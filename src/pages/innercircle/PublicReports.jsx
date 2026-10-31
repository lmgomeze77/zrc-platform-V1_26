import {IcText} from './icLocale';
import edition from '../../data/innercircle/october2026.json';
export default function PublicReports({onRead}){
 const cards=[
  {id:'S4',tag:'MÉXICO',title:'Expandirse con hitos verificables',text:'La inversión requiere acreditar demanda, permisos y capacidad local. La ficha de México conecta el contexto publicado con las comprobaciones previas al desembolso.'},
  {id:'S5',tag:'COLOMBIA',title:'Financiar en otra moneda exige mirar la caja',text:'El coste de una deuda depende de moneda, plazo y cobertura. El comentario explica qué contrastar antes de comparar financiación en pesos y euros.'},
  {id:'S2',tag:'ENERGÍA Y EMPRESA',title:'La resiliencia también consume capital',text:'Energía, logística y circulante pueden absorber el crecimiento de las ventas. La edición plantea escenarios y preguntas para revisar el flujo de caja.'}
 ];
 return <IcText><div className="ic-public-reports"><span className="ic-kicker">LECTURAS PÚBLICAS · OCTUBRE DE 2026</span><div className="ic-three">{cards.map(card=>{const source=edition.sources.find(s=>s.id===card.id);return <article key={card.id} className="ic-panel"><span className="ic-kicker">{card.tag}</span><h3>{card.title}</h3><p>{card.text}</p><p className="ic-small">Fuente: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher}</a> · {source.published}</p>{onRead?<button type="button" className="ic-button ic-button-quiet" onClick={onRead}>Leer el comentario completo →</button>:<a className="ic-button ic-button-quiet" href="#ic-edition">Leer el comentario completo →</a>}</article>})}</div></div></IcText>;
}
