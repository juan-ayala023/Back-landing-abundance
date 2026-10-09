import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext.jsx';
import { APP_URL, SUPPORT_EMAIL, money } from '../config.js';
import { trackPurchase } from '../lib/analytics.js';

/* =========================================================
   ABUNDANCE CODE — Gracias por tu compra

   Stripe devuelve aquí al comprador con dos cosas en la URL:
   el id de la sesión de pago y el token de acceso. Esta página
   confirma el pago, dispara el evento de compra en Analytics y
   ofrece el enlace para entrar a la app con el token.

   Si alguien llega sin token, no hay nada que hacer aquí y se
   le manda al inicio. Si el backend no contesta, se sigue igual
   hacia la app: el token es lo que da el acceso, el importe
   solo se muestra.
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

export default function Gracias() {
  const { t, lang } = useLang();
  const params    = new URLSearchParams(window.location.search);
  const token     = params.get('token');
  const sessionId = params.get('session_id');

  const [pago, setPago] = useState(null);

  /* El idioma viaja con el token: la app lo guarda en una cookie de su propio
     dominio, así que quien compra en inglés llega sin ninguna y vería el
     portal en español. */
  const destino = token
    ? `${APP_URL.replace(/\/$/, '')}/activar?token=${encodeURIComponent(token)}&lang=${lang}`
    : null;

  /* Importe real cobrado, para mostrarlo y para el evento de compra. */
  useEffect(() => {
    if (!sessionId) return;
    let cancelado = false;
    fetch(`${API}/stripe/session/${encodeURIComponent(sessionId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelado || !data) return;
        setPago(data);
        if (data.paid) {
          trackPurchase({
            transactionId: sessionId,
            value: (data.amountTotal || 0) / 100,
            currency: data.currency,
            itemName: 'Abundance Code — Acceso inicial',
          });
        }
      })
      .catch(() => { /* sin importe se sigue igual */ });
    return () => { cancelado = true; };
  }, [sessionId]);

  if (!token) return <Navigate to="/" replace />;

  const importe = pago?.paid
    ? `${money((pago.amountTotal || 0) / 100)} ${(pago.currency || 'usd').toUpperCase()}`
    : null;

  return (
    <main className="bg-[#F5F1ED] pt-24 pb-4 min-h-screen">
      <section className="section-pad">
        <motion.div
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-md mx-auto text-center"
        >
          <motion.p variants={fadeUp} className="eyebrow mb-3">{t('thanks.eyebrow')}</motion.p>
          <AccentDivider />
          <motion.h1 variants={fadeUp}
            className="h1-ac mb-4"
          >
            {t('thanks.h1')}
          </motion.h1>

          <motion.div variants={fadeUp}
            className="rounded-2xl p-8 mt-6"
            style={{ background: '#FFFDF7', border: '1px solid rgba(212,175,55,0.45)' }}
          >
            {importe && (
              <p className="text-[#5B3E2A] mb-2 uppercase tracking-[0.18em]" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                {t('thanks.paid')} {importe}
              </p>
            )}
            <p className="body-ac text-[#3D2817] mb-6">
              {t('thanks.body')}
            </p>

            {/* Sin salto automático, a propósito: la persona entra cuando pulsa.
                Así lee que su portal está listo, y el evento de compra de
                Analytics —que espera al backend— siempre llega a dispararse. */}
            <a href={destino} className="btn-primary w-full">
              {t('thanks.cta')}
            </a>
          </motion.div>

          <motion.p variants={fadeUp} className="small-ac text-[#5B3E2A] mt-6">
            {t('thanks.note')}{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="link-ac">{SUPPORT_EMAIL}</a>
          </motion.p>
        </motion.div>
      </section>
    </main>
  );
}
