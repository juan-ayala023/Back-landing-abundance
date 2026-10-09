-- =============================================================================
-- ABUNDANCE CODE — Cuándo PIDIÓ la baja, que no es cuándo se va
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Idempotente: se puede volver a ejecutar sin romper nada.
--
-- Al cancelar desde el portal de Stripe, la suscripción no se cierra: queda
-- marcada para terminar al final del periodo pagado. Para Stripe sigue
-- «activa», así que el webhook llegaba, se guardaba como activa y no se
-- avisaba a nadie. El aviso de cancelación salía un mes después, cuando el
-- periodo vencía de verdad — justo cuando ya no se puede hacer nada.
--
-- Esta columna guarda el momento en que la persona lo pidió, que es el único
-- que sirve para reaccionar. Se limpia si deshace la baja desde el mismo
-- portal («Don't cancel subscription»), porque entonces ya no se va.
--
-- Se probó el 3 de octubre de 2026: la baja de prueba llegó al webhook a las
-- 20:35:46 y no dejó rastro en ninguna parte.
-- =============================================================================

alter table public.subscriptions
  add column if not exists cancel_requested_at timestamptz;

comment on column public.subscriptions.cancel_requested_at is
  'Cuándo pidió la baja. Sigue teniendo acceso hasta current_period_end. Null si no la ha pedido o si la deshizo.';

-- Para listar en el panel quién se va sin recorrer la tabla entera.
create index if not exists subscriptions_cancel_requested_at_idx
  on public.subscriptions (cancel_requested_at);
