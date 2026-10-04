# GeoRisk: hoja de ruta de producto y datos

## Objetivo

Convertir GeoRisk en una herramienta de decisión auditable: mostrar datos observados con su procedencia, explicar los supuestos y validar cualquier cambio del índice frente a referencias externas. Una serie pública es evidencia y contexto; no convierte por sí sola el score ZRC en un modelo calibrado.

## Fases propuestas

| Fase | Entrega | Condición para darla por terminada |
| --- | --- | --- |
| 0. Confianza de datos | Fuentes macro y divisas del BCE; fechas de observación, estado de disponibilidad y captura; textos que distingan el índice semanal de los controles de escenario | Tests de parser y regresiones; ningún dato de ejemplo mostrado como observado |
| 1. Referencias externas | Caldara–Iacoviello GPR global/país y World Bank WGI; documentación de atribución/licencia y página de metodología versionada | Backfill trazable, captura periódica y cambios de fuente registrados; comparación visible pero sin cambiar pesos |
| 2. Señales de atención y mercado | GDELT para volumen/tono de noticias; cesta de mercado por escenario (FX, diferenciales soberanos y commodities) | Señales con ventana, cobertura, retraso y fórmula de normalización publicados; fallos aislados no rompen el índice |
| 3. Fichas país y mandatos | Fichas Iberia, LATAM y MENA; exposición por canal × sector × país; tres drivers legibles para cada mandato | Cada driver enlaza a dato o supuesto y muestra fecha; tabla accesible además del mapa |
| 4. Validación del modelo | Backtests temporales, ventanas fuera de muestra, métricas y registro de versiones | Comparación con línea base, resultados reproducibles y aprobación analítica; la IA no modifica pesos |
| 5. Producto y distribución | Alertas, exportación para comité, mapa con drill-down, límites de acceso por plan | Rendimiento móvil, accesibilidad, CORS/rate limits y costes/licencias revisados |

## Primera entrega en curso

El PR #65 incorpora series gratuitas del BCE y BLS y amplía divisas de referencia del BCE a MXN, BRL, TRY, ILS y ZAR. El panel de datos informa que estas referencias son observaciones independientes de los supuestos y pesos del simulador. La simulación puede reaccionar al instante a los controles, mientras que el índice público tiene periodicidad semanal.

Cobertura en esta fase:

- Tipo de depósito del BCE y rendimiento soberano a 10 años de la zona euro.
- CPI-U mensual de EE. UU.; el panel deriva la variación interanual comparando el mismo mes.
- Tipos de referencia EUR/USD, EUR/GBP, EUR/CNY, EUR/MXN, EUR/BRL, EUR/TRY, EUR/ILS, EUR/ZAR; USD/CNY es un cruce calculado y debe identificarse como tal.
- GPR, WGI, commodities, flujos internacionales y fuentes macro chinas siguen fuera de este primer PR.

## Decisiones de rigor

1. Cada observación conserva proveedor, serie, unidad, fecha observada, fecha de primera captura, enlace y revisiones detectadas.
2. La fecha de captura propia no se presenta como fecha original de publicación si la fuente no la proporciona.
3. Los vacíos no se interpolan en el gráfico ni se sustituyen por cifras de ejemplo.
4. Indicadores con metodologías distintas —por ejemplo, CPI no ajustado y HICP— se describen por separado y no se mezclan sin una regla explícita.
5. GPR, WGI y GDELT se muestran primero como referencias independientes. Su incorporación a una fórmula exige especificación, backtest y control de versión.
6. Datos con restricciones comerciales o de uso con IA (por ejemplo, ACLED u OpenSanctions según sus términos vigentes) no entran en el producto de suscripción sin autorización adecuada.

## Dependencias y límites

- El despliegue de series archivadas requiere que D1 esté disponible en el Worker de producción y que el proceso de migración pueda ejecutarse. La última ejecución de producción quedó bloqueada por permisos del token de Cloudflare; las pruebas locales no acreditan el estado de la base remota.
- La integración del GPR original debe conservar la atribución solicitada por los autores, registrar la fecha de descarga y tener en cuenta que el dato diario más reciente es preliminar y puede revisarse. Antes de automatizarla hay que verificar el formato y la licencia del fichero descargable.
- El archivo histórico sirve para construir vintages desde la primera captura propia. No implica que existan vintages anteriores ni fechas históricas de publicación que la fuente no haya suministrado.
