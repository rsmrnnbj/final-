# backend/database.py
import psycopg2
from psycopg2.extras import RealDictCursor

# 🔑 MAIN TRANSACTIONAL DATABASE CONFIG
DB_CONFIG = {
    "dbname": "ecommerce_main_db",
    "user": "postgres",
    "password": "anne2663",
    "host": "localhost",
    "port": "5432"
}

# 🔑 NEW SEPARATE REPORTING DATABASE CONFIG
REPORT_DB_CONFIG = {
    "dbname": "ecommerce_reporting_db", 
    "user": "postgres",
    "password": "anne2663",
    "host": "localhost",
    "port": "5432"
}

def get_db_connection():
    """Helper function to open a clean connection to your main store database."""
    conn = psycopg2.connect(**DB_CONFIG)
    return conn

def get_reporting_db_connection():
    """Helper function to open a clean connection to your separate reporting analytics database."""
    conn = psycopg2.connect(**REPORT_DB_CONFIG)
    return conn