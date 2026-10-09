import { Router } from 'express';
import { sendContactEmail } from '../services/emailService.js';

/* =============================================================================
 *  POST /api/contact   { name, email, subject, message, locale, website }
 *
 *  Público. Dos defensas sin dependencias: un campo trampa (`website`) que un
 *  humano nunca rellena, y un límite por IP para que nadie use el formulario
 *  como cañón de correo contra el buzón de soporte.
 * ============================================================================*/
const router = Router();

const VENTANA_MS = 10 * 60 * 1000;
const MAX_POR_VENTANA = 5;
const intentos = new Map(); // ip → [timestamps]

function permitido(ip) {
  const ahora = Date.now();
  const lista = (intentos.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  if (lista.length >= MAX_POR_VENTANA) return false;
  lista.push(ahora);
  intentos.set(ip, lista);
  return true;
}

const esEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));

router.post('/', async (req, res, next) => {
  try {
    const { name = '', email = '', subject = '', message = '', locale = 'es', website = '' } = req.body || {};

    /* Campo trampa relleno = bot. Se responde ok para no darle pistas. */
    if (website) return res.json({ ok: true });

    if (!esEmail(email) || String(message).trim().length < 5) {
      return res.status(400).json({ message: 'Falta un correo válido o el mensaje' });
    }
    if (String(message).length > 5000) {
      return res.status(400).json({ message: 'El mensaje es demasiado largo' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    if (!permitido(ip)) {
      return res.status(429).json({ message: 'Demasiados mensajes seguidos. Inténtalo en unos minutos.' });
    }

    await sendContactEmail({
      name:    String(name).slice(0, 200),
      email:   String(email).trim().toLowerCase(),
      subject: String(subject).slice(0, 200),
      message: String(message),
      locale,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[Contacto] No se pudo entregar el mensaje:', err.message);
    next(err);
  }
});

export default router;
