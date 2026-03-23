import express from 'express';
import { getRecommendations, getPrediction, getPredictAll, trainModels, getHealth } from './ai.controller.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

router.get('/health',                   getHealth);
router.post('/train',          protect, trainModels);
router.get('/recommendations', protect, getRecommendations);
router.get('/predict-all',     protect, getPredictAll);
router.get('/predict/:productId', protect, getPrediction);

export default router;