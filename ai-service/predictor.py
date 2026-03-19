import pandas as pd
import numpy as np
import os
import pickle
import json
from datetime import datetime, timedelta
from prophet import Prophet
from database import fetch_sales_data, fetch_all_products
from data_generator import generate_sample_sales, get_base_demand

MODELS_DIR = 'models'
os.makedirs(MODELS_DIR, exist_ok=True)

FORECAST_DAYS    = 7
MIN_REAL_DAYS    = 14  # need at least 14 days real data to use it alone
MIN_TRAINING_ROWS = 10  # minimum rows to train

def get_training_data(product_id, product_name, price=100):
    """
    Get training data — mix real + sample if needed.
    """
    # Fetch real sales
    real_rows  = fetch_sales_data(product_id)
    real_df    = pd.DataFrame(real_rows)

    has_real_data = len(real_df) >= MIN_TRAINING_ROWS

    if has_real_data:
        real_df['sale_date'] = pd.to_datetime(real_df['sale_date'])
        real_days = (real_df['sale_date'].max() - real_df['sale_date'].min()).days

        if real_days >= MIN_REAL_DAYS:
            # Enough real data — use only real
            print(f"  Using real data only: {len(real_df)} rows")
            return real_df[['sale_date','qty_sold']].rename(
                columns={'sale_date': 'ds', 'qty_sold': 'y'}
            )
        else:
            # Mix real + sample
            print(f"  Mixing real ({len(real_df)} rows) + sample data")
            base   = get_base_demand(product_name, price)
            sample = generate_sample_sales(product_id, product_name,
                                           days=60, base_demand=base)
            sample['sale_date'] = pd.to_datetime(sample['sale_date'])
            real_df['sale_date'] = pd.to_datetime(real_df['sale_date'])

            # Remove sample dates that have real data
            real_dates = set(real_df['sale_date'].dt.date)
            sample     = sample[~sample['sale_date'].dt.date.isin(real_dates)]

            combined = pd.concat([
                sample[['sale_date','qty_sold']],
                real_df[['sale_date','qty_sold']],
            ]).rename(columns={'sale_date': 'ds', 'qty_sold': 'y'})
            return combined.sort_values('ds').reset_index(drop=True)
    else:
        # No real data — use sample only
        print(f"  Using sample data only for {product_name}")
        base   = get_base_demand(product_name, price)
        sample = generate_sample_sales(product_id, product_name,
                                       days=90, base_demand=base)
        sample['sale_date'] = pd.to_datetime(sample['sale_date'])
        return sample[['sale_date','qty_sold']].rename(
            columns={'sale_date': 'ds', 'qty_sold': 'y'}
        )

def train_product(product):
    """Train Prophet model for a single product"""
    pid   = product['product_id']
    name  = product['name']
    price = float(product.get('sellingPrice', 100))

    print(f"Training: {name} ({pid})")

    try:
        df = get_training_data(pid, name, price)
        df = df.dropna()
        df['y'] = df['y'].clip(lower=0)

        if len(df) < MIN_TRAINING_ROWS:
            print(f"  Skipping {name} — not enough data")
            return False

        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05,
            interval_width=0.80,
        )
        model.fit(df)

        # Save model
        model_path = os.path.join(MODELS_DIR, f"{pid}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump({
                'model':        model,
                'trained_at':   datetime.now().isoformat(),
                'product_name': name,
                'product_id':   pid,
                'data_rows':    len(df),
            }, f)

        print(f"  ✅ Saved model for {name}")
        return True

    except Exception as e:
        print(f"  ❌ Error training {name}: {e}")
        return False

def train_all():
    """Train models for all active products"""
    products = fetch_all_products()
    print(f"\n🤖 Training {len(products)} products...\n")
    success = 0
    for p in products:
        if train_product(p):
            success += 1
    print(f"\n✅ Trained {success}/{len(products)} products")
    return {'trained': success, 'total': len(products)}

def predict_product(product_id):
    """Get 7-day prediction for a product"""
    model_path = os.path.join(MODELS_DIR, f"{product_id}.pkl")

    if not os.path.exists(model_path):
        return None

    with open(model_path, 'rb') as f:
        saved = pickle.load(f)

    model        = saved['model']
    product_name = saved['product_name']
    trained_at   = saved['trained_at']

    # Make future dataframe
    future = model.make_future_dataframe(periods=FORECAST_DAYS)
    forecast = model.predict(future)

    # Get only future predictions
    today    = pd.Timestamp(datetime.now().date())
    future_f = forecast[forecast['ds'] >= today].tail(FORECAST_DAYS)

    predictions = []
    for _, row in future_f.iterrows():
        predictions.append({
            'date':       row['ds'].strftime('%Y-%m-%d'),
            'predicted':  max(0, round(float(row['yhat']),    1)),
            'lower':      max(0, round(float(row['yhat_lower']), 1)),
            'upper':      max(0, round(float(row['yhat_upper']), 1)),
        })

    total_predicted = sum(p['predicted'] for p in predictions)

    return {
        'product_id':   product_id,
        'product_name': product_name,
        'trained_at':   trained_at,
        'forecast_days': FORECAST_DAYS,
        'total_predicted': round(total_predicted, 1),
        'daily_avg':    round(total_predicted / FORECAST_DAYS, 1),
        'predictions':  predictions,
    }

def get_recommendations():
    """Get restock recommendations for all products"""
    products   = fetch_all_products()
    recs       = []

    for product in products:
        pid       = product['product_id']
        stock     = int(product['stock'])
        min_stock = int(product['minStockLevel'])

        pred = predict_product(pid)
        if not pred:
            continue

        total_demand  = pred['total_predicted']
        daily_avg     = pred['daily_avg']
        days_of_stock = round(stock / daily_avg, 1) if daily_avg > 0 else 999

        # Determine urgency
        if stock == 0:
            urgency = 'critical'
        elif days_of_stock <= 3:
            urgency = 'high'
        elif days_of_stock <= 7:
            urgency = 'medium'
        elif stock <= min_stock:
            urgency = 'low'
        else:
            urgency = 'ok'

        # Calculate trend (compare first 3 days vs last 4 days)
        preds = pred['predictions']
        if len(preds) >= 6:
            first_half = sum(p['predicted'] for p in preds[:3]) / 3
            last_half  = sum(p['predicted'] for p in preds[-3:]) / 3
            if last_half > first_half * 1.1:   trend = 'rising'
            elif last_half < first_half * 0.9: trend = 'falling'
            else:                               trend = 'stable'
        else:
            trend = 'stable'

        # Suggested reorder quantity
        suggested_qty = max(0, round(total_demand * 1.5 - stock))

        recs.append({
            'product_id':    pid,
            'product_name':  product['name'],
            'current_stock': stock,
            'min_stock':     min_stock,
            'days_of_stock': days_of_stock,
            'total_demand':  round(total_demand, 1),
            'daily_avg':     daily_avg,
            'trend':         trend,
            'urgency':       urgency,
            'suggested_qty': suggested_qty,
        })

    # Sort by urgency
    order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'ok': 4}
    recs.sort(key=lambda x: order.get(x['urgency'], 5))
    return recs