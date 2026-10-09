import { sb, throwIfError } from '../lib/supabase.js';

const SUB_COLS = `
  id, email, name,
  stripe_customer_id, stripe_subscription_id, stripe_session_id,
  plan, price_cents, currency,
  status, current_period_end, source,
  access_token, access_code, token_expires_at, redeemed_at, app_user_id,
  utm_campaign, locale, reminders_sent, last_reminder_at, canceled_at, cancel_requested_at,
  renewals_count, last_renewal_at, total_paid_cents, last_invoice_id,
  created_at, updated_at
`;

/* ── Lookups ─────────────────────────────────────────────────────────────── */

export async function findBySession(stripeSessionId) {
  const { data, error } = await sb
    .from('subscriptions')
    .select(SUB_COLS)
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function findByToken(token) {
  const { data, error } = await sb
    .from('subscriptions')
    .select(SUB_COLS)
    .eq('access_token', token)
    .maybeSingle();
  throwIfError(error);
  return data;
}

/* El email es la llave del sistema. Se guarda siempre en minúsculas (ver
 * upsertByEmail), así que aquí basta con normalizar la búsqueda igual.
 *
 * Se usa `eq` y no `ilike` a propósito: en ilike, `_` y `%` son comodines, y
 * el guion bajo es legal en un correo — `john_doe@x.com` acabaría casando con
 * `johnXdoe@x.com`. */
export async function findByEmail(email) {
  const { data, error } = await sb
    .from('subscriptions')
    .select(SUB_COLS)
    .eq('email', (email || '').trim().toLowerCase())
    .maybeSingle();
  throwIfError(error);
  return data;
}

/* Varias de golpe, para cruzar con la lista de usuarios de la app. */
export async function findByEmails(emails) {
  const lista = [...new Set((emails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
  if (lista.length === 0) return [];
  const { data, error } = await sb
    .from('subscriptions')
    .select('email, status, source, created_at, renewals_count')
    .in('email', lista);
  throwIfError(error);
  return data || [];
}

export async function findByStripeSubscription(subscriptionId) {
  const { data, error } = await sb
    .from('subscriptions')
    .select(SUB_COLS)
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

export async function findByStripeCustomer(customerId) {
  const { data, error } = await sb
    .from('subscriptions')
    .select(SUB_COLS)
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  throwIfError(error);
  return data;
}

/* ── Escritura ───────────────────────────────────────────────────────────── */

/* Alta o actualización por email: si alguien vuelve a suscribirse tras
 * cancelar, se reutiliza su fila y conserva su historial.
 *
 * Se busca y luego se escribe, en vez de usar `upsert`. Motivo: `upsert` exige
 * un índice único sobre la columna `email`, y la base puede tenerlo sobre
 * `lower(email)` — Postgres no acepta un índice de expresión en un ON CONFLICT
 * y revienta con "no unique or exclusion constraint matching". Así funciona con
 * cualquiera de los dos.
 *
 * La carrera entre dos webhooks simultáneos del mismo correo la sigue cubriendo
 * el índice único: el segundo INSERT falla, Stripe reintenta, y en el reintento
 * ya encuentra la fila. */
export async function upsertByEmail(fields) {
  const email = (fields.email || '').trim().toLowerCase();
  const payload = { ...fields, email };

  const existing = await findByEmail(email);

  if (existing) {
    return updateById(existing.id, payload);
  }

  const { data, error } = await sb
    .from('subscriptions')
    .insert(payload)
    .select(SUB_COLS)
    .single();
  throwIfError(error);
  return data;
}

export async function updateById(id, fields) {
  const { data, error } = await sb
    .from('subscriptions')
    .update(fields)
    .eq('id', id)
    .select(SUB_COLS)
    .single();
  throwIfError(error);
  return data;
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

/* Listado para el panel. Lo más reciente primero, que es como se mira.
 *
 * La búsqueda se limpia antes de entrar en `.or()`: esa cadena es sintaxis de
 * PostgREST, no un valor, así que una coma o un paréntesis escritos por el
 * administrador no filtran mal — rompen el filtro entero con un error de
 * sintaxis. También se quitan `%` y `_`, que en `ilike` son comodines y harían
 * que buscar `a_b` devolviera `axb`. */
export async function listSubscriptions({ status, search = '', page = 1, limit = 20 } = {}) {
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let q = sb
    .from('subscriptions')
    .select(SUB_COLS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') q = q.eq('status', status);

  const termino = String(search).trim().replace(/[%_,()."\\]/g, '');
  if (termino) q = q.or(`email.ilike.%${termino}%,name.ilike.%${termino}%`);

  const { data, error, count } = await q;
  throwIfError(error);

  return {
    subscriptions: data || [],
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  };
}

/* Resumen de la cartera.
 *
 * Se cuenta con `head: true`, que pide a Postgres el número y no las filas: es
 * exacto y no depende de cuántas haya. La alternativa —traérselas y contarlas
 * en Node— funciona con veinte clientes y deja de funcionar sin avisar.
 *
 * De dinero se suma `total_paid_cents` y NUNCA `price_cents`. La diferencia
 * importa: `price_cents` es lo que el webhook anotó al crear la suscripción
 * —con 49 $ el primer mes y 14,99 $ después, sumarla daría una cifra que
 * parece facturación y no lo es—, mientras que `total_paid_cents` lo lleva al
 * día el webhook con cada factura cobrada. Stripe sigue siendo la fuente de
 * la verdad; esto es para no tener que abrirlo por una cifra. */
export async function getSubscriptionStats() {
  const contar = async (aplicar = (q) => q) => {
    const { count, error } = await aplicar(
      sb.from('subscriptions').select('*', { count: 'exact', head: true }),
    );
    throwIfError(error);
    return count || 0;
  };

  /*
   * El primer cobro mensual no llega el día de la compra: la entrada incluye
   * 30 días. Hasta que pasan, nadie ha tenido ocasión de renovar, y contar a
   * esa gente como «no renovó» es lo que hacía que el panel dijera «0 han
   * renovado» con cuatro suscriptores al corriente. Debe coincidir con
   * INCLUDED_DAYS del checkout, que es quien fija el trial en Stripe.
   */
  const diasIncluidos = Number(process.env.INCLUDED_DAYS) || 30;
  const yaLesTocaba = new Date(Date.now() - diasIncluidos * 24 * 3600 * 1000).toISOString();
  const hace30Dias = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [total, active, pastDue, canceled, incomplete, unredeemed, renewed, vencidas, renovadas, bajas30d, seVan] =
    await Promise.all([
      contar(),
      contar((q) => q.eq('status', 'active')),
      contar((q) => q.eq('status', 'past_due')),
      contar((q) => q.eq('status', 'canceled')),
      contar((q) => q.eq('status', 'incomplete')),
      /* Pagó y nunca canjeó su enlace de acceso. Es el número que más importa de
       * todos: cada fila aquí es alguien que ha pagado y no ha recibido nada. */
      contar((q) => q.is('redeemed_at', null).eq('status', 'active')),
      /* Pasaron del primer mes y pagaron al menos una cuota: la retención real. */
      contar((q) => q.gt('renewals_count', 0)),
      /* A cuántos les ha llegado ya su primera renovación. Es el denominador
       * honesto: sin él, «han renovado» se lee como un fracaso cuando lo único
       * que pasa es que la fecha no ha llegado. Las incompletas no cuentan:
       * nunca llegaron a empezar. */
      contar((q) => q.lt('created_at', yaLesTocaba).neq('status', 'incomplete')),
      contar((q) => q.lt('created_at', yaLesTocaba).gt('renewals_count', 0)),
      /* Bajas recientes. `canceled` es el acumulado de siempre y no dice si la
       * sangría es de este mes o de hace medio año. */
      contar((q) => q.gte('canceled_at', hace30Dias)),
      /* Las que se van pero todavía no se han ido: pidieron la baja y siguen
       * teniendo acceso hasta que venza su periodo. Son a las que aún se les
       * puede escribir, así que es el número que hay que mirar hoy. */
      contar((q) => q.not('cancel_requested_at', 'is', null).neq('status', 'canceled')),
    ]);

  /*
   * Lo cobrado, sumado aquí y no en Postgres.
   *
   * Se traen solo los enteros de una columna, que es lo más barato que se
   * puede pedir, y con los números de este negocio no hay diferencia
   * apreciable. Si algún día hay decenas de miles de suscripciones, esto pasa
   * a ser una función en la base — y se notará antes en el tiempo de respuesta
   * del panel que en ningún otro sitio.
   */
  const { data: pagos, error: errorPagos } = await sb
    .from('subscriptions')
    .select('total_paid_cents');
  throwIfError(errorPagos);
  const cobradoCents = (pagos || []).reduce((suma, fila) => suma + (fila.total_paid_cents || 0), 0);

  return {
    total, active, pastDue, canceled, incomplete, unredeemed, renewed,
    vencidas, renovadas, bajas30d, seVan, cobradoCents,
  };
}

/* Suscripciones pagadas que nadie ha canjeado todavía — para los recordatorios. */
export async function findUnredeemed({ olderThanHours = 24, maxReminders = 2 } = {}) {
  const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000).toISOString();
  const { data, error } = await sb
    .from('subscriptions')
    .select(SUB_COLS)
    .is('redeemed_at', null)
    .eq('status', 'active')
    .lt('created_at', cutoff)
    .lt('reminders_sent', maxReminders);
  throwIfError(error);
  return data || [];
}
