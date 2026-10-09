import nodemailer from 'nodemailer';
import { buildAccessUrl } from './accessService.js';

/* Tiempos máximos de la conexión SMTP.
 *
 * Sin ellos, un servidor que no contesta deja la promesa colgada para siempre:
 * el 15 de septiembre de 2026 la primera compra real se registró bien y el
 * correo de acceso no salió nunca, sin una sola línea de error, porque el
 * envío se quedó esperando. Y /api/access/resend, que sí espera al envío, no
 * devolvía respuesta. Un fallo tiene que ser un fallo en segundos, y con motivo. */
const TIEMPOS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

/* Las variables llegan tal cual se pegaron en Railway. Un espacio delante
 * del host —de copiarlo de una tabla— convierte «smtp.hostinger.com» en un
 * nombre que DNS no resuelve (EBADNAME), y el correo no sale. Se limpian
 * aquí, que es donde se usan. */
const limpio = (v) => String(v ?? '').trim();

const createTransporter = () => {
  const port = Number(limpio(process.env.SMTP_PORT)) || 587;
  return nodemailer.createTransport({
    host: limpio(process.env.SMTP_HOST),
    port,
    /* 465 es TLS implícito; 587 es STARTTLS. Antes estaba fijo en `false`, así
     * que con el 465 el cliente hablaba en claro a un puerto que espera TLS y
     * la conexión se quedaba muda. Ahora el modo sale del puerto. */
    secure: port === 465,
    auth: { user: limpio(process.env.SMTP_USER), pass: limpio(process.env.SMTP_PASS) },
    ...TIEMPOS,
  });
};

/* Describe el destino sin la contraseña, para que el log de un fallo diga por
 * sí solo contra qué se intentó. */
const destinoSmtp = () =>
  `${limpio(process.env.SMTP_HOST) || '(sin SMTP_HOST)'}:${Number(limpio(process.env.SMTP_PORT)) || 587} como ${limpio(process.env.SMTP_USER) || '(sin SMTP_USER)'}`;

/* =============================================================================
 *  Transporte: API HTTPS de Resend si hay clave; SMTP si no.
 *
 *  Railway bloquea los puertos SMTP (25, 465, 587) en los planes Free, Trial y
 *  Hobby: desde ahí ningún correo salió nunca, con ninguna configuración.
 *  Resend envía por HTTPS, que no está bloqueado, con mejor entregabilidad
 *  que un SMTP compartido, y su plan gratuito cubre de sobra el volumen.
 *
 *  SMTP se conserva como alternativa para quien despliegue en otro sitio.
 * ============================================================================*/
async function enviarPorResend(mensaje) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${limpio(process.env.RESEND_API_KEY)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     mensaje.from,
      to:       [mensaje.to],
      subject:  mensaje.subject,
      html:     mensaje.html,
      /* Si el cliente responde, que llegue al buzón de soporte — salvo que el
       * mensaje traiga su propio reply_to (el formulario de contacto). */
      reply_to: mensaje.reply_to || limpio(process.env.EMAIL_FROM) || undefined,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${cuerpo.message || JSON.stringify(cuerpo)}`);
  }
  return { messageId: cuerpo.id };
}

async function enviar(mensaje) {
  const porApi = Boolean(limpio(process.env.RESEND_API_KEY));
  try {
    const info = porApi
      ? await enviarPorResend(mensaje)
      : await createTransporter().sendMail(mensaje);
    console.log(`[Email] Enviado a ${mensaje.to} vía ${porApi ? 'Resend (HTTPS)' : destinoSmtp()} (${info.messageId})`);
    return info;
  } catch (err) {
    /* Se re-lanza con el destino dentro: quien lea el log sabrá si el problema
     * es el host, el puerto o la credencial sin abrir Railway a mirar variables. */
    if (!porApi) err.message = `SMTP ${destinoSmtp()}: ${err.message}`;
    throw err;
  }
}

/* Paleta de la marca — la misma que usa la web. */
const IVORY     = '#F5F1ED';
const CARD      = '#FFFDF7';
const BEIGE     = '#E8DCC8';
const CHAMPAGNE = '#D4AF37';
const MOKA      = '#3D2817';
const MUTED     = '#5B3E2A';

/* =============================================================================
 *  Correo de acceso
 *
 *  Es la red de seguridad: quien paga vuelve a la app directamente desde
 *  Stripe, así que este correo es para quien cerró la pestaña. El enlace lleva
 *  el token dentro, de modo que la cuenta queda vinculada al correo que pagó
 *  sin que el usuario tenga que acordarse de nada.
 *
 *  Sale en el idioma en que la persona compró. La web lo manda al abrir el
 *  checkout, viaja en los metadatos de Stripe y llega aquí por el webhook; en
 *  el reenvío lo manda la propia página. Sin idioma conocido, español.
 * ============================================================================*/

/* Textos del correo. Andrea redacta los definitivos; la estructura ya admite
 * cambiarlos aquí sin tocar la plantilla. */
const TEXTOS = {
  // Texto de p1/p2 fijado por la propietaria (16 sept 2026): tuteo.
  es: {
    subject:    'Tu acceso a Abundance Code está listo ✦',
    eyebrow:    'Tu portal está abierto',
    saludo:     (name) => `Te damos la bienvenida${name}.`,
    p1:         'Tu suscripción ya está activa. Haz clic en el botón para crear tu cuenta y acceder a tu portal. Tu cuenta quedará vinculada automáticamente a este correo.',
    p2:         'Una vez dentro, ingresa tu fecha, hora y lugar de nacimiento. Con estos datos calcularemos tu carta natal y, en pocos minutos, tendrás tu primera lectura.',
    cta:        'ENTRAR A MI PORTAL',
    siFalla:    'Si el botón no funciona, copia y pega este enlace:',
    respaldo:   'Código de respaldo',
    caduca:     'Este enlace es personal y caduca en 30 días. Si lo pierdes, pide uno nuevo en',
    pie:        'Abundance Code · Puedes cancelar tu suscripción cuando quieras desde tu cuenta.',
  },
  en: {
    subject:    'Your Abundance Code access is ready ✦',
    eyebrow:    'Your portal is open',
    saludo:     (name) => `Welcome${name}.`,
    p1:         'Your subscription is active. This button takes you into your portal and creates your account — it is already linked to this same email, there is nothing else to do.',
    p2:         'Inside, we will ask for your date, time and place of birth. With that we calculate your natal chart and within minutes you have your first reading.',
    cta:        'ENTER MY PORTAL',
    siFalla:    'If the button does not work, copy and paste this link:',
    respaldo:   'Backup code',
    caduca:     'This link is personal and expires in 30 days. If you lose it, request a new one at',
    pie:        'Abundance Code · You can cancel your subscription any time from your account.',
  },
};

/* Normaliza lo que llegue: 'en-US', 'EN', undefined… → 'es' | 'en'. */
export function idiomaDeCorreo(valor) {
  return String(valor || '').trim().toLowerCase().startsWith('en') ? 'en' : 'es';
}

export const sendAccessEmail = async (subscription, locale) => {
  const x = TEXTOS[idiomaDeCorreo(locale)];
  if (!limpio(process.env.RESEND_API_KEY) && !limpio(process.env.SMTP_USER)) {
    console.log('[Email] SMTP sin configurar — se omite el correo de acceso');
    return;
  }

  const url  = buildAccessUrl(subscription.access_token, idiomaDeCorreo(locale));
  const name = subscription.name ? `, ${subscription.name}` : '';

  await enviar({
    from: `"Abundance Code" <${limpio(process.env.EMAIL_FROM)}>`,
    to: subscription.email,
    subject: x.subject,
    html: `
      <div style="font-family: Montserrat, Helvetica, Arial, sans-serif; background:${IVORY}; padding:40px 20px;">
        <div style="max-width:560px; margin:0 auto; background:${CARD}; border:1px solid ${BEIGE}; border-radius:16px; padding:40px;">

          <p style="color:${CHAMPAGNE}; font-size:11px; letter-spacing:3px; text-transform:uppercase; margin:0 0 20px;">
            ${x.eyebrow}
          </p>

          <h1 style="color:${MOKA}; font-size:24px; line-height:1.3; margin:0 0 20px; font-weight:600;">
            ${x.saludo(name)}
          </h1>

          <p style="color:${MOKA}; font-size:15px; line-height:1.6; margin:0 0 12px;">
            ${x.p1}
          </p>

          <p style="color:${MUTED}; font-size:14px; line-height:1.6; margin:0 0 28px;">
            ${x.p2}
          </p>

          <div style="text-align:center; margin:0 0 28px;">
            <a href="${url}"
               style="display:inline-block; background:${MOKA}; color:${IVORY}; padding:16px 36px;
                      border-radius:999px; text-decoration:none; font-weight:600; font-size:14px;
                      letter-spacing:0.06em;">
              ${x.cta}
            </a>
          </div>

          <p style="color:${MUTED}; font-size:12px; line-height:1.6; margin:0 0 24px; text-align:center;">
            ${x.siFalla}<br>
            <span style="color:${MOKA}; word-break:break-all;">${url}</span>
          </p>

          ${subscription.access_code ? `
          <div style="background:${BEIGE}; border-radius:12px; padding:18px; text-align:center; margin:0 0 24px;">
            <p style="color:${MUTED}; font-size:10px; letter-spacing:2px; text-transform:uppercase; margin:0 0 6px;">
              ${x.respaldo}
            </p>
            <p style="color:${MOKA}; font-size:20px; font-weight:700; letter-spacing:3px; margin:0;">
              ${subscription.access_code}
            </p>
          </div>` : ''}

          <div style="border-top:1px solid ${BEIGE}; padding-top:20px; margin-top:8px;">
            <p style="color:${MUTED}; font-size:12px; line-height:1.6; margin:0;">
              ${x.caduca}
              <a href="${process.env.FRONTEND_URL}/activar-acceso" style="color:${CHAMPAGNE};">
                ${(process.env.FRONTEND_URL || '').replace(/^https?:\/\//, '')}/activar-acceso
              </a>.
            </p>
          </div>
        </div>

        <p style="text-align:center; color:${MUTED}; font-size:11px; margin:24px 0 0;">
          ${x.pie}
        </p>
      </div>
    `,
  });
};

/* Recordatorio para quien pagó y nunca llegó a entrar. */
export const sendAccessReminderEmail = async (subscription) => {
  if (!process.env.SMTP_USER) return;

  /* Este recordatorio solo existe en español —su asunto y su cuerpo lo están—
     así que el enlace va en español. Si algún día se traduce, el idioma de la
     compra viaja en los metadatos de Stripe. */
  const url = buildAccessUrl(subscription.access_token, 'es');

  await enviar({
    from: `"Abundance Code" <${limpio(process.env.EMAIL_FROM)}>`,
    to: subscription.email,
    subject: 'Tu carta natal sigue esperándote ✦',
    html: `
      <div style="font-family: Montserrat, Helvetica, Arial, sans-serif; background:${IVORY}; padding:40px 20px;">
        <div style="max-width:560px; margin:0 auto; background:${CARD}; border:1px solid ${BEIGE}; border-radius:16px; padding:40px;">
          <h1 style="color:${MOKA}; font-size:22px; line-height:1.3; margin:0 0 16px; font-weight:600;">
            Tu portal está pagado y sin abrir.
          </h1>
          <p style="color:${MOKA}; font-size:15px; line-height:1.6; margin:0 0 28px;">
            Todavía no has creado tu cuenta, así que tu carta natal sigue sin calcularse.
            Son dos minutos y este enlace lo deja todo listo.
          </p>
          <div style="text-align:center;">
            <a href="${url}"
               style="display:inline-block; background:${MOKA}; color:${IVORY}; padding:16px 36px;
                      border-radius:999px; text-decoration:none; font-weight:600; font-size:14px;
                      letter-spacing:0.06em;">
              ENTRAR A MI PORTAL
            </a>
          </div>
        </div>
      </div>
    `,
  });
};

/* =============================================================================
 *  Mensaje del formulario de contacto → buzón de soporte
 *
 *  El formulario de la web marcaba «enviado» sin enviar nada (un TODO). Todo
 *  lo que un cliente escribió ahí se perdió. Ahora llega a EMAIL_FROM —el
 *  buzón de soporte— con reply_to al remitente, para contestar con un clic.
 * ============================================================================*/
const escapeHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const sendContactEmail = async ({ name, email, subject, message, locale }) => {
  if (!limpio(process.env.RESEND_API_KEY) && !limpio(process.env.SMTP_USER)) {
    throw new Error('Correo sin configurar');
  }
  const soporte = limpio(process.env.EMAIL_FROM);
  const asunto  = subject ? `[Contacto] ${subject}` : '[Contacto] Mensaje desde la web';

  return enviar({
    from:     `"Abundance Code · Web" <${soporte}>`,
    to:       soporte,
    subject:  asunto,
    reply_to: email,
    html: `
      <div style="font-family: Montserrat, Helvetica, Arial, sans-serif; color:${MOKA}; font-size:15px; line-height:1.6;">
        <p style="margin:0 0 4px;"><strong>De:</strong> ${escapeHtml(name || '—')} &lt;${escapeHtml(email)}&gt;</p>
        <p style="margin:0 0 4px;"><strong>Asunto:</strong> ${escapeHtml(subject || '—')}</p>
        <p style="margin:0 0 16px; color:${MUTED}; font-size:12px;">Idioma de la web: ${escapeHtml(locale || 'es')}</p>
        <div style="white-space:pre-wrap; border-left:3px solid ${CHAMPAGNE}; padding-left:12px;">${escapeHtml(message)}</div>
        <p style="margin:24px 0 0; color:${MUTED}; font-size:12px;">Responde a este correo para contestar directamente a la persona.</p>
      </div>
    `,
  });
};

/**
 * Un aviso al buzón de soporte: algo ha pasado y alguien tiene que mirarlo.
 *
 * Nace de dos cosas que se quedaban calladas. Una solicitud de corrección de
 * datos de nacimiento se guardaba en la base y nadie se enteraba: había que
 * entrar a mirar la tabla, así que podía quedarse semanas. Y una cancelación
 * se registraba sin más, cuando es justo el momento en que conviene saberlo.
 *
 * Va a `EMAIL_FROM`, el buzón real del producto, y no a una lista aparte: es
 * el mismo sitio donde ya aterrizan los mensajes del formulario de contacto.
 *
 * `reply_to` apunta a la persona cuando se conoce, para poder contestarle con
 * un clic sin buscar su correo en ninguna parte.
 */
export const sendInternalNotice = async ({ titulo, datos, responderA, nota }) => {
  if (!limpio(process.env.RESEND_API_KEY) && !limpio(process.env.SMTP_USER)) {
    throw new Error('Correo sin configurar');
  }

  const soporte = limpio(process.env.EMAIL_FROM);
  const filas = Object.entries(datos || {})
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(
      ([clave, valor]) => `
        <tr>
          <td style="padding:6px 12px 6px 0; color:${MUTED}; font-size:13px; vertical-align:top; white-space:nowrap;">${escapeHtml(clave)}</td>
          <td style="padding:6px 0; font-size:14px;">${escapeHtml(valor)}</td>
        </tr>`,
    )
    .join('');

  return enviar({
    from:     `"Abundance Code · Avisos" <${soporte}>`,
    to:       soporte,
    subject:  `[Aviso] ${titulo}`,
    reply_to: responderA || undefined,
    html: `
      <div style="font-family: Montserrat, Helvetica, Arial, sans-serif; color:${MOKA}; font-size:15px; line-height:1.6;">
        <p style="margin:0 0 16px; font-size:17px;"><strong>${escapeHtml(titulo)}</strong></p>
        <table style="border-collapse:collapse; margin:0 0 16px;">${filas}</table>
        ${nota ? `<p style="margin:0; color:${MUTED}; font-size:13px;">${escapeHtml(nota)}</p>` : ''}
      </div>
    `,
  });
};
