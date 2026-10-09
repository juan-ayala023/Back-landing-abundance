import { sb, throwIfError } from '../lib/supabase.js';

/**
 * Intentos de compra: quién abrió el checkout y quién llegó a pagar.
 *
 * De una compra solo quedaba rastro cuando se completaba —la fila de
 * `subscriptions` nace en el webhook—, así que quien pulsaba «Comprar» y se
 * iba no dejaba nada. Y es la gente más recuperable que hay: ya dio su correo
 * y ya quería.
 */

const COLS = `
  id, email, name, stripe_session_id,
  utm_campaign, locale, completed_at, created_at
`;

/** Guarda el intento en el momento de abrir el checkout. */
export async function createAttempt(fields) {
  const { data, error } = await sb
    .from('checkout_attempts')
    .insert(fields)
    .select(COLS)
    .single();
  throwIfError(error);
  return data;
}

/** Marca como pagado el intento de esa sesión. Si no existe, no pasa nada. */
export async function markAttemptCompleted(stripeSessionId) {
  const { error } = await sb
    .from('checkout_attempts')
    .update({ completed_at: new Date().toISOString() })
    .eq('stripe_session_id', stripeSessionId)
    .is('completed_at', null);
  throwIfError(error);
}

/**
 * El embudo de los últimos días.
 *
 * `abandonados` solo cuenta los que ya no van a convertirse: un intento de
 * hace dos minutos es alguien que puede estar escribiendo su tarjeta ahora
 * mismo, y contarlo como perdido sería mentir sobre la tasa de conversión.
 */
export async function getFunnel({ dias = 30, minutosDeGracia = 30 } = {}) {
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString();
  const corte = new Date(Date.now() - minutosDeGracia * 60 * 1000).toISOString();

  const { data, error } = await sb
    .from('checkout_attempts')
    .select(COLS)
    .gte('created_at', desde)
    .order('created_at', { ascending: false });
  throwIfError(error);

  const intentos = data || [];
  const completados = intentos.filter((i) => i.completed_at);
  const abandonados = intentos.filter((i) => !i.completed_at && i.created_at < corte);

  /* Un correo que lo intentó varias veces es una sola persona perdida. */
  const porCorreo = new Map();
  for (const intento of abandonados) {
    const clave = String(intento.email || '').toLowerCase();
    const previo = porCorreo.get(clave);
    if (!previo || intento.created_at > previo.ultimoIntento) {
      porCorreo.set(clave, {
        email: intento.email,
        name: intento.name,
        intentos: (previo?.intentos ?? 0) + 1,
        ultimoIntento: intento.created_at,
        utmCampaign: intento.utm_campaign,
      });
    } else {
      previo.intentos += 1;
    }
  }

  /* Quien abandonó y luego compró no está perdido: no se le persigue. */
  const compraron = new Set(completados.map((i) => String(i.email || '').toLowerCase()));
  const perdidos = [...porCorreo.entries()]
    .filter(([email]) => !compraron.has(email))
    .map(([, persona]) => persona)
    .sort((a, b) => (a.ultimoIntento < b.ultimoIntento ? 1 : -1));

  /*
   * En qué idioma llega la gente.
   *
   * Lo preguntó Andrea, y no es curiosidad: decide en qué idioma se escribe lo
   * siguiente que se publique. Se cuenta sobre los intentos y no sobre las
   * compras porque la muestra de intentos es mayor y la pregunta es de dónde
   * viene el tráfico, no quién paga mejor — aunque van las dos cifras, que es
   * justo donde se ve si un idioma atrae y no convierte.
   */
  const idiomas = {};
  for (const intento of intentos) {
    const clave = intento.locale === 'en' ? 'en' : intento.locale === 'es' ? 'es' : 'sin-dato';
    const fila = (idiomas[clave] ??= { intentos: 0, compras: 0 });
    fila.intentos += 1;
    if (intento.completed_at) fila.compras += 1;
  }

  return {
    dias,
    idiomas,
    intentos: intentos.length,
    compras: completados.length,
    abandonados: perdidos.length,
    conversion: intentos.length ? Math.round((completados.length / intentos.length) * 100) : null,
    perdidos: perdidos.slice(0, 100),
  };
}
