import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { getNotifications } from './notifications.controller.js';

const router = Router();

router.get('/', protect, getNotifications);

export default router;
