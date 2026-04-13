const AI_SERVICE = 'http://localhost:5001';

const proxy = async (req, res, url, method = 'GET') => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (req.dbName) {
      headers['X-Database-Name'] = req.dbName;
    }
    const response = await fetch(`${AI_SERVICE}${url}`, { method, headers });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
};

export const getHealth          = (req, res) => proxy(req, res, '/health');
export const trainModels        = (req, res) => proxy(req, res, '/train', 'POST');
export const getRecommendations = (req, res) => proxy(req, res, '/recommendations');
export const getPredictAll      = (req, res) => proxy(req, res, '/predict-all');
export const getPrediction      = (req, res) => proxy(req, res, `/predict/${req.params.productId}`);