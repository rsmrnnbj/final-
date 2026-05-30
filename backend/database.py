# backend/database.py
import psycopg2
from psycopg2.extras import RealDictCursor

DB_CONFIG = {
    "dbname": "ecommerce_main_db",
    "user": "rose",
    "password": "anne2663",
    "host": "168.231.118.191", 
    "port": "5432"
}

REPORT_DB_CONFIG = {
    "dbname": "ecommerce_reporting_db", 
    "user": "rose",
    "password": "anne2663",
    "host": "168.231.118.191", 
    "port": "5432"
}

import os
# from dotenv import load_dotenv
# Load the .env file
# load_dotenv()

def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv("MAIN_DB_NAME"),
        user=os.getenv("MAIN_DB_USER"),
        password=os.getenv("MAIN_DB_PASS"),
        host=os.getenv("MAIN_DB_HOST"), 
        port="5432"
    )

def get_reporting_db_connection():
    return psycopg2.connect(
        dbname=os.getenv("REPORT_DB_NAME"),
        user=os.getenv("REPORT_DB_USER"),
        password=os.getenv("REPORT_DB_PASS"),
        host=os.getenv("REPORT_DB_HOST"),
        port="5432"
    )

def get_db_connection():
    """Helper function to open a clean connection to your main store database."""
    conn = psycopg2.connect(**DB_CONFIG)
    return conn

def get_reporting_db_connection():
    """Helper function to open a clean connection to your separate reporting analytics database."""
    conn = psycopg2.connect(**REPORT_DB_CONFIG)
    return conn
