-- =============================================================================
-- ABUNDANCE CODE — Cuándo se dio de baja cada quien
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Idempotente: se puede volver a ejecutar sin romper nada.
--
-- `status = 'canceled'` dice que alguien se fue, pero no cuándo. Sin esa fecha
-- el panel solo puede enseñar el acumulado de siempre, y «3 canceladas» es un
-- dato distinto según sean de este mes o de hace medio año: en un caso hay algo
-- que mirar hoy y en el otro no.
--
-- El webhook la pone cuando el estado CAMBIA a cancelada, y la limpia si la
-- suscripción vuelve a estar activa. Hoy no hay ninguna baja todavía, así que
-- la columna nace sin nada que rellenar y sin ninguna fecha inventada: lo que
-- se cuente a partir de ahora será cierto.
-- =============================================================================

alter table public.subscriptions
  add column if not exists canceled_at timestamptz;

comment on column public.subscriptions.canceled_at is
  'Cuándo pasó a cancelada. Null si está activa o si se dio de baja antes de que se guardara.';

-- Para contar las bajas de los últimos 30 días sin recorrer la tabla entera.
create index if not exists subscriptions_canceled_at_idx
  on public.subscriptions (canceled_at);
