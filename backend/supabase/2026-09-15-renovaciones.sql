-- Renovaciones pagadas por suscripción.
--
-- El panel veía la compra inicial y la fecha de la próxima renovación, pero
-- no si esa renovación llegó a cobrarse. Eso lo sabe Stripe en cada factura
-- pagada (invoice.paid) y el backend no lo escuchaba.
--
-- Ejecutar en Supabase → SQL Editor, proyecto del backend (xaexhjswztqedoygsodz).
-- Es idempotente: se puede correr dos veces sin daño.

alter table public.subscriptions
  add column if not exists renewals_count   integer     not null default 0,
  add column if not exists last_renewal_at  timestamptz,
  add column if not exists total_paid_cents integer     not null default 0,
  -- Última factura contabilizada. Stripe reintenta los webhooks; sin esto una
  -- misma factura podría sumarse dos veces.
  add column if not exists last_invoice_id  text;

comment on column public.subscriptions.renewals_count   is 'Cobros mensuales pagados después del inicial (billing_reason = subscription_cycle).';
comment on column public.subscriptions.last_renewal_at  is 'Fecha del último cobro mensual pagado.';
comment on column public.subscriptions.total_paid_cents is 'Suma de lo cobrado: inicial + renovaciones. Lo que dice Stripe, no el precio de lista.';
comment on column public.subscriptions.last_invoice_id  is 'id de la última factura de Stripe contabilizada, para no sumarla dos veces.';

-- Las filas anteriores a este cambio: el total empieza en lo cobrado al inicio.
update public.subscriptions
   set total_paid_cents = coalesce(price_cents, 0)
 where total_paid_cents = 0;
