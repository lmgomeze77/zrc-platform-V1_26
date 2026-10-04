# Implementación gratuita inicial — 4 de octubre de 2026

La decisión vigente es empezar con fuentes oficiales gratuitas. La comparación comercial que aparece más abajo queda como referencia para una fase posterior, sin contratación ni dependencia de un proveedor de pago.

## Entrega implementada

- BCE: EUR/USD, EUR/GBP y EUR/CNY diarios; USD/CNY calculado dividiendo EUR/CNY por EUR/USD de la misma fecha, expresamente identificado como cruce derivado.
- Hasta cinco años de observaciones publicadas, selección de periodo, gráfico, últimas observaciones y descarga CSV en «Datos reales», en Dashboard y ML.
- Endpoint `/api/georisk-market-data`, sin claves, consulta con tiempo máximo y caché de una hora. Fecha de publicación separada de fecha de consulta. Más de siete días sin observaciones genera aviso de retraso.
- Sin interpolación de festivos ni datos fabricados cuando falla el proveedor. El ticker editorial existente permanece independiente.
- Atribución y aviso de disponibilidad gratuita en cada acceso y antes de suscribir en Pricing, conforme a las condiciones del BCE.
- El factor sectorial, los pesos y los impactos continúan siendo supuestos. Esta entrega construye la capa de observaciones; no afirma calibración empírica ni modifica los niveles del simulador sin un contraste previo.

Fuentes oficiales: [divisas y descargas BCE](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), [XML histórico](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml), [condiciones de reutilización](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html).

## Cobertura pendiente

Tipos, inflación, deuda, materias primas y flujos todavía no están conectados. Se probaron ECB Data Portal (tipos) y Eurostat (inflación): el primero devolvió un error 504 y la consulta de HICP utilizada terminó en diciembre de 2025. Esas respuestas no se presentan como datos actuales. Hay que verificar el conjunto vigente y la continuidad antes de incorporarlos.

La siguiente fase debe ampliar fuentes oficiales por variable y región, versionar las observaciones y diseñar una validación temporal del modelo. EUR/USD no sustituye a DXY; el cruce USD/CNY no es el fixing del PBOC; no se sustituye S&P GSCI por un índice distinto sin cambiar expresamente la definición.

## Verificación

Build Vite y empaquetado Worker en modo dry-run correctos. Tests del parser: orden, ventana histórica, fechas futuras, valores ausentes, duplicados, cruces de la misma fecha y fallo del proveedor. Descarga oficial contrastada el 4/10/2026: 1.281 puntos por serie, última publicación 2/10/2026. EUR/USD 1,1225; EUR/GBP 0,85033; EUR/CNY 7,5259; USD/CNY derivado 6,7045879733. Comprobaciones del esquema editorial existentes también correctas.

---

# GeoRisk: factor sectorial y datos de mercado

**Fecha:** 4 de octubre de 2026  
**Alcance:** auditoría del factor sectorial, referencias macroeconómicas y ticker público de mercado en `main`.

## Qué significa hoy el factor

El Dashboard y GeoRisk ML calculan primero un riesgo base ponderando los escenarios seleccionados. Después aplican un coeficiente fijo por sector al riesgo y a los impactos de las variables:

| Sector | Coeficiente actual | Lectura sencilla |
|---|---:|---|
| Global | 1,00 | Sin ajuste |
| Real Estate | 0,88 | Reduce un 12% |
| Financiero | 1,15 | Aumenta un 15% |
| Industrial | 0,92 | Reduce un 8% |
| Energía | 1,08 | Aumenta un 8% |

Ejemplo: riesgo base 75 × 0,88 = 66 para Real Estate. El coeficiente no se deriva de los datos de ese sector, rendimientos observados ni un backtest. Es un supuesto fijo de modelización; la interfaz ahora lo identifica como tal.

## Auditoría de las cifras

- Los valores `base` de tipos, inflación, divisas, materias primas, deuda soberana y flujos están definidos como constantes en `GeoRiskDashboard.jsx` y `GeoRiskML.jsx`. Sus fechas y nombres de fuente no acreditan una observación actual; no hay series históricas conectadas a esas tablas.
- El ticker general de portada se genera en `scripts/update-market.js` con Claude y una búsqueda web. La hora `market_updated_at` indica cuándo acabó la búsqueda, no la hora oficial de cotización ni una actualización de un proveedor financiero. No debe presentarse como feed verificable de cotizaciones.
- Mostrar cotizaciones e historia reales mejora la transparencia y da contexto; por sí solo no calibra ni valida los multiplicadores. Para eso hay que estimar sensibilidades con observaciones históricas, definir ventanas/frecuencias y comprobarlas fuera de muestra.

## Diseño de datos recomendado

1. Obtener datos en backend, desde proveedores identificados. Cada observación debe guardar instrumento, valor, moneda/unidad, `observed_at`, `fetched_at`, fuente y frecuencia.
2. Separar en la interfaz **dato observado** (valor y serie, con fecha/fuente) de **impacto del escenario** (resultado hipotético del modelo). Si el dato falta o está vencido, mostrarlo como no disponible/desactualizado; nunca convertir un valor fijo en una cotización.
3. Para estadísticas oficiales, usar APIs de ECB/Eurostat y, según la región, fuentes nacionales. Estas publicaciones tienen frecuencias diarias, mensuales o trimestrales; no son todas cotizaciones en tiempo real.
4. Para precios de mercado con uso comercial, seleccionar una fuente que cubra las bolsas/instrumentos necesarios y autorice el uso y la redistribución en la plataforma. Guardar claves solo como secretos del backend.
5. Mantener los factores sectoriales como **supuestos** hasta que exista calibración documentada. Después, mostrar la sensibilidad estimada, periodo y muestra, fecha de actualización y resultado de backtest; permitir compararla con el supuesto previo.

## Decisiones necesarias para conectar un feed

- Proveedor y cobertura contratada (FX, tipos, índices, deuda y materias primas).
- Nivel de actualización permitido: cierre diario, datos retrasados o tiempo real.
- Instrumentos exactos por región. Por ejemplo, S&P GSCI y DXY son índices de proveedor y requieren revisar sus derechos de uso; no deben sustituirse por aproximaciones sin indicarlo.

El conector debe implementarse después de elegir la fuente y disponer de su credencial/condiciones; esta auditoría no añade ni inventa un feed.


## Comparación inicial de proveedores (4 de octubre de 2026)

| Proveedor | Cobertura útil para GeoRisk | Precio publicado | Límite/observación |
|---|---|---:|---|
| **Financial Modeling Prep (FMP) Enterprise** | Cotizaciones e históricos de divisas, índices y materias primas; también Treasury rates e indicadores económicos. | Precio bajo consulta comercial. | La propia página exige un acuerdo específico de display/licencia para mostrar o redistribuir datos. Es el candidato más coherente como proveedor único, sujeto a cotización y comprobación de instrumentos concretos. |
| **EOD Historical Data (EODHD) All-in-One** | Series EOD, intradía, divisas, índices, materias primas, Treasury y varios indicadores económicos. | 99,99 USD/mes o 999,90 USD/año (83,33 USD/mes equivalente). | Alternativa de menor coste para un piloto. Su página advierte que algunos precios de divisas/CFD son indicativos, no provienen de bolsas y pueden no coincidir con el precio de mercado. Confirmar derechos B2B de visualización antes de publicar. |
| **Twelve Data Venture / Enterprise** | API histórica, divisas, materias primas y renta fija; Venture ofrece visualización externa para aplicaciones de clientes. | Venture: 499 USD/mes o 4.990 USD/año (414 USD/mes equivalente). Enterprise: 1.099 USD/mes o 10.992 USD/año (916 USD/mes equivalente). | La página de índices dice que la cobertura de índices aún está por llegar; no cubre por sí sola todos los índices que GeoRisk muestra, como DXY o S&P GSCI. Enterprise añade distribución externa. |

**Recomendación provisional:** pedir primero una cotización a FMP Enterprise para los instrumentos exactos y confirmar por escrito el display en una plataforma SaaS de suscripción. Si el coste no encaja, probar EODHD con precios claramente etiquetados como EOD/indicativos y derechos B2B confirmados. No contratar ni reemplazar índices por proxies sin documentarlo.

Para series macro oficiales, complementar el feed de precios con ECB/Eurostat y fuentes nacionales. ECB y Eurostat publican interfaces estadísticas programáticas; FRED requiere API key. Mantener esas series oficiales separadas de las cotizaciones de mercado.

**Fuentes consultadas:** [FMP Commercial](https://site.financialmodelingprep.com/developer/docs/pricing?planType=commercial), [EODHD Pricing](https://eodhd.com/pricing), [Twelve Data Business Pricing](https://twelvedata.com/pricing-business), [Twelve Data Indices](https://twelvedata.com/indices), [ECB SDMX API](https://data.ecb.europa.eu/help/getting-data-web-services-sdmx-0), [Eurostat API](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access), [FRED API keys](https://fred.stlouisfed.org/docs/api/api_key.html).
