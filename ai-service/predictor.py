import pandas as pd
import numpy as np
import os
import pickle
import json
from datetime import datetime, timedelta
from prophet import Prophet
from database import (
    fetch_sales_data, fetch_all_products,
    fetch_shop_profile, fetch_day_of_week_patterns,
    fetch_monthly_patterns,
)
from data_generator import generate_sample_sales, get_base_demand

MODELS_DIR        = 'models'
os.makedirs(MODELS_DIR, exist_ok=True)

FORECAST_DAYS     = 7
MIN_REAL_DAYS     = 7
MIN_TRAINING_ROWS = 5

# ── Shop-type seasonal config ────────────────────────────────

def get_db_prefix():
    db_name = os.getenv('DB_NAME', 'inventory')
    try:
        from flask import has_request_context, request
        if has_request_context() and request.headers.get('X-Database-Name'):
            return request.headers.get('X-Database-Name')
    except ImportError:
        pass
    return db_name

def get_model_path(product_id):
    prefix = get_db_prefix()
    return os.path.join(MODELS_DIR, f"{prefix}_{product_id}.pkl")
# These are STARTING POINTS — actual patterns override from data
SHOP_SEASONALITY = {
    'general_store':  { 'weekly': True,  'yearly': False },
    'restaurant':     { 'weekly': True,  'yearly': False },
    'pharmacy':       { 'weekly': False, 'yearly': True  },
    'electronics':    { 'weekly': False, 'yearly': True  },
    'textile':        { 'weekly': False, 'yearly': True  },
    'hardware':       { 'weekly': True,  'yearly': False },
    'auto_parts':     { 'weekly': True,  'yearly': False },
    'jewellery':      { 'weekly': False, 'yearly': True  },
    'stationery':     { 'weekly': True,  'yearly': True  },
    'manufacturing':  { 'weekly': True,  'yearly': True  },
    'warehouse':      { 'weekly': True,  'yearly': False },
    'other':          { 'weekly': True,  'yearly': False },
}

def get_shop_seasonality(shop_type):
    return SHOP_SEASONALITY.get(shop_type, SHOP_SEASONALITY['other'])

def get_training_data(product_id, product_name, price=100):
    """Get training data — prefer real data always, sample only as last resort."""
    real_rows = fetch_sales_data(product_id)
    real_df   = pd.DataFrame(real_rows)

    # If ANY real data exists — use it directly, never mix with sample
    if len(real_df) >= MIN_TRAINING_ROWS:
        real_df['sale_date'] = pd.to_datetime(real_df['sale_date'])
        real_days = (real_df['sale_date'].max() - real_df['sale_date'].min()).days
        print(f"  Using real data: {len(real_df)} rows over {real_days} days")
        return real_df[['sale_date','qty_sold']].rename(
            columns={'sale_date': 'ds', 'qty_sold': 'y'}
        )

    elif len(real_df) == 1:
        # Only 1 real row — use it but pad with minimal sample
        real_df['sale_date'] = pd.to_datetime(real_df['sale_date'])
        print(f"  Only 1 real row — padding with minimal sample for {product_name}")
        base   = get_base_demand(product_name, price)
        sample = generate_sample_sales(product_id, product_name,
                                       days=30, base_demand=base)
        sample['sale_date']  = pd.to_datetime(sample['sale_date'])
        real_dates = set(real_df['sale_date'].dt.date)
        sample     = sample[~sample['sale_date'].dt.date.isin(real_dates)]
        combined   = pd.concat([
            sample[['sale_date','qty_sold']],
            real_df[['sale_date','qty_sold']],
        ]).rename(columns={'sale_date': 'ds', 'qty_sold': 'y'})
        return combined.sort_values('ds').reset_index(drop=True)

    else:
        # Zero real data — use sample only
        print(f"  No real data — using sample only for {product_name}")
        base   = get_base_demand(product_name, price)
        sample = generate_sample_sales(product_id, product_name,
                                       days=90, base_demand=base)
        sample['sale_date'] = pd.to_datetime(sample['sale_date'])
        return sample[['sale_date','qty_sold']].rename(
            columns={'sale_date': 'ds', 'qty_sold': 'y'}
        )

def train_product(product, shop_profile=None):
    """Train Prophet model for a single product — shop-aware"""
    pid    = product['product_id']
    name   = product['name']
    price  = float(product.get('sellingPrice') or 100)
    inv_type = product.get('inventory_type', 'FINISHED')

    # Skip RAW materials — they're purchased not sold
    if inv_type == 'RAW':
        print(f"  Skipping RAW material: {name}")
        return False

    print(f"Training: {name} ({pid}) [{inv_type}]")

    # Get shop profile if not passed
    if shop_profile is None:
        shop_profile = fetch_shop_profile()

    shop_type  = shop_profile.get('shop_type', 'general_store')
    seasonality = get_shop_seasonality(shop_type)

    # Fetch data-driven patterns
    dow_patterns     = fetch_day_of_week_patterns(pid)
    monthly_patterns = fetch_monthly_patterns(pid)

    # If we have enough historical data, enable yearly seasonality
    has_monthly_data = len(monthly_patterns) >= 6
    use_yearly       = seasonality['yearly'] or has_monthly_data

    try:
        df = get_training_data(pid, name, price)
        df = df.dropna()
        df['y'] = df['y'].clip(lower=0)

        if len(df) < MIN_TRAINING_ROWS:
            print(f"  Skipping {name} — not enough data")
            return False

        model = Prophet(
            daily_seasonality   = False,
            weekly_seasonality  = seasonality['weekly'],
            yearly_seasonality  = use_yearly,
            changepoint_prior_scale = 0.05,
            interval_width      = 0.80,
        )
        model.fit(df)

        model_path = get_model_path(pid)
        with open(model_path, 'wb') as f:
            pickle.dump({
                'model':            model,
                'trained_at':       datetime.now().isoformat(),
                'product_name':     name,
                'product_id':       pid,
                'inventory_type':   inv_type,
                'shop_type':        shop_type,
                'data_rows':        len(df),
                'dow_patterns':     dow_patterns,
                'monthly_patterns': monthly_patterns,
                'lead_time_days':   product.get('lead_time_days', 1),
                'min_order_qty':    product.get('min_order_qty', 1),
            }, f)

        print(f"  ✅ Saved model for {name}")
        return True

    except Exception as e:
        print(f"  ❌ Error training {name}: {e}")
        return False

def train_all():
    """Train models for all active products — role aware"""
    shop_profile = fetch_shop_profile()
    is_supplier  = shop_profile.get('shop_type') == 'supplier'
    mode_label   = "Sales Forecasting (B2B Mode)" if is_supplier else "Demand Prediction (Retail Mode)"
    
    print(f"\n🏪 Shop: {shop_profile['shop_type']} | Mode: {mode_label}")
    print(f"📦 Types: {shop_profile['inventory_types']}")
    
    products = fetch_all_products()
    print(f"🤖 Training {len(products)} products...\n")
    success = 0
    for p in products:
        if train_product(p, shop_profile):
            success += 1
    print(f"\n✅ Trained {success}/{len(products)} products")
    return {'trained': success, 'total': len(products)}

def predict_product(product_id):
    """Get 7-day prediction for a product"""
    model_path = get_model_path(product_id)
    if not os.path.exists(model_path):
        return None

    with open(model_path, 'rb') as f:
        saved = pickle.load(f)

    model        = saved['model']
    product_name = saved['product_name']
    trained_at   = saved['trained_at']

    future   = model.make_future_dataframe(periods=FORECAST_DAYS)
    forecast = model.predict(future)

    today    = pd.Timestamp(datetime.now().date())
    future_f = forecast[forecast['ds'] >= today].tail(FORECAST_DAYS)

    predictions = []
    for _, row in future_f.iterrows():
        predictions.append({
            'date':      row['ds'].strftime('%Y-%m-%d'),
            'predicted': max(0, round(float(row['yhat']),       1)),
            'lower':     max(0, round(float(row['yhat_lower']), 1)),
            'upper':     max(0, round(float(row['yhat_upper']), 1)),
        })

    total_predicted = sum(p['predicted'] for p in predictions)

    return {
        'product_id':      product_id,
        'product_name':    product_name,
        'trained_at':      trained_at,
        'inventory_type':  saved.get('inventory_type', 'FINISHED'),
        'shop_type':       saved.get('shop_type', 'general_store'),
        'forecast_days':   FORECAST_DAYS,
        'total_predicted': round(total_predicted, 1),
        'daily_avg':       round(total_predicted / FORECAST_DAYS, 1),
        'predictions':     predictions,
        'lead_time_days':  saved.get('lead_time_days', 1),
        'min_order_qty':   saved.get('min_order_qty',  1),
    }

def get_recommendations():
    """
    Get restock recommendations — lead-time aware.
    Urgency now accounts for how long it takes stock to arrive.
    """
    products = fetch_all_products()
    recs     = []

    for product in products:
        pid       = product['product_id']
        stock     = int(product['stock'])
        min_stock = int(product['minStockLevel'])
        lead_time = int(product.get('lead_time_days', 1))
        moq       = int(product.get('min_order_qty',  1))
        inv_type  = product.get('inventory_type', 'FINISHED')

        # Skip RAW — not sold directly
        if inv_type == 'RAW':
            continue

        pred = predict_product(pid)
        if not pred:
            continue

        total_demand  = pred['total_predicted']
        daily_avg     = pred['daily_avg']

        # Days of stock remaining
        days_of_stock = round(stock / daily_avg, 1) if daily_avg > 0 else 999

        # Lead-time aware urgency
        # If days_of_stock <= lead_time → need to order NOW
        # If days_of_stock <= lead_time + 3 → high urgency
        if stock == 0:
            urgency = 'critical'
        elif days_of_stock <= lead_time:
            urgency = 'critical'   # will run out before new stock arrives
        elif days_of_stock <= lead_time + 3:
            urgency = 'high'
        elif days_of_stock <= lead_time + 7:
            urgency = 'medium'
        elif stock <= min_stock:
            urgency = 'low'
        else:
            urgency = 'ok'

        # Trend
        preds = pred['predictions']
        if len(preds) >= 6:
            first_half = sum(p['predicted'] for p in preds[:3]) / 3
            last_half  = sum(p['predicted'] for p in preds[-3:]) / 3
            if   last_half > first_half * 1.1: trend = 'rising'
            elif last_half < first_half * 0.9: trend = 'falling'
            else:                              trend = 'stable'
        else:
            trend = 'stable'

        # Suggested reorder quantity
        # Cover lead_time + 7 days demand, minus current stock
        # Round up to min_order_qty
        days_to_cover  = lead_time + FORECAST_DAYS
        demand_to_cover = daily_avg * days_to_cover
        raw_qty        = max(0, demand_to_cover - stock)
        # Round up to nearest MOQ
        if moq > 1 and raw_qty > 0:
            suggested_qty = int(np.ceil(raw_qty / moq) * moq)
        else:
            suggested_qty = int(np.ceil(raw_qty))

        recs.append({
            'product_id':     pid,
            'product_name':   product['name'],
            'inventory_type': inv_type,
            'current_stock':  stock,
            'min_stock':      min_stock,
            'days_of_stock':  days_of_stock,
            'lead_time_days': lead_time,
            'total_demand':   round(total_demand, 1),
            'daily_avg':      daily_avg,
            'trend':          trend,
            'urgency':        urgency,
            'suggested_qty':  suggested_qty,
            'min_order_qty':  moq,
        })

    order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'ok': 4}
    recs.sort(key=lambda x: order.get(x['urgency'], 5))
    return recs

def analyze_patterns():
    """
    Analyze sales patterns per product — learned from data.
    Returns day-of-week + monthly peaks from actual sales history.
    """
    products = fetch_all_products()
    patterns = []

    for product in products:
        pid  = product['product_id']
        name = product['name']

        dow     = fetch_day_of_week_patterns(pid)
        monthly = fetch_monthly_patterns(pid)

        if not dow and not monthly:
            continue

        # Find peak day of week
        if dow:
            peak_dow = max(dow, key=dow.get)
            dow_names = {1:'Sunday',2:'Monday',3:'Tuesday',4:'Wednesday',
                        5:'Thursday',6:'Friday',7:'Saturday'}
            peak_day_name = dow_names.get(peak_dow, 'Unknown')
        else:
            peak_day_name = None

        # Find peak month
        if monthly:
            peak_month = max(monthly, key=monthly.get)
            month_names = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
                          7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}
            peak_month_name = month_names.get(peak_month, 'Unknown')
        else:
            peak_month_name = None

        patterns.append({
            'product_id':     pid,
            'product_name':   name,
            'peak_day':       peak_day_name,
            'peak_month':     peak_month_name,
            'dow_pattern':    dow,
            'monthly_pattern': monthly,
        })

    return patterns

def get_procurement_recommendations():
    """
    Full procurement advisor — combines restock + patterns.
    Used by the procurement tab in frontend.
    """
    shop_profile = fetch_shop_profile()
    recs         = get_recommendations()
    patterns     = {p['product_id']: p for p in analyze_patterns()}

    result = []
    for rec in recs:
        pid     = rec['product_id']
        pattern = patterns.get(pid, {})
        result.append({
            **rec,
            'shop_type':    shop_profile['shop_type'],
            'peak_day':     pattern.get('peak_day'),
            'peak_month':   pattern.get('peak_month'),
            'order_before': rec['lead_time_days'],  # days before stockout to order
        })

    return {
        'shop_profile': shop_profile,
        'items':        result,
        'generated_at': datetime.now().isoformat(),
    }
