import crypto from 'crypto';
import { generateActivationCode } from './activationService.js';

/* =============================================================================
 *  Acceso a la app
 *
 *  El usuario paga en la web. Para que pueda entrar a la app hace falta unir
 *  dos cosas que viven en sistemas distintos: el pago (aquí) y la cuenta (allá).
 *
 *  Esa unión se hace con un token de un solo uso que YA lleva dentro el email
 *  que pagó. Así el usuario no tiene que acordarse de registrarse con el mismo
 *  correo: es la app la que lo vincula sola al canjear el token.
 * ============================================================================*/

/* Vale 30 días: quien pagó no debería perder el acceso por tardar en activar.
 * Si se le pasa, la página de reenvío le genera uno nuevo. */
const TOKEN_TTL_DAYS = 30;

export function generateAccessToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function tokenExpiry(days = TOKEN_TTL_DAYS) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

/* Token + código corto de respaldo, por si el enlace se rompe en el cliente
 * de correo y el usuario tiene que escribirlo a mano o dárselo a soporte. */
export async function issueAccessCredentials() {
  return {
    access_token:     generateAccessToken(),
    access_code:      await generateActivationCode(),
    token_expires_at: tokenExpiry(),
  };
}

/* URL de entrada a la app. Es también el success_url de Stripe, así que la
 * mayoría activa sin salir del flujo y sin depender del correo.
 *
 * El valor por defecto apuntaba al prototipo de Lovable, que sigue en línea.
 * Con la variable sin definir, quien pagaba aterrizaba en una app que parece
 * la buena pero no puede canjear el token, y nadie veía un error. Un fallback
 * tiene que ser el sitio real o no ser. */
export const APP_PUBLIC_URL_POR_DEFECTO = 'https://app.abundancecode.us';

/* Un valor que apunte al prototipo se trata como si no estuviera. Es la única
 * variable de entorno que se ignora a propósito: ese destino está retirado, la
 * plantilla de despliegue lo traía como valor a copiar, y el coste de
 * respetarlo es un cliente que paga y no recibe nada. server.js lo avisa en
 * el log al arrancar; aquí además se corrige. */
export function appPublicUrl() {
  const configurada = (process.env.APP_PUBLIC_URL || '').trim();
  if (!configurada || /lovable\.app/i.test(configurada)) return APP_PUBLIC_URL_POR_DEFECTO;
  return configurada;
}

export function buildAccessUrl(token, locale = 'es') {
  const base = appPublicUrl().replace(/\/$/, '');
  const path = process.env.APP_ACTIVATE_PATH || '/activar';
  /* `lang` por la misma razón que en la página de gracias: la app guarda el
   * idioma en una cookie de SU dominio, y quien compra en inglés llega sin
   * ninguna. Sin esto, el correo llegaba en inglés y el portal se abría en
   * español (Andrea, 3 oct 2026). */
  return `${base}${path}?token=${encodeURIComponent(token)}&lang=${locale}`;
}

/* A dónde vuelve el comprador desde Stripe: la página de gracias de la web,
 * no la app directamente. Es una parada de segundos —dispara el evento de
 * compra en Google Analytics, que vive en la web y no en la app— y sigue sola
 * hacia la app con el token. El correo de acceso, en cambio, sigue apuntando
 * directo a la app: ahí no hay nada que medir.
 *
 * `{CHECKOUT_SESSION_ID}` va literal, sin codificar: Stripe lo sustituye por el
 * id de la sesión al redirigir. */
export function buildThankYouUrl(token, locale = 'es') {
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  /* `lang` viaja en la URL porque la web guarda el idioma en el navegador y
   * la vuelta de Stripe puede abrirse en otro (el navegador interno de
   * Instagram, o www. en vez del dominio): Andrea pagó en inglés y la página
   * de gracias salió en español. Con esto sigue al idioma de la compra. */
  return `${base}/gracias?session_id={CHECKOUT_SESSION_ID}&token=${encodeURIComponent(token)}&lang=${locale}`;
}

/* Lo que la app necesita saber para dar o quitar acceso. Nada más:
 * ni datos de tarjeta, ni ids internos de Stripe. */
export function toEntitlement(sub) {
  if (!sub) return null;
  return {
    email:              sub.email,
    name:               sub.name || null,
    plan:               sub.plan,
    status:             sub.status,
    source:             sub.source,
    currentPeriodEnd:   sub.current_period_end,
    hasAccess:          sub.status === 'active' || sub.status === 'past_due',
    utmCampaign:        sub.utm_campaign || null,
  };
}

export function isTokenValid(sub) {
  if (!sub || !sub.access_token) return false;
  if (sub.redeemed_at) return false;
  if (sub.token_expires_at && new Date(sub.token_expires_at) < new Date()) return false;
  return true;
}
