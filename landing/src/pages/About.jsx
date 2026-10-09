import { motion } from 'framer-motion';
import StarField from '../components/bits/StarField.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import StartCta from '../components/ui/StartCta.jsx';
import SectionImage from '../components/ui/SectionImage.jsx';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

function Block({ title, body, bold }) {
  return (
    <motion.div variants={fadeUp} className="mb-10 md:mb-12">
      <h2 className="h2-ac mb-3">{title}</h2>
      {(Array.isArray(body) ? body : [body]).map((p, i) => (
        <p key={i} className="body-ac text-[#3D2817]/85 mb-3">{p}</p>
      ))}
      {bold && <p className="lead-ac font-medium text-gold-ink">{bold}</p>}
    </motion.div>
  );
}

export default function About() {
  const { t } = useLang();

  return (
    <main className="relative min-h-screen bg-[#F5F1ED] pt-24 pb-12 md:pb-16">
      <StarField count={40} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.14 } } }}
        >
          <motion.p variants={fadeUp} className="eyebrow mb-4">{t('about.label')}</motion.p>
          <motion.h1 variants={fadeUp} className="h1-ac mb-6">Abundance Code</motion.h1>

          {/* Banda 5:2 anclada arriba: la cabeza está en la mitad superior. */}
          <motion.div variants={fadeUp} className="mb-10 md:mb-12">
            <SectionImage
              src="/img/lifestyle-window.webp"
              alt={t('about.img')}
              width={1000}
              height={1000}
              variant="banner"
              imgClassName="object-top"
              priority
            />
          </motion.div>

          <Block title={t('about.s1.h')} body={t('about.s1.p')} bold={t('about.s1.b')} />
          <Block title={t('about.s2.h')} body={t('about.s2.p')} bold={t('about.s2.b')} />
          <Block title={t('about.s3.h')} body={[t('about.s3.p1'), t('about.s3.p2')]} bold={t('about.s3.b')} />
          <Block title={t('about.s4.h')} body={t('about.s4.p')} bold={t('about.s4.b')} />
          <Block title={t('about.s5.h')} body={[t('about.s5.p1'), t('about.s5.p2')]} bold={t('about.s5.b')} />

          {/* Compromisos */}
          <motion.div variants={fadeUp} className="mb-10 md:mb-12">
            <h2 className="h2-ac mb-4">{t('about.commit.h')}</h2>
            <ul className="space-y-3 mb-5">
              {[t('about.commit.1'), t('about.commit.2'), t('about.commit.3'), t('about.commit.4')].map((item) => (
                <li key={item} className="flex items-start gap-3 body-ac text-[#3D2817]/85">
                  <span className="text-[#D4AF37] mt-1 flex-shrink-0" aria-hidden="true">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="lead-ac font-medium text-gold-ink">{t('about.commit.b')}</p>
          </motion.div>

          {/* Quién está detrás */}
          <motion.p variants={fadeUp} className="small-ac text-[#5B3E2A] mb-10 md:mb-12">
            {t('about.operator')}
          </motion.p>

          {/* CTA */}
          <motion.div variants={fadeUp} className="text-center card-gold rounded-2xl p-6 md:p-10">
            <p className="h3-ac mb-2">{t('about.cta.h')}</p>
            <p className="body-ac text-[#3D2817]/80 mb-6">{t('about.cta.p')}</p>
            <StartCta campaign="about" className="w-full sm:w-auto">
              {t('about.cta.btn')}
            </StartCta>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
