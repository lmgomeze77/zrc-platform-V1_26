# Referencia GPR · metodología de integración v1

## En sencillo

El GPR mide la cobertura de amenazas y acontecimientos geopolíticos en diez periódicos. Es una referencia independiente que ayuda a situar los escenarios ZRC en su contexto. Una mayor cobertura no equivale por sí sola a una mayor probabilidad de conflicto ni a una pérdida financiera prevista.

El índice global usa la media de 1985–2019 igual a 100: 150 corresponde a 1,5 veces el nivel de referencia. Las series de amenazas y actos tienen sus propias escalas y no se suman. Las series país originales GPRC representan el porcentaje de artículos; no se convierten en una puntuación de riesgo 0–100 ni se comparan directamente con el índice global.

## Cobertura inicial

- Global mensual: GPR, amenazas GPRT y actos GPRA, hasta diez años.
- Global diario: GPRD, amenazas y actos, hasta cinco años. La fuente suele publicar los diarios cada lunes, no cada día.
- País mensual, hasta diez años: España, Portugal, México, Brasil, Colombia, Chile, Argentina, Perú, Arabia Saudí, Türkiye e Israel.
- No se crean datos para países que no estén en el fichero original. Marruecos y Emiratos Árabes Unidos no están incluidos en esta selección GPR.

## Captura y actualización

`scripts/collect-georisk-gpr.py` descarga los XLS de los autores, valida las columnas y fechas y conserva las unidades originales. Produce `public/data/georisk-gpr.json` con fecha de descarga, URLs y SHA-256 de cada fichero. La extensión XLS es Excel binario real, leído con xlrd: no se trata como CSV.

El workflow `GeoRisk GPR refresh` consulta la fuente cada día hábil a las 21:00 UTC para cubrir retrasos de publicación. Si los hashes cambian, guarda el nuevo snapshot en git y llama al despliegue reutilizable del commit exacto. Si la validación falla, no publica el nuevo snapshot; el aviso de frescura permite identificar la referencia anterior. Los cambios en git permiten revisar los snapshots retenidos por ZRC desde su primera captura.

El Worker lee el asset, sirve la API y archiva observaciones y revisiones en D1. El cron diario ofrece redundancia y la primera consulta puede iniciar el backfill. Una revisión y su reemplazo se escriben en la misma transacción; una repetición no debe duplicarlos. Los metadatos del fichero fuente se conservan en el registro de capturas.

La captura del XLS, la fecha observada y la primera escritura en D1 son fechas distintas. El backfill representa la versión actual del histórico publicada por los autores, no los datos que se conocían originalmente en cada fecha. Un backtest sin anticipación de información debe usar vintages originales o limitarse a las capturas propias acumuladas desde el inicio de ZRC.

## Frescura y descargas

Se advierte si la captura tiene más de diez días, si la última observación diaria tiene más de catorce días o si la mensual tiene más de 75 días. La frecuencia y la fecha observada siempre están visibles. Se ofrecen gráfico, tabla de las últimas doce observaciones y CSV de la serie y del archivo D1. Los valores recientes son preliminares y pueden revisarse.

## Relación con ZRC y la tesis

Esta versión ofrece una referencia externa y un archivo reproducible. No recalibra pesos ni afirma que exista una correlación validada con ZRC. La siguiente entrega de validación deberá fijar frecuencia común, transformación, ventana, número de observaciones, cobertura y evaluación fuera de muestra. El dataset permite preparar ese trabajo con trazabilidad.

## Atribución

Caldara, Dario y Matteo Iacoviello (2022), “Measuring Geopolitical Risk”, *American Economic Review* 112(4):1194–1225. DOI: 10.1257/aer.20191823.

Fuente: https://www.matteoiacoviello.com/gpr.htm. Licencia de los datos: CC BY 4.0, con atribución a autores, artículo, web y fecha de descarga. ZRC conserva esos créditos en el panel, en el dataset y en este documento.
