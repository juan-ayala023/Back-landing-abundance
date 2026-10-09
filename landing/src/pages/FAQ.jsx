import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import StarField from '../components/bits/StarField.jsx';
import RichText from '../components/ui/RichText.jsx';
import { useLang } from '../context/LanguageContext.jsx';

/* =========================================================
   ABUNDANCE CODE — Preguntas frecuentes

   Cuatro grupos (ronda de sept 2026): antes de comprar, acceso y uso,
   pagos y cancelación, datos y soporte. Cada grupo lista cuántas
   preguntas tiene; las claves son faq.gN.Mq / faq.gN.Ma en es.js/en.js.
   Las respuestas pueden llevar enlaces [texto](destino): los pinta
   RichText, así el correo de soporte o la política de reembolso son
   enlaces reales y no texto que copiar.
   ========================================================= */
const GROUPS = [
  { key: 'g1', count: 9 },
  { key: 'g2', count: 10 },
  { key: 'g3', count: 8 },
  { key: 'g4', count: 4 },
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

function FAQItem({ id, q, a, isOpen, onToggle }) {
  return (
    <div className="border-b border-[#E8DCC8] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={id}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="body-ac font-medium text-[#3D2817]">{q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gold-ink flex-shrink-0"
          aria-hidden="true"
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <RichText text={a} className="body-ac text-[#3D2817]/85 pb-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const { t } = useLang();

  const categories = GROUPS.map(({ key, count }) => ({
    key,
    title: t(`faq.${key}`),
    items: Array.from({ length: count }, (_, i) => ({
      q: t(`faq.${key}.${i + 1}q`),
      a: t(`faq.${key}.${i + 1}a`),
    })),
  }));

  // Una pregunta abierta por grupo: { grupo: índice }
  const [openMap, setOpenMap] = useState({});
  const toggle = (g, i) => setOpenMap((prev) => ({ ...prev, [g]: prev[g] === i ? -1 : i }));

  return (
    <main className="relative min-h-screen bg-[#F5F1ED] pt-24 pb-12 md:pb-16">
      <StarField count={40} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-14"
        >
          <p className="eyebrow mb-4">{t('faq.label')}</p>
          <h1 className="h1-ac">{t('faq.h1')}</h1>
        </motion.div>

        <div className="space-y-10 md:space-y-12">
          {categories.map((cat) => (
            <motion.section
              key={cat.key}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.h2 variants={fadeUp} className="h2-ac mb-4">{cat.title}</motion.h2>
              <motion.div variants={fadeUp} className="card-glass rounded-2xl px-5 md:px-8">
                {cat.items.map((item, i) => (
                  <FAQItem
                    key={i}
                    id={`faq-${cat.key}-${i}`}
                    q={item.q}
                    a={item.a}
                    isOpen={openMap[cat.key] === i}
                    onToggle={() => toggle(cat.key, i)}
                  />
                ))}
              </motion.div>
            </motion.section>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12 md:mt-16"
        >
          <p className="body-ac text-[#3D2817]/80 mb-4">{t('faq.still')}</p>
          <Link to="/contact" className="btn-outline w-full sm:w-auto">{t('faq.contact')}</Link>
        </motion.div>
      </div>
    </main>
  );
}
