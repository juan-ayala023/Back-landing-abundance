/**
 * Cliente de la app (app.abundancecode.us) — el sentido inverso de la
 * integración.
 *
 * Hasta ahora el tráfico iba solo en una dirección: la app preguntaba aquí
 * quién había pagado. El panel de administración necesita lo contrario, y no
 * por capricho de arquitectura: la app usa OTRO proyecto de Supabase, así que
 * ninguna consulta desde este backend puede ver a sus usuarios. Y las cortesías
 * no las vería ni compartiendo base, porque no son filas: son la variable
 * ACCESOS_CORTESIA que solo lee el servidor de la app.
 *
 * Variables de entorno:
 *   APP_API_URL         — https://app.abundancecode.us (sin barra final)
 *   APP_SHARED_SECRET   — el mismo que ya valida las llamadas que ella hace aquí
 *
 * Se reutiliza APP_SHARED_SECRET a propósito: es el mismo par de sistemas
 * confiando el uno en el otro. Un secreto distinto por sentido serían dos
 * valores que rotar en dos paneles distintos, y el olvido de uno rompería la
 * mitad de la integración sin que la otra mitad avisara.
 */

/* Si la app no responde, el panel tiene que decirlo y seguir funcionando: no
 * puede quedarse colgado esperando a un servicio que quizá está desplegando. */
const TIEMPO_MAXIMO_MS = 8000;

export function isConfigured() {
  return !!(process.env.APP_API_URL && process.env.APP_SHARED_SECRET);
}

/* Error propio para que el controlador distinga "la app dijo que no" de un
 * fallo de programación, y pueda responder algo útil en vez de un 500 mudo. */
export class AppUnavailableError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'AppUnavailableError';
    this.status = status;
  }
}

/**
 * Usuarios registrados en la app y su acceso, ya resuelto por ella.
 *
 * Devuelve { usuarios, resumen } tal y como los calcula la app. Este backend no
 * reinterpreta el acceso: quien conoce la lista de cortesías es ella, y duplicar
 * aquí esa lógica garantizaría que algún día las dos digan cosas distintas.
 */
export async function fetchPortalUsers() {
  if (!isConfigured()) {
    throw new AppUnavailableError(
      'Integración con la app no configurada: faltan APP_API_URL o APP_SHARED_SECRET',
    );
  }

  const base = process.env.APP_API_URL.replace(/\/$/, '');
  const pedir = () => fetch(`${base}/api/admin/usuarios`, {
    headers: { Authorization: `Bearer ${process.env.APP_SHARED_SECRET}` },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    cache: 'no-store',
  });

  let res;
  try {
    res = await pedir();
    /* Un 502/503 casi siempre es Railway cambiando la app de versión: dura
     * unos segundos. Un reintento evita que el panel enseñe un error por
     * abrirse en el momento equivocado. Solo uno: si persiste, es real. */
    if (res.status === 502 || res.status === 503) {
      await new Promise((r) => setTimeout(r, 2500));
      res = await pedir();
    }
  } catch (err) {
    /* Timeout, DNS, TLS… Nada de esto es culpa de quien mira el panel, así que
     * el detalle va al log y al administrador se le dice que la app no responde. */
    console.error('[appService] no se pudo contactar con la app:', err.message);
    throw new AppUnavailableError('La app no responde ahora mismo');
  }

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    console.error(`[appService] la app respondió ${res.status}:`, detalle.slice(0, 300));

    /* Un 401 aquí significa que los dos APP_SHARED_SECRET no coinciden. Se dice
     * explícitamente porque es el fallo más probable al desplegar esto y el más
     * desconcertante de diagnosticar a ciegas. */
    if (res.status === 401) {
      throw new AppUnavailableError(
        'La app rechazó la autenticación: APP_SHARED_SECRET no coincide entre los dos servicios',
      );
    }

    throw new AppUnavailableError(`La app respondió con un error (${res.status})`);
  }

  return res.json();
}

/**
 * Borra la cuenta de un usuario en la app. Devuelve lo que responda ella:
 * { ok, email, cortesia }. Los 4xx de la app se propagan con su mensaje para
 * que el panel los muestre tal cual.
 */
export async function deletePortalUser(id) {
  if (!isConfigured()) {
    throw new AppUnavailableError(
      'Integración con la app no configurada: faltan APP_API_URL o APP_SHARED_SECRET',
    );
  }

  const base = process.env.APP_API_URL.replace(/\/$/, '');

  let res;
  try {
    res = await fetch(`${base}/api/admin/usuarios`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.APP_SHARED_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
  } catch (err) {
    console.error('[appService] no se pudo contactar con la app:', err.message);
    throw new AppUnavailableError('La app no responde ahora mismo');
  }

  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      throw new AppUnavailableError(
        'La app rechazó la autenticación: APP_SHARED_SECRET no coincide entre los dos servicios',
      );
    }
    throw new AppUnavailableError(cuerpo.message || `La app respondió con un error (${res.status})`, res.status);
  }

  return cuerpo;
}

/**
 * Archiva la lectura, el retrato y la activación de hoy de una persona para
 * que la app los reescriba en su próxima visita. No genera nada aquí: la app
 * responde en menos de un segundo y el trabajo ocurre cuando la persona entre.
 *
 * Existe porque las lecturas se escriben una sola vez: cuando cambia la voz
 * con la que se redactan, quien ya tenía lectura sigue leyendo la vieja.
 *
 * Devuelve { archivadas: [...] }. Los 404/409 de la app llegan con su mensaje
 * para que el panel los muestre tal cual.
 */
export async function regenerarLectura(email) {
  if (!isConfigured()) {
    throw new AppUnavailableError(
      'Integración con la app no configurada: faltan APP_API_URL o APP_SHARED_SECRET',
    );
  }

  const base = process.env.APP_API_URL.replace(/\/$/, '');

  let res;
  try {
    res = await fetch(`${base}/api/admin/regenerar-lectura`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.APP_SHARED_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
  } catch (err) {
    console.error('[appService] no se pudo contactar con la app:', err.message);
    throw new AppUnavailableError('La app no responde ahora mismo');
  }

  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      throw new AppUnavailableError(
        'La app rechazó la autenticación: APP_SHARED_SECRET no coincide entre los dos servicios',
      );
    }
    throw new AppUnavailableError(cuerpo.message || `La app respondió con un error (${res.status})`, res.status);
  }

  return cuerpo;
}

/**
 * Corrige la fecha o la hora de nacimiento de una persona.
 *
 * La app archiva lo escrito, lo vacía y borra la carta para recalcularla; aquí
 * solo se transporta. Es la otra mitad de «Solicitar una corrección»: hasta
 * ahora la solicitud llegaba al buzón y no había con qué atenderla.
 *
 * Devuelve { archivadas, antes, ahora } para que el panel pueda decir qué
 * cambió exactamente, que en un dato así no es un detalle.
 */
export async function corregirNacimiento(datos) {
  if (!isConfigured()) {
    throw new AppUnavailableError(
      'Integración con la app no configurada: faltan APP_API_URL o APP_SHARED_SECRET',
    );
  }

  const base = process.env.APP_API_URL.replace(/\/$/, '');

  let res;
  try {
    res = await fetch(`${base}/api/admin/corregir-nacimiento`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.APP_SHARED_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
  } catch (err) {
    console.error('[appService] no se pudo contactar con la app:', err.message);
    throw new AppUnavailableError('La app no responde ahora mismo');
  }

  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      throw new AppUnavailableError(
        'La app rechazó la autenticación: APP_SHARED_SECRET no coincide entre los dos servicios',
      );
    }
    throw new AppUnavailableError(cuerpo.message || `La app respondió con un error (${res.status})`, res.status);
  }

  return cuerpo;
}

/**
 * Buscar ciudades para el formulario de corrección del panel.
 *
 * Las credenciales del proveedor viven en la app y no salen de ahí; esto solo
 * transporta la pregunta. Una ciudad no es un texto: trae coordenadas y zona
 * horaria, y de ellas salen el ascendente y las casas.
 */
export async function buscarCiudades(q) {
  if (!isConfigured()) {
    throw new AppUnavailableError(
      'Integración con la app no configurada: faltan APP_API_URL o APP_SHARED_SECRET',
    );
  }

  const base = process.env.APP_API_URL.replace(/[/]$/, '');

  let res;
  try {
    res = await fetch(`${base}/api/admin/ciudades?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${process.env.APP_SHARED_SECRET}` },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[appService] no se pudo contactar con la app:', err.message);
    throw new AppUnavailableError('La app no responde ahora mismo');
  }

  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AppUnavailableError(cuerpo.message || 'No se pudo buscar ciudades', res.status);
  }

  return cuerpo;
}

/**
 * Traduce un puñado de textos. La IA vive en la app; aquí solo se transporta.
 *
 * Se le pasa un mapa de campos y vuelve el mismo mapa traducido. El backend no
 * tiene clave de modelo y no la va a tener: una clave en dos sitios es una
 * clave que alguien olvida rotar.
 */
export async function traducirTextos({ idioma, textos, que }) {
  if (!isConfigured()) {
    throw new AppUnavailableError(
      'Integración con la app no configurada: faltan APP_API_URL o APP_SHARED_SECRET',
    );
  }

  const base = process.env.APP_API_URL.replace(/[/]$/, '');

  let res;
  try {
    res = await fetch(`${base}/api/admin/traducir`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.APP_SHARED_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idioma, textos, que }),
      /* Un artículo entero tarda más que una consulta corriente: el tiempo de
       * espera general dejaría la traducción a medias y sin guardar. */
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    console.error('[appService] no se pudo contactar con la app:', err.message);
    throw new AppUnavailableError('La app no responde ahora mismo');
  }

  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AppUnavailableError(cuerpo.message || 'No se pudo traducir', res.status);
  }

  return cuerpo.textos || {};
}
