-- Campos SEO y Open Graph del blog.
--
-- Ejecutar en Supabase → SQL Editor, proyecto del backend (xaexhjswztqedoygsodz).
-- Idempotente.
--
-- La programación de entradas no necesita columna: una entrada marcada como
-- publicada con `published_at` en el futuro no se muestra al público hasta
-- que llegue esa fecha (ver listPublished / findPublishedBySlug).

alter table public.blog_posts
  add column if not exists seo_title       text,
  add column if not exists seo_description text,
  add column if not exists image_alt       text,
  add column if not exists og_image_url    text,
  add column if not exists og_title        text,
  add column if not exists og_description  text;

comment on column public.blog_posts.seo_title       is 'Etiqueta <title> del artículo. Vacío = se usa title.';
comment on column public.blog_posts.seo_description is 'Meta descripción. Vacío = se usa excerpt.';
comment on column public.blog_posts.image_alt       is 'Texto alternativo de la imagen destacada.';
comment on column public.blog_posts.og_image_url    is 'Imagen para redes (1200×630). Vacío = se usa image_url.';
comment on column public.blog_posts.og_title        is 'Open Graph title. Vacío = seo_title, y si no, title.';
comment on column public.blog_posts.og_description  is 'Open Graph description. Vacío = seo_description, y si no, excerpt.';
