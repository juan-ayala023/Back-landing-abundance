import { SITE_URL, SITE_NAME, OG_IMAGE, fullTitle } from './routes.js';
import { setMeta, removeMeta } from './head.js';

/* =========================================================
   SEO de un artículo del blog.

   Seo.jsx cubre las rutas fijas; un artículo se conoce solo
   cuando llega del servidor, así que BlogPostPage llama aquí
   al tenerlo. Cada campo cae en cascada si se dejó vacío en
   el editor: título SEO → título; meta descripción → extracto;
   Open Graph → SEO → texto; imagen social → imagen destacada.
   ========================================================= */

/* Categorías del blog en español, para la vista pública. El valor guardado
   sigue en inglés porque es por lo que se filtra. */
export const CATEGORY_LABELS = {
  Astrology:  'Astrología',
  Tarot:      'Tarot',
  Numerology: 'Numerología',
  Crystals:   'Cristales',
  Abundance:  'Abundancia',
  Mindset:    'Mentalidad',
};

export function categoryLabel(value) {
  return CATEGORY_LABELS[value] || value || '';
}

const JSONLD_ID = 'post-jsonld';

/* Recorta a lo que Google muestra sin cortar una palabra por la mitad. */
function recortar(texto, max) {
  const limpio = String(texto || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/* Lo que verá cada canal, resuelto en cascada. */
export function resolvePostMeta(post) {
  const title       = post.seoTitle || post.title || '';
  const description = post.seoDescription || recortar(post.excerpt, 160);
  const ogTitle     = post.ogTitle || title;
  const ogDesc      = post.ogDescription || description;
  const image       = post.ogImageUrl || post.imageUrl || OG_IMAGE;
  return { title, description, ogTitle, ogDesc, image };
}

/**
 * Pinta el <head> de un artículo.
 *
 * `indexable`: solo las entradas publicadas y vistas por su URL normal. Un
 * borrador o una vista previa lleva noindex, nofollow y sin canonical: no
 * queremos que Google indexe algo que todavía no existe para el público.
 */
/** `/blog/<slug>` en español, `/en/blog/<slug>` en inglés. */
export function urlDelPost(slug, idioma) {
  return idioma === 'en' ? `${SITE_URL}/en/blog/${slug}` : `${SITE_URL}/blog/${slug}`;
}

export function applyPostSeo(post, { indexable }) {
  const { title, description, ogTitle, ogDesc, image } = resolvePostMeta(post);

  /* El idioma de ESTA versión, que no siempre es el del original: un artículo
     escrito en español y traducido al inglés se sirve en inglés bajo /en, y
     decirle a Google que está en español le invita a traducir lo traducido. */
  const idioma = post.idiomaServido || post.idioma || 'es';
  const canonical = urlDelPost(post.slug, idioma);

  document.documentElement.lang = idioma;
  document.title = fullTitle(title);
  setMeta('meta[name="description"]',        { name: 'description', content: description });

  setMeta('meta[property="og:type"]',        { property: 'og:type', content: 'article' });
  setMeta('meta[property="og:title"]',       { property: 'og:title', content: ogTitle });
  setMeta('meta[property="og:description"]', { property: 'og:description', content: ogDesc });
  setMeta('meta[property="og:image"]',       { property: 'og:image', content: image });
  setMeta('meta[property="og:url"]',         { property: 'og:url', content: canonical });
  if (post.publishedAt) {
    setMeta('meta[property="article:published_time"]', { property: 'article:published_time', content: post.publishedAt });
  }
  if (post.updatedAt) {
    setMeta('meta[property="article:modified_time"]', { property: 'article:modified_time', content: post.updatedAt });
  }

  setMeta('meta[name="twitter:card"]',        { name: 'twitter:card', content: 'summary_large_image' });
  setMeta('meta[name="twitter:title"]',       { name: 'twitter:title', content: ogTitle });
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: ogDesc });
  setMeta('meta[name="twitter:image"]',       { name: 'twitter:image', content: image });

  if (indexable) {
    setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' });
    setMeta('link[rel="canonical"]', { rel: 'canonical', href: canonical });
  } else {
    setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' });
    removeMeta('link[rel="canonical"]');
  }

  /*
    Las versiones hermanas.

    Sin esto, la versión inglesa y la española son dos páginas con el mismo
    tema y Google se queda con una, por duplicadas. Con `hreflang` son la misma
    pieza en dos idiomas y puede enseñar cada una a quien busca en ella —que es
    todo el beneficio de haberla traducido—. Cada versión se declara a sí misma
    además de a su hermana: así lo pide la especificación.
  */
  limpiarAlternativas();
  if (indexable) {
    for (const otro of post.idiomas || [idioma]) {
      const enlace = document.createElement('link');
      enlace.rel = 'alternate';
      enlace.hreflang = otro;
      enlace.href = urlDelPost(post.slug, otro);
      enlace.dataset.postAlternate = 'true';
      document.head.appendChild(enlace);
    }
  }

  /* Datos estructurados. Solo en lo indexable: un borrador no es un artículo. */
  document.getElementById(JSONLD_ID)?.remove();
  if (indexable) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSONLD_ID;
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      image: [image],
      author: { '@type': 'Organization', name: post.author || SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/img/logo-transparent.png` } },
      datePublished: post.publishedAt || post.createdAt,
      dateModified: post.updatedAt || post.publishedAt || post.createdAt,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        inLanguage: idioma,
    });
    document.head.appendChild(script);
  }
}

/* Al salir del artículo: lo que Seo.jsx no repone solo. */
/* Las alternativas son de este artículo: al salir se van con él. */
function limpiarAlternativas() {
  document.querySelectorAll('link[data-post-alternate]').forEach((e) => e.remove());
}

export function clearPostSeo() {
  document.getElementById(JSONLD_ID)?.remove();
  limpiarAlternativas();
  document.documentElement.lang = 'es';
  setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  removeMeta('meta[property="article:published_time"]');
  removeMeta('meta[property="article:modified_time"]');
  removeMeta('meta[name="twitter:card"]');
  removeMeta('meta[name="twitter:image"]');
}
