import Stripe from 'stripe';
import {
  findBySession,
  findByEmail,
  findByStripeSubscription,
  findByStripeCustomer,
  upsertByEmail,
  updateById,
} from '../data/subscriptions.js';
import { createAttempt, markAttemptCompleted } from '../data/checkoutAttempts.js';
import {
  issueAccessCredentials,
  buildThankYouUrl,
} from '../services/accessService.js';
import { idiomaDeCorreo, sendAccessEmail, sendInternalNotice } from '../services/emailService.js';

let _stripe;
const getStripe = () => {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

/* =============================================================================
 *  Modelo de precio
 *
 *  El usuario paga $49 hoy, que cubren sus primeros 30 días. A partir del
 *  día 31 se le cobran $14.99 al mes para mantener el acceso.
 *
 *  En Stripe eso es UNA suscripción de $14.99/mes con 30 días de trial, más
 *  un cargo único de $49 en la misma sesión de pago. El trial hace que el
 *  primer cobro mensual caiga el día 31; el cargo único se cobra al instante.
 *
 *  Los importes salen de variables de entorno y tienen que coincidir con
 *  frontend/src/config.js, que es lo que ve el usuario en la web.
 * ============================================================================*/
const OFFER = {
  initialPrice:  Number(process.env.PRICE_INITIAL_CENTS) || 4900,   // $49.00
  monthlyPrice:  Number(process.env.PRICE_MONTHLY_CENTS) || 1499,   // $14.99
  includedDays:  Number(process.env.INCLUDED_DAYS)       || 30,
};

/**
 * Lo que se lee en la pantalla de pago, en los dos idiomas.
 *
 * El `locale` que se le pasa a Stripe traduce SU interfaz —«Pay», «Add
 * promotion code», «Total due today»— pero no los nombres de los productos:
 * esos los escribimos nosotros. Estaban solo en español, así que quien venía
 * navegando en inglés encontraba una pantalla medio traducida: los botones en
 * su idioma y lo que estaba comprando en otro. Lo vio Andrea el 2 de octubre
 * de 2026.
 *
 * Un nombre de producto viaja además a la factura y al extracto del banco, así
 * que es lo último que conviene que alguien no entienda.
 */
const PRODUCTOS = {
  es: {
    inicial: `Abundance Code — Acceso inicial (${OFFER.includedDays} días incluidos)`,
    mensual: 'Abundance Code — Acceso mensual',
    descripcion:
      'Acceso completo a tu portal: tu carta natal calculada y explicada, tu patrón central, ' +
      'ciclos y tránsitos, áreas clave y tu lectura personal de cada día.',
    renovacion:
      'Mantiene activas tu lectura del mes, tu lectura de cada día y tus consultas a la guía.',
  },
  en: {
    inicial: `Abundance Code — Initial access (${OFFER.includedDays} days included)`,
    mensual: 'Abundance Code — Monthly access',
    descripcion:
      'Full access to your portal: your natal chart calculated and explained, your core pattern, ' +
      'cycles and transits, key areas and your personal reading each day.',
    renovacion:
      'Keeps your reading of the month, your daily reading and your guidance consultations active.',
  },
};

// POST /api/stripe/create-subscription-session
export const createSubscriptionSession = async (req, res, next) => {
  try {
    const { customerEmail, customerName, utmCampaign, locale } = req.body;

    if (!customerEmail) {
      return res.status(400).json({ message: 'Falta el email' });
    }

    const email = String(customerEmail).trim().toLowerCase();

    /* Si ya tiene una suscripción activa no tiene sentido cobrarle otra vez. */
    const existing = await findByEmail(email);
    if (existing && existing.status === 'active' && existing.source === 'stripe') {
      return res.json({
        alreadySubscribed: true,
        message: 'Ya tienes una suscripción activa con este correo.',
      });
    }

    /* El token se genera AQUÍ, antes del pago, para poder meterlo en el
     * success_url. Así, al terminar de pagar, Stripe devuelve al usuario
     * directamente a la app con su acceso ya en la mano — sin pasar por el
     * correo, que es donde se pierde la gente. El webhook lo persiste. */
    const credentials = await issueAccessCredentials();

    const idioma = idiomaDeCorreo(locale);
    const textos = PRODUCTOS[idioma];

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      /* La página de pago de Stripe, en el idioma en que la persona venía
       * navegando. Sin esto Stripe adivina por el navegador, y adivina mal
       * con frecuencia. */
      locale: idioma,
      /* Sin «Adaptive Pricing»: el checkout no ofrece pagar en la moneda
       * local (AUD, COP…). Está activado a nivel de cuenta en el panel de
       * Stripe, pero Andrea vio que el selector AUD/USD frena la compra
       * (16 sept 2026). Se cobra siempre en USD; si la tarjeta es de otro
       * país, convierte el banco del cliente. */
      adaptive_pricing: { enabled: false },
      line_items: [
        /* Cargo único: se cobra hoy y cubre los primeros 30 días. */
        {
          price_data: {
            currency: 'usd',
            product_data: { name: textos.inicial, description: textos.descripcion },
            unit_amount: OFFER.initialPrice,
          },
          quantity: 1,
        },
        /* Suscripción: en trial durante los días incluidos, así que su primer
         * cobro cae el día 31. A partir de ahí, cada mes. */
        {
          price_data: {
            currency: 'usd',
            product_data: { name: textos.mensual, description: textos.renovacion },
            unit_amount: OFFER.monthlyPrice,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      /* Los metadatos viajan hasta el webhook: es como el token generado antes
       * del pago sobrevive hasta el momento de guardarlo. */
      metadata: {
        customerName: customerName || '',
        utmCampaign:  utmCampaign || '',
        /* Idioma en que compró, para que el correo de acceso salga igual. */
        locale:       idioma,
        accessToken:  credentials.access_token,
        accessCode:   credentials.access_code,
      },
      subscription_data: {
        /* El trial NO es acceso gratis: son los 30 días que el usuario ya
         * pagó con el cargo inicial. Sirve para retrasar el primer cobro. */
        trial_period_days: OFFER.includedDays,
        metadata: { customerName: customerName || '' },
      },
      allow_promotion_codes: true,
      success_url: buildThankYouUrl(credentials.access_token, idioma),
      cancel_url:  `${process.env.FRONTEND_URL}/pricing?lang=${idioma}`,
    });

    /*
     * Queda constancia del intento, pagado o no.
     *
     * La fila de `subscriptions` nace en el webhook, o sea después del pago:
     * quien abría esta pantalla y se iba no dejaba rastro en ninguna parte
     * nuestra. Y es la gente más recuperable que hay, porque ya dio su correo.
     *
     * No bloquea ni puede tumbar la compra: si esto falla, la persona tiene su
     * checkout abierto igual, que es lo único que no se puede perder.
     */
    createAttempt({
      email,
      name: customerName || null,
      stripe_session_id: session.id,
      utm_campaign: utmCampaign || null,
      locale: idioma,
    }).catch((err) => console.error('[Checkout] no se pudo registrar el intento:', err.message));

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
};

// POST /api/stripe/webhook
export const handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

async function handleCheckoutCompleted(session) {
  /* El intento se cierra aquí, aunque el resto falle: es el dato del embudo. */
  markAttemptCompleted(session.id).catch((err) =>
    console.error('[Webhook] no se pudo cerrar el intento:', err.message),
  );

  // Idempotencia: Stripe reintenta los webhooks, así que puede llegar repetido.
  const existing = await findBySession(session.id);
  if (existing) {
    console.log(`[Webhook] Suscripción ya registrada para la sesión ${session.id} — se omite`);
    return;
  }

  const email = (session.customer_email || session.customer_details?.email || '')
    .trim().toLowerCase();
  if (!email) {
    console.error('[Webhook] checkout.session.completed sin email — no se puede vincular el acceso');
    return;
  }

  /* Normalmente el token viene de los metadatos (se creó al abrir el checkout).
   * Si por lo que sea no llegó, se genera aquí y el usuario lo recibe por
   * correo — sigue teniendo acceso, sólo pierde la vuelta directa. */
  const credentials = session.metadata?.accessToken
    ? {
        access_token:     session.metadata.accessToken,
        access_code:      session.metadata.accessCode || null,
        token_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      }
    : await issueAccessCredentials();

  /* El idioma del cliente en Stripe decide en qué idioma le llegan los
   * recibos y las facturas. Checkout no lo rellena solo; se fija aquí con el
   * que vino de la web. Si falla, no se bloquea la compra: el acceso importa
   * más que el idioma de un recibo, y queda en el log. */
  if (session.customer && session.metadata?.locale) {
    try {
      await getStripe().customers.update(session.customer, {
        preferred_locales: [session.metadata.locale],
      });
    } catch (err) {
      console.error('[Webhook] No se pudo fijar el idioma del cliente en Stripe:', err.message);
    }
  }

  let currentPeriodEnd = null;
  if (session.subscription) {
    try {
      const sub = await getStripe().subscriptions.retrieve(session.subscription);
      currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
    } catch (err) {
      console.error('[Webhook] No se pudo leer la suscripción de Stripe:', err.message);
    }
  }

  const descuento = session.total_details?.amount_discount || 0;
  if (descuento > 0) {
    console.log(`[Webhook] ${email} pagó ${session.amount_total} de ${session.amount_subtotal} (descuento ${descuento}, promo ${session.discounts?.[0]?.promotion_code || '?'})`);
  }

  const record = await upsertByEmail({
    email,
    name:                   session.metadata?.customerName || session.customer_details?.name || null,
    stripe_customer_id:     session.customer || null,
    stripe_subscription_id: session.subscription || null,
    stripe_session_id:      session.id,
    plan:                   'monthly',
    /* Lo que Stripe cobró de verdad, no el precio configurado. La primera
     * compra real llevaba un código promocional de 48 $ y el panel decía
     * 49,00 $ cuando se habían cobrado 1,00 $. Con cupones activos, el precio
     * de lista no es un dato: es una intención. */
    price_cents:            session.amount_total ?? OFFER.initialPrice,
    /* El total arranca en lo cobrado hoy. La primera factura (invoice.paid
     * con billing_reason subscription_create) no vuelve a sumarlo: se marca
     * como ya contabilizada con su id, que viene en la sesión. */
    total_paid_cents:       session.amount_total ?? OFFER.initialPrice,
    last_invoice_id:        session.invoice || null,
    renewals_count:         0,
    last_renewal_at:        null,
    currency:               'usd',
    status:                 'active',
    current_period_end:     currentPeriodEnd,
    source:                 'stripe',
    utm_campaign:           session.metadata?.utmCampaign || null,
    /* En qué idioma se compró. Se conocía desde que se abrió el pago —de aquí
     * salen el checkout, el correo de acceso y el enlace al portal— pero vivía
     * solo en los metadatos de la sesión. Guardado, se puede contar: Andrea
     * quiere saber quién llega en inglés y quién en español. */
    locale:                 session.metadata?.locale || null,
    ...credentials,
    // Una suscripción nueva estrena token: se limpia cualquier canje anterior.
    redeemed_at:            null,
    app_user_id:            null,
    reminders_sent:         0,
  });

  // El correo es la red de seguridad de quien cerró la pestaña tras pagar.
  sendAccessEmail(record, session.metadata?.locale).catch(err =>
    console.error('[Email] No se pudo enviar el acceso:', err.message)
  );
}

async function handleSubscriptionChange(subscription) {
  const record =
    (await findByStripeSubscription(subscription.id)) ||
    (await findByStripeCustomer(subscription.customer));
  if (!record) return;

  /* Stripe tiene más estados de los que necesitamos. Lo único que importa
   * para dar o quitar acceso es: activa, en gracia por impago, o cerrada. */
  /*
   * Cancelar en el portal de Stripe NO cierra la suscripción: la marca para
   * terminar al final del periodo ya pagado. Hasta entonces, para Stripe sigue
   * «activa» — y eso es lo que llegaba aquí, así que la baja se guardaba como
   * si no hubiera pasado nada y el aviso salía un mes después, al vencer el
   * periodo. Para entonces ya no hay nada que hacer.
   *
   * Se comprobó el 3 de octubre de 2026 con una baja de prueba: el webhook
   * llegó a los segundos y no dejó rastro en ninguna parte.
   */
  const pidioLaBaja = subscription.cancel_at_period_end === true;

  let status = 'active';
  if (['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)) {
    status = 'canceled';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'incomplete') {
    status = 'incomplete';
  }

  await updateById(record.id, {
    status,
    stripe_subscription_id: subscription.id,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : record.current_period_end,
    /* Cuándo se dio de baja. `status` dice que está cancelada pero no desde
     * cuándo, y sin fecha no se puede saber si las bajas son de este mes o de
     * hace medio año — que es la diferencia entre un problema y un dato.
     * Se pone al cambiar, no en cada evento: Stripe reenvía estos avisos y
     * sobrescribirla movería la fecha de una baja vieja a hoy. Si vuelve a
     * estar activa se limpia, porque ya no es una baja. */
    ...(status === 'canceled' && record.status !== 'canceled'
      ? { canceled_at: new Date().toISOString() }
      : {}),
    ...(status !== 'canceled' && record.canceled_at ? { canceled_at: null } : {}),

    /* Cuándo PIDIÓ irse, que no es cuándo se va. Ver el bloque de abajo. */
    ...(pidioLaBaja && !record.cancel_requested_at
      ? { cancel_requested_at: new Date().toISOString() }
      : {}),
    ...(!pidioLaBaja && record.cancel_requested_at ? { cancel_requested_at: null } : {}),
  });

  /*
   * Una cancelación es la noticia que más vale la pena saber a tiempo, y hasta
   * ahora se registraba en silencio: había que entrar a mirar la tabla.
   *
   * Solo cuando el estado CAMBIA a cancelada: Stripe reenvía estos eventos y
   * manda varios por la misma baja, y un buzón con cinco avisos de la misma
   * persona deja de leerse.
   *
   * El envío no bloquea ni tumba el webhook: si el correo falla, la baja ya
   * está bien guardada, que es lo que no se puede perder.
   */
  /*
   * Y el aviso que faltaba: cuando lo pide, no cuando se cumple.
   *
   * Es el único momento en que se puede hacer algo —escribirle, preguntarle
   * qué pasó, ofrecerle otra cosa—, y la persona sigue teniendo acceso
   * mientras tanto. Solo en el cambio: Stripe reenvía estos eventos, y la
   * columna recién guardada es la que evita repetir el aviso.
   */
  if (pidioLaBaja && !record.cancel_requested_at) {
    sendInternalNotice({
      titulo: 'Alguien pidió la baja de su suscripción',
      responderA: record.email,
      datos: {
        'Correo': record.email,
        'Nombre': record.name || '—',
        'Compró el': record.created_at ? String(record.created_at).slice(0, 10) : '—',
        'Meses cobrados': record.renewals_count ?? 0,
        'Total pagado': `${((record.total_paid_cents ?? 0) / 100).toFixed(2)} USD`,
        'Mantiene el acceso hasta': record.current_period_end
          ? String(record.current_period_end).slice(0, 10)
          : '—',
        'Cliente en Stripe': record.stripe_customer_id || '—',
      },
      nota: 'Todavía no se ha ido: conserva todo hasta esa fecha, y puede deshacerlo desde el mismo portal. Es el momento de escribirle.',
    }).catch((err) => console.error('[Webhook] no se pudo avisar de la baja pedida:', err.message));
  }

  if (status === 'canceled' && record.status !== 'canceled') {
    sendInternalNotice({
      titulo: 'Alguien canceló su suscripción',
      responderA: record.email,
      datos: {
        'Correo': record.email,
        'Nombre': record.name || '—',
        'Plan': record.plan || '—',
        'Compró el': record.created_at ? String(record.created_at).slice(0, 10) : '—',
        'Meses cobrados': record.renewals_count ?? 0,
        'Total pagado': `${((record.total_paid_cents ?? 0) / 100).toFixed(2)} USD`,
        'Acceso hasta': record.current_period_end
          ? String(record.current_period_end).slice(0, 10)
          : '—',
        'Cliente en Stripe': record.stripe_customer_id || '—',
      },
      nota: 'Conserva su carta natal y su lectura base; pierde la lectura diaria y la guía.',
    }).catch((err) => console.error('[Webhook] no se pudo avisar de la cancelación:', err.message));
  }
}

/* Cada factura pagada. Es lo que permite distinguir «compró» de «sigue
 * pagando»: la primera factura es la compra inicial, y cada
 * `subscription_cycle` es una cuota mensual cobrada de verdad.
 *
 * Idempotente por factura: Stripe reintenta los webhooks, y una cuota sumada
 * dos veces sería un cliente que parece más fiel de lo que es. */
async function handleInvoicePaid(invoice) {
  const record =
    (invoice.subscription && (await findByStripeSubscription(invoice.subscription))) ||
    (await findByStripeCustomer(invoice.customer));
  if (!record) return;

  if (record.last_invoice_id === invoice.id) {
    console.log(`[Webhook] Factura ${invoice.id} ya contabilizada — se omite`);
    return;
  }

  const cobrado = invoice.amount_paid || 0;
  const esRenovacion = invoice.billing_reason === 'subscription_cycle';

  const patch = {
    last_invoice_id:  invoice.id,
    total_paid_cents: (record.total_paid_cents || 0) + cobrado,
  };
  if (esRenovacion) {
    patch.renewals_count  = (record.renewals_count || 0) + 1;
    patch.last_renewal_at = new Date((invoice.status_transitions?.paid_at || invoice.created) * 1000).toISOString();
    /* Una cuota pagada cierra cualquier impago anterior. */
    if (record.status === 'past_due') patch.status = 'active';
  }

  await updateById(record.id, patch);
  console.log(`[Webhook] ${record.email}: ${esRenovacion ? 'renovación' : 'factura inicial'} de ${cobrado} (${invoice.id})`);
}

async function handlePaymentFailed(invoice) {
  const record = await findByStripeCustomer(invoice.customer);
  if (!record) return;
  await updateById(record.id, { status: 'past_due' });
}

// GET /api/stripe/session/:sessionId   [público: lo llama la página de gracias]
// Devuelve solo lo que esa página necesita para mostrar el pago y medirlo en
// Google Analytics. Antes devolvía la sesión de Stripe entera —ids de cliente,
// metadatos, el token de acceso dentro— a quien tuviera la URL.
export const getSession = async (req, res, next) => {
  try {
    const s = await getStripe().checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      paid:           s.payment_status === 'paid',
      amountTotal:    s.amount_total,
      amountSubtotal: s.amount_subtotal,
      discount:       s.total_details?.amount_discount || 0,
      currency:       s.currency,
      email:          s.customer_details?.email || s.customer_email || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * A dónde vuelve quien pulsa «Volver a Abundance Code» en el portal de Stripe.
 *
 * Por defecto, la portada de la web. Pero a ese portal se entra desde «Mi
 * Cuenta» dentro de la app, y volver a la portada de marketing es sacar a la
 * persona de donde estaba: Andrea lo probó el 3 de octubre de 2026 y se quedó
 * fuera de su portal sin forma de seguir. Por eso quien abre la sesión puede
 * decir a dónde quiere volver.
 *
 * Se comprueba contra las direcciones propias, no se acepta cualquiera: este
 * valor viaja en el cuerpo de la petición y acaba en una redirección, que es
 * la receta de un «open redirect» si no se mira.
 */
function urlDeRetorno(pedida) {
  const permitidas = [process.env.FRONTEND_URL, process.env.APP_API_URL]
    .filter(Boolean)
    .map((u) => u.replace(/\/$/, ''));

  const valor = String(pedida || '').trim();
  if (valor && permitidas.some((base) => valor === base || valor.startsWith(`${base}/`))) {
    return valor;
  }

  return `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/`;
}

// POST /api/stripe/portal  { email, returnUrl? }
// Portal de cliente de Stripe: cancelar, cambiar tarjeta y ver facturas.
// Es lo que cumple la promesa de "cancela en dos clics" sin construirlo a mano.
export const createPortalSession = async (req, res, next) => {
  try {
    const email  = String(req.body.email || '').trim().toLowerCase();
    const record = await findByEmail(email);

    if (!record || !record.stripe_customer_id) {
      return res.status(404).json({ message: 'No encontramos una suscripción con ese correo.' });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer:   record.stripe_customer_id,
      return_url: urlDeRetorno(req.body.returnUrl),
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};
