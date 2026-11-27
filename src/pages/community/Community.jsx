import PublicReports from "../innercircle/PublicReports";

export default function Community({lang='es',onExplore}) {
 const es=lang==='es';
 return <section className="ic-desk ic-community-intro" aria-label={es?'Descubre Inner Circle':'Discover Inner Circle'}>
   <div className="ic-community-content">
     <div className="ic-community-masthead"><span>ZENITH RISE CAPITAL</span><span>THE INNER CIRCLE</span></div>
     <div className="ic-community-headline"><span className="ic-kicker">{es?'INTELIGENCIA PARA DECISIONES':'INTELLIGENCE FOR DECISIONS'}</span><h2>{es?'Una mirada más cerca.':'A closer look.'}</h2><p>{es?'Del dato y la señal del Observatorio a sus consecuencias para una empresa, una inversión o un mercado. Una pieza concreta, contrastada y trabajada en profundidad.':'From Observatory data and signals to their consequences for a business, an investment or a market. A focused, sourced analysis.'}</p></div>
     <PublicReports lang={lang} onRead={onExplore}/>
     <div className="ic-community-access"><div><span className="ic-kicker">{es?'ACCESO POR SOLICITUD':'ACCESS BY APPLICATION'}</span><p>{es?'Recibe la edición completa, los escenarios y las herramientas de trabajo tras la aprobación personal de tu solicitud.':'Read the full edition, scenarios and working tools after your application is personally approved.'}</p><small>{es?'Registro gratuito en esta etapa.':'Free registration at this stage.'}</small></div><button type="button" className="ic-button" onClick={onExplore}>{es?'Solicitar acceso':'Request access'}</button></div>
   </div>
 </section>;
}
