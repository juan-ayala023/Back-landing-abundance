/* =========================================================
   ABUNDANCE CODE — Google Analytics

   Un único punto de entrada. Si VITE_GA_ID no está definida,
   nada de esto hace nada: la web funciona igual sin medición,
   y el día que haya un ID basta con ponerlo en .env.production
   y recompilar.

   La medición vive aquí, en la web, y no en la app: por eso el
   comprador vuelve de Stripe a /gracias antes de entrar a su
   portal. Esa parada de unos segundos es lo que permite contar
   la compra.
   ========================================================= */

const GA_ID    = import.meta.env.VITE_GA_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

/* Carga Google Analytics y el píxel de Meta una sola vez, al arrancar. Cada
   uno solo si tiene ID; se pueden usar por separado. */
export function initAnalytics() {
  initGoogle();
  initMeta();
}

function initGoogle() {
  if (!GA_ID || window.gtag) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  /* La página se cuenta a mano desde React Router, no aquí: con una SPA el
     `config` automático solo vería la primera carga. */
  window.gtag('config', GA_ID, { send_page_view: false });
}

/* Píxel de Meta (Facebook/Instagram Ads). Es la fuente con la que se miden
   las conversiones de los anuncios: sin el evento `Purchase` en /gracias,
   Meta no sabe qué anuncio trajo a quien compró. */
function initMeta() {
  if (!PIXEL_ID || window.fbq) return;

  const fbq = function () {
    fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  window.fbq('init', PIXEL_ID);
}

export function trackPageView(path) {
  if (window.gtag) window.gtag('event', 'page_view', { page_path: path });
  if (window.fbq)  window.fbq('track', 'PageView');
}

/* Evento estándar de compra de GA4, para que el embudo de checkout se vea en
   los informes de monetización sin configurar nada a mano.

   Se dispara una sola vez por sesión de pago: recargar /gracias no puede
   contar dos compras. El id de la sesión de Stripe es la llave. */
export function trackPurchase({ transactionId, value, currency, itemName }) {
  if (!transactionId || (!window.gtag && !window.fbq)) return;

  const llave = `ac_purchase_${transactionId}`;
  try {
    if (sessionStorage.getItem(llave)) return;
    sessionStorage.setItem(llave, '1');
  } catch { /* sin storage se cuenta igual; el riesgo es contar dos veces, no cero */ }

  const moneda = (currency || 'usd').toUpperCase();

  if (window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value,
      currency: moneda,
      items: [{ item_id: 'abundance-code-access', item_name: itemName, price: value, quantity: 1 }],
    });
  }

  if (window.fbq) {
    /* `eventID` deduplica con la API de conversiones de Meta si algún día se
       manda también desde el servidor: mismo id de sesión, un solo evento. */
    window.fbq('track', 'Purchase', { value, currency: moneda, content_name: itemName },
               { eventID: transactionId });
  }
}
