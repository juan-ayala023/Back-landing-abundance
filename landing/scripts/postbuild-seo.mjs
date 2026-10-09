/* =========================================================
   ABUNDANCE CODE — SEO post-build
   Se ejecuta después de `vite build` (ver package.json → "build").

   Vite genera un único dist/index.html vacío: Google ve el mismo título
   y la misma descripción en todas las URLs, y el resto del <head> lo
   pinta React después. Este script deja, para cada ruta pública de
   src/seo/routes.js, un dist/<ruta>/index.html con su título,
   descripción, canonical, Open Graph y JSON-LD ya escritos, y genera
   dist/sitemap.xml. El .htaccess sirve dist/<ruta>/index.html cuando
   existe y cae en la SPA para lo demás.

   Todo sale de archivos del repo: se regenera igual en cada build y no
   se pierde con un despliegue.
   ========================================================= */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);
const { ROUTES, SITE_URL, SITE_NAME, OG_IMAGE, DEFAULT_LANG, fillPrices, fullTitle } = await load('src/seo/routes.js');
const { PRICE_INITIAL, PRICE_MONTHLY, INCLUDED_DAYS, CURRENCY, money } = await load('src/prices.js');
const { es } = await load('src/i18n/es.js');

const PRICES = { price: money(PRICE_INITIAL), monthly: money(PRICE_MONTHLY), days: INCLUDED_DAYS, currency: CURRENCY };

const indexPath = join(DIST, 'index.html');
if (!existsSync(indexPath)) {
  console.error('postbuild-seo: no existe dist/index.html — ejecuta `vite build` antes.');
  process.exit(1);
}
const template = readFileSync(indexPath, 'utf8');

/* ---------- utilidades ---------- */

const escAttr = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* JSON-LD va dentro de <script>: la única secuencia peligrosa es "</". */
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/<\//g, '<\\/')}</script>`;

/* Quita del <head> las etiquetas que vamos a escribir nosotros. */
function stripHead(html) {
  return html
    .replace(/<title>[^<]*<\/title>\s*/g, '')
    .replace(/<meta name="description"[^>]*>\s*/g, '')
    .replace(/<meta property="og:(?:url|title|description)"[^>]*>\s*/g, '')
    .replace(/<meta name="twitter:(?:title|description)"[^>]*>\s*/g, '')
    .replace(/<link rel="canonical"[^>]*>\s*/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
}

/* ---------- JSON-LD ---------- */

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL + '/',
  logo: `${SITE_URL}/img/symbol-transparent.png`,
};

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL + '/',
  inLanguage: DEFAULT_LANG,
};

const offer = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  url: `${SITE_URL}/app`,
  inLanguage: DEFAULT_LANG,
  offers: {
    '@type': 'Offer',
    url: `${SITE_URL}/pricing`,
    price: money(PRICE_INITIAL),
    priceCurrency: CURRENCY,
    description: fillPrices(
      'Incluye {days} días de acceso completo. Después, renovación automática de ${monthly} {currency}/mes. Cancela cuando quieras.',
      PRICES,
    ),
  },
};

/* FAQPage a partir de las mismas claves que pinta /faq. Con la prueba
   gratis desactivada, la variante `.paid` es la que se muestra. */
function faqPage() {
  const pick = (k) => es[`${k}.paid`] ?? es[k];
  const entries = Object.keys(es)
    .filter((k) => /^faq\.cat\d+\.\d+q$/.test(k))
    .map((qk) => ({ q: pick(qk), a: pick(qk.replace(/q$/, 'a')) }))
    .filter((e) => e.q && e.a);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: DEFAULT_LANG,
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.q,
      acceptedAnswer: { '@type': 'Answer', text: e.a },
    })),
  };
}

const JSONLD = {
  home:  () => [organization, website],
  offer: () => [offer],
  faq:   () => [faqPage()],
};

/* ---------- una página por ruta ---------- */

function buildPage(route) {
  const copy = route[DEFAULT_LANG];
  const title = fullTitle(fillPrices(copy.title, PRICES));
  const description = fillPrices(copy.description, PRICES);
  const canonical = SITE_URL + route.path;
  const blocks = (route.path === '/' ? JSONLD.home() : []).concat(route.jsonld ? JSONLD[route.jsonld]() : []);

  const head = [
    `<title>${escAttr(title)}</title>`,
    `<meta name="description" content="${escAttr(description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(description)}" />`,
    `<meta name="twitter:title" content="${escAttr(title)}" />`,
    `<meta name="twitter:description" content="${escAttr(description)}" />`,
    ...blocks.map(jsonLd),
  ].map((l) => '    ' + l).join('\n');

  return stripHead(template)
    .replace(/<html lang="[^"]*">/, `<html lang="${DEFAULT_LANG}">`)
    .replace('</head>', `${head}\n  </head>`);
}

let written = 0;
for (const route of ROUTES) {
  const out = route.path === '/' ? indexPath : join(DIST, route.path.slice(1), 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildPage(route));
  written++;
}

/* ---------- sitemap ---------- */

/* Sin <lastmod>: la fecha del build en todas las URLs es peor que ninguna,
   porque Google la descarta cuando ve que nunca varía entre páginas. */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((r) => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

/* robots.txt y llms.txt vienen de public/ — sólo se comprueba que Vite los copió. */
for (const f of ['robots.txt', 'llms.txt', '.htaccess']) {
  if (!existsSync(join(DIST, f))) console.warn(`postbuild-seo: aviso — falta dist/${f}`);
}

console.log(`postbuild-seo: ${written} páginas con <head> propio, sitemap.xml con ${ROUTES.length} URLs.`);
