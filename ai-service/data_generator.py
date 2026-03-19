import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_sample_sales(product_id, product_name, days=90, base_demand=10):
    """
    Generate realistic sample sales data for a product.
    Creates patterns: weekends higher, some random spikes.
    """
    np.random.seed(hash(product_id) % (2**32))  # consistent per product

    dates = []
    quantities = []

    end_date   = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    current    = start_date

    while current <= end_date:
        # Weekend boost (Sat/Sun sell more)
        weekday = current.weekday()
        if weekday == 5:   multiplier = 1.4   # Saturday
        elif weekday == 6: multiplier = 1.3   # Sunday
        elif weekday == 0: multiplier = 0.8   # Monday slow
        else:              multiplier = 1.0

        # Monthly pattern (end of month spike)
        if current.day >= 28: multiplier *= 1.2

        # Festival random spikes (5% chance of big day)
        if np.random.random() < 0.05: multiplier *= 2.5

        # Calculate quantity with noise
        qty = max(0, int(np.random.poisson(base_demand * multiplier)))

        if qty > 0:
            dates.append(str(current))
            quantities.append(qty)

        current += timedelta(days=1)

    return pd.DataFrame({
        'product_id':   product_id,
        'product_name': product_name,
        'sale_date':    dates,
        'qty_sold':     quantities,
    })

def get_base_demand(product_name, price=100):
    """Estimate base daily demand from product type and price"""
    name_lower = product_name.lower()

    # High demand items
    if any(x in name_lower for x in ['salt', 'sugar', 'rice', 'oil', 'flour', 'atta']):
        base = 15
    # Medium demand
    elif any(x in name_lower for x in ['tea', 'coffee', 'biscuit', 'soap', 'shampoo']):
        base = 10
    # Low demand (electronics, expensive items)
    elif price > 1000:
        base = 2
    elif price > 500:
        base = 4
    else:
        base = 8

    return base