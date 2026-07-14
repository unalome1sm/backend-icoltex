import { Router } from 'express';
import {
  createOrderHandler,
  getOrderByReferenceHandler,
  wompiWebhookHandler,
} from '../controllers/orders.controller';

const router = Router();

router.post('/orders', createOrderHandler);
router.get('/orders/:reference', getOrderByReferenceHandler);
router.post('/payments/wompi/webhook', wompiWebhookHandler);

export default router;
