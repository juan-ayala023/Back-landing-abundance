import LegalPage from './LegalPage.jsx';
import { useLang } from '../../context/LanguageContext.jsx';
import { SUPPORT_EMAIL } from '../../config.js';


export default function Refund() {
  const { t } = useLang();

  return (
    <LegalPage title={t('refund.title')} updated={t('refund.updated')}>
      <h2>{t('refund.1h')}</h2>
      <p>{t('refund.1p1')}</p>
      <p>{t('refund.1p2')} <a href={`mailto:${SUPPORT_EMAIL}`} className="link-ac">{SUPPORT_EMAIL}</a></p>

      <h2>{t('refund.2h')}</h2>
      <ul>
        <li>{t('refund.2li1')}</li>
        <li>{t('refund.2li2')}</li>
        <li>{t('refund.2li3')}</li>
        <li>{t('refund.2li4')}</li>
      </ul>

      <h2>{t('refund.3h')}</h2>
      {/* Pasos numerados: aquí el orden importa, no es una lista suelta. */}
      <ol className="list-decimal pl-6 space-y-2">
        <li>{t('refund.3li1')}</li>
        <li>{t('refund.3li2')}</li>
        <li>{t('refund.3li3')}</li>
        <li>{t('refund.3li4')}</li>
      </ol>
      <p>{t('refund.3p')} <a href={`mailto:${SUPPORT_EMAIL}`} className="link-ac">{SUPPORT_EMAIL}</a></p>

      <h2>{t('refund.4h')}</h2>
      <p>{t('refund.4p')} <a href={`mailto:${SUPPORT_EMAIL}`} className="link-ac">{SUPPORT_EMAIL}</a></p>

      <h2>{t('refund.5h')}</h2>
      <p>{t('refund.5p')}</p>
    </LegalPage>
  );
}
