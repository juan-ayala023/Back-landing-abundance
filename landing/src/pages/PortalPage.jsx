import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Clock, Star, Compass } from 'lucide-react';
import StarField from '../components/bits/StarField.jsx';
import SpotlightCard from '../components/bits/SpotlightCard.jsx';
import Aurora from '../components/bits/Aurora.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import StartCta from '../components/ui/StartCta.jsx';
import SectionImage from '../components/ui/SectionImage.jsx';

/* =========================================================
   ABUNDANCE CODE — La app (/app)

   La maqueta del portal enseña una activación del día tal y como la
   genera la app: tránsito sobre la carta, tema activo, texto, pregunta y
   el contador de consultas. Antes mostraba «888», un árbol y una «ventana
   óptima 08:00–10:00»: nada de eso existe en el producto (no hay
   numerología ni ventanas horarias). Está rotulada como ejemplo.
   ========================================================= */
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function PortalPage() {
  const { t } = useLang();

  return (
    <main className="min-h-screen bg-[#F5F1ED] pt-24 pb-12 md:pb-16">
      <StarField count={70} />
      <Aurora />

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* Cabecera */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="text-center mb-10 md:mb-14"
        >
          <motion.p variants={fadeUp} className="eyebrow mb-4">{t('portal.label')}</motion.p>
          <motion.h1 variants={fadeUp} className="h1-ac mb-5">{t('portal.h1')}</motion.h1>
          <motion.p variants={fadeUp} className="lead-ac text-[#3D2817]/85 max-w-2xl mx-auto">
            {t('portal.subtitle')}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-7 flex justify-center">
            <StartCta campaign="app-page-hero" className="w-full sm:w-auto px-10">
              {t('portal.cta')}
            </StartCta>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-3 small-ac text-[#5B3E2A]">
            {t('portal.instant')}
          </motion.p>
        </motion.div>

        {/* Foto + maqueta, a dos columnas: antes iban una debajo de otra y
            eran dos imágenes grandes seguidas. */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="max-w-md mx-auto md:max-w-none w-full"
          >
            <SectionImage
              src="/img/app-hero-woman.webp"
              alt={t('portal.img.hero')}
              width={1000}
              height={1000}
              variant="section"
              imgClassName="object-top"
              priority
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex justify-center"
          >
            <div className="w-full max-w-sm card-glass rounded-3xl p-6 shadow-2xl" aria-label={t('portal.mock.eyebrow')}>
              <p className="text-gold-ink text-xs uppercase tracking-[0.22em] mb-4">{t('portal.mock.eyebrow')}</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} aria-hidden="true" />
                <span className="text-xs uppercase tracking-widest font-semibold text-[#3D2817]">{t('portal.todayLabel')}</span>
              </div>
              <div className="space-y-3">
                <div className="card-gold rounded-xl p-3">
                  <p className="text-gold-ink text-xs mb-1">{t('portal.mock.transit')}</p>
                  <p className="small-ac font-medium text-[#3D2817]">{t('portal.mock.transitD')}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: '#F5F1ED' }}>
                  <p className="small-ac text-[#3D2817]/85">{t('portal.mock.msg')}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: '#E8DCC8' }}>
                  <p className="text-[#5B3E2A] text-xs uppercase tracking-[0.2em] mb-1">{t('portal.mock.askLabel')}</p>
                  <p className="small-ac italic text-[#3D2817]">{t('portal.mock.ask')}</p>
                </div>
                <p className="text-gold-ink text-xs uppercase tracking-[0.18em] text-center pt-1">{t('portal.mock.count')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Lo que recibes */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="mb-12 md:mb-16"
        >
          <motion.h2 variants={fadeUp} className="h2-ac text-center mb-8">{t('portal.included')}</motion.h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {[
              { icon: <Compass size={20} />, title: t('portal.inc1'), desc: t('portal.inc1d') },
              { icon: <Star size={20} />,    title: t('portal.inc2'), desc: t('portal.inc2d') },
              { icon: <Zap size={20} />,     title: t('portal.inc3'), desc: t('portal.inc3d') },
              { icon: <Clock size={20} />,   title: t('portal.inc4'), desc: t('portal.inc4d') },
            ].map(({ icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp}>
                <SpotlightCard className="card-glass rounded-2xl p-5 md:p-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold-ink flex-shrink-0" aria-hidden="true">{icon}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="h3-ac">{title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 font-semibold text-gold-ink uppercase tracking-wider">{t('portal.included.tag')}</span>
                      </div>
                      <p className="body-ac text-[#3D2817]/80">{desc}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Banda de cierre antes del último CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="mb-10 md:mb-12"
        >
          <SectionImage
            src="/img/lifestyle-lounge-wide.webp"
            alt={t('h.img.lounge')}
            width={1254}
            height={501}
            variant="banner"
          />
        </motion.div>

        {/* CTA final: mismo botón que el de arriba */}
        <div className="text-center">
          <StartCta campaign="app-page-final" className="w-full sm:w-auto px-10">
            {t('portal.finalCta')}
          </StartCta>
          <p className="small-ac text-[#5B3E2A] mt-3">{t('portal.finalSub')}</p>
          <p className="mt-5">
            <Link to="/pricing" className="link-ac body-ac">{t('portal.pricingLink')}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
