import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../../context/LanguageContext.jsx';
import AppCta from '../ui/AppCta.jsx';
import StartCta from '../ui/StartCta.jsx';

/* Nav enfocado en el funnel: la app, cómo funciona, precio.
   Sobre nosotros y contacto viven en el footer.
   El blog sale del menú mientras no tenga publicaciones (sept 2026); la
   ruta /blog sigue existiendo y se vuelve a listar cuando haya contenido. */
const NAV_KEYS = [
  { key: 'nav.home',    href: '/' },
  { key: 'nav.app',     href: '/app' },
  { key: 'nav.how',     href: '/how-it-works' },
  { key: 'nav.pricing', href: '/pricing' },
  { key: 'nav.faq',     href: '/faq' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);
  const location                = useLocation();
  const { lang, toggle, t }     = useLang();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled && !open
            ? 'bg-[#F5F1ED]/95 backdrop-blur-md border-b border-[#E8DCC8]'
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0" onClick={() => setOpen(false)}>
            <img
              src="/img/symbol-transparent.png"
              alt="Abundance Code"
              width={32}
              height={32}
              className="block shrink-0"
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
            <span
              className="font-sans uppercase select-none font-semibold whitespace-nowrap"
              style={{ color: '#3D2817', fontSize: 'clamp(0.65rem, 2.6vw, 0.875rem)', letterSpacing: '0.22em' }}
            >
              Abundance Code
            </span>
          </Link>

          {/* Desktop links.
              Con 7 enlaces (uno de tres palabras) la fila no cabe entre 768 y
              ~1080px: hasta lg se usa el menú hamburguesa. */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7">
            {NAV_KEYS.map(({ key, href }) => (
              <Link
                key={href}
                to={href}
                className={`font-sans text-sm transition-colors duration-200 ${
                  isActive(href) ? 'text-[#3D2817] font-semibold' : 'text-[#5B3E2A] hover:text-[#3D2817]'
                }`}
              >
                {t(key)}
              </Link>
            ))}
          </div>

          {/* Desktop CTA + Lang toggle */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggle}
              className="font-sans text-xs tracking-widest uppercase text-[#5B3E2A] hover:text-[#3D2817] transition-colors border border-[#E8DCC8] hover:border-[#D4AF37] rounded-full px-3 min-h-[2.25rem]"
              aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
            {/* "Entrar" para quien ya pagó — va directo a la app.
                Botón y no texto plano: mezclado con los enlaces del menú se
                leía como una sección más de la web, no como la puerta a la
                cuenta. Contorneado, para que "Empezar" siga siendo el botón
                que más pesa. */}
            <AppCta
              campaign="navbar-login"
              path="/"
              variant="outline"
              className="px-5 !min-h-[2.5rem] !py-2 !text-sm"
            >
              {t('nav.login')}
            </AppCta>
            <StartCta campaign="navbar" className="px-5 !min-h-[2.5rem] !py-2 !text-sm">
              {t('nav.cta')}
            </StartCta>
          </div>

          {/* Mobile: entrar + idioma + hamburguesa.

              "Entrar" vive aquí y no solo dentro del menú: quien ya pagó abre
              la web en el móvil para usar la app, y antes tenía que adivinar
              que su cuenta estaba detrás de la hamburguesa. Es el único
              elemento del menú que se saca fuera, porque es el único que no
              es navegación sino acceso.

              Se oculta con el menú abierto (el overlay ya lo ofrece a lo
              ancho) para no amontonar dos veces la misma acción. */}
          <div className="lg:hidden flex items-center gap-2">
            {!open && (
              <AppCta
                campaign="navbar-mobile-bar-login"
                path="/"
                variant="outline"
                className="px-4 !min-h-[2.25rem] !py-1.5 !text-xs whitespace-nowrap"
              >
                {t('nav.login')}
              </AppCta>
            )}
            <button
              onClick={() => setOpen(!open)}
              className="relative z-[60] w-10 h-10 flex items-center justify-center text-[#3D2817]/80 hover:text-[#3D2817] transition-colors"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
            >
              <AnimatePresence mode="wait">
                {open ? (
                  <motion.span key="close"
                    initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.18 }}>
                    <X size={22} />
                  </motion.span>
                ) : (
                  <motion.span key="menu"
                    initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.18 }}>
                    <Menu size={22} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 backdrop-blur-xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(245,241,237,0.98)' }}
          >
            <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">
              <nav className="flex flex-col items-center gap-6 mb-10 w-full">
                {NAV_KEYS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.3, delay: i * 0.06 }}
                  >
                    <Link
                      to={link.href}
                      className={`font-sans text-2xl tracking-wide transition-all duration-200 ${
                        isActive(link.href)
                          ? 'text-[#3D2817] font-semibold'
                          : 'text-[#5B3E2A] hover:text-[#3D2817]'
                      }`}
                    >
                      {t(link.key)}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="w-full h-px mb-8"
                style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.4, delay: 0.42 }}
                className="w-full"
              >
                <StartCta campaign="navbar-mobile" className="w-full">
                  {t('nav.cta')}
                </StartCta>
                <AppCta
                  campaign="navbar-mobile-login"
                  path="/"
                  variant="outline"
                  className="mt-3 w-full"
                >
                  {t('nav.login')}
                </AppCta>
                <button
                  onClick={toggle}
                  className="mt-4 w-full font-sans text-xs tracking-widest uppercase text-[#5B3E2A] hover:text-[#3D2817] transition-colors border border-[#E8DCC8] hover:border-[#D4AF37] rounded-full min-h-[2.75rem]"
                >
                  {lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
                </button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-8 flex items-center gap-5"
            >
              {[['nav.terms', '/terms'], ['nav.privacy', '/privacy'], ['nav.contact', '/contact']].map(([key, href]) => (
                <Link key={href} to={href} className="text-[#5B3E2A] text-xs tracking-widest uppercase hover:text-[#3D2817] transition-colors font-sans py-2">
                  {t(key)}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
