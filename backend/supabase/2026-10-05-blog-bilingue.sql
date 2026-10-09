-- =============================================================================
-- ABUNDANCE CODE — El blog en dos idiomas
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Idempotente: se puede volver a ejecutar sin romper nada.
--
-- Una entrada del blog tenía un solo título, un solo texto y un solo juego de
-- campos SEO. Quien escribía tenía que elegir idioma, y el que no lo hablara
-- veía el artículo igual: la web traduce sus menús y sus botones, pero no el
-- contenido, porque el contenido no está escrito a mano en dos sitios.
--
-- `idioma` dice en cuál se escribió el original. `traducciones` guarda las
-- demás versiones, con la misma forma que usan las lecturas del portal:
--
--   { "en": { "title": "…", "excerpt": "…", "content": "…",
--             "seo_title": "…", "seo_description": "…", "image_alt": "…",
--             "og_title": "…", "og_description": "…" } }
--
-- La imagen no se traduce y por eso no está aquí: es la misma pieza, y pedirle
-- a quien diseña dos versiones de cada imagen sería duplicar el trabajo que
-- esto viene a evitar.
--
-- Lo ya escrito se marca como español, que es lo que hay: una entrada en
-- borrador titulada «Horóscopo de octubre 2026…».
-- =============================================================================

alter table public.blog_posts
  add column if not exists idioma text not null default 'es';

alter table public.blog_posts
  drop constraint if exists blog_posts_idioma_check;

alter table public.blog_posts
  add constraint blog_posts_idioma_check check (idioma in ('es', 'en'));

alter table public.blog_posts
  add column if not exists traducciones jsonb;

comment on column public.blog_posts.idioma is
  'Idioma en que se escribió el original.';

comment on column public.blog_posts.traducciones is
  'Las otras versiones, por idioma. La imagen no se traduce: es la misma.';
