import PublicReports from "../innercircle/PublicReports";

// The homepage is an invitation to understand the membership, not a second login flow.
export default function Community({lang='es',onExplore}) {
  const es=lang==='es';
  return <section className="ic-desk ic-community-intro" aria-label={es?'Descubre Inner Circle':'Discover Inner Circle'}>
    <div className="ic-community-content">
      <span className="ic-kicker">ZRC · THE INNER CIRCLE</span>
      <h2>{es?'Información para tus decisiones internacionales.':'Insight for your international decisions.'}</h2>
      <p className="ic-lead">{es?'Conoce los temas de la edición antes de solicitar acceso. Si ya eres miembro y tienes una sesión activa, entra directamente a tu espacio.':'Preview this edition’s topics before applying. If you are already a member with an active session, enter your workspace directly.'}</p>
      <PublicReports onRead={onExplore}/>
      <div className="ic-actions"><button type="button" className="ic-button" onClick={onExplore}>{es?'Entrar o solicitar membresía →':'Enter or apply for membership →'}</button><span className="ic-small">{es?'Resumen público · gratuita durante esta etapa · aprobación manual':'Public preview · free during this stage · reviewed admission'}</span></div>
    </div>
  </section>;
}
