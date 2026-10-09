import { motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext.jsx';
import useAutoCarousel from '../../lib/useAutoCarousel.js';

/* =========================================================
   ABUNDANCE CODE — Ejemplos ilustrativos

   Antes se llamaban «testimonios». No consta procedencia ni autorización
   de ninguno, así que se presentan como lo que son: historias de ejemplo
   con nombres ficticios. El rótulo lo dice en la propia sección y no se
   muestran ciudades, que solo añadían realismo a algo que no es real.
   Si el dueño confirma testimonios reales y autorizados, se cambia el
   texto de tm.eyebrow / tm.sub y se vuelve a enseñar lo que corresponda.

   La barra compacta del hero se retiró en la ronda de sept 2026: era la
   misma información dos veces en la misma página.
   ========================================================= */

const TESTIMONIALS = [
  { id: 1, key: 'tm.1', initials: 'V', gradient: 'linear-gradient(135deg, #D4AF37, #3D2817)' },
  { id: 2, key: 'tm.2', initials: 'C', gradient: 'linear-gradient(135deg, #E8DCC8, #D4AF37)' },
  { id: 3, key: 'tm.3', initials: 'L', gradient: 'linear-gradient(135deg, #5B3E2A, #D4AF72)' },
];

function Avatar({ initials, gradient, size = 40 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold select-none"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: gradient,
        color: '#F5F1ED',
        fontSize: size * 0.4,
        boxShadow: '0 4px 12px rgba(61,40,23,0.15)',
      }}
    >
      {initials}
    </div>
  );
}

/* Carrusel deslizable en móvil, 3 columnas desde md. Scroll nativo con
   scroll-snap; el hook solo sabe qué tarjeta está activa y avanza sola. */
export function TestimonialCards() {
  const { t } = useLang();
  const { trackProps, active, goTo, pauseAutoplay } = useAutoCarousel(TESTIMONIALS.length);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8 md:mb-10">
        <p className="eyebrow mb-3">{t('tm.eyebrow')}</p>
        <h2 className="h2-ac mb-3">{t('tm.h2')}</h2>
        <p className="small-ac text-[#5B3E2A] max-w-2xl mx-auto">{t('tm.sub')}</p>
      </div>

      <div
        {...trackProps}
        className="relative flex snap-x snap-mandatory overflow-x-auto no-scrollbar gap-5 -mx-4 px-4 py-2
                   md:grid md:grid-cols-3 md:overflow-visible md:mx-0 md:px-0 md:py-0"
      >
        {TESTIMONIALS.map((tm, idx) => (
          <motion.article
            key={tm.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
            className="rounded-2xl p-6 flex flex-col w-[85%] shrink-0 snap-center md:w-auto md:shrink"
            style={{ background: '#FFFDF7', border: '1px solid #E8DCC8', boxShadow: '0 6px 20px rgba(61,40,23,0.06)' }}
          >
            <span className="text-[#D4AF37] text-2xl leading-none mb-3" aria-hidden="true">"</span>
            <p className="body-ac text-[#3D2817]/90 italic mb-5 flex-1">
              {t(`${tm.key}.text`)}
            </p>

            <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#E8DCC8' }}>
              <Avatar initials={tm.initials} gradient={tm.gradient} size={44} />
              <div>
                <p className="body-ac font-semibold text-[#3D2817]">{t(`${tm.key}.name`)}</p>
                <p className="text-gold-ink text-xs uppercase tracking-[0.16em] mt-0.5">{t(`${tm.key}.result`)}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="flex items-center justify-center mt-3 md:hidden">
        {TESTIMONIALS.map((tm, idx) => (
          <button
            key={tm.id}
            type="button"
            onClick={() => { pauseAutoplay(); goTo(idx); }}
            aria-label={t(`${tm.key}.name`)}
            aria-current={idx === active}
            className="dot-btn"
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}
