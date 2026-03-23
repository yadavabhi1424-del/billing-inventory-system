import mysql.connector
import os
import json
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

def fetch_shop_profile():
    """Fetch shop profile — shop_type, inventory_types, currency etc."""
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT shop_type, inventory_types, currency, timezone
        FROM shop_profile LIMIT 1
    """)
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row:
        return {
            'shop_type':       'general_store',
            'inventory_types': ['FINISHED'],
            'currency':        'INR',
            'timezone':        'Asia/Kolkata',
        }

    # Parse inventory_types JSON if string
    inv = row['inventory_types']
    if isinstance(inv, str):
        try:    inv = json.loads(inv)
        except: inv = ['FINISHED']

    return {
        'shop_type':       row['shop_type'],
        'inventory_types': inv,
        'currency':        row['currency'] or 'INR',
        'timezone':        row['timezone'] or 'Asia/Kolkata',
    }

def fetch_sales_data(product_id=None):
    """Fetch daily sales per product from transactions"""
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            ti.product_id,
            p.name          as product_name,
            p.stock         as current_stock,
            p.minStockLevel as min_stock,
            DATE(t.createdAt) as sale_date,
            SUM(ti.quantity)  as qty_sold
        FROM transaction_items ti
        JOIN transactions t ON t.transaction_id = ti.transaction_id
        JOIN products p     ON p.product_id     = ti.product_id
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
    """Fetch all active products with extended fields"""
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT
            p.product_id,
            p.name,
            p.stock,
            p.minStockLevel,
            p.sellingPrice,
            p.costPrice,
            p.inventory_type,
            p.lead_time_days,
            p.min_order_qty,
            p.industry_tags,
            c.name as category_name
        FROM products p
        LEFT JOIN categories c ON c.category_id = p.category_id
        WHERE p.isActive = TRUE
    """)
    products = cursor.fetchall()
    cursor.close()
    conn.close()

    # Parse industry_tags JSON
    for p in products:
        tags = p.get('industry_tags')
        if isinstance(tags, str):
            try:    p['industry_tags'] = json.loads(tags)
            except: p['industry_tags'] = []
        elif tags is None:
            p['industry_tags'] = []

        # Defaults
        p['inventory_type'] = p.get('inventory_type') or 'FINISHED'
        p['lead_time_days'] = int(p.get('lead_time_days') or 1)
        p['min_order_qty']  = int(p.get('min_order_qty')  or 1)

    return products

def fetch_day_of_week_patterns(product_id):
    """Fetch historical day-of-week sales pattern for a product"""
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT
            DAYOFWEEK(t.createdAt) as dow,
            AVG(ti.quantity)       as avg_qty
        FROM transaction_items ti
        JOIN transactions t ON t.transaction_id = ti.transaction_id
        WHERE ti.product_id = %s AND t.status = 'COMPLETED'
        GROUP BY DAYOFWEEK(t.createdAt)
        ORDER BY dow
    """, (product_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return {int(r['dow']): float(r['avg_qty']) for r in rows}

def fetch_monthly_patterns(product_id):
    """Fetch historical monthly sales pattern for a product"""
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT
            MONTH(t.createdAt)  as month,
            AVG(ti.quantity)    as avg_qty
        FROM transaction_items ti
        JOIN transactions t ON t.transaction_id = ti.transaction_id
        WHERE ti.product_id = %s AND t.status = 'COMPLETED'
        GROUP BY MONTH(t.createdAt)
        ORDER BY month
    """, (product_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return {int(r['month']): float(r['avg_qty']) for r in rows}