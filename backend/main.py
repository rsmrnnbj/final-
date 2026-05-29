from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import random
from datetime import datetime
import subprocess
from etl_sync import run_analytics_etl
from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File, Form
import shutil
import os
from fastapi.staticfiles import StaticFiles



# Mount the static files directory for image uploads (do this after app is created)
# app.mount("/images", StaticFiles(directory="images"), name="images")

app = FastAPI(title="E-Commerce API Engine")

static_dir = os.path.join(os.path.dirname(__file__), "static")
# Mount static files (serve from ./static)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/api/add-product")
async def add_product(
    file: UploadFile = File(...), 
    name: str = Form(...), 
    price: float = Form(...)
):
    # 1. Save the file to the static/images folder
    file_path = f"static/images/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 2. UPDATE THE DATABASE WITH THE PATH
    conn = get_db_connection()
    cursor = conn.cursor()
    # Ensure you are inserting the 'file_path' into the 'image_url' column!
    cursor.execute(
    "INSERT INTO products (name, price, stock, category, image_url) VALUES (%s, %s, %s, %s, %s)",
    (name, price, 0, "Uncategorized", f"images/{file.filename}") 
)
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": "Success"}

@app.post("/process-order/")
async def process_order(background_tasks: BackgroundTasks):
    # Simulate order processing logic here (e.g., validate order, update inventory, etc.)
    # For demonstration, we'll just trigger the ETL process in the background.
    
    background_tasks.add_task(run_analytics_etl)
    
    return {"message": "Order processed successfully! Analytics ETL is running in the background."}


# 🌐 Enable CORS so your Vite dev server can connect smoothly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔑 Your exact pgAdmin credentials
DB_CONFIG = {
    "dbname": "ecommerce_main_db",
    "user": "postgres",
    "password": "anne2663",
    "host": "168.231.118.191",
    "port": "5432"
}

REP_DB_CONFIG = {
    "dbname": "ecommerce_reporting_db",
    "user": "postgres",
    "password": "anne2663",
    "host": "168.231.118.191",
    "port": "5432"
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 👥 Core Accounts Table (Stores both Customer and Seller credentials)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'customer' -- 'customer' or 'seller'
            );
        """)
        
        # (Keep your existing products and orders table blocks below this...)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL,
                price REAL NOT NULL, stock INTEGER NOT NULL,
                category VARCHAR(100), image_url TEXT
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY, tracking_ref VARCHAR(50) NOT NULL,
                order_date VARCHAR(50) NOT NULL, total_statement REAL NOT NULL,
                status VARCHAR(50) NOT NULL, product_name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL, item_price REAL NOT NULL, image_url TEXT
            );
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Account Authorization Databases verified safely!")
    except Exception as e:
        print(f"❌ Auth DB Init Error: {e}")

init_db()

class OrderCreate(BaseModel):
    product_id: int
    quantity: int

class RestockUpdate(BaseModel):
    quantity: int

# Authorization Schema Formats
class UserSignUp(BaseModel):
    email: str
    password: str
    role: str = "customer" # Can pass 'customer' or 'seller'

class UserLogin(BaseModel):
    email: str
    password: str
    role: str

class ProductSchema(BaseModel):
    name: str
    price: float
    stock: int
    category: str
    description: str = ""
    image_url: str = ""

# 🔑 LOGIN: Case-Insensitive Role Check
@app.post("/auth/login")
def login_user(req: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, password, role FROM users WHERE email = %s", (req.email,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Account not found.")
        
        # 💡 Ensure we compare passwords correctly
        if user['password'] != req.password:
            raise HTTPException(status_code=401, detail="Incorrect password.")
        
        # 💡 Ensure we compare roles in lowercase to prevent case-sensitivity issues
        if user['role'].lower() != req.role.lower():
            raise HTTPException(
                status_code=401, 
                detail=f"This account is registered as a {user['role']}, not a {req.role}."
            )
            
        return {"email": user['email'], "role": user['role']}
    finally:
        cursor.close()
        conn.close()

# 📝 SIGNUP: Ensures roles are stored consistently
@app.post("/auth/signup")
def register_user(req: UserSignUp):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Convert incoming role to lowercase to keep database consistent
        normalized_role = req.role.lower()
        
        cursor.execute(
            "INSERT INTO users (email, password, role) VALUES (%s, %s, %s);",
            (req.email, req.password, normalized_role)
        )
        conn.commit()
        return {"message": f"Account created as {normalized_role}!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="User already exists.")
    finally:
        cursor.close()
        conn.close()

# 🛍️ POST /buy - Bulletproofed for your pgAdmin configuration
@app.post("/buy", summary="Buy Product")
def buy_product(req: OrderCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Connection Refused: {str(e)}")
    
    try:
        # Check if product exists in your PostgreSQL table
        cursor.execute("SELECT * FROM products WHERE id = %s", (req.product_id,))
        product = cursor.fetchone()
        
        if not product:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail=f"Product with ID {req.product_id} not found in pgAdmin tables.")
            
        # Safe extraction using .get() to avoid any key errors
        p_name = product.get('name', 'Unknown Product')
        p_price = product.get('price', 0.0)
        current_stock = product.get('stock', 0)
        p_image = product.get('image_url', '')
        
        if current_stock < req.quantity:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Insufficient inventory stock for {p_name}. Balance: {current_stock}")
            
        # Deduct stock level counters in pgAdmin
        new_stock = current_stock - req.quantity
        cursor.execute("UPDATE products SET stock = %s WHERE id = %s", (new_stock, req.product_id))
        
        # Create tracking details matching your design references
        date_str = datetime.now().strftime("%B %d, %Y")
        tracking_ref = f"#GG-{random.randint(10000, 99999)}-MN"
        total_cost = p_price * req.quantity

        # Insert order transaction securely into PostgreSQL
        cursor.execute("""
            INSERT INTO orders (tracking_ref, order_date, total_statement, status, product_name, quantity, item_price, image_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (tracking_ref, date_str, total_cost, "In Transit", p_name, req.quantity, p_price, p_image))
        
        conn.commit()
        return {"message": "Purchase tracked perfectly in PostgreSQL!", "tracking_ref": tracking_ref}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Query Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# 📦 GET /orders - Fetches from pgAdmin
@app.get("/orders", summary="Get Order History")
def get_orders():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders ORDER BY id DESC;")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load tracking metrics: {str(e)}")

# 📋 GET /products - Fetches from pgAdmin
@app.get("/products", summary="Get Products")
def get_products():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products ORDER BY id ASC;")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load store listings: {str(e)}")
    
# 3. FOR DASHBOARD ANALYTICS (The new one that fixes the white screen)
@app.get("/api/analytics", summary="Get Latest Analytics Summary")
def get_analytics():
    conn = psycopg2.connect(**REP_DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    # Use LIMIT 1 to get a single object, not a list!
    cursor.execute("SELECT * FROM daily_analytics_summary ORDER BY id DESC LIMIT 1;")
    stats = cursor.fetchone() 
    conn.close()
    
    # Return the single object or a default if empty
    return stats if stats else {"total_revenue": 0, "total_orders": 0, "total_items_sold": 0}

@app.get("/api/analytics", summary="Get Latest Analytics Summary")
def get_analytics():
    conn = psycopg2.connect(**REP_DB_CONFIG)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Use ORDER BY id DESC to get the newest entry first
    cursor.execute("SELECT * FROM daily_analytics_summary ORDER BY id DESC LIMIT 1;")
    stats = cursor.fetchone()
    
    conn.close()
    
    # Return the latest stats or a default object if the table is empty
    return stats if stats else {"total_revenue": 0, "total_orders": 0, "total_items_sold": 0}

# @app.get("/api/analytics")
# def get_analytics():
#     conn = get_reporting_db_connection()
#     cursor = conn.cursor(cursor_factory=RealDictCursor)
#     cursor.execute("SELECT * FROM daily_analytics_summary LIMIT 1;")
#     data = cursor.fetchone()
#     conn.close()
#     return data

@app.get("/api/inventory")
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    # Using the correct column names from your database: name, price, stock
    cursor.execute("SELECT id, name, price, stock, category FROM products;") 
    data = cursor.fetchall()
    conn.close()
    return data

@app.get("/api/orders")
def get_orders():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    # Using exact column names from your database:
    cursor.execute("SELECT id, tracking_ref, order_date, total_statement, status, product_name, quantity, item_price FROM orders;")
    data = cursor.fetchall()
    conn.close()
    return data

@app.post("/api/trigger-etl")
def trigger_etl():
    # This manually executes your script
    subprocess.run(["python", "etl_sync.py"], check=True)
    return {"status": "success", "message": "ETL process triggered"}

@app.post("/api/products")
def add_product(product: ProductSchema):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO products (name, price, stock, category) VALUES (%s, %s, %s, %s)",
                   (product.name, product.price, product.stock, product.category))
    conn.commit()
    conn.close()
    # AUTOMATIC SYNC: Triggered immediately after adding
    run_analytics_etl()
    return {"message": "Product added and synced"}

@app.put("/api/products/{id}")
def update_product(id: int, product: ProductSchema):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE products SET name=%s, price=%s, stock=%s, category=%s WHERE id=%s",
                   (product.name, product.price, product.stock, product.category, id))
    conn.commit()
    conn.close()
    # AUTOMATIC SYNC: Triggered immediately after updating
    run_analytics_etl()
    return {"message": "Product updated and synced"}

@app.delete("/api/products/{id}")
def delete_product(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    # AUTOMATIC SYNC: Triggered immediately after deleting
    run_analytics_etl()
    return {"message": "Product deleted and synced"}
