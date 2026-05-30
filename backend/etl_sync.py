import psycopg2
import json
from datetime import datetime

# Connection for the main transactional database (Source)
MAIN_DB_CONFIG = {
    "dbname": "ecommerce_main_db",
    "user": "rose",
    "password": "anne2663",
    "host": "168.231.118.191",
    "port": "5432"
}

# Connection for the reporting analytics database (Destination)
REPORTING_DB_CONFIG = {
    "dbname": "ecommerce_reporting_db",
    "user": "rose",
    "password": "anne2663",
    "host": "168.231.118.191",
    "port": "5432"
}

def run_analytics_etl():
    main_conn = None
    reporting_conn = None
    try:
        print(f"[{datetime.now()}] Starting ETL Sync...")

        # 1. Connect to Main DB and EXTRACT data
        main_conn = psycopg2.connect(**MAIN_DB_CONFIG)
        main_cur = main_conn.cursor()

        # --- FIX 1: Calculate general order stats ---
        # Added SUM(quantity) for total_items_sold
        # COUNT(DISTINCT user_id) will work as long as user_id column exists in orders
        main_cur.execute("""
            SELECT 
                COALESCE(SUM(total_statement), 0)   AS total_revenue,
                COUNT(id)                            AS total_orders,
                COALESCE(SUM(quantity), 0)           AS total_items_sold,
                COUNT(DISTINCT user_id)              AS total_users
            FROM orders;
        """)
        stats = main_cur.fetchone()
        # stats = (total_revenue, total_orders, total_items_sold, total_users)

        # --- FIX 2: Top 3 Products by total quantity sold (more meaningful) ---
        main_cur.execute("""
            SELECT product_name
            FROM orders
            GROUP BY product_name
            ORDER BY SUM(quantity) DESC
            LIMIT 3;
        """)
        top_products = [row[0] for row in main_cur.fetchall()]

        main_cur.close()
        main_conn.close()

        # 2. Connect to Reporting DB and LOAD data
        reporting_conn = psycopg2.connect(**REPORTING_DB_CONFIG)
        reporting_cur = reporting_conn.cursor()

        # --- FIX 3: Now correctly inserts total_items_sold ---
        reporting_cur.execute("""
            INSERT INTO daily_analytics_summary 
            (summary_date, total_revenue, total_orders, total_items_sold, top_products, total_users, last_updated)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (summary_date) 
            DO UPDATE SET 
                total_revenue    = EXCLUDED.total_revenue,
                total_orders     = EXCLUDED.total_orders,
                total_items_sold = EXCLUDED.total_items_sold,
                total_users      = EXCLUDED.total_users,
                top_products     = EXCLUDED.top_products,
                last_updated     = EXCLUDED.last_updated;
        """, (
            datetime.now().date(),
            stats[0],   # total_revenue
            stats[1],   # total_orders
            stats[2],   # total_items_sold  <-- was missing before
            json.dumps(top_products),
            stats[3],   # total_users
            datetime.now()
        ))

        reporting_conn.commit()
        print(f"[{datetime.now()}] ETL Sync successfully completed.")
        print(f"  Revenue: {stats[0]}, Orders: {stats[1]}, Items Sold: {stats[2]}, Users: {stats[3]}")
        print(f"  Top Products: {top_products}")

        reporting_cur.close()
        reporting_conn.close()

    except Exception as e:
        print(f"[{datetime.now()}] ERROR during ETL process: {e}")
        if main_conn and not main_conn.closed:
            main_conn.close()
        if reporting_conn and not reporting_conn.closed:
            reporting_conn.close()
        raise  # Re-raise so FastAPI endpoint can report the error

if __name__ == "__main__":
    run_analytics_etl()