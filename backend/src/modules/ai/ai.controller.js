const AI_SERVICE = 'http://localhost:5001';

const proxy = async (res, url, method = 'GET') => {
  try {
    const response = await fetch(`${AI_SERVICE}${url}`, { method });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
};

export const getHealth          = (req, res) => proxy(res, '/health');
export const trainModels        = (req, res) => proxy(res, '/train', 'POST');
export const getRecommendations = (req, res) => proxy(res, '/recommendations');
export const getPredictAll      = (req, res) => proxy(res, '/predict-all');
export const getPrediction      = (req, res) => proxy(res, `/predict/${req.params.productId}`);