import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import {
  PRICE_INITIAL,
  PRICE_MONTHLY,
  INCLUDED_DAYS,
  CURRENCY,
  money,
} from '../config.js';

/* =========================================================
   ABUNDANCE CODE — Precios
   Aquí se cobra: el formulario abre Stripe Checkout en modo
   suscripción. Al terminar, Stripe devuelve al usuario
   directamente a la app con su token de acceso.
   Los importes vienen de config.js, nunca del i18n.
   ========================================================= */

const API = (import.meta.env.VITE_API_URL || '') + '/api';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

function AccentDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-4">
      <span className="block w-8 h-px bg-[#D4AF37]" />
      <span className="text-[#D4AF37] text-sm leading-none">✦</span>
      <span className="block w-8 h-px bg-[#D4AF37]" />
    </div>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#D4AF37" strokeWidth="2">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const INCLUDED_KEYS = ['pr.inc1', 'pr.inc2', 'pr.inc3', 'pr.inc4', 'pr.inc5', 'pr.inc6'];

export default function Pricing() {
  const { t, lang } = useLang();
  const [searchParams] = useSearchParams();
  const [email, setEmail]     = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [notice, setNotice]   = useState('');

  /* Rellena los importes del copy desde config.js: {price}, {monthly},
     {days} y {currency}. Los textos nunca llevan números escritos a mano. */
  const fill = (text) => text
    .replace(/\{price\}/g, money(PRICE_INITIAL))
    .replace(/\{monthly\}/g, money(PRICE_MONTHLY))
    .replace(/\{days\}/g, INCLUDED_DAYS)
    .replace(/\{currency\}/g, CURRENCY);

  /* De qué sección del sitio vino el clic. Viaja hasta Stripe como metadato
     para poder atribuir la venta después. */
  const campaign = searchParams.get('from')
    || searchParams.get('utm_campaign')
    || 'pricing-direct';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim()) { setError(t('pr.errEmail')); return; }
    setLoading(true);

    try {
      const res = await fetch(`${API}/stripe/create-subscription-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email.trim(),
          customerName:  name.trim(),
          utmCampaign:   campaign,
          /* Idioma en que compra: el correo de acceso saldrá en el mismo. */
          locale:        lang,
        }),
      });
      const data = await res.json();

      /* Ya es cliente: en vez de cobrarle otra vez, se le manda a recuperar
         su enlace de acceso. */
      if (data.alreadySubscribed) {
        setNotice(t('pr.alreadySubscribed'));
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setError(data.message || t('pr.errGeneric'));
      setLoading(false);
    } catch {
      setError(t('pr.errNetwork'));
      setLoading(false);
    }
  };

  return (
    <main className="bg-[#F5F1ED] pt-24 pb-4">

      {/* ===== Encabezado ===== */}
      <section className="px-4 md:px-6">
        <motion.div
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.p variants={fadeUp} className="eyebrow mb-3">{t('pr.eyebrow')}</motion.p>
          <AccentDivider />
          {/*
            Sin precio en el titular y sin párrafo debajo: los dos decían lo
            mismo que la tarjeta que viene justo después —los 49, los 30 días,
            los 14,99 y la renovación—, y repetir el precio tres veces en una
            pantalla no convence, agota.

            El h1 se queda, vacío de cifras. Es el único de esta página y Google
            lo usa para entender de qué va; quitarlo por acortar sería ahorrar
            dos líneas a cambio de la página que más importa.
          */}
          <motion.h1 variants={fadeUp} className="h1-ac mb-2">
            {t('pr.h1')}
          </motion.h1>
        </motion.div>
      </section>

      {/* ===== Tarjeta del plan ===== */}
      <section id="plan" className="section-pad pt-8 md:pt-10" style={{ scrollMarginTop: '6rem' }}>
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#FFFDF7',
              border: '1px solid rgba(212,175,55,0.45)',
              boxShadow: '0 20px 60px rgba(61,40,23,0.10)',
            }}
          >
            {/* Franja superior */}
            <div className="text-center py-3" style={{ background: '#3D2817' }}>
              <p className="text-[#D4AF37] uppercase tracking-[0.28em] text-xs font-semibold">
                {fill(t('pr.badge'))}
              </p>
            </div>

            <div className="p-6 md:p-8">
              {/* Precio: lo que se paga hoy, y lo que se paga después */}
              <div className="text-center pb-6 mb-6 border-b" style={{ borderColor: '#E8DCC8' }}>
                <p className="text-[#5B3E2A] uppercase tracking-[0.22em] text-xs mb-4">
                  {t('pr.planName')}
                </p>

                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-[#3D2817] font-semibold" style={{ fontSize: '3rem', lineHeight: 1 }}>
                    ${money(PRICE_INITIAL)}
                  </span>{' '}
                  <span className="text-[#3D2817] font-semibold body-ac">{CURRENCY}</span>{' '}
                  <span className="text-[#5B3E2A] small-ac">{t('pr.today')}</span>
                </div>

                <p className="small-ac text-[#3D2817]/75 mt-2">
                  {fill(t('pr.includes30'))}
                </p>

                {/* Lo que pasa el día 31 — en su propio bloque, no en letra pequeña */}
                <div className="mt-5 rounded-xl px-5 py-4" style={{ background: '#F5F1ED' }}>
                  <p className="text-[#5B3E2A] uppercase tracking-[0.2em] text-xs font-semibold mb-1">
                    {fill(t('pr.afterLabel'))}
                  </p>
                  <p className="text-[#3D2817] font-semibold lead-ac">
                    ${money(PRICE_MONTHLY)} {CURRENCY} <span className="small-ac font-normal">{t('pr.perMonth')}</span>
                  </p>
                  <p className="small-ac text-[#5B3E2A] mt-1.5">
                    {t('pr.afterDetail')}
                  </p>
                </div>
              </div>

              {/* Incluye */}
              <p className="text-[#3D2817] uppercase tracking-[0.2em] text-xs font-semibold mb-4">
                {t('pr.includes')}
              </p>
              <ul className="space-y-3 mb-7">
                {INCLUDED_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-3 text-[#3D2817] body-ac">
                    <IconCheck />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>

              {/* Formulario de compra — abre Stripe Checkout */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="pr-name" className="sr-only">{t('pr.namePlaceholder')}</label>
                <input
                  id="pr-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('pr.namePlaceholder')}
                  autoComplete="name"
                  className="w-full rounded-xl px-4 min-h-[3rem] outline-none transition-colors body-ac"
                  style={{ background: '#F5F1ED', border: '1px solid #E8DCC8', color: '#3D2817' }}
                />
                <label htmlFor="pr-email" className="sr-only">{t('pr.emailPlaceholder')}</label>
                <input
                  id="pr-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('pr.emailPlaceholder')}
                  autoComplete="email"
                  className="w-full rounded-xl px-4 min-h-[3rem] outline-none transition-colors body-ac"
                  style={{ background: '#F5F1ED', border: '1px solid #E8DCC8', color: '#3D2817' }}
                />

                <p className="small-ac text-[#5B3E2A]">
                  {t('pr.emailNote')}
                </p>

                {error && (
                  <p className="text-center small-ac" role="alert" style={{ color: '#B0413E' }}>{error}</p>
                )}
                {notice && (
                  <p className="text-center small-ac text-[#3D2817]" role="status">
                    {notice}{' '}
                    <Link to="/activar-acceso" className="link-ac">
                      {t('pr.recoverLink')}
                    </Link>
                  </p>
                )}

                {/* La renovación se lee justo antes de pagar, no sólo en la FAQ
                    ni en letra pequeña. */}
                <p className="text-center text-[#3D2817] font-medium body-ac">
                  {fill(t('pr.renewal'))}
                </p>

                {/* Único botón que conserva el ancho del formulario. */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                  style={loading ? { cursor: 'wait' } : undefined}
                >
                  {loading ? t('pr.loading') : t('pr.cta')}
                </button>
              </form>

              <p className="text-center small-ac text-[#5B3E2A] mt-4">
                {t('pr.noCard')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Tranquilizadores ===== */}
      <section className="section-pad pt-0">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6 text-center">
          {[
            { t: 'pr.r1.t', d: 'pr.r1.d' },
            { t: 'pr.r2.t', d: 'pr.r2.d' },
            { t: 'pr.r3.t', d: 'pr.r3.d' },
          ].map((r) => (
            <motion.div key={r.t}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl p-6"
              style={{ background: '#FFFDF7', border: '1px solid #E8DCC8' }}
            >
              <p className="text-[#3D2817] uppercase tracking-[0.18em] text-xs font-semibold mb-2">
                {t(r.t)}
              </p>
              <p className="small-ac text-[#5B3E2A]">
                {t(r.d)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== Cierre ===== */}
      <section className="section-pad" style={{ background: '#E8DCC8' }}>
        <div className="max-w-2xl mx-auto text-center">
          <AccentDivider />
          <h2 className="h2-ac mb-4">{t('pr.close.h2')}</h2>
          <p className="body-ac text-[#3D2817]/85 mb-7">
            {fill(t('pr.close.body'))}
          </p>
          {/* Sube al formulario de arriba en vez de duplicarlo */}
          <a href="#plan" className="btn-primary w-full sm:w-auto px-10">
            {t('pr.close.cta')}
          </a>
          <p className="mt-6">
            <Link to="/faq" className="link-ac small-ac">
              {t('pr.close.faq')}
            </Link>
          </p>
        </div>
      </section>

    </main>
  );
}
