/* =========================================================
   ABUNDANCE CODE — Imagen de sección

   Marco común para las fotos de la web: hereda el lenguaje visual de las
   tarjetas (esquinas rounded-2xl + borde beige) para que las imágenes no
   parezcan pegadas encima del diseño.

   Tres proporciones, y no una por foto:
     section  4:3   — la foto que acompaña a un bloque de texto
     banner   5:2   — banda ancha entre secciones
     square   1:1   — capturas de la app y retratos que ya vienen cuadrados
   `variant` fija la proporción; el archivo se recorta con object-cover y
   `imgClassName` decide por dónde (object-top cuando la cabeza está arriba).

   width/height van siempre al <img> aunque el tamaño real lo decida el CSS:
   el navegador reserva el hueco con esa proporción y el texto de debajo no
   salta cuando la imagen termina de cargar. El fondo beige del marco hace
   además de placeholder: una imagen diferida se ve como un bloque de color,
   no como un hueco roto.
   ========================================================= */
const VARIANTS = {
  section: 'aspect-[4/3]',
  banner:  'aspect-[5/2]',
  square:  'aspect-square',
  natural: '',
};

export default function SectionImage({
  src,
  alt,
  width,
  height,
  variant = 'natural',
  className = '',
  imgClassName = '',
  priority = false,
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${VARIANTS[variant] ?? ''} ${className}`}
      style={{ background: '#E8DCC8', border: '1px solid #E8DCC8', boxShadow: '0 10px 30px rgba(61,40,23,0.07)' }}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`w-full h-full object-cover ${imgClassName}`}
      />
    </div>
  );
}
