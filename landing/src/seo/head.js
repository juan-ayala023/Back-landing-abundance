/* Utilidades mínimas para escribir en <head>. Las usan Seo.jsx (rutas fijas)
   y postSeo.js (artículos del blog), para que los dos hablen el mismo idioma
   y ninguno deje etiquetas duplicadas. */

export function setMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

export function removeMeta(selector) {
  document.head.querySelector(selector)?.remove();
}
