import { useLang } from '../../context/LanguageContext.jsx';

/* =========================================================
   AppScreenshot — la app en contexto: el móvil con la carta natal
   abierta sobre el escritorio.

   Antes había una captura por idioma (app-es.png / app-en.png) y el
   componente seguía al selector de idioma. Esta foto es una sola, así
   que la interfaz que se ve dentro del móvil está en español aunque el
   sitio esté en inglés. Si hace falta una versión en inglés, basta con
   volver a la ruta por idioma de antes.
   ========================================================= */
export default function AppScreenshot({ priority = false, className = '', style = {} }) {
  const { t } = useLang();

  return (
    <img
      src="/img/app-hero-chart.png"
      alt={t('h.app.alt')}
      width={1289}
      height={1221}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`block w-full h-auto rounded-2xl ${className}`}
      style={{
        border: '1px solid #E8DCC8',
        boxShadow: '0 24px 70px rgba(61,40,23,0.16), 0 4px 16px rgba(61,40,23,0.06)',
        background: '#FFFDF7',
        ...style,
      }}
    />
  );
}
