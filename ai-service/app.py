from flask import Flask, jsonify, request
from flask_cors import CORS
from predictor import train_all, train_product, predict_product, get_recommendations
from database import fetch_all_products
import os
import threading
import schedule
import time

app = Flask(__name__)
CORS(app)

# ── Health check ─────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({
        'success': True,
        'message': 'AI Service is running',
        'models':  len(os.listdir('models')) if os.path.exists('models') else 0,
    })

# ── Train all products ────────────────────────────────────
@app.route('/train', methods=['POST'])
def train():
    try:
        result = train_all()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── Train single product ──────────────────────────────────
@app.route('/train/<product_id>', methods=['POST'])
def train_one(product_id):
    try:
        products = fetch_all_products()
        product  = next((p for p in products if p['product_id'] == product_id), None)
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        result = train_product(product)
        return jsonify({'success': result, 'message': 'Trained successfully' if result else 'Training failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── Predict single product ────────────────────────────────
@app.route('/predict/<product_id>')
def predict(product_id):
    try:
        result = predict_product(product_id)
        if not result:
            return jsonify({'success': False, 'message': 'Model not found. Please train first.'}), 404
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── Get all recommendations ───────────────────────────────
@app.route('/recommendations')
def recommendations():
    try:
        recs = get_recommendations()
        return jsonify({'success': True, 'data': recs})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── Get predictions for all products ─────────────────────
@app.route('/predict-all')
def predict_all():
    try:
        products = fetch_all_products()
        results  = []
        for p in products:
            pred = predict_product(p['product_id'])
            if pred:
                results.append(pred)
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    
@app.route('/debug/<product_id>')
def debug_product(product_id):
    from database import fetch_sales_data
    rows = fetch_sales_data(product_id)
    return jsonify({
        'real_rows':    len(rows),
        'data':         rows,
    })

def scheduled_train():
    print("\n🔄 Auto-retraining models (weekly schedule)...")
    try:
        result = train_all()
        print(f"✅ Auto-retrain complete: {result['trained']}/{result['total']} products")
    except Exception as e:
        print(f"❌ Auto-retrain failed: {e}")

def run_scheduler():
    schedule.every().sunday.at("02:00").do(scheduled_train)
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == '__main__':
    print("\n🤖 ─────────────────────────────────────")
    print("   StockSense AI Service starting...")
    print("   Port : http://localhost:5001")
    print("   Train: POST http://localhost:5001/train")
    print("   Auto : Every Sunday at 2:00 AM")
    print("─────────────────────────────────────────\n")

    # Train on startup if no models exist
    if not os.listdir('models'):
        print("📦 No models found — running initial training...")
        train_all()

    # Start scheduler in background thread
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

    app.run(host='0.0.0.0', port=5001, debug=False)
