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

El PR #65 ya incorpora series gratuitas del BCE, Eurostat y BLS, amplía divisas a MXN, BRL, TRY, ILS y ZAR y deja un archivo de observaciones propio en D1. El panel explica en lenguaje sencillo que estas referencias son observaciones independientes de los supuestos y pesos del simulador. El PR #66 añade la primera capa WGI para fichas país, con sus límites visibles. La simulación puede reaccionar al instante a los controles, mientras que el índice público tiene periodicidad semanal.

Cobertura en esta fase:

- Tipo de depósito del BCE y rendimiento soberano a 10 años de la zona euro.
- HICP mensual de Eurostat para la eurozona, junto con CPI-U mensual de EE. UU.; se mantienen como indicadores distintos.
- Tipos de referencia EUR/USD, EUR/GBP, EUR/CNY, EUR/MXN, EUR/BRL, EUR/TRY, EUR/ILS, EUR/ZAR; USD/CNY es un cruce calculado y debe identificarse como tal.
- GPR, commodities, flujos internacionales, GDELT y fuentes macro chinas siguen como siguientes entregas.

## Capa estructural WGI (PR #66)\n\nLa interfaz consulta por país las seis dimensiones del Worldwide Governance Indicators del Banco Mundial y muestra el último año disponible y el dato anterior. El archivo D1 registra la serie y sus revisiones desde la primera consulta de ZRC. La visualización no construye un promedio ni cambia el índice semanal.\n\nEl WGI combina encuestas y valoraciones expertas, expresa percepciones con incertidumbre y puede revisarse. El Banco Mundial indica que no debe emplearse como criterio definitivo de riesgo de inversión o calificación crediticia; ese límite debe acompañar siempre al dato. Fuente atribuida bajo CC BY 4.0.\n\n## Decisiones de rigor

1. Cada observación conserva proveedor, serie, unidad, fecha observada, fecha de primera captura, enlace y revisiones detectadas.
2. La fecha de captura propia no se presenta como fecha original de publicación si la fuente no la proporciona.
3. Los vacíos no se interpolan en el gráfico ni se sustituyen por cifras de ejemplo.
4. Indicadores con metodologías distintas —por ejemplo, CPI no ajustado y HICP— se describen por separado y no se mezclan sin una regla explícita.
5. GPR, WGI y GDELT se muestran primero como referencias independientes. Su incorporación a una fórmula exige especificación, backtest y control de versión.
6. Datos con restricciones comerciales o de uso con IA (por ejemplo, ACLED u OpenSanctions según sus términos vigentes) no entran en el producto de suscripción sin autorización adecuada.

## Dependencias y límites

- El despliegue de series archivadas requiere que D1 esté disponible en el Worker de producción y que el proceso de migración pueda ejecutarse. La última ejecución de producción quedó bloqueada por permisos del token de Cloudflare; las pruebas locales no acreditan el estado de la base remota.
- El índice GPR original ofrece ficheros diarios en Excel con actualización semanal, datos mensuales y vintages; los autores indican licencia Creative Commons Attribution y advierten que los datos recientes pueden revisarse. La descarga debe conservar fecha de captura y versión del fichero; como el formato diario es XLS, la integración debe probar primero la conversión y el registro de revisiones.
- El archivo histórico sirve para construir vintages desde la primera captura propia. No implica que existan vintages anteriores ni fechas históricas de publicación que la fuente no haya suministrado.
