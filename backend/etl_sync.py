import logging
import json  # CRITICAL: This allows us to store the product list as a JSON string
from database import get_db_connection, get_reporting_db_connection

logging.basicConfig(level=logging.INFO)

def run_analytics_etl():
    main_conn = None
    report_conn = None
    
    try:
        # Connect to both databases
        main_conn = get_db_connection()
        report_conn = get_reporting_db_connection()
        main_cursor = main_conn.cursor()
        report_cursor = report_conn.cursor()

        # --- 1. PRODUCT SYNCHRONIZATION ---
        logging.info("Starting Product Sync...")
        main_cursor.execute("SELECT id, name, price, stock, category, image_url FROM products;")
        products = main_cursor.fetchall()
        
        report_cursor.execute("TRUNCATE TABLE products;")
        for p in products:
            report_cursor.execute("""
                INSERT INTO products (id, name, price, stock, category, image_url) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (p[0], p[1], p[2], p[3], p[4], p[5]))
        report_conn.commit()

        # --- 2. ANALYTICS CALCULATION ---
        logging.info("Starting Analytics Calculation...")
        
        # Revenue and Orders
        main_cursor.execute("SELECT total_statement FROM orders WHERE status = 'In Transit'")
        orders = main_cursor.fetchall()
        total_revenue = sum(order[0] for order in orders)
        total_orders = len(orders)
        
        # Top 3 Products
        main_cursor.execute("SELECT name FROM products ORDER BY stock DESC LIMIT 3;")
        top_products = [p[0] for p in main_cursor.fetchall()]
        
        # Total Registered Users
        main_cursor.execute("SELECT COUNT(*) FROM users;")
        total_users = main_cursor.fetchone()[0]
        
        # Update Reporting DB
        # We use json.dumps() to convert the Python list to a string for Postgres
        report_cursor.execute("TRUNCATE TABLE daily_analytics_summary;") 
        report_cursor.execute("""
            INSERT INTO daily_analytics_summary 
            (total_revenue, total_orders, top_products, total_users) 
            VALUES (%s, %s, %s, %s)
        """, (total_revenue, total_orders, json.dumps(top_products), total_users))
        
        report_conn.commit()
        logging.info(f"✅ ETL Sync Complete: Revenue: {total_revenue}, Users: {total_users}")

    except Exception as e:
        logging.error(f"❌ ETL Sync Failed: {e}")
        if report_conn: report_conn.rollback()
    finally:
        if 'main_cursor' in locals(): main_cursor.close()
        if 'report_cursor' in locals(): report_cursor.close()
        if main_conn: main_conn.close()
        if report_conn: report_conn.close()
        logging.info("Database connections closed.")

if __name__ == "__main__":
    run_analytics_etl()