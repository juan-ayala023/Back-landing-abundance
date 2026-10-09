import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, MessageCircle } from 'lucide-react';
import StarField from '../components/bits/StarField.jsx';
import { useLang } from '../context/LanguageContext.jsx';

const API = (import.meta.env.VITE_API_URL || '') + '/api';
import { SUPPORT_EMAIL } from '../config.js';

export default function Contact() {
  const { t, lang } = useLang();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  /* El mensaje va al buzón de soporte por el backend (POST /api/contact).
     Antes esto solo marcaba «enviado» sin enviar nada: todo lo que un cliente
     escribió aquí se perdió. El campo `website` es una trampa para bots: un
     humano no lo ve ni lo rellena. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, locale: lang, website: honeypot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'error');
      setSent(true);
    } catch (err) {
      setError(err.message && err.message !== 'error' ? err.message : t('contact.error'));
    }
    setSending(false);
  };

  return (
    <main className="min-h-screen bg-[#F5F1ED] pt-24 pb-12 md:pb-16">
      <StarField count={40} />
      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="eyebrow mb-4">{t('contact.label')}</p>
          <h1 className="h1-ac mb-4">{t('contact.h1')}</h1>
          <p className="lead-ac text-[#3D2817]/80 max-w-md mx-auto">{t('contact.subtitle')}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="grid sm:grid-cols-3 md:grid-cols-1 gap-3 md:gap-4 content-start"
          >
            {[
              { icon: <Mail size={18} />, label: t('contact.email'), val: <a href={`mailto:${SUPPORT_EMAIL}`} className="link-ac break-all">{SUPPORT_EMAIL}</a> },
              { icon: <Clock size={18} />, label: t('contact.response'), val: t('contact.responseVal') },
              { icon: <MessageCircle size={18} />, label: t('contact.hours'), val: t('contact.hoursVal') },
            ].map(({ icon, label, val }) => (
              <div key={label} className="card-glass rounded-xl p-4 md:p-5">
                <div className="text-gold-ink mb-2" aria-hidden="true">{icon}</div>
                <p className="text-[#5B3E2A] text-xs uppercase tracking-wide mb-1">{label}</p>
                <p className="text-[#3D2817] small-ac">{val}</p>
              </div>
            ))}
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-2"
          >
            {sent ? (
              <div className="card-glass rounded-2xl p-8 md:p-12 text-center" role="status">
                <p className="h3-ac mb-3">{t('contact.sent')}</p>
                <p className="body-ac text-[#3D2817]/80">{t('contact.sentSub')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card-glass rounded-2xl p-5 md:p-8 space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { k: 'name', label: t('contact.name'), type: 'text', placeholder: t('contact.namePh') },
                    { k: 'email', label: t('contact.email'), type: 'email', placeholder: t('contact.emailPh') },
                  ].map(({ k, label, type, placeholder }) => (
                    <div key={k}>
                      <label htmlFor={`contact-${k}`} className="block text-[#5B3E2A] text-xs uppercase tracking-wide mb-2">{label}</label>
                      <input
                        id={`contact-${k}`}
                        type={type}
                        placeholder={placeholder}
                        value={form[k]}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="w-full bg-[#E8DCC8]/40 border border-[#E8DCC8] rounded-xl px-4 min-h-[3rem] text-[#3D2817] body-ac placeholder-[#5B3E2A]/50 focus:border-gold"
                        required
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-[#5B3E2A] text-xs uppercase tracking-wide mb-2">{t('contact.subject')}</label>
                  <input
                    id="contact-subject"
                    type="text"
                    placeholder={t('contact.subjectPh')}
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full bg-[#E8DCC8]/40 border border-[#E8DCC8] rounded-xl px-4 min-h-[3rem] text-[#3D2817] body-ac placeholder-[#5B3E2A]/50 focus:border-gold"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-[#5B3E2A] text-xs uppercase tracking-wide mb-2">{t('contact.message')}</label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder={t('contact.messagePh')}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full bg-[#E8DCC8]/40 border border-[#E8DCC8] rounded-xl px-4 py-3 text-[#3D2817] body-ac placeholder-[#5B3E2A]/50 focus:border-gold resize-none"
                    required
                  />
                </div>
                {/* Trampa para bots: invisible para personas, tentadora para scripts. */}
                <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)}
                  tabIndex={-1} autoComplete="off" aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
                {error && <p className="text-center small-ac" role="alert" style={{ color: '#B0413E' }}>{error}</p>}
                {/* Ancho del texto, no del formulario: en escritorio medía 574 px. */}
                <div className="flex justify-end">
                  <button type="submit" disabled={sending} className="btn-primary w-full sm:w-auto px-10" style={sending ? { cursor: 'wait' } : undefined}>
                    {sending ? t('contact.sending') : t('contact.send')}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
