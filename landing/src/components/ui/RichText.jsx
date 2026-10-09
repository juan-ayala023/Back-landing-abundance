import { Link } from 'react-router-dom';

/* =========================================================
   RichText — enlaces dentro de un texto traducido.

   Los textos viven en es.js/en.js como cadenas, y `t()` devuelve una cadena.
   Un correo o una política citada en una respuesta tiene que ser un enlace
   real, no texto que hay que copiar. Así que el texto lleva la marca
   [etiqueta](destino) y aquí se convierte:

     mailto: y http(s):  → <a>  (los externos abren en pestaña nueva)
     /ruta               → <Link> del router, sin recargar la web

   Solo eso. No es Markdown: negritas, listas, etc. no se interpretan.
   ========================================================= */
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export default function RichText({ text, as: Tag = 'p', className = '', linkClassName = 'link-ac' }) {
  const parts = [];
  let last = 0;
  let m;
  const src = String(text ?? '');
  while ((m = LINK.exec(src)) !== null) {
    if (m.index > last) parts.push(src.slice(last, m.index));
    const [, label, href] = m;
    const key = `${m.index}-${href}`;
    if (href.startsWith('/')) {
      parts.push(<Link key={key} to={href} className={linkClassName}>{label}</Link>);
    } else {
      const externo = /^https?:/i.test(href);
      parts.push(
        <a key={key} href={href} className={linkClassName}
          {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {label}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push(src.slice(last));
  LINK.lastIndex = 0;

  return <Tag className={className}>{parts}</Tag>;
}
