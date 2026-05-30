from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import random
from datetime import datetime
import json
import os
import shutil
from fastapi import UploadFile, File, Form
from etl_sync import run_analytics_etl

app = FastAPI(title="E-Commerce API Engine")

static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    "dbname": "ecommerce_main_db",
    "user": "rose",
    "password": "anne2663",
    "host": "168.231.118.191",
    "port": "5432"
}

REP_DB_CONFIG = {
    "dbname": "ecommerce_reporting_db",
    "user": "rose",
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

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'customer'
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL,
                category VARCHAR(100),
                image_url TEXT
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                tracking_ref VARCHAR(50) NOT NULL,
                order_date VARCHAR(50) NOT NULL,
                total_statement REAL NOT NULL,
                status VARCHAR(50) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                item_price REAL NOT NULL,
                image_url TEXT,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
            );
        """)

        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Database tables verified!")
    except Exception as e:
        print(f"❌ DB Init Error: {e}")

init_db()

# ─── Pydantic Schemas ───────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    product_id: int
    quantity: int
    user_id: int = None 

class UserSignUp(BaseModel):
    email: str
    password: str
    role: str = "customer"

class UserLogin(BaseModel):
    email: str
    password: str
    role: str

class ProductSchema(BaseModel):
    name: str
    price: float
    stock: int = 10
    category: str = "Electronics"
    description: str = ""
    image_url: str = ""

# ─── Auth ────────────────────────────────────────────────────────────────────

@app.post("/auth/login")
def login_user(req: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, password, role FROM users WHERE email = %s", (req.email,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Account not found.")
        if user['password'] != req.password:
            raise HTTPException(status_code=401, detail="Incorrect password.")
        if user['role'].lower() != req.role.lower():
            raise HTTPException(status_code=401, detail=f"This account is registered as a {user['role']}, not a {req.role}.")
        return {"id": user['id'], "email": user['email'], "role": user['role']}
    finally:
        cursor.close()
        conn.close()

@app.post("/auth/signup")
def register_user(req: UserSignUp):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        normalized_role = req.role.lower()
        cursor.execute(
            "INSERT INTO users (email, password, role) VALUES (%s, %s, %s);",
            (req.email, req.password, normalized_role)
        )
        conn.commit()
        return {"message": f"Account created as {normalized_role}!"}
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=400, detail="User already exists.")
    finally:
        cursor.close()
        conn.close()

# ─── Products ────────────────────────────────────────────────────────────────

@app.get("/products")
def get_products_public():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY id ASC;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/api/inventory")
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, price, stock, category, image_url FROM products;")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.post("/api/products")
def add_product(product: ProductSchema):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO products (name, price, stock, category, image_url) VALUES (%s, %s, %s, %s, %s)",
        (product.name, product.price, product.stock, product.category, product.image_url)
    )
    conn.commit()
    cursor.close()
    conn.close()
    run_analytics_etl()
    return {"message": "Product added and synced"}

@app.put("/api/products/{id}")
def update_product(id: int, product: ProductSchema):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE products SET name=%s, price=%s, stock=%s, category=%s, image_url=%s WHERE id=%s",
        (product.name, product.price, product.stock, product.category, product.image_url, id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    run_analytics_etl()
    return {"message": "Product updated and synced"}

@app.delete("/api/products/{id}")
def delete_product(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = %s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    run_analytics_etl()
    return {"message": "Product deleted and synced"}

@app.post("/api/add-product")
async def add_product_with_image(
    file: UploadFile = File(...),
    name: str = Form(...),
    price: float = Form(...)
):
    file_path = f"static/images/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO products (name, price, stock, category, image_url) VALUES (%s, %s, %s, %s, %s)",
        (name, price, 0, "Uncategorized", f"images/{file.filename}")
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Success"}

# ─── Orders ──────────────────────────────────────────────────────────────────

@app.get("/orders")
def get_orders_public():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY id DESC;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/api/orders")
def get_orders():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, tracking_ref, order_date, total_statement, status,
               product_name, quantity, item_price, user_id
        FROM orders ORDER BY id DESC;
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.post("/buy")
def buy_product(req: OrderCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB Connection Error: {str(e)}")

    try:
        cursor.execute("SELECT * FROM products WHERE id = %s", (req.product_id,))
        product = cursor.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {req.product_id} not found.")

        p_name = product.get('name', 'Unknown')
        p_price = product.get('price', 0.0)
        current_stock = product.get('stock', 0)
        p_image = product.get('image_url', '')

        if current_stock < req.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {p_name}.")

        new_stock = current_stock - req.quantity
        cursor.execute("UPDATE products SET stock = %s WHERE id = %s", (new_stock, req.product_id))

        tracking_ref = f"#GG-{random.randint(10000, 99999)}-MN"
        total_cost = p_price * req.quantity
        date_str = datetime.now().strftime("%B %d, %Y")

        cursor.execute("""
            INSERT INTO orders 
            (tracking_ref, order_date, total_statement, status, product_name, quantity, item_price, image_url, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (tracking_ref, date_str, total_cost, "In Transit", p_name, req.quantity, p_price, p_image, req.user_id))

        conn.commit()

        # Auto-sync ETL after every purchase
        run_analytics_etl()

        return {"message": "Order placed!", "tracking_ref": tracking_ref}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Order error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# ─── Analytics ───────────────────────────────────────────────────────────────

@app.get("/api/analytics")
def get_analytics():
    try:
        conn = psycopg2.connect(**REP_DB_CONFIG, cursor_factory=RealDictCursor)
        cur = conn.cursor()
        cur.execute("""
            SELECT total_revenue, total_orders, total_items_sold, top_products, total_users
            FROM daily_analytics_summary
            ORDER BY summary_date DESC LIMIT 1;
        """)
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return {
                "totalRevenue": 0,
                "activeOrders": 0,
                "totalItemsSold": 0,
                "top_products": [],
                "total_users": 0
            }

        # Parse top_products — stored as JSON string in DB
        raw_top = row['top_products']
        if isinstance(raw_top, list):
            top_products = raw_top
        elif isinstance(raw_top, str):
            try:
                top_products = json.loads(raw_top)
            except Exception:
                top_products = []
        else:
            top_products = []

        return {
            "totalRevenue":   float(row['total_revenue']    or 0),
            "activeOrders":   int(row['total_orders']       or 0),
            "totalItemsSold": int(row['total_items_sold']   or 0),
            "top_products":   top_products,
            "total_users":    int(row['total_users']        or 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analytics load failed: {str(e)}")

# ─── ETL Trigger ─────────────────────────────────────────────────────────────

@app.post("/api/trigger-etl")
def trigger_etl():
    try:
        run_analytics_etl()
        return {"status": "success", "message": "ETL sync completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ETL failed: {str(e)}")

@app.post("/process-order/")
async def process_order(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_analytics_etl)
    return {"message": "Order processed! ETL running in background."}


