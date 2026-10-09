import { motion } from 'framer-motion';
import StarField from '../components/bits/StarField.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import StartCta from '../components/ui/StartCta.jsx';
import SectionImage from '../components/ui/SectionImage.jsx';
import RichText from '../components/ui/RichText.jsx';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

export default function HowItWorks() {
  const { t } = useLang();

  const steps = [
    { n: '01', title: t('hiw.s1'), desc: t('hiw.s1d') },
    { n: '02', title: t('hiw.s2'), desc: t('hiw.s2d') },
    { n: '03', title: t('hiw.s3'), desc: t('hiw.s3d') },
    { n: '04', title: t('hiw.s4'), desc: t('hiw.s4d') },
    { n: '05', title: t('hiw.s5'), desc: t('hiw.s5d') },
  ];

  return (
    <main className="min-h-screen bg-[#F5F1ED] pt-24 pb-12 md:pb-16">
      <StarField count={50} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="text-center mb-10 md:mb-14"
        >
          <motion.p variants={fadeUp} className="eyebrow mb-4">{t('hiw.label')}</motion.p>
          <motion.h1 variants={fadeUp} className="h1-ac mb-4">{t('hiw.h1')}</motion.h1>
          <motion.p variants={fadeUp} className="lead-ac text-[#3D2817]/80 max-w-xl mx-auto">
            {t('hiw.subtitle')}
          </motion.p>
        </motion.div>

        <ol className="relative space-y-8 md:space-y-10">
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent" aria-hidden="true" />
          {steps.map(({ n, title, desc }, i) => (
            <motion.li
              key={n}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex gap-5 md:gap-8"
            >
              <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full border border-gold/40 bg-[#F5F1ED] flex items-center justify-center text-gold-ink font-semibold text-base md:text-lg">
                {n}
              </div>
              <div className="flex-1 pt-1.5 md:pt-3">
                <h3 className="h3-ac mb-2">{title}</h3>
                <p className="body-ac text-[#3D2817]/85">{desc}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        {/* Si no puedo entrar: los dos caminos reales (correo y Google), la
            otra sesión abierta y el reenvío del enlace. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mt-10 md:mt-12 rounded-2xl p-5 md:p-7"
          style={{ background: '#FFFDF7', border: '1px solid #E8DCC8' }}
        >
          <h2 className="h2-ac mb-2">{t('hiw.access.h')}</h2>
          <RichText text={t('hiw.access.p')} className="body-ac text-[#3D2817]/85" />
        </motion.div>

        {/* Ejemplo de patrón central (paso 4). Estaba en la home; aquí es
            donde se explica el proceso, así que aquí va el detalle. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mt-12 md:mt-16 max-w-2xl mx-auto"
        >
          <p className="eyebrow text-center mb-4">{t('h.pattern.eyebrow')}</p>
          <p className="body-ac text-[#3D2817]/80 text-center mb-5">{t('cp.intro')}</p>
          <div className="card-gold rounded-2xl p-5 md:p-7">
            <h3 className="h3-ac mb-3">{t('h.pattern.title')}</h3>
            <p className="body-ac text-[#3D2817]/85 mb-5">{t('h.pattern.body')}</p>
            <dl className="space-y-4">
              {[
                { l: 'h.pattern.signLabel',    d: 'h.pattern.sign' },
                { l: 'h.pattern.exploreLabel', d: 'h.pattern.explore' },
              ].map((row) => (
                <div key={row.l} className="pl-4" style={{ borderLeft: '2px solid #D4AF37' }}>
                  <dt className="text-gold-ink text-xs uppercase tracking-[0.2em] mb-1">{t(row.l)}</dt>
                  <dd className="body-ac text-[#3D2817]">{t(row.d)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="small-ac text-[#5B3E2A] text-center mt-3 italic">{t('cp.disclaimer')}</p>
        </motion.div>

        {/* Los pasos terminan en «recibe tu guía», pero sin enseñar ninguna.
            Este ejemplo la muestra tal cual, antes de pedir la cuenta. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mt-12 md:mt-16"
        >
          <p className="eyebrow text-center mb-6">{t('hiw.today.eyebrow')}</p>

          <div className="grid gap-6 md:gap-8 md:grid-cols-2 md:items-center">
            <div>
              <SectionImage
                src="/img/es.png"
                alt={t('hiw.today.img')}
                width={1000}
                height={1000}
                variant="square"
                className="max-w-sm mx-auto md:max-w-none"
              />
              <p className="small-ac text-[#5B3E2A] italic text-center mt-3 md:text-left">
                {t('hiw.today.caption')}
              </p>
            </div>

            <div className="card-gold rounded-2xl p-5 md:p-7">
              <p className="eyebrow mb-2">{t('hiw.today.themeLabel')}</p>
              <h3 className="h3-ac mb-3">{t('hiw.today.theme')}</h3>
              <p className="body-ac text-[#3D2817]/85 mb-4">{t('hiw.today.body')}</p>

              <div className="space-y-3">
                <div className="rounded-xl p-4" style={{ background: '#F5F1ED' }}>
                  <p className="text-gold-ink text-xs uppercase tracking-[0.2em] mb-1">{t('hiw.today.focusLabel')}</p>
                  <p className="small-ac text-[#3D2817]">{t('hiw.today.focus')}</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#E8DCC8' }}>
                  <p className="text-[#5B3E2A] text-xs uppercase tracking-[0.2em] mb-1">{t('hiw.today.askLabel')}</p>
                  <p className="small-ac italic text-[#3D2817]">{t('hiw.today.ask')}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10 md:mt-14"
        >
          <StartCta campaign="how-it-works-page" className="w-full sm:w-auto px-10">
            {t('hiw.cta')}
          </StartCta>
        </motion.div>
      </div>
    </main>
  );
}
