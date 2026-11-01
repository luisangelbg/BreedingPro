# Changelog

## Después de la 1.0.1 — 2026-10-31

Correcciones de la interfaz en inglés halladas al traducir el manual. En español sólo cambian el espacio antes de %,
el reparto de las tablas lado a lado y la fuente de algunos ejemplos (que ahora sale en español). Ningún cálculo cambia.

- Siglas que quedaban en español en la interfaz inglesa: **σ²GCA / σ²SCA** (comparación de métodos del Bloque 4 y su
  hoja de Excel: «GCA SS», «SCA SS», «Reciprocal SS»), **LSD** y **df** (precisión y potencia del Bloque 2),
  **Cov(HS)**, **MS<sub>e</sub>**, **σ²P**, **GCA × E / SCA × E** y la razón de Baker con GCA/SCA en las fórmulas de
  parámetros del Bloque 6 (antes «σ²A/σ²F (base de parcela)» salía en español: ahora «σ²A/σ²P (plot basis)»),
  **CVp %** y **σ²GE** en la tabla de parámetros del Bloque 8 (como en su nota), **b ± SE** en la regresión de
  estabilidad del Bloque 9 y **SCA** en la descripción emergente de la figura observado-predicho del Bloque 4.
- El ambiente único se llama **Single environment** en inglés (antes «Single»); en español sigue «Única».
- Hojas de la libreta de campo en inglés: «Field book» y «Crossing block» (antes FieldBook y CrossingBlock); la casilla
  del Bloque 2 dice «to load the field book back in Block 3».
- Ortografía estadounidense en toda la interfaz inglesa, incluidos el editor ✎ y el estudio de figuras de esta copia:
  program, recognized, randomized/randomization, analyze(d), realized, maximize, equalize, generalized, studentized,
  standardized, parametrization, summarized, modeling, color, gray/Grayscale, favorable, labeled, license, hectoliter,
  center(ed), toward, penalized, Canceled. Los títulos de las obras citadas no cambian.
- Comillas tipográficas “ ” en los textos ingleses.
- Espacio antes de % en todas las cifras y en los dos idiomas («5 %»): fmtPct, Bloque 2 (semilla, diferencia
  detectable, precisión de varianzas, potencia deseada), Bloque 3 (LSD 5 %, eficiencia intrabloque, intervalos de 95 %),
  Bloque 4 (reparto GCA/SCA), Bloque 5 (partición de Hayman), deslizadores de los laboratorios del Bloque 1 y zoom y tamaño de texto
  del estudio de figuras.
- Tablas lado a lado (`.two-col`): con columnas fijas (1:1) la tabla de arreglos del Bloque 5 y el ANOVA combinado del
  Bloque 3, entre otras, salían cortadas o con desplazamiento a 1400–1700 px, porque el índice del bloque a la derecha
  estrecha la página. Ahora cada columna parte del ancho de su tabla y, si las dos no caben, la segunda pasa debajo
  de la primera a todo el ancho (`css/style.css`); en el Bloque 5 (tarjeta 4, `narrow-wide`) la tabla de arreglos
  conserva su ancho y en el Bloque 3 (`wide-narrow`) lo conserva el ANOVA; el espacio sobrante va a la otra tabla. Comprobado con los 21 ejemplos a 1400 y 1700 px: ninguna
  tabla de esas tarjetas queda cortada.
- Galería de ejemplos: las fuentes que eran notas en inglés (papa de Carolina del Norte II y PLRV del CIP, maíz y
  avena de Olivoto, datos de Kang) salen en español con la interfaz española y en inglés con la inglesa.
- 7 pruebas nuevas (siglas y ortografía inglesas, % con espacio, ambiente único, fuentes de los ejemplos y reparto de
  `.two-col`): 345 en total, todas en verde.

## Unreleased

- Accessibility (WCAG 2.5.3, Label in Name): the brand link in the top bar was announced as "BreedingPro home", a
  name that did not contain the text it shows. `I18N.apply` (`js/i18n.js`) copied every tooltip (`data-es-title` /
  `data-en-title`) to `aria-label`; it still does, except where a link, button or tab already shows a readable text
  that the tooltip does not contain: there the control is named by that text and the tooltip stays as its
  description. Nothing looks or computes differently; the 338 unit tests still pass.
- Studentized range (`S.ptukey` and `S.qtukey` in `js/stats.js`): the last cut-off of the inner integral was
  exp(−30/k) instead of exp(−30) (there is a single range), which turned small probabilities into 0 when there are
  many means (k = 10: every value below 0.05); the first term also uses now the threshold exp(−50/k) of the classical
  algorithm. Checked against R 4.4.2 on a grid of 125 points (k = 2 to 20, ν = 2 to ∞; all within 1e-7). No block of
  BreedingPro calls these functions, so no result of the app changes; the 338 unit tests still pass.
- Anderson–Darling (`AS.andersonDarling` in `js/assump.js`, shared with AgriDesign): now identical to
  `nortest::ad.test`. The p-value stays at 3.7e-24 from AA = 10 on (before, the last quadratic of Stephens' formula
  turned upwards and gave p = 1 for clearly non-normal large samples, AA above about 307); the cumulative
  probabilities enter as logarithms without losing the tails instead of being clipped to [1e-12, 1 − 1e-12]; and the
  returned statistic `A` is A² as R reports it (the version corrected for sample size is now `AA`). Checked against
  nortest on 54 samples (statistic within 7e-13, p-value within 4e-12 relative). No block of BreedingPro calls this
  test, so no result of the app changes; the 338 unit tests still pass.

## 1.0.1 — 2026-09-28

- The software is archived in Zenodo: concept DOI 10.5281/zenodo.23005938 (it always resolves to the latest
  version); the DOI of release v1.0.0 is 10.5281/zenodo.23005939 and that of v1.0.1, 10.5281/zenodo.23006094.
- The DOI is now in the citation of the home page, in the report of Block 12 (citation and BibTeX entry), in
  `CITATION.cff`, `codemeta.json`, the README and the user manual (credits, section 1.7 and appendix F).
- No change to any calculation: results are identical to version 1.0.0.

## 1.0.0 — 2026-09-19

- First public release: twelve blocks (home and laboratories; planning of crosses, field trial and power; data,
  recognised design and field analysis; Griffing diallels; Hayman–Jinks and Gardner–Eberhart; mating designs;
  generation means and variances; genetic parameters and selection; genotype × environment and stability; mixed
  models, BLUP and crossbreeding; genomic selection and hybrid prediction; report), bilingual interface (Spanish and
  English) with light and dark themes, example data sets with their sources, 338 unit tests and the user manual in
  Spanish.
