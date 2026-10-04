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
