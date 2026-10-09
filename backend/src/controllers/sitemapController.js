import * as Blog from '../data/blogPosts.js';
import { idiomasDe } from '../lib/blogIdioma.js';

/* =============================================================================
 *  El sitemap de los artículos, servido en vivo.
 *
 *  El de la web lo escribe el build y lista las doce páginas fijas. Los
 *  artículos no estaban en ninguno: viven en la base, aparecen cuando alguien
 *  publica, y volver a compilar y subir la web entera para anunciar un artículo
 *  nuevo es justo el tipo de paso que se olvida. Google acababa encontrándolos
 *  por el enlace del índice, semanas tarde.
 *
 *  Por eso éste se sirve desde aquí: siempre dice la verdad, sin desplegar
 *  nada. `robots.txt` lo anuncia junto al otro — Google acepta varios.
 *
 *  Cada artículo sale una vez por idioma en que existe, y cada entrada declara
 *  sus hermanas con `hreflang`. Eso es lo que impide que Google trate la
 *  versión en inglés como contenido duplicado de la española y se quede solo
 *  con una.
 * ============================================================================*/

const SITIO = () => (process.env.FRONTEND_URL || 'https://abundancecode.us').replace(/\/$/, '');

/** `&`, `<` y `>` dentro de una URL romperían el XML. */
function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** `/blog/slug` en español, `/en/blog/slug` en inglés. */
function urlDe(sitio, slug, idioma) {
  return idioma === 'en' ? `${sitio}/en/blog/${slug}` : `${sitio}/blog/${slug}`;
}

// GET /sitemap-blog.xml
export const getBlogSitemap = async (req, res, next) => {
  try {
    const sitio = SITIO();

    /* Todo lo publicado. El límite es alto a propósito: un blog que pase de
     * mil artículos necesitará paginar el sitemap, y entonces esto avisará
     * solo —no se puede partir lo que no se sabe que es grande. */
    const { posts } = await Blog.listPublished({ page: 1, limit: 1000 });

    const entradas = [];
    for (const post of posts || []) {
      const idiomas = idiomasDe(post);
      const fecha = (post.updated_at || post.published_at || '').slice(0, 10);

      for (const idioma of idiomas) {
        const alternativas = idiomas
          .map(
            (otro) =>
              `    <xhtml:link rel="alternate" hreflang="${otro}" href="${escapar(urlDe(sitio, post.slug, otro))}"/>`,
          )
          .join('\n');

        entradas.push(
          [
            '  <url>',
            `    <loc>${escapar(urlDe(sitio, post.slug, idioma))}</loc>`,
            fecha ? `    <lastmod>${fecha}</lastmod>` : null,
            alternativas,
            '  </url>',
          ]
            .filter(Boolean)
            .join('\n'),
        );
      }
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...entradas,
      '</urlset>',
      '',
    ].join('\n');

    /* Media hora de caché: un artículo nuevo no es urgente para Google, y sin
     * esto cada rastreador recorrería la tabla entera. */
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(xml);
  } catch (err) { next(err); }
};
