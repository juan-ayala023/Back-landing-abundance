import express, { Router } from 'express';
import {
  getOrders,
  getOrderById,
  updateOrderCtrl,
  getStats,
  getUsers,
  getSubscriptions,
  getSubscriptionStats,
  getCheckoutFunnel,
  getPortalUsers,
  deletePortalUserCtrl,
  regenerarLecturaCtrl,
  corregirNacimientoCtrl,
  buscarCiudadesCtrl,
} from '../controllers/adminController.js';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import {
  adminGetPosts,
  adminGetPost,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminUploadImage,
  adminTraducirPost,
  adminGuardarTraduccion,
} from '../controllers/blogController.js';
import { protect, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect, requireAdmin);

router.get('/stats', getStats);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.patch('/orders/:id', updateOrderCtrl);
router.get('/users', getUsers);

/* Usuarios de la app: los de verdad. `/users` de arriba lee esta base, que solo
   tiene administradores. Ver el comentario en el controlador. */
router.get('/portal-users', getPortalUsers);
router.delete('/portal-users/:id', deletePortalUserCtrl);
router.post('/portal-users/regenerar-lectura', regenerarLecturaCtrl);
router.post('/portal-users/corregir-nacimiento', corregirNacimientoCtrl);
router.get('/portal-users/ciudades', buscarCiudadesCtrl);

// Subscriptions (portal payments). `/stats` va antes que cualquier `/:id` que
// se añada aquí en el futuro, o Express lo tomaría por un id.
router.get('/subscriptions/stats', getSubscriptionStats);
router.get('/funnel',              getCheckoutFunnel);
router.get('/subscriptions', getSubscriptions);

// Products
router.get('/products', getProducts);
router.post('/products', createProduct);
router.patch('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Blog
// La imagen llega como cuerpo binario, no como JSON: express.json() no la toca.
const cuerpoArchivo = express.raw({ type: ['image/*', 'application/pdf'], limit: '8mb' });
router.post('/blog/imagen',  cuerpoArchivo, adminUploadImage);
router.post('/blog/archivo', cuerpoArchivo, adminUploadImage);   // el editor: imágenes y PDF
router.get('/blog', adminGetPosts);
router.get('/blog/:id', adminGetPost);
router.post('/blog', adminCreatePost);
router.patch('/blog/:id', adminUpdatePost);
router.delete('/blog/:id', adminDeletePost);
router.post('/blog/:id/traducir', adminTraducirPost);
router.patch('/blog/:id/traduccion', adminGuardarTraduccion);

export default router;
