# Manual de usuario de BreedingPro

El manual se escribe por partes, en HTML, con el mismo estilo que los manuales de PopGeneticsPro, ClusteringPro,
AgriDesign y PCAPro. Primero se hace en español y luego en inglés. Cuando todas las partes estén listas se unen en
un solo documento y se imprime a PDF de una vez.

```
manual/
  manual.css           hoja común: tamaño carta y marco de la portada
  interior.css         páginas interiores: hojas blancas, vivos en morado de maíz y negro, un color por bloque
  paginar.js           reparte el contenido en hojas tamaño carta (encabezados, números de página, índice)
  img/                 capturas de pantalla de la app
  herramientas/
    captura.ps1        abre la app, ejecuta una receta y guarda la captura en img/ al doble de resolución
    recetas/           una receta por captura (JS): inicio, ejemplos, bloque, figura, b1-…
    evaluar.ps1        abre una página sin ventana, ejecuta un guion y escribe el resultado (recortes, marcas, valores)
    huecos.js          guion para evaluar.ps1: el hueco al pie de cada hoja de una parte del manual
    unir-manual.pl     une la portada y las partes en es/manual-completo.html para imprimir el manual completo
                       (ver «Cómo obtener el PDF»)
  es/
    00a-portada.html   portada blanca: título en español e inglés; al centro, el diagrama de cuerdas de un dialelo
                       de ocho progenitores (una cinta por cruza, con el grosor de su ACE; banda exterior con la ACG)
                       y un «×» de cruza; alrededor, maíz F₂ con granos morados y amarillos que segregan 3 : 1,
                       chile habanero, tomate de cáscara (Physalis ixocarpa) con su cáliz, jitomate y papa (con flor,
                       tallo, estolones y tubérculos crema, rojo y morado), cada uno con su nombre científico y su
                       número cromosómico; abajo, cuatro viñetas: gráfico Wr–Vr, respuesta a la selección, biplot GGE
                       y pedigrí con marcadores (todo dibujado con gráficos vectoriales originales)
    00b-introduccion.html créditos, índice general, cómo leer el manual e introducción sin número (secciones I.1–I.9: qué es, preguntas que responde,
                       cinco ideas clave con figura a escala, datos que acepta, cómo abrirlo, recorrido por la
                       interfaz, los 21 ejemplos del Bloque 3 y los de los Bloques 2, 10 y 11, rutas por tipo de
                       experimento, valores P e intervalos)
    01-bloque1.html    capítulo 1: la portada de la app (secciones, siete pasos, material, 32 métodos), el laboratorio
                       de dialelos (modelo de Hayman, controles, recuadros, reglas de lectura, error en medio dialelo)
                       con cinco prácticas, el laboratorio de selección con seis prácticas y una sesión de clase,
                       los quince temas de teoría con la comparación de metodologías, y cómo citar (63 referencias)
    02-bloque2.html    capítulo 2: las cuatro tarjetas del Bloque 2 con un ejemplo de hilo conductor (dialelo de ocho
                       líneas, método 4, dos testigos, látice α): once diseños, calendario, semilla y polinizaciones,
                       diseños de campo y látice α (E y su cota), libreta y su línea de diseño, potencia; Carolinas del
                       Norte, línea × probador, dialelo parcial y generaciones con sus números; paso al Bloque 3
    03-bloque3.html    capítulo 3: las cinco tarjetas del Bloque 3 con el látice α simulado de hilo conductor (dialelo
                       de 10 progenitores, método 2, 5 testigos, 3 localidades): archivo, hoja de datos (guardada en
                       el navegador), libreta y su línea de declaración, ejemplos; los 16 papeles de columna y sus
                       sinónimos, pedigrí y tipos, columnas → filas; reglas del reconocimiento de apareamiento y de
                       campo, lo reconocido en los 21 ejemplos; calidad y atípicos (dialelo de Hayman); modelos por
                       diseño, recuadros, H² del ensayo y eficiencia, supuestos; análisis combinado; datos por planta,
                       plantas sin parcelas, error externo, aumentados; descargas y botón Continuar
    04-bloque4.html    capítulo 4: los cuatro métodos (figura de celdas) y los dos modelos de Griffing con el dialelo
                       de maíz 4 × 4 (método 1, publicado): controles, análisis de varianza con maternos y no maternos,
                       efectos, matriz de ACE y recíprocos, componentes y parámetros, mejores cruzas, comparación de
                       métodos; varios ambientes con el látice α simulado (error de medias ajustadas, verdad simulada);
                       medias con error externo, datos incompletos, descargas
    05-bloque5.html    capítulo 5: las tres lecturas de un dialelo; supuestos probados uno por uno, partición de Hayman
                       con interacciones con bloques, componentes D, F, H₁, H₂, h² y cocientes, correcciones del medio
                       dialelo, gráfico Wr–Vr y orden de dominancia (dialelo de Hayman); Gardner y Eberhart II y III y
                       heterosis (variedades de Lonnquist y Gardner); equivalencias entre las tres metodologías
    06-bloque6.html    capítulo 6: los seis diseños (Carolinas del Norte I–III, cruza triple, línea × probador, dialelo
                       parcial); cuadrados medios esperados por trazas, efectos, componentes y parámetros con la CN II de
                       papa; CN I con datos por planta; sumas, diferencias y epistasis (CN III y cruza triple simulada);
                       línea × probador con heterosis; dialelo parcial circulante; varios ambientes
    07-bloque7.html    capítulo 7: generaciones y lo que esperan; varianza de cada media (plantas, parcelas sin bloques,
                       un valor por parcela); pruebas de escala; prueba conjunta con la secuencia de modelos, las dos
                       métricas y Welch–James con medias de parcela; D, H, F, E y heredabilidades; heterosis, depresión
                       endogámica y potencia; factores efectivos; varios ambientes
    08-bloque8.html    capítulo 8: parámetros genéticos (H² por parcela y medias, Knapp, Cullis, CV, avance), intensidad
                       exacta y finita, varios ambientes, correlaciones, sendas (y cuándo no tienen sentido), índices de
                       selección con G acotada por P, genotipos seleccionados y métodos de selección recurrente
    09-bloque9.html    capítulo 9: tabla G × A y su análisis de varianza, dos etapas con el error de cada ambiente,
                       regresiones (Finlay–Wilkinson, Eberhart–Russell), Wricke, Shukla, Lin–Binns, Annicchiarico, Huehn,
                       Kang, AMMI con F residual, ASV, WAAS y ganadores, vistas del biplot GGE y resumen
    10-bloque10.html   capítulo 10: pedigrí (revisión, autofecundación, líneas y fundadores puros, F, b, A y A⁻¹), modelo
                       animal con REML (rebaño simulado), valores genéticos y confiabilidad con 1 + F, tendencia; modelo
                       de padres, registros repetidos, efecto materno y factores aleatorios; BLUP de un ensayo con K = I,
                       A y A + I; cruzamiento de Dickerson (estimar, parámetros dados, porcentajes) y dialelo de razas
    11-bloque11.html   capítulo 11: marcadores (codificaciones, control de calidad, MAF, componentes principales), G de
                       VanRaden con cresta y mezcla con A, GBLUP con heredabilidad genómica (semivarianza media), valores
                       genómicos y efectos de los marcadores, validación cruzada CV1 y respuesta por año, híbridos de dos
                       grupos heteróticos (ACG, ACE, T2/T1/T0) y cruzas triples y dobles de Jenkins; trigo CIMMYT y maíz de Technow
    12-bloque12.html   capítulo 12: contenido del informe (bloques con resultados, casos especiales, partes opcionales,
                       idioma), vista previa, PDF y HTML, secciones del informe, métodos redactados y sus citas, tablas y
                       figuras, paquete ZIP y su contenido, cómo citar; ejemplo: dialelo de maíz 4 × 4 en los Bloques 3, 4, 5 y 8
    13-apendices.html  apéndices A–F: formatos de archivo (fuentes, faltantes, tabla de parcelas, línea de declaración,
                       tablas de los Bloques 10 y 11, lo que descarga cada bloque); 22 reglas de decisión (las 8 de los
                       capítulos copiadas y 14 que resumen los Bloques 6 a 12) con índice de una fila por bloque;
                       glosario (siglas, 84 términos, símbolos con varios significados); solución de problemas en seis
                       tablas; 142 referencias (◆ = las que puede citar el informe); componentes de terceros, escalas
                       propias (figura F.1) y licencias de los datos de ejemplo
```

## Plan de partes

| Parte | Archivo | Contenido |
|---|---|---|
| 1 | `00a-portada.html` | portada (lista) |
| 2 | `00b-introduccion.html` | créditos, índice general, cómo leer el manual e introducción, sin número de capítulo (lista) |
| 3 | `01-bloque1.html` | Bloque 1 · Inicio, laboratorios y teoría (lista) |
| 4 | `02-bloque2.html` | Bloque 2 · Planear cruzas, ensayo y potencia (lista) |
| 5 | `03-bloque3.html` | Bloque 3 · Datos: carga, papeles de columna, diseño reconocido, calidad, análisis de campo (lista) |
| 6 | `04-bloque4.html` | Bloque 4 · Dialelos de Griffing (lista) |
| 7 | `05-bloque5.html` | Bloque 5 · Hayman–Jinks y Gardner–Eberhart (lista) |
| 8 | `06-bloque6.html` | Bloque 6 · Diseños de apareamiento (lista) |
| 9 | `07-bloque7.html` | Bloque 7 · Generaciones y heterosis (lista) |
| 10 | `08-bloque8.html` | Bloque 8 · Parámetros genéticos y selección (lista) |
| 11 | `09-bloque9.html` | Bloque 9 · Interacción genotipo × ambiente (lista) |
| 12 | `10-bloque10.html` | Bloque 10 · Modelos mixtos, BLUP y cruzamiento (lista) |
| 13 | `11-bloque11.html` | Bloque 11 · Selección genómica y predicción de híbridos (lista) |
| 14 | `12-bloque12.html` | Bloque 12 · Informe, figuras y paquete de resultados (lista) |
| 15 | `13-apendices.html` | formatos de archivo, reglas de decisión, glosario, solución de problemas, referencias, componentes de terceros (lista) |

## Colores por bloque

Los de la franja de la portada, en el mismo orden.

| Bloque | Color | Variable |
|---|---|---|
| Preliminares e introducción | berenjena `#2a1740` | `--b0` |
| 1 Inicio | morado de maíz `#5e2e8c` | `--b1` |
| 2 Planear | verde hoja `#2e8556` | `--b2` |
| 3 Datos | verde azulado `#0f766e` | `--b3` |
| 4 Griffing | naranja habanero `#c2410c` | `--b4` |
| 5 Hayman–Jinks | ocre `#b7791f` | `--b5` |
| 6 Apareamiento | carmín de jitomate `#b4234a` | `--b6` |
| 7 Generaciones | violeta `#7e3fb0` | `--b7` |
| 8 Selección | azul `#1d74b5` | `--b8` |
| 9 G×A | verde de tomate de cáscara `#4d7c0f` | `--b9` |
| 10 BLUP | café de papa `#8a5a2b` | `--b10` |
| 11 Genómica | cian profundo `#0e7490` | `--b11` |
| 12 Informe | grafito `#334155` | `--b12` |
| Apéndices | negro `#111111` | `--bx` |

## Convenciones (las mismas de los otros manuales)

- **Un capítulo es una sección:** `<section class="capitulo" id="cap-bN" data-pestana="BN" data-orden="N+1" style="--acento: var(--bN)">`. Con 14 pestañas, `paginar.js` las separa 0.64 in (en los otros manuales, 0.68 in) y cada una mide 0.56 in de alto.
- **Numeración (19 sep 2026):** el capítulo N es el Bloque N: secciones, figuras y tablas N.x, anclas `sN-x` y archivo `NN-bloqueN.html`. La introducción no lleva número de capítulo: pestaña «In», secciones, figuras y tablas I.x y anclas `si-x`. La portada y la introducción son `00a-` y `00b-`; los apéndices serán `13-apendices.html`.
- **Recuadros:** `caja nota`, `caja importante`, `caja teoria`, `caja ejemplo`, `caja regla` y `caja dato`; pasos en `ol.pasos`; texto de la app en `span.ui` y `span.ruta`.
- **Citas:** «y colaboradores» (no «et al.») y «y» entre dos autores. Si el título de una obra nombra un programa, ese nombre se sustituye por […]. No se nombran programas comerciales ni de terceros en el texto.
- **Números:** `95&nbsp;%` con espacio fijo; los valores que se citan como resultados de la app se comprueban antes de escribirlos.
- **Subíndices:** en el texto, `<sub>` (Crimson Pro no tiene los dígitos subíndice de Unicode y H₁ saldría como H1); en tablas y pies de figura (Jost) sirven ambos. Dentro de SVG, `<tspan dy="3" font-size="8">` y se regresa con `dy="-3"`.

## Capturas de pantalla

Desde la carpeta de la app, con una receta de `herramientas/recetas/`:

```
powershell -ExecutionPolicy Bypass -File manual\herramientas\captura.ps1 -Receta figura -Alto 900 -Recorte "0,0,1400,800"
powershell -ExecutionPolicy Bypass -File manual\herramientas\captura.ps1 -Receta figura -Tema dark -Idioma en -Salida figura-oscuro-en
```

La captura sale en `img/<receta>.png` (o `-Salida`) al doble de resolución. `-Recorte "x,y,ancho,alto"` se da en píxeles de pantalla. El encabezado de la app mide unos 88 píxeles: las recetas desplazan la vista 104 píxeles por encima del elemento para que no lo tape. Imágenes de la introducción: `inicio` (recortada a 1400 × 790), `bloque` (tarjeta del análisis de varianza del Bloque 4, recorte `126,92,1136,392`), `figura` y `figura-oscuro-en` (recorte `0,0,1400,800`) y `ejemplos`.

- **Capítulo 1 (Bloque 1):** `b1-flujo`, `b1-materiales`, `b1-wrvr-*` (seis escenarios del laboratorio de dialelos), `b1-tray-*` (seis del de selección, tras 25 ciclos), `b1-teoria`, `b1-citar`, y `b1-lab-dialelos` y `b1-lab-seleccion` con `-Ancho 1040` (la letra de la app queda más grande en la hoja). Las recetas `b1-` dejan el recorte en `window.__recorte`; las dos de los laboratorios dejan además en `window.__marcas` la posición de cada marca numerada, en % del recorte, calculada al final del texto o en un hueco, para que no tape nada. Ambos valores se leen con `herramientas/evaluar.ps1` (misma ventana y mismo ancho que la captura) y se pasan a `captura.ps1 -Recorte` y al HTML.
- **Capítulo 2 (Bloque 2):** las recetas `b2-*` preparan primero el ejemplo del capítulo (L1 a L8, método 4, dos testigos, látice α con k = 5 y repeticiones lado a lado) y recortan una tarjeta o el SVG de una figura; `b3-desde-plan` muestra el mosaico de la libreta en el Bloque 3. La libreta va como tabla del manual, porque su captura salía apretada. `evaluar.ps1` recibe `-Width` y `-Height` iguales a los de la captura: si la figura está al final de la página, la posición de desplazamiento depende del alto de la ventana.
- **Capítulo 3 (Bloque 3):** las recetas `b3-*` cargan un ejemplo desde la galería y esperan a que termine el análisis. Con el látice α simulado (`simAlpha`): `b3-carga`, `b3-columnas`, `b3-diseno`, `b3-presencia` (el SVG), `b3-analisis` (Chapultepec), `b3-residuales`, `b3-combinado` y `b3-medias`; con el dialelo de Hayman (`hayman54`): `b3-calidad` y `b3-atipicos`; `b3-hoja` abre el dialelo de maíz 4 × 4 en la hoja de datos.
- **Capítulo 4 (Bloque 4):** las recetas `b4-*` cargan el ejemplo en el Bloque 3 y pasan al 4. Con el maíz 4 × 4 (`maize4`): `b4-modelo`, `b4-anova`, `b4-efectos`, `b4-fig-gca`, `b4-matriz`, `b4-recip`, `b4-param`, `b4-mejores`, `b4-obspred` y `b4-metodos`; con el látice α (`simAlpha`): `b4-amb-anova` y `b4-amb-gca`. La figura 5.1 (celdas de cada método) es un SVG escrito a mano.
- **Capítulo 5 (Bloque 5):** recetas `b5-*`: con el dialelo de Hayman (`hayman54`) `b5-datos`, `b5-supuestos`, `b5-particion`, `b5-componentes`, `b5-wrvr`, `b5-dominancia`, `b5-arreglos` y `b5-equiv`; con las variedades de Lonnquist y Gardner (`lonnquist61`) `b5-ge` (solo los dos análisis de varianza: las tablas de estimaciones tienen desplazamiento interno y salen cortadas) y `b5-heterosis`.
- **Capítulo 6 (Bloque 6):** recetas `b6-*` (pasan al Bloque 6): con la CN II de papa (`nc2`) `b6-datos`, `b6-anova`, `b6-efectos`, `b6-sca` y `b6-comp`; `b6-nc1`, `b6-nc3`, `b6-lxt` y `b6-parcial` recortan el análisis de varianza de su ejemplo; con la cruza triple simulada (`simTTC`) `b6-sd`, `b6-fig-sd` y `b6-epi`; `b6-lxt-het` es la heterosis de línea × probador.
- **Capítulo 7 (Bloque 7):** recetas `b7-*` (pasan al Bloque 7): con *N. rustica* (`gale77`) `b7-datos`, `b7-escala`, `b7-modelos`, `b7-fig-medias`, `b7-heterosis` y `b7-factores` (este, solo la tabla de factores efectivos, sin la de heterosis); con el simulado por planta (`simGen`) `b7-sim-datos`, `b7-sim-modelos`, `b7-sim-heterosis` (la heterosis estándar contra el testigo del simulado), `b7-varianzas` (solo el título y las dos tablas: con la tarjeta entera entra la figura) y `b7-fig-var`. Las recetas de los Bloques 6 y 7 filtran los nodos ocultos (`offsetParent !== null`) antes de medir el recorte.
- **Capítulo 8 (Bloque 8):** recetas `b8-*` con el maíz de 13 híbridos (`maize13`) y una función `prep` común: proporción seleccionada 20 % (10 % en `b8-fehr` y `b8-fig-fehr`, la del ejemplo de Fehr), variables PH, EH, KW, TKW y NKE con PH y EH a disminuir, sendas de KW (`pathP: "P"` o `"G"`) y PH restringida (`restrict`). `b8-params` y `b8-amb` (cuatro ambientes, `maize13env`) ensanchan `main` a 1500 px y se capturan con `ANCHO=1600`, porque la tabla de parámetros tiene 15 columnas; `b8-seleccion` quita la altura máxima de la tabla de orden. Los recuadros plegados se buscan como `details.acc-plain` (el primer `details` de una tarjeta es el editor de la figura).
- **Capítulo 9 (Bloque 9):** recetas `b9-*` con la avena (`oat14`), salvo `b9-ammi-ejes`, `b9-fig-ammi1`, `b9-fig-ammi2`, `b9-fig-waas` y `b9-ganadores`, con la papa (`plrv28`). Todas quitan la altura máxima de las tablas `.book-scroll`. Los biplots, las figuras de regresión y la de correlaciones de Spearman se vuelven a dibujar más chicos antes de capturarlos (`Fig.registry[id].cfg.width/height` y `redraw()`), para que su letra se lea en `figure.chica`; `b9-resumen` ensancha `main` a 1800 px y se captura con `ANCHO=1900`. Las vistas GGE se eligen cambiando el menú Vista (`b9View`).
- **Capítulo 10 (Bloque 10):** recetas `b10-*` con cabecera común (`ex10(id)` carga un ejemplo de la tarjeta 1, `run()` ajusta el modelo, `xex(id)` uno de cruzamiento, `filas(host, n)` recorta una tabla a sus primeras filas). Con el rebaño (`simFlock`): `b10-datos`, `b10-fig-ped`, `b10-modelo`, `b10-ebv`, `b10-fig-ebv` y `b10-fig-tendencia`; `b10-fig-a` con Schaeffer 3.1 (recorta al contenido del SVG, sin el margen vacío de abajo); `b10-lineas` con el pedigrí de líneas; `b10-repetibilidad` con Schaeffer 6.1; `b10-ensayo`, `b10-ensayo-tabla` y `b10-fig-shrink` cargan antes `simLines` en el Bloque 3; `b10-cruza-datos` (agranda las áreas de texto a su contenido), `b10-cruza-par`, `b10-cruza-pred` y `b10-fig-cruza` con `sim3`, `b10-dialelo` con `dial4` y `b10-buchanan`. Las figuras se vuelven a dibujar más chicas antes de capturarlas.
- **Capítulo 11 (Bloque 11):** recetas `b11-*` con cabecera común (`ex11(id)` carga un ejemplo; `gblup()`, `validar()`, `hibridos()` y `valHib()` pulsan los botones y esperan el resultado; `chico(id, w, h)` redibuja una figura más chica). Con el trigo (`wheat`): `b11-marcadores`, `b11-fig-maf`, `b11-parentesco`, `b11-fig-g`, `b11-gblup`, `b11-gebv`, `b11-fig-gebv`, `b11-fig-efectos`, `b11-cv`, `b11-fig-cv` (no se usa en el capítulo) y `b11-respuesta`; con el maíz de Technow (`technow`): `b11-fig-pca` (colorea los grupos heteróticos), `b11-hibridos`, `b11-hib-top`, `b11-fig-hib`, `b11-hib-cv` y `b11-jenkins`. La validación del trigo tarda unos 15 s.
- **Capítulo 12 (Bloque 12):** recetas `b12-*` con la función `sesion()` (carga el dialelo de maíz 4 × 4, abre los Bloques 4, 5 y 8 y vuelve al 12 con título y autor), `armar()` y `enMarco(título)`, que desplaza la vista previa del informe hasta una sección. `b12-contenido`, `b12-vista` (recortada 520 px debajo del inicio del marco), `b12-informe-metodos` y `b12-informe-tabla` (recortadas a su sección; la segunda oculta la tabla 8), `b12-zip` y `b12-cita`.
- **Apéndices:** `<section class="capitulo" id="apendices" data-pestana="A" data-orden="14" style="--acento: var(--bx)">`, secciones `ap-a` a `ap-f`. Solo B empieza hoja (`data-nueva-hoja`); C a F siguen en la misma para no dejar hojas casi vacías. Las reglas de los capítulos se copian tal cual; si se cambia una en su capítulo, hay que cambiarla también en B. Las referencias de E salen del registro de la app (`methods12.js`, `home.js`, listas de cada bloque y ejemplos) más las que solo cita el manual; se comprobaron contra las revistas, y el ◆ marca las del registro del informe (`methods12.js`). Con 36 hojas, los huecos mayores (1.5 a 2.2 in) están en B, porque cada recuadro de regla es indivisible.
- **Acentos combinados:** Jost desplaza las barras combinadas (h̄, v̄) y Crimson Pro separa a veces el circunflejo combinado en texto justificado (m̂, r̂): se usa `text-decoration: overline` o la letra en cursiva sin acento; ĝ y ŝ tienen carácter propio y se ven bien.
- **Miles:** con espacio fijo (`30&nbsp;162.40`), para que el número no se parta entre renglones.
- **Una figura que no cabe al pie de su hoja** abre la siguiente, y `paginar.js` adelanta al hueco hasta seis bloques de los que la siguen (texto, recuadros, tablas y subtítulos de tercer nivel con su bloque; nunca un título de sección ni otra figura). Si aun así queda un hueco grande: se ponen primero las tablas de controles y luego la captura, se recorta la captura a lo que ilustra o se usa `figure.media` (84 %) o `figure.chica` (72 %).
- **La leyenda de las marcas** (`ul.leyenda-marcas`) puede ir dentro de su `<figure>`, después del pie: así nunca se separa de la captura. Conviene cuando la figura no es muy alta.

## Ver e imprimir una parte

Abre el HTML con doble clic. El PDF del manual se imprime una sola vez, al final, con todas las partes unidas; las vistas previas en PDF de cada parte no se guardan en `manual/`. Para revisar una parte, desde la carpeta de la app y con salida fuera del manual:

```
powershell -ExecutionPolicy Bypass -File tools\local\shot.ps1 -Out $env:TEMP\parte.pdf -Page manual/es/01-bloque1.html -Pdf -Wait 6000
```

La herramienta usa el tamaño carta del manual (`@page`) y no añade márgenes. Desde el cuadro de impresión del
navegador: destino **Guardar como PDF**, márgenes **Ninguno** y **Gráficos de fondo** activado.

## Cómo obtener el PDF

**Manual completo** (19 sep 2026: `BreedingPro User's Manual.pdf`, 229 hojas: portada, 4 preliminares con números
romanos y 224 numeradas; tamaño carta; 39 enlaces internos; unos 25 MB). Desde la carpeta `manual/`:

```
perl herramientas/unir-manual.pl es
msedge --headless=new --no-pdf-header-footer --virtual-time-budget=300000 --user-data-dir=%TEMP%\breedingpro-shot --print-to-pdf=C:\ruta\sin\espacios\manual-es.pdf "file:///C:/Users/luisa/Documents/LABG%20Apps/BreedingPro/manual/es/manual-completo.html"
```

- `unir-manual.pl` escribe `es/manual-completo.html` con la portada (`00a-portada.html`) y las 17 secciones de
  `00b-introduccion.html` a `13-apendices.html`, con los estilos propios de cada parte. Una regla que una parte define
  distinto de otra se limita a las hojas de esa parte (hoy solo `.rejilla` del capítulo 1). Ese archivo no se edita:
  se corrigen las partes y se vuelve a generar.
- **Cuidado con las reglas de una sola parte:** al unir, valen para todo el manual. Por eso la introducción usa
  `figure.reducida` (no `figure.chica`, que en los capítulos achica solo el `.marco`) y el margen corto de los
  recuadros de regla de los apéndices se escribe `.hoja[data-pestana="A"] .caja.regla`.
- Se imprime de una sola vez: unir PDF sueltos pierde los enlaces del índice y reinicia la numeración. Edge no
  escribe el PDF si la ruta de `--print-to-pdf` tiene espacios; se imprime en una carpeta sin espacios y se copia.
  Tarda unos 25 segundos.
- Antes de imprimir conviene revisar la paginación del documento unido (mismas hojas por capítulo que cada parte
  sola, ninguna desbordada) y que el índice general tenga sus números de página.

## Componentes de terceros

- **Cormorant**, de Christian Thalmann. Licencia SIL Open Font License 1.1.
- **Crimson Pro**, de Jacques Le Bailly. Licencia SIL Open Font License 1.1.
- **Jost**, de Owen Earl. Licencia SIL Open Font License 1.1.

Las tres se cargan desde el servicio público de fuentes web. Todo lo demás es original: ilustraciones, diagramas y
el paginador. No se usan imágenes de terceros.
