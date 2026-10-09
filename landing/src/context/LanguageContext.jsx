import { createContext, useContext, useState } from 'react';
import { en } from '../i18n/en.js';
import { es } from '../i18n/es.js';
import { TRIAL_ENABLED } from '../config.js';

const translations = { en, es };

/* Mientras la app no ofrezca prueba gratis (TRIAL_ENABLED = false), cualquier
   texto que la prometa se sustituye por su variante `<key>.paid`, si existe.
   Así el copy de la prueba no se borra: se reactiva cambiando la constante. */
const variant = (key) => (TRIAL_ENABLED ? key : `${key}.paid`);

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  /* El idioma vive en el navegador. Si la URL trae ?lang= (la vuelta de
     Stripe lo añade con el idioma de la compra), manda sobre lo guardado:
     la vuelta puede abrirse en otro navegador que no sabe nada del idioma
     elegido antes. */
  const [lang, setLang] = useState(() => {
    const deUrl = new URLSearchParams(window.location.search).get('lang');
    if (deUrl === 'es' || deUrl === 'en') {
      try { localStorage.setItem('lang', deUrl); } catch { /* sin almacenamiento */ }
      return deUrl;
    }
    try { return localStorage.getItem('lang') || 'es'; } catch { return 'es'; }
  });

  const toggle = () =>
    setLang(l => {
      const next = l === 'es' ? 'en' : 'es';
      localStorage.setItem('lang', next);
      return next;
    });

  /* Fijar el idioma sin alternarlo. Lo necesita el blog: sus artículos tienen
     una URL por idioma, y quien llega a /en/blog/... desde una búsqueda en
     inglés tiene que ver inglés aunque su navegador recuerde otra cosa. */
  const fijarIdioma = (valor) => {
    if (valor !== 'es' && valor !== 'en') return;
    setLang(valor);
    try { localStorage.setItem('lang', valor); } catch { /* sin almacenamiento */ }
  };

  const lookup = (key) =>
    translations[lang]?.[key] ?? translations['en']?.[key] ?? null;

  const t = (key) => lookup(variant(key)) ?? lookup(key) ?? key;

  return (
    <LanguageContext.Provider value={{ lang, toggle, t, fijarIdioma }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
