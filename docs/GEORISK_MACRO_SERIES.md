# Datos macroeconómicos de GeoRisk

El panel **Datos económicos observados** presenta información publicada por fuentes oficiales y está disponible tanto en GeoRisk Dashboard como en GeoRisk ML.

| Zona / indicador | Fuente | Unidad y periodicidad | Definición |
| --- | --- | --- | --- |
| Tipo de depósito del BCE | Banco Central Europeo, Data Portal | % anual, diaria en días hábiles | Tipo oficial de la facilidad de depósito |
| Deuda pública a 10 años de la zona euro | Banco Central Europeo, Data Portal | % anual, diaria en días hábiles | Curva de rendimiento par del área del euro |
| Inflación armonizada de la eurozona | Eurostat, HICP mensual | % interanual, mensual | Tasa anual publicada por Eurostat para el agregado de la eurozona |
| Inflación de EE. UU. | BLS, distribuido por FRED (Reserva Federal de St. Louis) | % interanual, mensual | Variación calculada del CPI-U no ajustado estacionalmente, comparando el mismo mes del año anterior |

## Cómo interpretar los datos

- “Fecha del dato” es el periodo observado. No es la hora de consulta ni una cotización en tiempo real.
- Las series se consultan a la fuente y se descargan desde el archivo histórico ZRC. La primera consulta captura hasta diez años disponibles; después, el proceso diario vuelve a consultar las fuentes y conserva nuevas observaciones y cambios detectados.
- Se conserva la unidad, proveedor, enlace de fuente, fecha de primera captura y, cuando una observación cambia, la fecha de revisión detectada. La fecha de captura no equivale a la fecha original de publicación.
- Las cifras observadas ofrecen contexto. No sustituyen los valores del simulador ni recalibran por sí mismas las puntuaciones de riesgo.
- Un fallo o retraso de una fuente se muestra como dato no disponible; no se reemplaza por un número de ejemplo.

## Límites actuales

Este primer bloque añade tipos, inflación y rendimientos soberanos con conectores gratuitos oficiales. Los indicadores de materias primas y flujos de capital siguen en los supuestos existentes y no se muestran como series observadas hasta integrar sus fuentes y calendarios de publicación. La serie de inflación estadounidense usa CPI-U no ajustado estacionalmente; por tanto, no debe compararse directamente con una serie ajustada estacionalmente.

Fuentes:
- ECB API: https://data-api.ecb.europa.eu/service/data/
- FRED CPIAUCNS: https://fred.stlouisfed.org/series/CPIAUCNS
- CPI-U: https://www.bls.gov/cpi/data.htm


La inflación estadounidense se descarga del CSV público de FRED (`/graph/fredgraph.csv?id=CPIAUCNS`), sin clave. Se usa CPIAUCNS, equivalente al CPI-U no ajustado de BLS CUUR0000SA0: no se sustituye por CPIAUCSL (ajustado). Se descarga un año adicional para calcular hasta diez años de tasas interanuales: `(IPC del mes / IPC del mismo mes del año anterior − 1) × 100`. Los huecos se conservan y nunca se interpolan.

FRED distribuye el dato; BLS sigue siendo el productor original. La serie está etiquetada por FRED como dominio público con atribución solicitada. Se mantiene el identificador US_CPI para la aplicación y se guarda proveedor FRED y enlace de fuente en D1. Las capturas anteriores BLS se conservan, pero la descarga activa filtra el proveedor vigente para evitar duplicados o atribuciones incorrectas. La fecha de primera captura del nuevo proveedor comienza con su ingestión; no implica que el dato haya sido publicado ese día.

El CSV identifica CPI interanual como calculado. Los valores vacíos del BCE, Eurostat y FRED no se convierten en ceros. Un error de FRED deja solo su indicador no disponible, sin bloquear los otros. La descarga CSV no requiere la clave de la API REST de FRED, pero sigue dependiendo de la disponibilidad del servicio público.
