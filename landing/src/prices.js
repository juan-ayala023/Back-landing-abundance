/* =========================================================
   ABUNDANCE CODE — Importes que se muestran en la web
   Pago inicial de $49 que incluye los primeros 30 días.
   A partir del día 31, $14.99/mes para mantener el acceso.

   En Stripe se traduce en una única suscripción de $14.99/mes con
   30 días de trial y un cargo único de $49 cobrado al momento.
   Los importes de verdad viven en el backend (.env); estos son los
   que se muestran en la web y deben coincidir.

   Este archivo no usa import.meta a propósito: lo importan tanto la web
   (vía config.js) como scripts/postbuild-seo.mjs desde Node.
   ========================================================= */
export const CURRENCY = 'USD';

/* Lo que se paga hoy. */
export const PRICE_INITIAL = 49;

/* Días de acceso que cubre ese pago inicial. */
export const INCLUDED_DAYS = 30;

/* Lo que se cobra a partir del día 31, cada mes. */
export const PRICE_MONTHLY = 14.99;

/* Formatea un importe respetando los decimales sólo cuando los tiene:
   49 → "49" · 14.99 → "14.99" */
export function money(amount) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}
