import { useMemo } from 'react';

/* =========================================================
   StarField — capa de estrellas de fondo.

   Venía del diseño oscuro anterior: pintaba estrellas BLANCAS y las animaba
   con un keyframe `twinkle` que no existía en el CSS. Sobre el marfil actual
   (#F5F1ED) eso era invisible y quieto — decoración muerta en 8 páginas.

   Ahora las estrellas son champán y moka a baja opacidad, que sí se leen
   sobre marfil, y parpadean de verdad.

   Va en un solo <svg> en lugar de N divs absolutos: el navegador lo pinta
   como una capa y no como ochenta, que en móvil es la diferencia que cuenta.
   Sin viewBox, así que cx/cy aceptan porcentajes y r queda en píxeles: las
   estrellas se reparten por todo el bloque sin deformarse.
   ========================================================= */

/* PRNG con semilla. Math.random() suelto hacía que cada re-render recolocara
   y recoloreara las estrellas; con semilla fija el cielo es siempre el mismo. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHAMPAGNE = '#D4AF37';
const MOKA = '#5B3E2A';

export default function StarField({ count = 80, seed = 7 }) {
  const stars = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
      // Tres profundidades: lejanas pequeñas y tenues, cercanas grandes y vivas.
      const depth = rnd();
      const near = depth > 0.85;
      const mid = depth > 0.5;
      return {
        id: i,
        cx: `${(rnd() * 100).toFixed(2)}%`,
        cy: `${(rnd() * 100).toFixed(2)}%`,
        r: near ? 1.5 + rnd() * 0.9 : mid ? 0.9 + rnd() * 0.5 : 0.5 + rnd() * 0.35,
        // El champán es el acento de marca; el moka da profundidad sin brillar.
        fill: rnd() > 0.45 ? CHAMPAGNE : MOKA,
        opacity: near ? 0.34 + rnd() * 0.2 : mid ? 0.2 + rnd() * 0.14 : 0.1 + rnd() * 0.1,
        duration: (near ? 2.4 : mid ? 3.6 : 5.2) + rnd() * 2.4,
        delay: rnd() * 6,
      };
    });
  }, [count, seed]);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      focusable="false"
    >
      {stars.map((s) => (
        <circle
          key={s.id}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={s.fill}
          className="ac-twinkle"
          style={{
            '--twinkle-to': s.opacity,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}
