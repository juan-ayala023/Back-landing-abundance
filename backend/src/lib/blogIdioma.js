/* =============================================================================
 *  El blog en el idioma de quien lee.
 *
 *  La web traduce sus menús y sus botones porque están escritos a mano en los
 *  dos idiomas. Un artículo no: es contenido, y hasta ahora se publicaba en un
 *  idioma y se veía igual en el otro. Quien escribía tenía que elegir a qué
 *  mitad de su público le hablaba.
 *
 *  Ahora cada entrada guarda su original y sus traducciones, y aquí se decide
 *  cuál se sirve. Dos reglas:
 *
 *  1. Si no hay traducción al idioma pedido, **se devuelve el original**. Un
 *     artículo en el idioma equivocado se lee a medias; una página en blanco no
 *     se lee en absoluto.
 *  2. Lo que no es texto —la imagen, el autor, las fechas, el slug— no se toca.
 *     La URL es la misma pieza en los dos idiomas, y de eso depende que Google
 *     las entienda como una sola con dos versiones.
 * ============================================================================*/

/** Los campos que sí cambian de idioma. El resto de la fila se conserva. */
const TRADUCIBLES = [
  'title',
  'excerpt',
  'content',
  'seo_title',
  'seo_description',
  'image_alt',
  'og_title',
  'og_description',
];

export function idiomaPedido(valor) {
  return valor === 'en' ? 'en' : 'es';
}

/**
 * La entrada en el idioma pedido, o el original si no existe esa versión.
 *
 * Devuelve además `idiomaServido`, porque quien pinta la página necesita saber
 * si está enseñando una traducción o el original: de ahí sale el `lang` del
 * HTML, y un artículo en inglés etiquetado como español le dice a Google que
 * traduzca lo que ya está traducido.
 */
export function enIdioma(post, idioma) {
  if (!post) return post;

  const quiere = idiomaPedido(idioma);
  const original = post.idioma || 'es';
  if (quiere === original) return { ...post, idiomaServido: original };

  const version = post.traducciones?.[quiere];
  if (!version) return { ...post, idiomaServido: original };

  const traducido = { ...post, idiomaServido: quiere };
  for (const campo of TRADUCIBLES) {
    /* Campo a campo, y solo si tiene algo: una traducción a la que le falte
     * el `seo_title` debe caer en el del original, no dejarlo vacío. */
    const valor = version[campo];
    if (typeof valor === 'string' && valor.trim()) traducido[campo] = valor;
  }
  return traducido;
}

/** Los idiomas en que existe esa entrada, el original primero. */
export function idiomasDe(post) {
  const original = post?.idioma || 'es';
  const otros = Object.keys(post?.traducciones || {}).filter((i) => i !== original);
  return [original, ...otros];
}

export { TRADUCIBLES };
