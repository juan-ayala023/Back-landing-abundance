import * as Blog from '../data/blogPosts.js';
import { mapBlogPost } from '../lib/responseMappers.js';
import { sb } from '../lib/supabase.js';
import { enIdioma, idiomaPedido, TRADUCIBLES } from '../lib/blogIdioma.js';
import { traducirTextos, AppUnavailableError } from '../services/appService.js';

/* ── PUBLIC ──────────────────────────────────────────────────────────────── */

// GET /api/blog
export const getPosts = async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 12);
    const category = req.query.category;

    /* El idioma lo manda la web, que es quien sabe en cuál está mirando la
      * persona. Sin él, español: es el idioma del original de todo lo escrito
      * hasta hoy. */
    const idioma = idiomaPedido(req.query.lang);

    const result = await Blog.listPublished({ category, page, limit });
    res.json({
      ...result,
      posts: (result.posts || []).map((p) => mapBlogPost(enIdioma(p, idioma))),
    });
  } catch (err) { next(err); }
};

// GET /api/blog/:slug
export const getPostBySlug = async (req, res, next) => {
  try {
    const post = await Blog.findPublishedBySlug(req.params.slug);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(mapBlogPost(enIdioma(post, idiomaPedido(req.query.lang))));
  } catch (err) { next(err); }
};

/* ── ADMIN ───────────────────────────────────────────────────────────────── */

// GET /api/admin/blog
export const adminGetPosts = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const result = await Blog.listAll({ page, limit });
    res.json({ ...result, posts: (result.posts || []).map(mapBlogPost) });
  } catch (err) { next(err); }
};

/**
 * POST /api/admin/blog/:id/traducir   { idioma }
 *
 * Traduce la entrada al otro idioma y la guarda a su lado. No publica nada
 * distinto: la entrada sigue siendo la misma pieza, con la misma URL y la
 * misma imagen, y lo que cambia es qué texto se sirve según quién mire.
 *
 * Se traduce **a petición y una vez**, no en cada visita: una traducción es
 * cara y es siempre la misma. Y queda guardada en claro para que se pueda
 * corregir a mano después, que es lo que convierte una traducción automática
 * en un texto publicable.
 */
export const adminTraducirPost = async (req, res, next) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const destino = idiomaPedido(req.body?.idioma);
    const original = post.idioma || 'es';

    if (destino === original) {
      return res.status(409).json({
        message: `Esa entrada ya está escrita en ${destino === 'es' ? 'español' : 'inglés'}`,
      });
    }

    /* Solo los campos de texto. La imagen, el autor, la categoría y el slug
     * son los mismos en los dos idiomas: la URL tiene que coincidir para que
     * Google entienda que son la misma pieza. */
    const textos = {};
    for (const campo of TRADUCIBLES) {
      if (typeof post[campo] === 'string' && post[campo].trim()) textos[campo] = post[campo];
    }

    const traducidos = await traducirTextos({
      idioma: destino,
      textos,
      que: 'un artículo de blog sobre astrología y abundancia',
    });

    const traducciones = { ...(post.traducciones || {}), [destino]: traducidos };
    const guardado = await Blog.update(post.id, { traducciones });

    res.json(mapBlogPost(guardado));
  } catch (err) {
    if (err instanceof AppUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
};

/**
 * PATCH /api/admin/blog/:id/traduccion   { idioma, textos }
 *
 * Guarda una traducción corregida a mano. Lo que sale del modelo es un primer
 * borrador bueno, no un texto publicado: quien escribe tiene que poder
 * arreglarle una frase sin volver a traducir el artículo entero.
 */
export const adminGuardarTraduccion = async (req, res, next) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const destino = idiomaPedido(req.body?.idioma);
    const textos = req.body?.textos || {};

    const limpios = {};
    for (const campo of TRADUCIBLES) {
      if (typeof textos[campo] === 'string') limpios[campo] = textos[campo];
    }
    if (Object.keys(limpios).length === 0) {
      return res.status(400).json({ message: 'No llegó ningún texto' });
    }

    const traducciones = {
      ...(post.traducciones || {}),
      [destino]: { ...(post.traducciones?.[destino] || {}), ...limpios },
    };
    res.json(mapBlogPost(await Blog.update(post.id, { traducciones })));
  } catch (err) { next(err); }
};

// GET /api/admin/blog/:id
export const adminGetPost = async (req, res, next) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(mapBlogPost(post));
  } catch (err) { next(err); }
};

// POST /api/admin/blog
export const adminCreatePost = async (req, res, next) => {
  try {
    const {
      title, slug, excerpt, content, imageUrl, author, category, isPublished, publishedAt,
      seoTitle, seoDescription, imageAlt, ogImageUrl, ogTitle, ogDescription,
    } = req.body;
    const post = await Blog.create({
      title,
      slug,
      excerpt,
      content,
      image_url:       imageUrl,
      author,
      category,
      is_published:    !!isPublished,
      published_at:    publishedAt || undefined,
      seo_title:       seoTitle || null,
      seo_description: seoDescription || null,
      image_alt:       imageAlt || null,
      og_image_url:    ogImageUrl || null,
      og_title:        ogTitle || null,
      og_description:  ogDescription || null,
    });
    res.status(201).json(mapBlogPost(post));
  } catch (err) { next(err); }
};

// PATCH /api/admin/blog/:id
export const adminUpdatePost = async (req, res, next) => {
  try {
    const patch = {};
    const map = {
      title:       'title',
      slug:        'slug',
      excerpt:     'excerpt',
      content:     'content',
      imageUrl:    'image_url',
      author:      'author',
      category:    'category',
      isPublished: 'is_published',
      publishedAt: 'published_at',
      seoTitle:       'seo_title',
      seoDescription: 'seo_description',
      imageAlt:       'image_alt',
      ogImageUrl:     'og_image_url',
      ogTitle:        'og_title',
      ogDescription:  'og_description',
    };
    for (const [k, dbCol] of Object.entries(map)) {
      if (req.body[k] === undefined) continue;
      /* Un campo opcional vaciado en el editor se guarda como null, para que
       * los «si se deja vacío, se usa…» de la página del artículo funcionen. */
      patch[dbCol] = req.body[k] === '' && k !== 'content' ? null : req.body[k];
    }

    const post = await Blog.update(req.params.id, patch);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(mapBlogPost(post));
  } catch (err) { next(err); }
};

// DELETE /api/admin/blog/:id
export const adminDeletePost = async (req, res, next) => {
  try {
    await Blog.remove(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

/* =============================================================================
 *  GET /api/blog/:slug/share — la tarjeta del enlace para redes sociales
 *
 *  La web es una SPA en Hostinger: las etiquetas Open Graph de un artículo las
 *  escribe JavaScript, y WhatsApp, Facebook, X o LinkedIn no lo ejecutan al
 *  generar la vista previa de un enlace. Verían siempre la imagen genérica.
 *
 *  El .htaccess de la web manda a esos robots aquí. Se les devuelve un HTML
 *  mínimo con las etiquetas resueltas en la misma cascada que la página real
 *  (SEO → texto; Open Graph → SEO; imagen social → destacada) y el enlace
 *  canónico al artículo. Una persona que aterrice aquí por error tiene el
 *  enlace a la vista y un salto automático.
 * ============================================================================*/
const SITE_URL  = () => (process.env.FRONTEND_URL || 'https://abundancecode.us').replace(/\/$/, '');
const SITE_NAME = 'Abundance Code';

const escapeHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sinHtml = (v, max = 160) => {
  const t = String(v ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, '') + '…';
};

export const getPostShareCard = async (req, res, next) => {
  try {
    const post = await Blog.findPublishedBySlug(req.params.slug);
    if (!post) return res.status(404).send('Not found');

    const url         = `${SITE_URL()}/blog/${post.slug}`;
    const title       = post.seo_title || post.title;
    const description = post.seo_description || sinHtml(post.excerpt);
    const ogTitle     = post.og_title || title;
    const ogDesc      = post.og_description || description;
    const image       = post.og_image_url || post.image_url || `${SITE_URL()}/img/og-image.jpg`;

    res.set('Cache-Control', 'public, max-age=600');
    res.type('html').send(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} | ${SITE_NAME}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDesc)}">
<meta property="og:image" content="${escapeHtml(image)}">
${post.published_at ? `<meta property="article:published_time" content="${escapeHtml(post.published_at)}">` : ''}
${post.updated_at ? `<meta property="article:modified_time" content="${escapeHtml(post.updated_at)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(ogDesc)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(url)}">
</head>
<body><p><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></p></body>
</html>`);
  } catch (err) { next(err); }
};

/* ── Imagen del blog ──────────────────────────────────────────────────────
   POST /api/admin/blog/imagen · /blog/archivo  (cuerpo: el archivo tal
   cual, Content-Type image/* o application/pdf; ?nombre=archivo.jpg)

   Antes el editor solo aceptaba una URL: había que alojar la imagen en otro
   sitio y copiarla. Ahora se sube desde el panel y se guarda en Supabase
   Storage (bucket público «blog»), que ya es donde vive el resto de datos
   del backend. Devuelve la URL pública para rellenar el campo.
   ────────────────────────────────────────────────────────────────────── */
const BUCKET_BLOG   = 'blog';
const TIPOS_IMAGEN  = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'application/pdf': 'pdf' };
const MAX_IMAGEN    = 8 * 1024 * 1024;
let bucketListo = false;

async function asegurarBucket() {
  if (bucketListo) return;
  const { data } = await sb.storage.getBucket(BUCKET_BLOG);
  if (!data) {
    const { error } = await sb.storage.createBucket(BUCKET_BLOG, { public: true, fileSizeLimit: MAX_IMAGEN });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  bucketListo = true;
}

export const adminUploadImage = async (req, res, next) => {
  try {
    const tipo = (req.headers['content-type'] || '').split(';')[0].trim();
    const ext  = TIPOS_IMAGEN[tipo];
    if (!ext) return res.status(400).json({ message: 'Formato no admitido. Usa JPG, PNG, WebP, GIF, AVIF o PDF.' });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ message: 'No llegó ningún archivo.' });
    if (req.body.length > MAX_IMAGEN) return res.status(413).json({ message: 'El archivo supera los 8 MB.' });

    await asegurarBucket();

    // Nombre legible + sufijo para que dos subidas con el mismo nombre no se pisen.
    const base = String(req.query.nombre || 'imagen')
      .replace(/\.[a-z0-9]+$/i, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'imagen';
    const ruta = `${new Date().toISOString().slice(0, 10)}/${base}-${Date.now().toString(36)}.${ext}`;

    const { error } = await sb.storage.from(BUCKET_BLOG).upload(ruta, req.body, { contentType: tipo, cacheControl: '31536000', upsert: false });
    if (error) throw error;

    const { data } = sb.storage.from(BUCKET_BLOG).getPublicUrl(ruta);
    res.status(201).json({ url: data.publicUrl });
  } catch (err) {
    next(err);
  }
};
