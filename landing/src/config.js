/* =========================================================
   ABUNDANCE CODE — Configuración del funnel
   Único sitio donde viven la URL de la app y los precios.
   Cambiar aquí y se propaga a toda la web.
   ========================================================= */

/* URL base de la web app.
   Sobrescribible en build con VITE_APP_URL — cambiar aquí cuando la app
   se mueva del dominio de Lovable a un subdominio propio. */
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.abundancecode.us';

/* Ruta de entrada a la app. Hoy la app entra por /activar (código + magic
   link + Google). Si más adelante se abre un registro libre, basta cambiar
   esta constante. */
export const SIGNUP_PATH = import.meta.env.VITE_APP_SIGNUP_PATH || '/activar';

/* =========================================================
   MODELO DE PRECIO
   Los importes viven en src/prices.js (sin import.meta, para que el script
   de SEO post-build pueda leerlos desde Node). Aquí se re-exportan para que
   el resto de la web siga importando todo desde config.js.
   ========================================================= */
export { CURRENCY, PRICE_INITIAL, INCLUDED_DAYS, PRICE_MONTHLY, money } from './prices.js';

/* ¿La web ofrece días GRATIS?
   No: los 30 días primeros están pagados con los $49. Esta constante
   existe para poder activar una prueba gratuita de verdad más adelante
   sin reescribir copy — el texto ya está traducido (ver LanguageContext). */
export const TRIAL_ENABLED = false;
export const TRIAL_DAYS = 7;

/* Buzón de soporte. Único sitio donde se escribe: contacto, legales, /gracias
   y los mensajes de error lo leen de aquí. */
export const SUPPORT_EMAIL = 'contact@abundancecode.us';

/* Construye una URL de la app con UTM para poder medir el funnel.
   appUrl(SIGNUP_PATH, 'hero', 'en') → https://…/activar?utm_source=website&utm_medium=cta&utm_campaign=hero&lang=en

   El `lang` no es decorativo. La app guarda el idioma en una cookie de SU
   dominio, que es otro: quien lee la web en inglés y pulsa «entrar» llega sin
   ninguna cookie y veía el portal en español. Pasó con la compra y se arregló
   en el correo y en /gracias; este era el mismo agujero por la puerta de al
   lado, la de quien ya tiene cuenta y solo viene a entrar. */
export function appUrl(path = SIGNUP_PATH, source = 'web', lang) {
  const url = new URL(path, APP_URL);
  url.searchParams.set('utm_source', 'website');
  url.searchParams.set('utm_medium', 'cta');
  url.searchParams.set('utm_campaign', source);
  if (lang) url.searchParams.set('lang', lang);
  return url.toString();
}
