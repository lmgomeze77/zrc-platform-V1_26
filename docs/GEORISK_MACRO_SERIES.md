# Datos macroeconómicos de GeoRisk

El panel **Datos económicos observados** presenta información publicada por fuentes oficiales y está disponible tanto en GeoRisk Dashboard como en GeoRisk ML.

| Zona / indicador | Fuente | Unidad y periodicidad | Definición |
| --- | --- | --- | --- |
| Tipo de depósito del BCE | Banco Central Europeo, Data Portal | % anual, diaria en días hábiles | Tipo oficial de la facilidad de depósito |
| Deuda pública a 10 años de la zona euro | Banco Central Europeo, Data Portal | % anual, diaria en días hábiles | Curva de rendimiento par del área del euro |
| Inflación armonizada de la eurozona | Eurostat, HICP mensual | % interanual, mensual | Tasa anual publicada por Eurostat para el agregado de la eurozona |
| Inflación de EE. UU. | U.S. Bureau of Labor Statistics, API pública | % interanual, mensual | Variación calculada del CPI-U no ajustado estacionalmente, comparando el mismo mes del año anterior |

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
- BLS API: https://www.bls.gov/developers/api_signature.htm
- CPI-U: https://www.bls.gov/cpi/data.htm
