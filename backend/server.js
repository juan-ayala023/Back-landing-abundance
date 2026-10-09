// Side-effect import MUST be first so process.env is populated before
// any other module (lib/supabase.js) reads from it at evaluation time.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import orderRoutes      from './src/routes/orders.js';
import userRoutes       from './src/routes/users.js';
import stripeRoutes     from './src/routes/stripe.js';
import accessRoutes     from './src/routes/access.js';
import notifyRoutes     from './src/routes/notify.js';
import activationRoutes from './src/routes/activation.js';
import adminRoutes      from './src/routes/admin.js';
import blogRoutes       from './src/routes/blog.js';
import wcWebhookRoutes  from './src/routes/wcWebhook.js';
import contactRoutes    from './src/routes/contact.js';
import { getBlogSitemap } from './src/controllers/sitemapController.js';

const app = express();

/* Comprobación al arrancar de la variable que decide a dónde llega quien paga.
 * Es la única de todas las de entorno cuyo fallo no produce ningún error: el
 * cobro se hace, el webhook guarda la suscripción, el correo sale… y la persona
 * aterriza en el sitio equivocado. Por eso se avisa aquí, donde se lee el log
 * al desplegar, y no se espera a que alguien se queje. */
{
  const destino = process.env.APP_PUBLIC_URL || '';
  if (!destino) {
    console.warn('[config] APP_PUBLIC_URL no definida: se usará https://app.abundancecode.us. Defínela en Railway.');
  } else if (/lovable\.app/i.test(destino)) {
    console.error(`[config] APP_PUBLIC_URL apunta al prototipo de Lovable (${destino}). Se ignora y se usa https://app.abundancecode.us. Corrige la variable en Railway para que este aviso desaparezca.`);
  }
}
const PORT = process.env.PORT || 5000;

// Raw body needed for webhook signature verification — must come before express.json()
app.use('/api/stripe/webhook',       express.raw({ type: 'application/json' }));
app.use('/api/webhooks/woocommerce', express.raw({ type: '*/*' }));

/* -----------------------------------------------------------------------------
 * CORS
 *
 * FRONTEND_URL es un único valor, pero en desarrollo la web se abre desde varios
 * sitios a la vez (localhost:5173, el puerto que Vite elija si ese está ocupado,
 * y el túnel de VS Code). Con un solo origen permitido, todos los demás reciben
 * un preflight rechazado y el checkout falla con "Connection problem".
 *
 * En producción la lista sigue siendo cerrada: sólo FRONTEND_URL y lo que se
 * declare explícitamente en CORS_EXTRA_ORIGINS.
 *
 * Cada origen entra con su variante www y sin ella. Un dominio y su www son la
 * misma web, y aceptar sólo uno era una trampa: www.abundancecode.us sirve la
 * página entera sin redirigir, así que quien llegaba con www veía todo bien
 * hasta pulsar «Ir al pago», donde recibía «Problema de conexión». Nadie lo
 * detectaba porque quien prueba entra sin www. Dejarlo en manos de una variable
 * de entorno ya falló una vez; mejor que no dependa de que alguien se acuerde.
 * ---------------------------------------------------------------------------*/
const isProd = process.env.NODE_ENV === 'production';

function conYSinWww(origen) {
  try {
    const url  = new URL(origen);
    const host = url.hostname.replace(/^www\./, '');
    return [`${url.protocol}//${host}`, `${url.protocol}//www.${host}`];
  } catch {
    return [origen];
  }
}

const allowedOrigins = [...new Set(
  [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    ...(process.env.CORS_EXTRA_ORIGINS || '').split(','),
  ]
    .map((o) => (o || '').trim().replace(/\/$/, ''))
    .filter(Boolean)
    .flatMap(conYSinWww),
)];

/* Sólo fuera de producción: cualquier puerto local y los túneles de VS Code. */
const devOriginPatterns = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.devtunnels\.ms$/i,
];

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    // Sin cabecera Origin: curl, health checks, webhooks de Stripe, servidor a
    // servidor. No es una petición de navegador, CORS no aplica.
    if (!origin) return callback(null, true);

    const clean = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(clean)) return callback(null, true);
    if (!isProd && devOriginPatterns.some((re) => re.test(clean))) return callback(null, true);

    console.warn(`[cors] Origen bloqueado: ${origin}`);
    /* 403 y no 500: el manejador global usa err.statusCode. Sin esto un origen
     * ajeno se registraba como error interno del servidor y en los logs parecía
     * que el backend se caía cuando sólo estaba haciendo su trabajo. */
    const err = new Error(`Origen no permitido por CORS: ${origin}`);
    err.statusCode = 403;
    return callback(err);
  },
}));

app.use(express.json());

// Routes
app.use('/api/orders',               orderRoutes);
app.use('/api/users',                userRoutes);
app.use('/api/stripe',               stripeRoutes);
app.use('/api/access',               accessRoutes);
app.use('/api/activation',           activationRoutes);
app.use('/api/admin',                adminRoutes);
app.use('/api/blog',                 blogRoutes);
app.use('/api/contact',              contactRoutes);
app.use('/api/notify',               notifyRoutes);
app.use('/api/webhooks/woocommerce', wcWebhookRoutes);

/* El sitemap de los artículos, fuera de /api porque lo pide Google, no la web.
 * Se sirve en vivo: un artículo nuevo entra sin volver a desplegar la landing. */
app.get('/sitemap-blog.xml', getBlogSitemap);

/*
 * Salud, y qué versión está sirviendo.
 *
 * El `commit` responde a una pregunta que se hacía cada vez que se subía algo
 * —«¿ya está desplegado?»— y que no se podía contestar sin entrar a Railway:
 * desde fuera, un backend con el código viejo y uno con el nuevo responden
 * igual. Railway inyecta el SHA del commit que construyó; comparándolo con el
 * de git se sabe si el despliegue terminó.
 *
 * No es información sensible: es el identificador de un commit, y los dos
 * repos son del dueño. No dice ni qué hay dentro ni dónde está.
 */
app.get('/api/health', (_req, res) =>
  res.json({
    status: 'ok',
    backend: 'supabase',
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA || '').slice(0, 7) || null,
  }),
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack || err);
  res.status(err.statusCode || 500).json({ message: err.message || 'Internal server error' });
});

// No DB connection step — Supabase is reached per-request via @supabase/supabase-js.
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
