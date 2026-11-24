// Blind mandate catalogue. Served only after Supabase has verified the email address.
const records = [
  ['HTL-01','sell','real-estate','Hotel urbano 4★ llave en mano · 228 habitaciones','Madrid','38 M€','Proyecto de nueva construcción; entrega estimada veinte meses desde licencia. Operador por seleccionar.','Turnkey 4★ urban hotel · 228 rooms','Madrid','€38m','New-build project; estimated delivery twenty months after licence. Operator open.'],
  ['HTL-02','sell','real-estate','Hotel 2★ arrendado · 88 habitaciones','Madrid','20,5 M€','Licencia concedida; contrato de operador de veinte años, diez de obligado cumplimiento; renta anual indicada de 1,23 M€.','Leased 2★ hotel · 88 rooms','Madrid','€20.5m','Licence granted; twenty-year operator lease, ten years firm; indicated annual rent €1.23m.'],
  ['RE-01','sell','real-estate','Local urbano de gran superficie','Madrid · Chamberí','5–8 M€','Venta y potencial reposicionamiento; documentación en preparación para contrapartes cualificadas.','Large-format urban premises','Madrid · Chamberí','€5–8m','Sale with potential repositioning; documentation available for qualified counterparties.'],
  ['RE-02','sell','real-estate','Finca rústica · 330 ha','Jaén','A consultar','Explotación agrícola en Andalucía.','Rural estate · 330 ha','Jaén','On request','Agricultural estate in Andalusia.'],
  ['MA-01','sell','ma','Negocio de restauración de destino','Madrid','3,5 M€','Facturación indicada ~4,1 M€ y EBITDA ~600 k€ tras renta. El inmueble se plantea por separado.','Destination restaurant business','Madrid','€3.5m','Indicated revenue ~€4.1m and EBITDA ~€600k after rent. Property considered separately.'],
  ['MA-02','sell','ma','Participación minoritaria en restauración','Madrid','340–360 k€','Venta del 30 % del capital; documentación financiera y pacto de socios sujetos a revisión.','Minority restaurant stake','Madrid','€340–360k','Sale of a 30% stake; financials and shareholders agreement subject to review.'],
  ['MA-03','sell','ma','Taller oficial de automoción premium','Madrid','A consultar','Venta del negocio en explotación.','Premium authorised automotive workshop','Madrid','On request','Operating business for sale.'],
  ['MA-04','sell','ma','Compañía en proceso de venta','España','A consultar','Cuaderno y dosier ciego en preparación.','Company sale process','Spain','On request','Information memorandum and blind dossier in preparation.'],
  ['MA-05','sell','ma','Compañía de construcción','España','A consultar','Expediente preliminar y data room en preparación.','Construction company','Spain','On request','Preliminary workstream; data room in preparation.'],
  ['BUY-01','buy','real-estate','Oficinas con o sin inquilino','Madrid y Barcelona','Hasta 25 M€ por activo','Búsqueda de edificios y plantas, ocupados o vacíos, incluso con recorrido de reposicionamiento.','Offices with or without tenants','Madrid and Barcelona','Up to €25m per asset','Search for buildings and floors, occupied or vacant, including repositioning potential.'],
  ['BUY-02','buy','ma','Centros médicos','España','EBITDA >300 k€','Búsqueda nacional de negocios sanitarios privados.','Medical centres','Spain','EBITDA >€300k','Nationwide search for private healthcare businesses.'],
  ['BUY-03','buy','ma','Productores hortofrutícolas','España','A consultar','Búsqueda para fondo comprador; oportunidades adicionales bienvenidas.','Fruit and vegetable producers','Spain','On request','Search for an acquiring fund; additional opportunities welcome.'],
  ['AGR-01','sell','ma','Olivar superintensivo integrado · 700 ha','Cádiz','50 M€','Explotación con infraestructura industrial. Magnitudes operativas e hídricas sujetas a verificación.','Integrated olive estate · 700 ha','Cádiz','€50m','Estate with industrial infrastructure. Operating and water data subject to verification.'],
  ['AGR-02','sell','ma','Olivar con almazara · 1.212 ha','Alentejo, Portugal','A consultar','Plantaciones mecanizadas y almazara; valoración bajo confidencialidad.','Olive estate with mill · 1,212 ha','Alentejo, Portugal','On request','Mechanised groves and mill; valuation under confidentiality.'],
  ['AGR-03','sell','ma','Olivar en explotación','Valle del Guadalquivir','A consultar','Expediente con parte interesada; disponibilidad sujeta a confirmación.','Producing olive grove','Guadalquivir valley','On request','Workstream with interested party; availability subject to confirmation.'],
  ['AGR-04','sell','ma','Invernaderos de fruta tropical','Sur de España','A consultar','Búsqueda de inversor para explotación agrícola.','Tropical fruit greenhouses','Southern Spain','On request','Investor search for agricultural operation.'],
  ['AGR-05','sell','ma','Infraestructura agro hídrica','Marruecos','A consultar','Proyecto vinculado a explotación agrícola.','Agri-water infrastructure','Morocco','On request','Project linked to agricultural operations.'],
  ['CAP-01','sell','capital','Plataforma tecnológica de moda a medida','España','400–600 k€','Ronda semilla en estructuración; términos sujetos a confirmación.','Made-to-measure fashion technology','Spain','€400–600k','Seed round being structured; terms subject to confirmation.'],
  ['CAP-02','sell','capital','Compañía tecnológica','España','A consultar','Ronda de financiación en preparación.','Technology company','Spain','On request','Funding round in preparation.']
];

export async function handlePipeline(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return Response.json({error:'unauthorized'}, {status:401});
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {headers:{apikey:env.SUPABASE_SERVICE_KEY, Authorization:`Bearer ${token}`}});
  if (!response.ok) return Response.json({error:'unauthorized'}, {status:401});
  const user = await response.json();
  if (!user.email_confirmed_at && !user.confirmed_at) return Response.json({error:'email_unverified'}, {status:403});
  return Response.json({updated:'2026-11-19',items:records.map(([ref,side,vertical,title,geo,price,description,titleEn,geoEn,priceEn,descriptionEn])=>({ref,side,vertical,title:{es:title,en:titleEn},geo:{es:geo,en:geoEn},price:{es:price,en:priceEn},description:{es:description,en:descriptionEn}}))}, {headers:{'Cache-Control':'private, no-store'}});
}
