import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import { PRICE_INITIAL, PRICE_MONTHLY, INCLUDED_DAYS, CURRENCY, money } from '../config.js';
import {
  SITE_URL, SITE_NAME, OG_IMAGE, NOINDEX_PATHS,
  findRoute, fillPrices, fullTitle,
} from './routes.js';
import { setMeta, removeMeta } from './head.js';

/* =========================================================
   Mantiene <head> al día cuando el usuario navega dentro de la SPA o
   cambia de idioma. Las páginas estáticas que genera
   scripts/postbuild-seo.mjs ya traen estas etiquetas escritas; este
   componente sólo las sobrescribe con el mismo valor (o el del otro
   idioma), así que Google y el usuario ven lo mismo.
   No renderiza nada.
   ========================================================= */

const PRICES = {
  price: money(PRICE_INITIAL),
  monthly: money(PRICE_MONTHLY),
  days: INCLUDED_DAYS,
  currency: CURRENCY,
};


export default function Seo() {
  const { pathname } = useLocation();
  const { lang } = useLang();

  useEffect(() => {
    const route = findRoute(pathname);
    const noindex = NOINDEX_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
    const canonical = SITE_URL + (route ? route.path : pathname);

    document.documentElement.lang = lang;

    /* Un artículo del blog se conoce solo cuando llega del servidor: lo pinta
       postSeo.js desde BlogPostPage. Aquí no se toca nada, o se pisaría lo
       que esa página acaba de escribir. */
    if (/^\/blog\/[^/]+/.test(pathname)) return;

    if (route) {
      const copy = route[lang] || route.es;
      const title = fullTitle(fillPrices(copy.title, PRICES));
      const description = fillPrices(copy.description, PRICES);

      document.title = title;
      setMeta('meta[name="description"]',       { name: 'description', content: description });
      setMeta('meta[property="og:title"]',       { property: 'og:title', content: title });
      setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
      setMeta('meta[name="twitter:title"]',      { name: 'twitter:title', content: title });
      setMeta('meta[name="twitter:description"]',{ name: 'twitter:description', content: description });
    } else {
      document.title = SITE_NAME;
    }

    setMeta('meta[property="og:url"]',   { property: 'og:url', content: canonical });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: OG_IMAGE });

    if (noindex) {
      setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' });
      removeMeta('link[rel="canonical"]');
    } else {
      removeMeta('meta[name="robots"]');
      setMeta('link[rel="canonical"]', { rel: 'canonical', href: canonical });
    }
  }, [pathname, lang]);

  return null;
}
