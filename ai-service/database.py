import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host     = os.getenv('DB_HOST',     'localhost'),
        user     = os.getenv('DB_USER',     'root'),
        password = os.getenv('DB_PASSWORD', 'Abhi@1424'),
        database = os.getenv('DB_NAME',     'inventory'),
        port     = int(os.getenv('DB_PORT', 3306)),
    )

def fetch_sales_data(product_id=None):
    """Fetch daily sales per product from transactions"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            ti.product_id,
            p.name as product_name,
            p.stock as current_stock,
            p.minStockLevel as min_stock,
            DATE(t.createdAt) as sale_date,
            SUM(ti.quantity) as qty_sold
        FROM transaction_items ti
        JOIN transactions t ON t.transaction_id = ti.transaction_id
        JOIN products p     ON p.product_id = ti.product_id
        WHERE t.status = 'COMPLETED'
        {}
        GROUP BY ti.product_id, p.name, p.stock, p.minStockLevel, DATE(t.createdAt)
        ORDER BY ti.product_id, sale_date ASC
    """.format("AND ti.product_id = %s" if product_id else "")

    cursor.execute(query, (product_id,) if product_id else ())
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def fetch_all_products():
    """Fetch all active products"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT product_id, name, stock, minStockLevel, sellingPrice
        FROM products
        WHERE isActive = TRUE
    """)
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return products