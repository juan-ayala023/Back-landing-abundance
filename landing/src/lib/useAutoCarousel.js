import { useCallback, useEffect, useRef, useState } from 'react';

/* =========================================================
   useAutoCarousel — carrusel deslizable con avance automático.

   No hay librería detrás: es scroll nativo con scroll-snap. El hook solo
   aporta las tres cosas que el CSS no puede dar por sí solo — saber qué
   tarjeta está activa, avanzar sola y frenar cuando el usuario interviene.

   El markup lo pone quien lo usa. Es un hook y no un componente porque cada
   sección tiene sus propias tarjetas, y envolverlas para inyectarles clases
   rompería el estirado en flex/grid.

   Uso:
     const { trackProps, active, goTo, pauseAutoplay } = useAutoCarousel(3);

     <div {...trackProps} className="flex snap-x snap-mandatory overflow-x-auto
                                     md:grid md:grid-cols-3 md:overflow-visible">
       {items.map(...)}   // cada hijo: w-[85%] shrink-0 snap-center md:w-auto
     </div>

   Desde md el contenedor deja de tener scroll y el automático se apaga solo:
   el tick comprueba que el track sea realmente desplazable.
   ========================================================= */
export default function useAutoCarousel(count, { autoplayMs = 5500, resumeMs = 10000 } = {}) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // El intervalo necesita la tarjeta actual sin volver a montarse en cada
  // scroll, de ahí el ref en paralelo al estado.
  const activeRef = useRef(0);
  const resumeRef = useRef(null);

  /* La tarjeta activa es la que tiene su centro más cerca del centro visible.
     Se calcula así (y no con scrollLeft / ancho) para no depender del gap ni
     del padding lateral del track. */
  const syncActive = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let nearest = 0;
    let min = Infinity;
    Array.from(el.children).forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (d < min) { min = d; nearest = i; }
    });
    activeRef.current = nearest;
    setActive(nearest);
  }, []);

  /* Se desplaza SOLO el track, nunca la página.

     Antes esto usaba card.scrollIntoView({block:'nearest', inline:'center'}).
     'nearest' promete no mover el eje vertical, pero solo cumple si el
     elemento ya cabe entero en pantalla: si no cabe — y en móvil una tarjeta
     casi nunca cabe — el navegador desplaza la página para acercarlo. Con dos
     carruseles en la home, cada 5,5 s la página daba un salto y el usuario no
     podía ni leer ni desplazarse a mano.

     scrollTo sobre el contenedor no tiene ese efecto: mueve ese scroll y
     ningún otro. El delta se calcula con getBoundingClientRect para no
     depender de quién sea el offsetParent del track. */
  const goTo = useCallback((i) => {
    const el = trackRef.current;
    const card = el?.children[i];
    if (!el || !card) return;
    const trackBox = el.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const delta = (cardBox.left + cardBox.width / 2) - (trackBox.left + el.clientWidth / 2);
    el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' });
  }, []);

  /* Cualquier gesto manual corta el automático un rato: nada más molesto que
     el carrusel moviéndose mientras estás leyendo la tarjeta que elegiste. */
  const pauseAutoplay = useCallback(() => {
    setPaused(true);
    clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), resumeMs);
  }, [resumeMs]);

  useEffect(() => () => clearTimeout(resumeRef.current), []);

  /* Solo avanza mientras el carrusel está a la vista. Sin esto, los carruseles
     que quedan fuera de pantalla siguen corriendo, y el usuario se encuentra
     al volver una tarjeta distinta de la que dejó. */
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !visible) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const id = setInterval(() => {
      const el = trackRef.current;
      // En escritorio el track es un grid sin scroll: no hay nada que avanzar.
      if (!el || el.scrollWidth <= el.clientWidth + 1) return;
      if (document.hidden) return;
      goTo((activeRef.current + 1) % count);
    }, autoplayMs);

    return () => clearInterval(id);
  }, [paused, visible, goTo, count, autoplayMs]);

  return {
    active,
    goTo,
    pauseAutoplay,
    trackProps: {
      ref: trackRef,
      onScroll: syncActive,
      onPointerDown: pauseAutoplay,
      onWheel: pauseAutoplay,
    },
  };
}
