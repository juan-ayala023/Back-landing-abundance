/* =========================================================
   ZodiacWheel — la rueda de la carta natal, como marca de agua.

   El toque astrológico se apoya en geometría, no en los símbolos ♈♉♊ de
   Unicode: Montserrat no los trae, así que el sistema los sustituiría por su
   fuente de emoji y saldrían de colores, rompiendo la paleta. Además en
   Android e iOS se dibujan distinto. Los anillos, las divisiones de casas y
   la figura de aspectos se leen igual como "carta natal" y se ven idénticos
   en todos los teléfonos.

   Dos grupos giran en sentidos opuestos y muy despacio (minutos por vuelta):
   la rueda no debe "animarse", debe respirar. Con prefers-reduced-motion se
   queda quieta — ver .ac-spin-slow en index.css.

   Es decoración pura: aria-hidden y sin capturar el puntero.
   ========================================================= */

const GOLD = '#D4AF37';

/* Punto del círculo a un ángulo dado. -90 para que 0° quede arriba, como en
   una carta real y no a las 3 en punto que es donde el SVG empieza a contar. */
function pt(angleDeg, radius, cx = 200, cy = 200) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
}

function polygon(sides, radius, offset = 0) {
  return Array.from({ length: sides }, (_, i) => pt(offset + (360 / sides) * i, radius).join(','))
    .join(' ');
}

export default function ZodiacWheel({
  className = '',
  opacity = 0.5,
  spin = 240,          // segundos por vuelta del anillo exterior
  style = {},
}) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      {/* ---- Anillo exterior: zodiaco y grados ---- */}
      <g
        className="ac-spin-slow"
        style={{ animationDuration: `${spin}s`, transformOrigin: '200px 200px' }}
      >
        <circle cx="200" cy="200" r="190" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.55" />
        <circle cx="200" cy="200" r="162" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.55" />

        {/* Marcas de grado cada 5°, más largas cada 30° (cambio de signo) */}
        {Array.from({ length: 72 }, (_, i) => {
          const angle = i * 5;
          const isSign = i % 6 === 0;
          const [x1, y1] = pt(angle, 162);
          const [x2, y2] = pt(angle, isSign ? 190 : 182);
          return (
            <line
              key={angle}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={GOLD}
              strokeWidth={isSign ? 1 : 0.6}
              opacity={isSign ? 0.75 : 0.35}
            />
          );
        })}

        {/* Un punto por signo, en mitad de su sector */}
        {Array.from({ length: 12 }, (_, i) => {
          const [cx, cy] = pt(i * 30 + 15, 176);
          return <circle key={i} cx={cx} cy={cy} r="2.4" fill={GOLD} opacity="0.6" />;
        })}
      </g>

      {/* ---- Anillo de casas ---- */}
      <g
        className="ac-spin-slow ac-spin-reverse"
        style={{ animationDuration: `${spin * 1.6}s`, transformOrigin: '200px 200px' }}
      >
        <circle cx="200" cy="200" r="120" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.45" />
        {Array.from({ length: 12 }, (_, i) => {
          const [x1, y1] = pt(i * 30, 120);
          const [x2, y2] = pt(i * 30, 162);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="0.7" opacity="0.3" />;
        })}
      </g>

      {/* ---- Figura de aspectos: trígono y cuadratura ---- */}
      <g
        className="ac-spin-slow ac-spin-reverse"
        style={{ animationDuration: `${spin * 2.4}s`, transformOrigin: '200px 200px' }}
      >
        <circle cx="200" cy="200" r="118" fill="none" stroke={GOLD} strokeWidth="0.5" opacity="0.25" />
        <polygon points={polygon(3, 118, 12)} fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.4" />
        <polygon points={polygon(4, 118, 48)} fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.28" />
        {/* Los vértices son los "planetas": el ojo se agarra a ellos */}
        {[12, 132, 252].map((a) => {
          const [cx, cy] = pt(a, 118);
          return <circle key={a} cx={cx} cy={cy} r="3" fill={GOLD} opacity="0.55" />;
        })}
      </g>
    </svg>
  );
}
