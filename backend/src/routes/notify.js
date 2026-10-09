import { Router } from 'express';
import { sendNotice } from '../controllers/noticeController.js';
import { requireAppSecret } from '../middleware/appAuth.js';

const router = Router();

/* Servidor a servidor: sólo la app, con el secreto compartido. */
router.post('/', requireAppSecret, sendNotice);

export default router;
