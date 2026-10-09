-- =============================================================================
-- ABUNDANCE CODE — Intentos de compra
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Idempotente: se puede volver a ejecutar sin romper nada.
--
-- Hasta ahora, de una compra solo quedaba rastro cuando se completaba: la fila
-- de `subscriptions` nace en el webhook, después del pago. Quien pulsaba
-- «Comprar», veía la pantalla de Stripe y se iba, no dejaba nada. Y es la
-- gente más recuperable que hay: ya dio su correo y ya quería.
--
-- Esta tabla guarda el intento en el momento de abrirlo, y el webhook marca
-- cuál se convirtió en compra. La diferencia entre unos y otros es el embudo.
--
-- No sustituye a Stripe, que también los conserva: sirve para verlo en el
-- panel junto al resto, sin salir a buscarlo a otra herramienta.
-- =============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.checkout_attempts (
  id                 uuid primary key default gen_random_uuid(),

  -- Lo que la persona escribió antes de ir a pagar.
  email              text not null,
  name               text,

  -- La sesión de Stripe que se le abrió. Es la llave para casarlo con la compra.
  stripe_session_id  text unique,

  -- De dónde venía: el mismo dato de atribución que guarda `subscriptions`.
  utm_campaign       text,
  locale             text,

  -- Cuándo se completó el pago. Null = se fue sin pagar.
  completed_at       timestamptz,

  created_at         timestamptz not null default now()
);

comment on table public.checkout_attempts is
  'Un intento de compra por cada vez que se abre el checkout. `completed_at` null = abandonado.';

create index if not exists checkout_attempts_created_idx
  on public.checkout_attempts (created_at desc);

create index if not exists checkout_attempts_abandonados_idx
  on public.checkout_attempts (created_at desc)
  where completed_at is null;

create index if not exists checkout_attempts_email_idx
  on public.checkout_attempts (lower(email));

-- Solo lo escribe y lo lee el backend, con la clave de servicio. No se expone
-- a nadie más: son correos de gente que no llegó a comprar.
alter table public.checkout_attempts enable row level security;
grant all privileges on table public.checkout_attempts to service_role;
