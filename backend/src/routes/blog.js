import { Router } from 'express';
import { getPosts, getPostBySlug, getPostShareCard } from '../controllers/blogController.js';

const router = Router();

router.get('/', getPosts);
/* La tarjeta para robots de redes va antes que /:slug para que no la capture. */
router.get('/:slug/share', getPostShareCard);
router.get('/:slug', getPostBySlug);

export default router;
