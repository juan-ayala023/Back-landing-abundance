import {
  listOrders,
  findOrderById,
  updateOrder,
  getOrderStats,
} from '../data/orders.js';
import { listProfiles } from '../data/profiles.js';
import { findByEmail as findSubscriptionByEmail, findByEmails as findSubscriptionsByEmails } from '../data/subscriptions.js';
import { getFunnel } from '../data/checkoutAttempts.js';
import {
  listSubscriptions,
  getSubscriptionStats as readSubscriptionStats,
} from '../data/subscriptions.js';
import { mapOrder, mapProfile, mapSubscription } from '../lib/responseMappers.js';
import {
  fetchPortalUsers,
  deletePortalUser,
  regenerarLectura,
  corregirNacimiento,
  buscarCiudades,
  AppUnavailableError,
} from '../services/appService.js';

// GET /api/admin/orders
export const getOrders = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await listOrders({
      status,
      search,
      page:  Number(page),
      limit: Number(limit),
    });
    res.json({
      ...result,
      orders: (result.orders || []).map(mapOrder),
    });
  } catch (err) { next(err); }
};

// GET /api/admin/orders/:id
export const getOrderById = async (req, res, next) => {
  try {
    const order = await findOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(mapOrder(order));
  } catch (err) { next(err); }
};

// PATCH /api/admin/orders/:id
// Body: { status, trackingNumber, notes }
export const updateOrderCtrl = async (req, res, next) => {
  try {
    const { status, trackingNumber, notes } = req.body;
    const patch = {};

    if (status) {
      patch.status = status;
      if (status === 'shipped') {
        patch.shipped_at = new Date().toISOString();
        if (trackingNumber) patch.tracking_number = trackingNumber;
      }
      if (status === 'delivered') patch.delivered_at = new Date().toISOString();
    }
    if (trackingNumber !== undefined) patch.tracking_number = trackingNumber;
    if (notes          !== undefined) patch.notes           = notes;

    const order = await updateOrder(req.params.id, patch);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(mapOrder(order));
  } catch (err) { next(err); }
};

// GET /api/admin/stats
export const getStats = async (req, res, next) => {
  try {
    const stats = await getOrderStats();
    const { total: totalUsers } = await listProfiles({ page: 1, limit: 1 });
    res.json({ ...stats, totalUsers });
  } catch (err) { next(err); }
};

/* =============================================================================
 *  Suscripciones del portal — los pagos de Abundance Code
 *  ─────────────────────────────────────────────────────────────────────────
 *  Distinto de /orders, que son pedidos de tienda con envío y seguimiento.
 *  Esto es quién paga los 49 $ y los 14,99 $/mes, en qué estado está y —lo más
 *  importante— si llegó a canjear su acceso o pagó y se quedó fuera.
 * ============================================================================*/

// GET /api/admin/subscriptions
export const getSubscriptions = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await listSubscriptions({
      status,
      search,
      page:  Number(page)  || 1,
      limit: Number(limit) || 20,
    });
    res.json({
      ...result,
      subscriptions: (result.subscriptions || []).map(mapSubscription),
    });
  } catch (err) { next(err); }
};

// GET /api/admin/subscriptions/stats
export const getSubscriptionStats = async (req, res, next) => {
  try {
    res.json(await readSubscriptionStats());
  } catch (err) { next(err); }
};

/* =============================================================================
 *  Usuarios de la app — quién se ha registrado y quién tiene acceso
 *  ─────────────────────────────────────────────────────────────────────────
 *  No sale de esta base de datos, y no puede salir: la app corre sobre otro
 *  proyecto de Supabase. `listProfiles` de aquí solo conoce a los tres
 *  administradores, y por eso el panel mostraba «Portal Users: 0» teniendo
 *  usuarios reales.
 *
 *  Lo pregunta a la app, que además es la única que sabe quién entra por
 *  cortesía: esa lista vive en una variable de entorno suya, no en ninguna
 *  tabla que se pueda consultar desde aquí.
 * ============================================================================*/

// GET /api/admin/portal-users
export const getPortalUsers = async (req, res, next) => {
  try {
    const datos = await fetchPortalUsers();

    /* La app sabe cuándo se creó cada cuenta; este backend sabe cuándo compró.
     * Son fechas distintas —Andrea creó su cuenta el 31 de agosto y compró el
     * 15 de septiembre— y verlas juntas evita leer «registro» como «compra». */
    const compras = await findSubscriptionsByEmails((datos.usuarios || []).map((u) => u.email));
    const porEmail = new Map(compras.map((c) => [c.email.toLowerCase(), c]));
    datos.usuarios = (datos.usuarios || []).map((u) => {
      const c = porEmail.get(String(u.email || '').toLowerCase());
      return {
        ...u,
        compradoEn: c?.source === 'stripe' ? c.created_at : null,
        /* El idioma en el que compró. Nulo en las compras anteriores a que se
         * guardara: en el panel se lee «—», que es la verdad. */
        idioma: c?.locale || null,
      };
    });

    res.json(datos);
  } catch (err) {
    /* La app caída o mal configurada no es un error de este servidor: se
     * responde 503 con el motivo, para que el panel lo muestre en pantalla en
     * vez de dejar la tabla vacía como si no hubiera usuarios — que es
     * exactamente el malentendido que este endpoint viene a arreglar. */
    if (err instanceof AppUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
};

// DELETE /api/admin/portal-users/:id?email=…
// Borra la cuenta en la app. Aquí se comprueba lo único que la app no sabe:
// si ese correo tiene una suscripción de Stripe activa. Borrar la cuenta no la
// cancelaría —Stripe seguiría cobrando— así que se exige cancelar primero.
export const deletePortalUserCtrl = async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (email) {
      const sub = await findSubscriptionByEmail(email);
      if (sub && sub.source === 'stripe' && ['active', 'past_due'].includes(sub.status)) {
        return res.status(409).json({
          message: 'Tiene una suscripción activa en Stripe. Cancélala allí primero; si la borras aquí, seguiría cobrando.',
        });
      }
    }

    res.json(await deletePortalUser(req.params.id));
  } catch (err) {
    if (err instanceof AppUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
};

// POST /api/admin/portal-users/regenerar-lectura   { email }
// Archiva la lectura de esa persona en la app para que se reescriba en su
// próxima visita. Solo pasa la llamada: quien sabe qué archivar es la app.
export const regenerarLecturaCtrl = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Falta el correo' });

    res.json(await regenerarLectura(email));
  } catch (err) {
    if (err instanceof AppUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
};

// POST /api/admin/portal-users/corregir-nacimiento
// { email, birthDate, birthTime, timeUnknown }
//
// La otra mitad de «Solicitar una corrección»: hasta ahora la solicitud llegaba
// al buzón y no había con qué atenderla. No es un retoque — cambiar la fecha
// invalida la carta y todo lo escrito desde ella, así que la app lo archiva
// antes de tocar nada. Aquí solo se valida lo mínimo y se pasa la llamada.
export const corregirNacimientoCtrl = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const birthDate = String(req.body?.birthDate || '').trim();
    const timeUnknown = req.body?.timeUnknown === true;
    const birthTime = timeUnknown ? null : String(req.body?.birthTime || '').trim() || null;

    if (!email) return res.status(400).json({ message: 'Falta el correo' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ message: 'La fecha tiene que ser AAAA-MM-DD' });
    }

    /* El lugar es opcional: si no viene, la app conserva el que había. */
    const place = req.body?.place ?? null;

    res.json(await corregirNacimiento({ email, birthDate, birthTime, timeUnknown, place }));
  } catch (err) {
    if (err instanceof AppUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
};

// GET /api/admin/portal-users/ciudades?q=…
// El buscador que necesita el formulario de corrección: una ciudad son unas
// coordenadas y una zona horaria, no un texto.
export const buscarCiudadesCtrl = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ places: [] });
    res.json(await buscarCiudades(q));
  } catch (err) {
    if (err instanceof AppUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
};

// GET /api/admin/users
export const getUsers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const result = await listProfiles({
      search,
      page:  Number(page),
      limit: Number(limit),
    });
    res.json({
      ...result,
      users: (result.users || []).map(mapProfile),
    });
  } catch (err) { next(err); }
};

/* =============================================================================
 *  Embudo de compra — quién lo intentó y no llegó
 *  ─────────────────────────────────────────────────────────────────────────
 *  Las suscripciones cuentan a quien pagó. Esto cuenta a quien abrió la
 *  pantalla de pago y se fue, que hasta ahora no aparecía en ningún sitio: su
 *  fila solo nacía al completarse la compra. Son los más recuperables que hay,
 *  porque ya dieron su correo.
 * ============================================================================*/

// GET /api/admin/funnel?dias=30
export const getCheckoutFunnel = async (req, res, next) => {
  try {
    const dias = Math.min(Math.max(Number(req.query.dias) || 30, 1), 365);
    res.json(await getFunnel({ dias }));
  } catch (err) { next(err); }
};
