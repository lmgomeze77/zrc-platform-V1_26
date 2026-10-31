import InnerCircleValue from '../innercircle/InnerCircleValue';

// The homepage is an invitation to understand the membership, not a second login flow.
export default function Community({lang='es',onExplore}) {
  const es=lang==='es';
  return <section className="ic-desk ic-community-intro" aria-label={es?'Descubre Inner Circle':'Discover Inner Circle'}>
    <div className="ic-community-content">
      <span className="ic-kicker">ZRC · THE INNER CIRCLE</span>
      <h2>{es?'Valora la membresía antes de solicitar acceso.':'Explore the membership before applying.'}</h2>
      <p className="ic-lead">{es?'Una edición mensual con fuentes y una ficha para preparar decisiones de expansión, adquisición o financiación.':'A sourced monthly edition and a brief to prepare expansion, acquisition or financing decisions.'}</p>
      <InnerCircleValue lang={lang}/>
      <div className="ic-actions"><button type="button" className="ic-button" onClick={onExplore}>{es?'Conocer la membresía y solicitar acceso →':'Explore membership and apply →'}</button><span className="ic-small">{es?'Presentación pública · membresía gratuita · aprobación manual':'Public overview · free membership · reviewed admission'}</span></div>
    </div>
  </section>;
}
