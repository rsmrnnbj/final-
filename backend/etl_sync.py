import psycopg2
import json
from datetime import datetime

MAIN_DB_CONFIG = {
    "dbname": "ecommerce_main_db",
    "user": "rose",
    "password": "anne2663",
    "host": "168.231.118.191",
    "port": "5432"
}

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

        main_conn = psycopg2.connect(**MAIN_DB_CONFIG)
        main_cur = main_conn.cursor()

        main_cur.execute("""
            SELECT 
                COALESCE(SUM(total_statement), 0)   AS total_revenue,
                COUNT(id)                            AS total_orders,
                COALESCE(SUM(quantity), 0)           AS total_items_sold
            FROM orders;
        """)
        stats = main_cur.fetchone()
        
        main_cur.execute("SELECT COUNT(id) FROM users;")
        user_count = main_cur.fetchone()[0]

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

        reporting_conn = psycopg2.connect(**REPORTING_DB_CONFIG)
        reporting_cur = reporting_conn.cursor()

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
            stats[0],   
            stats[1],  
            stats[2],  
            json.dumps(top_products),
            user_count,
            datetime.now()
        ))

        reporting_conn.commit()
        print(f"[{datetime.now()}] ETL Sync successfully completed.")
        print(f"  Revenue: {stats[0]}, Orders: {stats[1]}, Items Sold: {stats[2]}, Users: {user_count}")
        print(f"  Top Products: {top_products}")

        reporting_cur.close()
        reporting_conn.close()

    except Exception as e:
        print(f"[{datetime.now()}] ERROR during ETL process: {e}")
        if main_conn and not main_conn.closed:
            main_conn.close()
        if reporting_conn and not reporting_conn.closed:
            reporting_conn.close()
        raise

if __name__ == "__main__":
    run_analytics_etl()
