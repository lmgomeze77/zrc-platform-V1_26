import {useEffect,useState} from "react";
import {MapContainer,TileLayer,GeoJSON} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const products={
 olive:{name:"Aceite de oliva virgen extra",hs:"1509.20",rates:{tn:8,ma:15,tr:12}},
 solar:{name:"Módulos fotovoltaicos",hs:"8541.43",rates:{cn:12,jp:0,kr:6}},
 pumps:{name:"Bombas centrífugas",hs:"8413.70",rates:{us:5,gb:0,cn:9}}
};
const origins={tn:"Túnez",ma:"Marruecos",tr:"Turquía",cn:"China",jp:"Japón",kr:"Corea del Sur",us:"Estados Unidos",gb:"Reino Unido",mx:"México",br:"Brasil",in:"India",ca:"Canadá"};
const money=new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:2});
const pct=new Intl.NumberFormat("es-ES",{maximumFractionDigits:2});
const field={padding:9,border:"1px solid #A6BED8",borderRadius:8,background:"#fff",color:"#15233B",width:"100%",boxSizing:"border-box",fontSize:16};
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:12};
const num=(x,max)=>x!==""&&x!=null&&Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=max?Number(x):null;
const shade=v=>v==null?"#CAD5E2":v===0?"#27867A":v<10?"#518BC6":"#BA642B";
const official="https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp?Lang=es";
export default function GeoRiskTariffAtlas(){
 const [product,setProduct]=useState("olive"),[demo,setDemo]=useState(true);
 const [manual,setManual]=useState({}),[selected,setSelected]=useState(["tn","ma","tr"]);
 const [customs,setCustoms]=useState("10000"),[shock,setShock]=useState("0");
 const [boundaries,setBoundaries]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const c=new AbortController();fetch("/georisk-world-42.geojson",{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setBoundaries).catch(()=>{if(!c.signal.aborted)setFailed(true)});return()=>c.abort()},[]);
 const p=products[product], amount=num(customs,1e12), extra=num(shock,100);
 const rate=id=>demo?p.rates[id]??null:num(manual[product]?.[id],1000);
 const toggle=id=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<3?[...prev,id]:prev);
 const change=key=>{setProduct(key);setSelected(Object.keys(products[key].rates));setShock("0")};
 return <section aria-label="Mapa arancelario" style={{background:"#F7F9FC",color:"#15233B",padding:"clamp(14px,3vw,28px)",borderRadius:18,colorScheme:"light"}}>
  <div style={{fontSize:11,letterSpacing:1.5,fontWeight:800,color:"#2E6FB8"}}>GEORISK · COMERCIO INTERNACIONAL</div>
  <h2 style={{fontSize:"clamp(22px,4vw,30px)",margin:"6px 0"}}>Mapa arancelario</h2>
  <p style={{fontSize:14,margin:"0 0 16px"}}>Compara hasta tres orígenes para un mismo producto. Destino piloto: España (territorio aduanero de la UE).</p>
  <div style={grid}>
   <label>Producto<select style={field} value={product} onChange={e=>change(e.target.value)}>{Object.entries(products).map(([id,item])=><option key={id} value={id}>{item.name} · HS {item.hs}</option>)}</select></label>
   <label>Modo<select style={field} value={demo?"demo":"manual"} onChange={e=>{setDemo(e.target.value==="demo");setShock("0")}}><option value="demo">Ejemplo con datos ficticios</option><option value="manual">Introducir tipos manualmente</option></select></label>
  </div>
  <p role="status" style={{fontSize:13,padding:10,background:demo?"#FFF2DD":"#EAF1F9",borderRadius:8}}>{demo?"Ejemplo ficticio: los colores y cifras no representan aranceles vigentes ni preferencias comerciales.":"Tipos aportados por ti, sin verificación automática. Consulta en TARIC el código completo, el origen y las medidas vigentes antes de introducirlos."} <a style={{color:"#175487"}} href={official} target="_blank" rel="noreferrer">Consultar TARIC</a></p>
  <div style={{overflow:"hidden",border:"1px solid #C7D6E6",borderRadius:14,position:"relative",isolation:"isolate"}}>
   <MapContainer center={[25,10]} zoom={2} minZoom={1} scrollWheelZoom={false} style={{height:"clamp(260px,42vw,410px)",background:"#EAF1F9"}}>
    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
    {boundaries&&<GeoJSON data={boundaries} style={feature=>{const id=feature.properties.id;return {color:selected.includes(id)?"#16385C":"#60748C",weight:selected.includes(id)?2.5:0.8,fillColor:shade(rate(id)),fillOpacity:rate(id)==null?.37:.8}}} onEachFeature={(feature,layer)=>{const id=feature.properties.id;if(origins[id]){layer.bindTooltip(origins[id]);layer.on("click",()=>toggle(id));}}}/>}
   </MapContainer>
  </div>
  {failed&&<p role="status" style={{fontSize:13}}>No se cargaron los contornos. Puedes comparar con los selectores de abajo.</p>}
  <ul aria-label="Leyenda del mapa" style={{display:"flex",flexWrap:"wrap",gap:12,listStyle:"none",padding:0,fontSize:12}}>
   {[[0,"0 %"],[5,"Más de 0 y menos de 10 %"],[10,"10 % o más"],[null,"Sin dato"]].map(([v,label])=><li key={label}><span aria-hidden="true" style={{display:"inline-block",width:12,height:12,background:shade(v),marginRight:5,borderRadius:3}}/>{label}</li>)}
  </ul>
  <fieldset style={{border:"1px solid #C7D6E6",borderRadius:10,margin:"12px 0",padding:12,minWidth:0}}>
   <legend>Orígenes a comparar ({selected.length}/3)</legend>
   <div style={{display:"flex",flexWrap:"wrap",gap:"6px 14px",fontSize:13}}>{Object.entries(origins).map(([id,name])=><label key={id} style={{display:"inline-flex",alignItems:"center",minHeight:32,gap:4}}><input type="checkbox" checked={selected.includes(id)} disabled={selected.length===3&&!selected.includes(id)} onChange={()=>toggle(id)}/>{name}</label>)}</div>
   <small>Si ya hay tres, quita uno para añadir otro.</small>
  </fieldset>
  <div style={grid}>
   <label>Valor en aduana (€)<input style={field} type="number" min="0" max="1000000000000" value={customs} onChange={e=>setCustoms(e.target.value)}/></label>
   <label>Subida hipotética (puntos porcentuales)<input style={field} type="number" min="0" max="100" step="0.5" value={shock} onChange={e=>setShock(e.target.value)}/></label>
  </div>
  <h3 style={{fontSize:18}}>Derechos estimados por envío</h3>
  {selected.length===0&&<p>Selecciona al menos un origen.</p>}
  <div style={grid}>{selected.map(id=>{const r=rate(id),cost=r==null||amount==null?null:amount*r/100;return <article key={id} style={{background:"#FFF",border:"1px solid #C7D6E6",borderRadius:12,padding:14}}>
   <h4 style={{margin:"0 0 8px",fontSize:16}}>{origins[id]}</h4>
   {demo?<div>{r==null?"Sin dato de ejemplo":pct.format(r)+" % · ejemplo"}</div>:<label>Tipo aportado (%)<input style={field} type="number" min="0" max="1000" step="any" value={manual[product]?.[id]??""} onChange={e=>setManual(prev=>({...prev,[product]:{...prev[product],[id]:e.target.value}}))}/></label>}
   <p style={{fontSize:22,fontWeight:750,margin:"8px 0"}}>{cost==null?"—":money.format(cost)}</p>
   {cost!=null&&extra>0&&<p style={{fontSize:13,margin:0}}>Con la subida: <strong>{money.format(cost+amount*extra/100)}</strong> (+{money.format(amount*extra/100)})</p>}
  </article>})}</div>
  <p style={{fontSize:12,marginBottom:0}}>Cálculo parcial: valor en aduana × tipo porcentual. No incluye IVA, derechos por peso, antidumping ni otros gastos. No determina si procede una preferencia o un contingente.</p>
 </section>;
}
