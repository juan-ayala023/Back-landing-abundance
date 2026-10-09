import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../context/LanguageContext.jsx';
import { TestimonialCards } from '../components/sections/Testimonials.jsx';
import StartCta from '../components/ui/StartCta.jsx';
import AppScreenshot from '../components/ui/AppScreenshot.jsx';
import SectionImage from '../components/ui/SectionImage.jsx';
import StarField from '../components/bits/StarField.jsx';
import ZodiacWheel from '../components/bits/ZodiacWheel.jsx';
import { INCLUDED_DAYS, PRICE_INITIAL, PRICE_MONTHLY, CURRENCY, money } from '../config.js';

/* =========================================================
   ABUNDANCE CODE — Home
   Túnel de venta de la app que lee tu carta natal.
   Palette: Ivory #F5F1ED · Beige #E8DCC8 · Champagne #D4AF37 · Moka #3D2817
   Typography: Montserrat (única fuente); escala en index.css.

   Ronda de sept 2026: la página medía ~11.500 px en móvil. Se dejó en
   siete bloques, sin repetir ideas:
     1. Hero — una promesa, un párrafo, el botón y las condiciones
     2. Identificación emocional
     3. Qué puedes descubrir (+ por qué no es un horóscopo) · foto a un lado
     4. Cómo funciona, en tres pasos; el detalle vive en /how-it-works
     5. Dentro de tu portal (antes eran dos secciones: la lista de módulos y
        «lo que desbloquea tu portal»; era lo mismo dicho dos veces). El
        ejemplo largo de patrón central vive ahora en /how-it-works.
     6. Ejemplos ilustrativos (antes «testimonios»)
     7. Un solo cierre con precio, renovación y botón
   ========================================================= */

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

function AnimSection({ children, className = '' }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AccentDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-4" aria-hidden="true">
      <span className="block w-8 h-px bg-[#D4AF37]" />
      <span className="text-[#D4AF37] text-sm leading-none">✦</span>
      <span className="block w-8 h-px bg-[#D4AF37]" />
    </div>
  );
}

/* Punto de carrusel: se ve pequeño, se toca grande (ver .dot-btn). */
function Dot({ active, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-current={active} className="dot-btn">
      <span />
    </button>
  );
}

/* Inline SVG icons — line style, champagne stroke */
function IconMoney() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="#D4AF37" strokeWidth="1.4" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="M24 12v24M30 17h-9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6h-9" strokeLinecap="round" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="#D4AF37" strokeWidth="1.4" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="M24 32s-9-5.2-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.8-9 12-9 12z" strokeLinejoin="round" />
    </svg>
  );
}
function IconGrowth() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="#D4AF37" strokeWidth="1.4" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="M14 32l6-6 4 4 10-12M28 18h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="#D4AF37" strokeWidth="1.4" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="M24 14v6M24 28v6M14 24h6M28 24h6M18 18l4 4M30 30l-4-4M18 30l4-4M30 18l-4 4" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="#D4AF37" strokeWidth="2" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const { t } = useLang();
  /* Rellena los huecos del copy con los valores reales del precio. */
  const vars = (key) => t(key)
    .replace(/\{days\}/g, INCLUDED_DAYS)
    .replace(/\{initial\}/g, money(PRICE_INITIAL))
    .replace(/\{price\}/g, money(PRICE_MONTHLY))
    .replace(/\{currency\}/g, CURRENCY);

  return (
    <main className="bg-[#F5F1ED] pt-16 md:pt-20">

      {/* =========================================================
          1. HERO — una promesa, un párrafo, el botón
          ========================================================= */}
      <section className="relative overflow-hidden px-4 md:px-6 pt-6 pb-10 md:pt-10 md:pb-14">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <StarField count={38} seed={11} />
          <ZodiacWheel
            opacity={0.16}
            spin={300}
            className="absolute w-[560px] md:w-[760px] -right-[38%] -top-[18%]
                       md:right-auto md:-left-[20%] md:-top-[34%]"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 md:gap-10 items-center">

            {/* Left — copy */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="eyebrow mb-4"
              >
                {t('h.hero.eyebrow')}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="h1-ac mb-5"
              >
                {t('h.hero.h1.line1')}<br/>{t('h.hero.h1.line2')}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="lead-ac text-[#3D2817]/80 mb-7 max-w-md"
              >
                {t('h.hero.body')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 mb-4"
              >
                <StartCta campaign="hero" className="w-full sm:w-auto">
                  {t('h.hero.cta1')}
                </StartCta>
                <Link to="/how-it-works" className="btn-outline w-full sm:w-auto">
                  {t('h.hero.cta2')}
                </Link>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex items-start gap-2 small-ac text-[#5B3E2A]"
              >
                <span className="mt-1"><IconCheck /></span>
                <span>{vars('h.hero.trialNote')}</span>
              </motion.p>
            </div>

            {/* Right — captura real de la app */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-md mx-auto md:max-w-none"
            >
              <AppScreenshot priority />
            </motion.div>
          </div>
        </div>
      </section>

      {/* =========================================================
          2. IDENTIFICACIÓN EMOCIONAL
          ========================================================= */}
      <section className="section-pad" style={{ background: '#FFFDF7' }}>
        <div className="max-w-5xl mx-auto">
          <AnimSection className="text-center">
            <AccentDivider />
            <motion.h2 variants={fadeUp} className="h2-ac mb-3 max-w-2xl mx-auto">{t('h.id.h2')}</motion.h2>
            <motion.p variants={fadeUp} className="body-ac text-[#3D2817]/75 max-w-2xl mx-auto mb-8">
              {t('h.id.sub')}
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: <IconMoney  />, key: 'h.id.card1' },
                { icon: <IconHeart  />, key: 'h.id.card2' },
                { icon: <IconGrowth />, key: 'h.id.card3' },
                { icon: <IconSpark  />, key: 'h.id.card4' },
              ].map((c) => (
                <motion.div key={c.key} variants={fadeUp}
                  className="rounded-2xl p-5 flex items-center gap-4 text-left"
                  style={{ background: '#E8DCC8' }}
                >
                  <div className="flex-shrink-0">{c.icon}</div>
                  <p className="body-ac text-[#3D2817]">{t(c.key)}</p>
                </motion.div>
              ))}
            </div>

            <motion.p variants={fadeUp} className="body-ac text-[#5B3E2A] italic mt-8">
              {t('h.id.outro')}
            </motion.p>
          </AnimSection>
        </div>
      </section>

      {/* =========================================================
          3. QUÉ PUEDES DESCUBRIR (+ por qué no es un horóscopo)
          La foto va al lado de las tarjetas, no encima a todo lo
          ancho: a 4:3 y 896 px ocupaba media pantalla ella sola.
          ========================================================= */}
      <section className="section-pad">
        <div className="max-w-6xl mx-auto">
          <AnimSection className="text-center">
            <motion.p variants={fadeUp} className="eyebrow mb-3">{t('h.cyc.eyebrow')}</motion.p>
            <AccentDivider />
            <motion.h2 variants={fadeUp} className="h2-ac mb-3 max-w-2xl mx-auto">{t('h.cyc.h2')}</motion.h2>
            <motion.p variants={fadeUp} className="body-ac text-[#3D2817]/75 max-w-2xl mx-auto mb-8 md:mb-10">
              {t('h.cyc.sub')}
            </motion.p>
          </AnimSection>

          <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 md:gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-sm mx-auto md:max-w-none w-full"
            >
              <SectionImage
                src="/img/app-portal-lifestyle.png"
                alt={t('h.img.lifestyle')}
                width={2048}
                height={2048}
                variant="section"
                imgClassName="object-top"
              />
            </motion.div>

            <AnimSection className="space-y-4">
              {[
                { icon: '🔒', tKey: 'h.cyc.c1.t', dKey: 'h.cyc.c1.d' },
                { icon: '💎', tKey: 'h.cyc.c2.t', dKey: 'h.cyc.c2.d' },
                { icon: '✨', tKey: 'h.cyc.c3.t', dKey: 'h.cyc.c3.d' },
              ].map((c) => (
                <motion.div key={c.tKey} variants={fadeUp}
                  className="rounded-2xl p-5 md:p-6 flex items-start gap-4"
                  style={{ background: '#FFFDF7', border: '1px solid #E8DCC8', boxShadow: '0 6px 20px rgba(61,40,23,0.05)' }}
                >
                  <div
                    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-lg"
                    style={{ background: '#E8DCC8' }}
                    aria-hidden="true"
                  >
                    {c.icon}
                  </div>
                  <div>
                    <h3 className="h3-ac mb-1">{t(c.tKey)}</h3>
                    <p className="body-ac text-[#3D2817]/80">{t(c.dKey)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimSection>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. CÓMO FUNCIONA — tres pasos; el detalle, en su página
          ========================================================= */}
      <section className="section-pad" style={{ background: '#FFFDF7' }}>
        <div className="max-w-6xl mx-auto">
          <AnimSection className="text-center">
            <motion.p variants={fadeUp} className="eyebrow mb-3">{t('h.how.eyebrow')}</motion.p>
            <AccentDivider />
            <motion.h2 variants={fadeUp} className="h2-ac mb-3 max-w-2xl mx-auto">{t('h.how.h2')}</motion.h2>
            <motion.p variants={fadeUp} className="body-ac text-[#3D2817]/75 max-w-2xl mx-auto mb-8 md:mb-10">
              {t('h.how.sub')}
            </motion.p>

            <div className="grid md:grid-cols-3 gap-4 md:gap-6 text-left">
              {[
                { n: 1, tKey: 'h.how.s1.title', dKey: 'h.how.s1.desc' },
                { n: 2, tKey: 'h.how.s2.title', dKey: 'h.how.s2.desc' },
                { n: 3, tKey: 'h.how.s3.title', dKey: 'h.how.s3.desc' },
              ].map((s) => (
                <motion.div key={s.n} variants={fadeUp}
                  className="rounded-2xl p-5 md:p-6 flex flex-col"
                  style={{ background: '#F5F1ED', border: '1px solid #E8DCC8' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center font-semibold shrink-0 text-gold-ink"
                      style={{ border: '1px solid #D4AF37' }}
                      aria-hidden="true"
                    >
                      {s.n}
                    </span>
                    <h3 className="h3-ac">{t(s.tKey)}</h3>
                  </div>
                  <p className="body-ac text-[#3D2817]/80">{vars(s.dKey)}</p>
                </motion.div>
              ))}
            </div>

            <motion.p variants={fadeUp} className="mt-6">
              <Link to="/how-it-works" className="link-ac body-ac">{t('h.how.more')}</Link>
            </motion.p>
          </AnimSection>
        </div>
      </section>

      {/* =========================================================
          6. EJEMPLOS ILUSTRATIVOS
          ========================================================= */}
      <section className="section-pad">
        <TestimonialCards />
      </section>

      {/* =========================================================
          7. CIERRE — el único con precio y botón de compra
          ========================================================= */}
      <section className="section-pad" style={{ background: '#E8DCC8' }}>
        <div className="max-w-2xl mx-auto text-center">
          <AnimSection>
            <motion.p variants={fadeUp} className="eyebrow mb-3">{t('h.cta.eyebrow')}</motion.p>
            <AccentDivider />
            <motion.h2 variants={fadeUp} className="h2-ac mb-4">{t('h.cta.h2')}</motion.h2>
            <motion.p variants={fadeUp} className="body-ac text-[#3D2817]/85 mb-7">
              {vars('h.cta.body')}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <StartCta campaign="home-final" className="w-full sm:w-auto px-10">
                {t('h.cta.btn1')}
              </StartCta>
              <Link to="/pricing" className="btn-outline w-full sm:w-auto px-10">
                {t('h.cta.link')}
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="inline-flex items-start gap-2 small-ac text-[#5B3E2A] text-left sm:text-center">
              <span className="mt-1"><IconCheck /></span>
              <span>{t('h.cta.note')}</span>
            </motion.p>
          </AnimSection>
        </div>
      </section>

    </main>
  );
}
