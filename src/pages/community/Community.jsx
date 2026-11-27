import PublicReports from "../innercircle/PublicReports";

// The homepage is an invitation to understand the membership, not a second login flow.
export default function Community({lang='es',onExplore}) {
  const es=lang==='es';
  return <section className="ic-desk ic-community-intro" aria-label={es?'Descubre Inner Circle':'Discover Inner Circle'}>
    <div className="ic-community-content">
      <span className="ic-kicker">ZRC · THE INNER CIRCLE</span>
      <h2>{es?'Información para tus decisiones internacionales.':'Insight for your international decisions.'}</h2>
      <p className="ic-lead">{es?'Una mirada a los asuntos que seguimos. La edición completa y las herramientas de trabajo se abren tras la aprobación de tu solicitud.':'A glimpse of the issues we follow. The full edition and working tools open after your application is approved.'}</p>
      <PublicReports onRead={onExplore}/>
      <div className="ic-actions"><button type="button" className="ic-button" onClick={onExplore}>{es?'Solicitar acceso →':'Request access →'}</button><span className="ic-small">{es?'Registro gratuito en esta etapa · aprobación personal':'Free registration at this stage · personal approval'}</span></div>
    </div>
  </section>;
}
