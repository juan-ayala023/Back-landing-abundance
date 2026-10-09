/* =========================================================
   ABUNDANCE CODE — SEO por ruta
   Única fuente de títulos, descripciones y JSON-LD de cada URL.

   La consumen dos sitios:
   · src/seo/Seo.jsx           → actualiza <head> al navegar en la SPA.
   · scripts/postbuild-seo.mjs → tras `vite build` genera dist/<ruta>/index.html
                                  con estas etiquetas ya escritas, y el sitemap.
   Por eso este archivo no usa JSX ni import.meta: tiene que cargar en Node.

   Los importes se rellenan con {price}, {monthly}, {days}, {currency};
   nunca van escritos a mano (ver src/prices.js).
   ========================================================= */

export const SITE_URL = 'https://abundancecode.us';
export const SITE_NAME = 'Abundance Code';
export const OG_IMAGE = `${SITE_URL}/img/og-image.jpg`;

/* Idioma principal del sitio y de las páginas estáticas. El toggle ES/EN es
   un estado del cliente, no una URL distinta, así que no hay hreflang. */
export const DEFAULT_LANG = 'es';

/* Rutas que no deben indexarse: privadas, transaccionales o del prototipo
   viejo. Reciben <meta name="robots" content="noindex"> y van en robots.txt. */
export const NOINDEX_PATHS = ['/activar-acceso', '/gracias', '/admin', '/activate', '/dashboard'];

/* Rutas públicas. `priority` y `changefreq` van al sitemap.
   `es`/`en`: title y description. El title no lleva el nombre del sitio:
   se añade al final automáticamente, así que debe quedar en ≤ 43 caracteres
   para que el total no pase de 60 y Google no lo recorte. */
export const ROUTES = [
  {
    path: '/',
    priority: 1.0, changefreq: 'weekly',
    es: {
      title: 'Carta Natal y Carta Astral Personalizada Online',
      description: 'Tu carta astral calculada con tu fecha, hora y lugar de nacimiento, e interpretada en lenguaje claro: tu patrón central, tus áreas clave y un horóscopo personalizado cada día. Desde ${price} {currency}.',
    },
    en: {
      title: 'Personalised Natal Chart and Astrology Online',
      description: 'Your natal chart calculated and explained, the pattern that repeats in your money, relationships and decisions, and daily guidance in your private portal. From ${price} {currency}.',
    },
  },
  {
    path: '/how-it-works',
    priority: 0.8, changefreq: 'monthly',
    es: {
      title: 'Cómo Calcular tu Carta Natal, Paso a Paso',
      description: 'Cinco pasos para calcular tu carta natal: escribes tu fecha, hora y lugar de nacimiento, se calculan tus posiciones y tu ascendente, y recibes la interpretación de tu carta astral y tu horóscopo de cada día.',
    },
    en: {
      title: 'How to Calculate Your Natal Chart, Step by Step',
      description: 'Five steps: you pay, sign in with Google, enter your date, time and place of birth, receive your personal reading and get daily guidance based on your natal chart.',
    },
  },
  {
    path: '/app',
    priority: 0.8, changefreq: 'monthly',
    es: {
      title: 'Horóscopo Diario y Mensual Personalizado',
      description: 'Tu horóscopo personalizado cada día y cada mes, calculado con los tránsitos reales sobre tu carta natal —no por signo solar—, además de tu lectura completa y tus consultas a la guía.',
    },
    en: {
      title: 'Personalised Daily and Monthly Horoscope',
      description: 'What you find inside your private portal: your full natal chart, your core pattern, cycles and transits updated every day and personalized guidance.',
    },
  },
  {
    path: '/pricing',
    priority: 0.9, changefreq: 'monthly',
    es: {
      title: 'Precio de tu Carta Astral Personalizada: ${price} {currency}',
      description: 'Un pago de ${price} {currency} con {days} días de acceso completo. Después, ${monthly} {currency} al mes con renovación automática. Cancela cuando quieras desde tu cuenta.',
    },
    en: {
      title: 'Pricing: ${price} {currency} with {days} Days Included',
      description: 'One payment of ${price} {currency} with {days} days of full access. Then ${monthly} {currency} a month, renewed automatically. Cancel anytime from your account.',
    },
    jsonld: 'offer',
  },
  {
    path: '/about',
    priority: 0.5, changefreq: 'yearly',
    es: {
      title: 'Sobre Abundance Code, Astrología Personalizada',
      description: 'Abundance Code nace para llegar al patrón que se repite en tu vida y convertir tu carta natal en una interpretación personalizada que se actualiza cada día.',
    },
    en: {
      title: 'About Us',
      description: 'Abundance Code was born to reach the pattern that repeats in your life and turn your natal chart into a personalized interpretation that updates every day.',
    },
  },
  {
    path: '/faq',
    priority: 0.7, changefreq: 'monthly',
    es: {
      title: 'Preguntas sobre tu Carta Natal y tu Suscripción',
      description: 'Respuestas sobre la carta natal, los datos de nacimiento, el acceso al portal, el pago de ${price} {currency}, la renovación mensual y cómo cancelar.',
    },
    en: {
      title: 'Frequently Asked Questions',
      description: 'Answers about the natal chart, birth data, portal access, the ${price} {currency} payment, monthly renewal and how to cancel.',
    },
    jsonld: 'faq',
  },
  {
    path: '/contact',
    priority: 0.4, changefreq: 'yearly',
    es: { title: 'Contacto', description: 'Escríbenos si tienes dudas sobre tu carta natal, tu acceso al portal o tu suscripción a Abundance Code.' },
    en: { title: 'Contact', description: 'Write to us with questions about your natal chart, your portal access or your Abundance Code subscription.' },
  },
  /* Legales: indexables pero con poca prioridad. */
  { path: '/privacy',    priority: 0.2, changefreq: 'yearly', es: { title: 'Política de Privacidad', description: 'Qué datos recoge Abundance Code, para qué se usan y cómo ejercer tus derechos.' }, en: { title: 'Privacy Policy', description: 'What data Abundance Code collects, what it is used for and how to exercise your rights.' } },
  { path: '/terms',      priority: 0.2, changefreq: 'yearly', es: { title: 'Términos y Condiciones', description: 'Condiciones de uso del servicio, suscripción, cancelación y limitación de responsabilidad de Abundance Code.' }, en: { title: 'Terms & Conditions', description: 'Terms of use, subscription, cancellation and limitation of liability for Abundance Code.' } },
  { path: '/refund',     priority: 0.2, changefreq: 'yearly', es: { title: 'Política de Reembolsos y Cancelación', description: 'Cómo cancelar tu suscripción, qué pasa con el periodo ya pagado y cómo reclamar un cobro erróneo.' }, en: { title: 'Refund & Cancellation Policy', description: 'How to cancel your subscription, what happens to the period already paid and how to report a billing error.' } },
  { path: '/cookies',    priority: 0.1, changefreq: 'yearly', es: { title: 'Política de Cookies', description: 'Qué cookies usa la web de Abundance Code, para qué sirven, cuánto duran y cómo puedes gestionarlas o desactivarlas desde tu navegador.' }, en: { title: 'Cookie Policy', description: 'Which cookies the Abundance Code website uses, what they are for, how long they last and how to manage or disable them in your browser.' } },
  { path: '/disclaimer', priority: 0.1, changefreq: 'yearly', es: { title: 'Aviso Legal', description: 'Abundance Code ofrece información astrológica con fines de desarrollo personal. No es asesoramiento financiero, legal ni médico.' }, en: { title: 'Disclaimer', description: 'Abundance Code provides astrological information for personal development. It is not financial, legal or medical advice.' } },
];

/* Rellena {price}, {monthly}, {days} y {currency} en un texto. */
export function fillPrices(text, p) {
  return text
    .replace(/\{price\}/g, p.price)
    .replace(/\{monthly\}/g, p.monthly)
    .replace(/\{days\}/g, p.days)
    .replace(/\{currency\}/g, p.currency);
}

/* Título completo de pestaña/SERP: "<título> | Abundance Code". La home
   ya lleva el nombre al final del título; no se duplica. */
export function fullTitle(title) {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

export function findRoute(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ROUTES.find((r) => r.path === clean) || null;
}
