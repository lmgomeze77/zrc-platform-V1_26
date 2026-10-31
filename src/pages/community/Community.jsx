import PublicReports from "../innercircle/PublicReports";
import InnerCircleValue from '../innercircle/InnerCircleValue';

// The homepage is an invitation to understand the membership, not a second login flow.
export default function Community({lang='es',onExplore}) {
  const es=lang==='es';
  return <section className="ic-desk ic-community-intro" aria-label={es?'Descubre Inner Circle':'Discover Inner Circle'}>
    <div className="ic-community-content">
      <span className="ic-kicker">ZRC · THE INNER CIRCLE</span>
      <h2>{es?'Información para tus decisiones internacionales.':'Insight for your international decisions.'}</h2>
      <p className="ic-lead">{es?'Lee el comentario mensual y los reportajes sin registro. Solicita la membresía para trabajar con tu ficha personal.':'Read the monthly commentary and reports without registering. Apply for membership to work on your personal decision brief.'}</p>
      <PublicReports onRead={onExplore}/>
      <InnerCircleValue lang={lang}/>
      <div className="ic-actions"><button type="button" className="ic-button" onClick={onExplore}>{es?'Conocer la membresía y solicitar acceso →':'Explore membership and apply →'}</button><span className="ic-small">{es?'Presentación pública · membresía gratuita · aprobación manual':'Public overview · free membership · reviewed admission'}</span></div>
    </div>
  </section>;
}
