import { Link } from 'react-router-dom';
import { FileText, LogIn, Mail } from 'lucide-react';
import { useLang } from '../../context/LanguageContext.jsx';
import AppCta from '../ui/AppCta.jsx';
import { SUPPORT_EMAIL } from '../../config.js';

/* =========================================================
   Pie de página.

   Compacto (ronda de sept 2026): en móvil medía ~900 px. Navegación y
   legal van en dos columnas también en móvil, el espaciado se acorta y
   no se repite nada que ya esté en el menú. Lo que tiene que seguir a
   mano: soporte (correo clicable) y documentos legales.

   El blog no está en la lista mientras no tenga publicaciones; la ruta
   sigue existiendo (/blog) y se vuelve a listar cuando haya contenido.

   Las páginas legales son rutas del sitio, no PDF: no sacan al usuario
   de la web, funcionan en móvil y cambian de idioma con el resto.
   ========================================================= */
const LEGAL_DOCS = [
  { key: 'footer.doc.privacy', href: '/privacy' },
  { key: 'footer.doc.terms',   href: '/terms' },
  { key: 'footer.doc.refund',  href: '/refund' },
];

const NAV = [
  { key: 'footer.home',    href: '/' },
  { key: 'footer.app',     href: '/app' },
  { key: 'footer.how',     href: '/how-it-works' },
  { key: 'footer.pricing', href: '/pricing' },
  { key: 'footer.about',   href: '/about' },
  { key: 'footer.faq',     href: '/faq' },
  { key: 'footer.contact', href: '/contact' },
];

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t" style={{ background: '#F7F3EE', borderColor: '#E8DCC8' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr] gap-x-6 gap-y-8 mb-8">
          {/* Marca + operador + soporte */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/img/symbol-transparent.png"
                alt=""
                width={40}
                height={40}
                loading="lazy"
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
              <span className="text-sm tracking-[0.28em] uppercase font-semibold" style={{ color: '#3D2817' }}>
                Abundance Code
              </span>
            </div>
            <p className="small-ac text-[#5B3E2A] mb-4" style={{ maxWidth: '36ch' }}>
              {t('footer.desc')}
            </p>
            <p className="small-ac text-[#5B3E2A]">
              <span className="uppercase tracking-[0.18em] text-xs text-gold-ink font-semibold mr-2">{t('footer.support')}</span>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="link-ac inline-flex items-center gap-1.5">
                <Mail size={14} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>

          {/* Navegación */}
          <nav aria-label={t('footer.nav')}>
            <p className="text-gold-ink text-xs uppercase tracking-[0.28em] mb-3 font-semibold">
              {t('footer.nav')}
            </p>
            <ul className="space-y-1.5">
              {NAV.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="small-ac text-[#5B3E2A] hover:text-[#3D2817] transition-colors inline-block py-0.5">
                    {t(link.key)}
                  </Link>
                </li>
              ))}
              {/* Segunda puerta de entrada para quien ya pagó. Destacada
                  porque no es navegación del sitio: es la salida a la app. */}
              <li className="pt-2.5 mt-2.5 border-t" style={{ borderColor: '#E8DCC8' }}>
                <AppCta
                  campaign="footer-login"
                  path="/"
                  variant="link"
                  className="inline-flex items-center gap-2 small-ac font-semibold text-[#3D2817] hover:text-gold-ink transition-colors py-0.5"
                >
                  <LogIn size={14} strokeWidth={1.75} className="shrink-0 text-[#D4AF37]" aria-hidden="true" />
                  {t('footer.login')}
                </AppCta>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <div>
            <p className="text-gold-ink text-xs uppercase tracking-[0.28em] mb-3 font-semibold">
              {t('footer.docs')}
            </p>
            <ul className="space-y-1.5">
              {LEGAL_DOCS.map((doc) => (
                <li key={doc.href}>
                  <Link
                    to={doc.href}
                    className="inline-flex items-start gap-2 small-ac text-[#5B3E2A] hover:text-[#3D2817] transition-colors py-0.5"
                  >
                    <FileText size={14} strokeWidth={1.75} className="shrink-0 text-[#D4AF37] mt-1" aria-hidden="true" />
                    <span>{t(doc.key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t pt-5 flex flex-col md:flex-row md:items-center justify-between gap-2"
          style={{ borderColor: '#E8DCC8' }}>
          <p className="text-xs text-[#5B3E2A]">{t('footer.rights')}</p>
          <a href="https://abundancecode.us/" className="text-xs text-[#5B3E2A]/80 hover:text-[#3D2817] transition-colors">
            abundancecode.us
          </a>
        </div>
      </div>
    </footer>
  );
}
