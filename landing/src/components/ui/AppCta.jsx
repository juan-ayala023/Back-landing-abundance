import { appUrl, SIGNUP_PATH } from '../../config.js';
import { useLang } from '../../context/LanguageContext.jsx';

/* =========================================================
   AppCta — enlace externo a la web app.
   Reemplaza a los <Link to="/checkout"> del sitio ecommerce.
   `campaign` identifica el bloque que generó el clic (UTM).
   ========================================================= */
export default function AppCta({
  children,
  campaign = 'generic',
  path = SIGNUP_PATH,
  variant = 'primary',
  className = '',
}) {
  /* El idioma viaja con el enlace: es el único punto por donde pasan todos
     los botones que llevan a la app, así que arreglarlo aquí los arregla
     todos —el del navbar, el del pie y los de las secciones—. */
  const { lang } = useLang();

  const base =
    variant === 'link'    ? ''
    : variant === 'outline' ? 'btn-outline'
    : 'btn-primary';

  return (
    <a
      href={appUrl(path, campaign, lang)}
      className={`${base} ${className}`}
      rel="noopener"
    >
      {children}
    </a>
  );
}
