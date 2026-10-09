import { sendInternalNotice } from '../services/emailService.js';

/**
 * Avisos que nacen dentro de la app y tienen que llegar a un buzón.
 *
 * La app no manda correos: quien tiene Resend es este backend. Y hay cosas que
 * la app sabe y nadie más —una solicitud de corrección de datos de nacimiento,
 * por ejemplo— que hasta ahora se guardaban en una tabla y ahí se quedaban. El
 * dueño tenía que acordarse de entrar a mirarla.
 *
 * Solo la app puede llamar aquí: el middleware `requireAppSecret` exige el
 * secreto compartido. Sin él, esto sería un formulario de contacto abierto
 * contra el buzón del negocio.
 */

/** Tipos admitidos, para que el asunto del correo no lo escriba quien llama. */
const TITULOS = {
  correccion: 'Solicitud de corrección de datos de nacimiento',
};

// POST /api/notify  { tipo, email?, datos?, nota? }
export const sendNotice = async (req, res, next) => {
  try {
    const tipo = String(req.body?.tipo || '').trim();
    const titulo = TITULOS[tipo];

    if (!titulo) {
      return res.status(400).json({ message: 'Tipo de aviso desconocido.' });
    }

    /*
     * Los datos llegan como pares para pintarlos tal cual, pero se acotan: una
     * lista larga o un valor enorme convertiría este endpoint en una forma de
     * mandarse a sí mismo lo que sea.
     */
    const datos = {};
    for (const [clave, valor] of Object.entries(req.body?.datos || {}).slice(0, 12)) {
      datos[String(clave).slice(0, 60)] = String(valor ?? '').slice(0, 500);
    }

    await sendInternalNotice({
      titulo,
      datos,
      responderA: String(req.body?.email || '').trim() || undefined,
      nota: String(req.body?.nota || '').slice(0, 300) || undefined,
    });

    res.json({ sent: true });
  } catch (err) {
    next(err);
  }
};
