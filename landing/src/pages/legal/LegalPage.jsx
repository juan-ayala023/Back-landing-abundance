import { motion } from 'framer-motion';
import { useLang } from '../../context/LanguageContext.jsx';

export default function LegalPage({ title, updated, children }) {
  const { t } = useLang();

  return (
    <main className="min-h-screen bg-[#F5F1ED] pt-24 pb-12 md:pb-16">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="eyebrow mb-3">{t('legal.label')}</p>
          <h1 className="h1-ac mb-2">{title}</h1>
          {updated && <p className="small-ac text-[#5B3E2A] mb-1">{t('legal.updated')} {updated}</p>}
          {/* Quién está detrás del servicio, en todos los documentos. */}
          <p className="small-ac text-[#5B3E2A] mb-8 md:mb-10">{t('footer.operator')}</p>
          <div className="prose-legal text-[#3D2817]/90 body-ac">
            <style>{`
              .prose-legal h2 { margin-top: 1.75rem; margin-bottom: 0.5rem; }
              .prose-legal h3 { font-size: 1.0625rem; font-weight: 600; color: #3D2817; margin-top: 1.25rem; margin-bottom: 0.4rem; }
              .prose-legal p { margin-bottom: 1rem; }
              .prose-legal ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
              .prose-legal ol { margin-bottom: 1rem; }
              .prose-legal li { margin-bottom: 0.5rem; }
            `}</style>
            {children}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
