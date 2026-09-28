/* BreedingPro — Block 1: the home page.
   Builds the stepper, the block cards, the material strip, the method gallery,
   the comparison of diallel methodologies and the reference list. The content
   lives here as bilingual data, so the map of the app is one editable list. */

(function () {

  /* ---------------- the twelve blocks ---------------- */
  const BLOCKS = [
    { n: 2, art: 'fieldPlan', tag: ['planear', 'plan'],
      t: ['Planear cruzas y campo', 'Plan crosses and field'],
      d: ['Genera el plan de cruzamientos para cualquier dialelo, Carolina del Norte, línea × probador o generaciones; aleatoriza el ensayo en bloques o látice alfa, calcula la semilla y la precisión esperada de ACG y ACE, y descarga la libreta de campo.',
        'Generate the crossing plan for any diallel, North Carolina design, line × tester or generation set; randomise the trial in blocks or alpha lattices, work out seed needs and the expected precision of GCA and SCA, and download the field book.'] },
    { n: 3, art: 'dataSheet', tag: ['datos', 'data'],
      t: ['Datos y diseño experimental', 'Data and experimental design'],
      d: ['Importa hojas de cálculo o pega tus datos; indica hembra, macho, repetición, ambiente y caracteres. La app reconoce el diseño de apareamiento, revisa balance, faltantes y atípicos, y hace el ANOVA del diseño de campo.',
        'Import spreadsheets or paste your data; mark female, male, replicate, environment and traits. The app recognises the mating design, checks balance, missing crosses and outliers, and runs the ANOVA of the field design.'] },
    { n: 4, art: 'griffing2', tag: ['dialelos', 'diallels'],
      t: ['Dialelos de Griffing', 'Griffing diallels'],
      d: ['Los cuatro métodos con modelo fijo y aleatorio: ANOVA, efectos de ACG, ACE y recíprocos (maternos y no maternos) con errores estándar, componentes de varianza, heredabilidad, dialelos en varios ambientes y datos desbalanceados por REML.',
        'All four methods under the fixed and random models: ANOVA, GCA, SCA and reciprocal (maternal and non-maternal) effects with standard errors, variance components, heritability, multi-environment diallels and unbalanced data by REML.'] },
    { n: 5, art: 'wrvr', tag: ['dialelos', 'diallels'],
      t: ['Hayman–Jinks y Gardner–Eberhart', 'Hayman–Jinks and Gardner–Eberhart'],
      d: ['Gráfica Wr–Vr con parábola límite, pruebas de los supuestos, componentes D, H₁, H₂, F, h² y E con sus razones; análisis II y III de Gardner y Eberhart, y la comparación lado a lado de las tres metodologías con los mismos datos.',
        'Wr–Vr graph with the limiting parabola, tests of the assumptions, components D, H₁, H₂, F, h² and E with their ratios; Gardner and Eberhart Analyses II and III, and a side-by-side comparison of the three methodologies on the same data.'] },
    { n: 6, art: 'nc2', tag: ['apareamiento', 'mating'],
      t: ['Otros diseños de apareamiento', 'Other mating designs'],
      d: ['Carolina del Norte I, II y III, línea × probador, cruza triple de prueba y dialelos parciales: varianza aditiva y de dominancia, grado medio de dominancia, epistasis y aptitud combinatoria de líneas y probadores.',
        'North Carolina I, II and III, line × tester, triple test cross and partial diallels: additive and dominance variance, average degree of dominance, epistasis and the combining ability of lines and testers.'] },
    { n: 7, art: 'generationMeans', tag: ['generaciones', 'generations'],
      t: ['Generaciones y heterosis', 'Generations and heterosis'],
      d: ['Pruebas de escala A, B, C, D, prueba conjunta y modelo de seis parámetros; varianzas generacionales, número efectivo de factores, heterosis sobre el progenitor medio, el mejor y un testigo, depresión endogámica y razón de potencia de la dominancia.',
        'Scaling tests A, B, C, D, the joint scaling test and the six-parameter model; generation variances, effective number of factors, mid-parent, better-parent and standard heterosis, inbreeding depression and the potence ratio of dominance.'] },
    { n: 8, art: 'selection', tag: ['selección', 'selection'],
      t: ['Parámetros genéticos y selección', 'Genetic parameters and selection'],
      d: ['Componentes de varianza, heredabilidad en parcela y en medias (con intervalos), CVG y CVF, avance genético, correlaciones genéticas, análisis de sendero, respuesta esperada por método de selección e índices de Smith–Hazel, restringidos, de ganancias deseadas y de rangos.',
        'Variance components, plot- and mean-basis heritability (with intervals), GCV and PCV, genetic advance, genetic correlations, path analysis, expected response for each selection method, and Smith–Hazel, restricted, desired-gains and rank-sum indices.'] },
    { n: 9, art: 'gge', tag: ['G×A', 'G×E'],
      t: ['Interacción genotipo × ambiente', 'Genotype × environment'],
      d: ['Finlay–Wilkinson, Eberhart–Russell, varianza de estabilidad de Shukla, ecovalencia de Wricke, superioridad de Lin–Binns, AMMI con prueba de ejes y biplot GGE: quién gana dónde, media contra estabilidad y ambientes representativos.',
        'Finlay–Wilkinson, Eberhart–Russell, Shukla\'s stability variance, Wricke\'s ecovalence, Lin–Binns superiority, AMMI with tests of the axes and the GGE biplot: which won where, mean versus stability and representative environments.'] },
    { n: 10, art: 'pedigree', tag: ['modelos mixtos', 'mixed models'],
      t: ['Modelos mixtos, BLUP y animales', 'Mixed models, BLUP and animals'],
      d: ['REML y BLUP para cualquier diseño, modelo animal con pedigrí (matriz de parentesco, consanguinidad, valores genéticos y confiabilidad), modelos de semental, maternos y de repetibilidad, y cruzamiento entre razas con el modelo de Dickerson.',
        'REML and BLUP for any design, the animal model with pedigree (relationship matrix, inbreeding, breeding values and reliability), sire, maternal and repeatability models, and crossbreeding with Dickerson\'s model.'] },
    { n: 11, art: 'hybridPrediction', tag: ['genómica', 'genomics'],
      t: ['Selección genómica e híbridos', 'Genomic selection and hybrids'],
      d: ['Matriz genómica de parentesco, GBLUP y regresión ridge con validación cruzada, predicción de cruzas simples entre dos grupos heteróticos que nunca se han sembrado, a partir de ACG, ACE y marcadores, con su exactitud según cuántos progenitores se probaron, y de cruzas triples y dobles.',
        'Genomic relationship matrix, GBLUP and ridge regression with cross-validation, prediction of never-grown single crosses between two heterotic groups from GCA, SCA and markers, with their accuracy according to how many parents were tested, and of three-way and double crosses.'] },
    { n: 12, art: 'report', tag: ['publicar', 'publish'],
      t: ['Figuras e informe', 'Figures and report'],
      d: ['Todas las figuras son editables y se exportan hasta 900 ppp en PNG, TIFF o SVG. Un clic arma el informe con la sección de métodos y sus citas, y un ZIP con tablas, figuras y datos.',
        'Every figure is editable and exports at up to 900 dpi as PNG, TIFF or SVG. One click builds the report with the methods section and its citations, and a ZIP with tables, figures and data.'] },
  ];

  /* ---------------- material that can be analysed ---------------- */
  const MATERIALS = [
    { art: 'matInbred', k: ['líneas e híbridos', 'lines and hybrids'], kc: '', t: ['Líneas endogámicas y sus cruzas', 'Inbred lines and their crosses'], s: ['Maíz, sorgo, girasol, hortalizas: dialelos, probadores y predicción de híbridos.', 'Maize, sorghum, sunflower, vegetables: diallels, testers and hybrid prediction.'] },
    { art: 'matPopulation', k: ['alógamas', 'outcrossers'], kc: 'l', t: ['Variedades y poblaciones', 'Varieties and populations'], s: ['Cruzas entre variedades nativas o poblaciones: heterosis de Gardner y Eberhart y selección recurrente.', 'Crosses between landraces or populations: Gardner–Eberhart heterosis and recurrent selection.'] },
    { art: 'matSelfer', k: ['autógamas', 'selfers'], kc: 'g', t: ['Cultivos autógamos', 'Self-pollinated crops'], s: ['Trigo, frijol, arroz, tomate: generaciones P₁–B₂, cruza triple de prueba y líneas puras.', 'Wheat, bean, rice, tomato: P₁–B₂ generations, triple test cross and pure lines.'] },
    { art: 'matClonal', k: ['perennes', 'perennials'], kc: 'l', t: ['Clonales y perennes', 'Clonal and perennial crops'], s: ['Frutales, forrajes y tubérculos: familias de medios hermanos, clones y repetibilidad.', 'Fruit trees, forages and tubers: half-sib families, clones and repeatability.'] },
    { art: 'matAnimals', k: ['pedigrí', 'pedigree'], kc: 'g', t: ['Ganado y especies animales', 'Livestock and animal species'], s: ['Modelo animal, sementales, efectos maternos y cruzamiento entre razas.', 'Animal model, sires, maternal effects and crossbreeding.'] },
    { art: 'matMarkers', k: ['marcadores', 'markers'], kc: '', t: ['Marcadores moleculares', 'Molecular markers'], s: ['Matrices SNP 0/1/2 para parentesco genómico, GBLUP y predicción de híbridos.', 'SNP matrices coded 0/1/2 for genomic relationships, GBLUP and hybrid prediction.'] },
  ];

  /* ---------------- method gallery ---------------- */
  const FAMS = {
    dia: ['dialelos', 'diallels'], mat: ['apareamiento', 'mating'], gen: ['generaciones', 'generations'],
    sel: ['selección', 'selection'], gxe: ['G×A', 'G×E'], mix: ['modelos mixtos', 'mixed models'], gen2: ['genómica', 'genomics'],
  };
  const METHODS = [
    { art: 'griffing1', fam: 'dia', n: ['Griffing, método 1', 'Griffing Method 1'], s: ['progenitores, F₁ y recíprocas', 'parents, F₁ and reciprocals'] },
    { art: 'griffing2', fam: 'dia', n: ['Griffing, método 2', 'Griffing Method 2'], s: ['progenitores y F₁', 'parents and F₁'] },
    { art: 'griffing3', fam: 'dia', n: ['Griffing, método 3', 'Griffing Method 3'], s: ['F₁ y recíprocas', 'F₁ and reciprocals'] },
    { art: 'griffing4', fam: 'dia', n: ['Griffing, método 4', 'Griffing Method 4'], s: ['solo F₁', 'F₁ only'] },
    { art: 'reciprocal', fam: 'dia', n: ['Efectos recíprocos', 'Reciprocal effects'], s: ['maternos y no maternos', 'maternal and non-maternal'] },
    { art: 'wrvr', fam: 'dia', n: ['Gráfica Wr–Vr', 'Wr–Vr graph'], s: ['Hayman y Jinks', 'Hayman and Jinks'] },
    { art: 'haymanAnova', fam: 'dia', n: ['ANOVA de Hayman', 'Hayman\'s ANOVA'], s: ['partición a, b₁, b₂, b₃, c, d', 'items a, b₁, b₂, b₃, c, d'] },
    { art: 'gardnerEberhart', fam: 'dia', n: ['Gardner y Eberhart', 'Gardner and Eberhart'], s: ['análisis II y III de heterosis', 'Analyses II and III of heterosis'] },
    { art: 'partialDiallel', fam: 'dia', n: ['Dialelo parcial', 'Partial diallel'], s: ['diseño circulante', 'circulant design'] },
    { art: 'nc1', fam: 'mat', n: ['Carolina del Norte I', 'North Carolina I'], s: ['hembras anidadas en machos', 'females nested in males'] },
    { art: 'nc2', fam: 'mat', n: ['Carolina del Norte II', 'North Carolina II'], s: ['diseño factorial', 'factorial design'] },
    { art: 'nc3', fam: 'mat', n: ['Carolina del Norte III y cruza triple', 'North Carolina III and triple test cross'], s: ['retrocruzas de la F₂', 'backcrosses of the F₂'] },
    { art: 'lineTester', fam: 'mat', n: ['Línea × probador', 'Line × tester'], s: ['ACG de líneas y probadores', 'GCA of lines and testers'] },
    { art: 'ttc', fam: 'mat', n: ['Prueba de epistasis', 'Epistasis test'], s: ['familias L₁, L₂, L₃', 'L₁, L₂, L₃ families'] },
    { art: 'generationMeans', fam: 'gen', n: ['Medias generacionales', 'Generation means'], s: ['pruebas de escala y 6 parámetros', 'scaling tests and 6 parameters'] },
    { art: 'generations', fam: 'gen', n: ['Varianzas generacionales', 'Generation variances'], s: ['D, H, E y número de genes', 'D, H, E and number of genes'] },
    { art: 'heterosis', fam: 'gen', n: ['Heterosis', 'Heterosis'], s: ['progenitor medio, mejor y testigo', 'mid-parent, better parent, check'] },
    { art: 'heritability', fam: 'sel', n: ['Heredabilidad', 'Heritability'], s: ['en parcela, en medias y generalizada', 'plot, entry-mean and generalised'] },
    { art: 'selection', fam: 'sel', n: ['Respuesta a la selección', 'Response to selection'], s: ['por método y por año', 'per method and per year'] },
    { art: 'selIndex', fam: 'sel', n: ['Índices de selección', 'Selection indices'], s: ['Smith–Hazel, restringido, deseado', 'Smith–Hazel, restricted, desired'] },
    { art: 'pathAnalysis', fam: 'sel', n: ['Correlaciones y senderos', 'Correlations and paths'], s: ['efectos directos e indirectos', 'direct and indirect effects'] },
    { art: 'stability', fam: 'gxe', n: ['Regresión de estabilidad', 'Stability regression'], s: ['Finlay–Wilkinson, Eberhart–Russell', 'Finlay–Wilkinson, Eberhart–Russell'] },
    { art: 'reactionNorms', fam: 'gxe', n: ['Ecovalencia y superioridad', 'Ecovalence and superiority'], s: ['Wricke, Shukla, Lin–Binns', 'Wricke, Shukla, Lin–Binns'] },
    { art: 'ammi', fam: 'gxe', n: ['AMMI', 'AMMI'], s: ['efectos principales e interacción', 'main effects and interaction'] },
    { art: 'gge', fam: 'gxe', n: ['Biplot GGE', 'GGE biplot'], s: ['quién gana dónde', 'which won where'] },
    { art: 'blup', fam: 'mix', n: ['REML y BLUP', 'REML and BLUP'], s: ['cualquier diseño, desbalanceado', 'any design, unbalanced'] },
    { art: 'pedigree', fam: 'mix', n: ['Modelo animal', 'Animal model'], s: ['pedigrí, consanguinidad, VG', 'pedigree, inbreeding, EBV'] },
    { art: 'crossbreeding', fam: 'mix', n: ['Cruzamiento entre razas', 'Crossbreeding'], s: ['modelo de Dickerson', 'Dickerson\'s model'] },
    { art: 'genomicMatrix', fam: 'gen2', n: ['GBLUP', 'GBLUP'], s: ['parentesco genómico', 'genomic relationships'] },
    { art: 'hybridPrediction', fam: 'gen2', n: ['Híbridos no probados', 'Untested hybrids'], s: ['predicción con ACG, ACE y SNP', 'prediction from GCA, SCA and SNPs'] },
    { art: 'doubleCross', fam: 'gen2', n: ['Cruzas dobles y triples', 'Double and three-way crosses'], s: ['predicción desde cruzas simples', 'predicted from single crosses'] },
    { art: 'heteroticGroups', fam: 'gen2', n: ['Cruzas entre dos grupos', 'Crosses between two groups'], s: ['exactitud T2, T1 y T0', 'T2, T1 and T0 accuracy'] },
  ];

  /* ---------------- what it brings together ---------------- */
  const ICONS = {
    table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
    missing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke-dasharray="2 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    fig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16v16H4z"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/></svg>',
    dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12"/><path d="M8 7h8M8 17h8"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
  };
  const BRING = [
    ['plan', ['Del plan de cruzas al artículo', 'From the crossing plan to the paper'], ['Planea, captura, analiza y publica en un mismo flujo, sin cambiar de programa.', 'Plan, record, analyse and publish in one workflow, without switching programs.']],
    ['table', ['Todos los diseños de apareamiento', 'Every mating design'], ['Griffing 1–4 con ambos modelos, Hayman–Jinks, Gardner–Eberhart, Carolina del Norte, línea × probador, cruza triple y generaciones.', 'Griffing 1–4 under both models, Hayman–Jinks, Gardner–Eberhart, North Carolina, line × tester, triple test cross and generations.']],
    ['missing', ['Cruzas perdidas y datos desbalanceados', 'Lost crosses and unbalanced data'], ['Cuando falta una cruza o una parcela, los modelos lineales y REML dan estimaciones correctas en lugar de rellenar a ojo.', 'When a cross or a plot is lost, linear models and REML give proper estimates instead of guessed fill-ins.']],
    ['check', ['Supuestos puestos a prueba', 'Assumptions put to the test'], ['Cada método revisa sus propios supuestos (b = 1 en Wr–Vr, homogeneidad, normalidad, epistasis) antes de interpretar.', 'Each method checks its own assumptions (b = 1 in Wr–Vr, homogeneity, normality, epistasis) before interpreting.']],
    ['chat', ['Interpretación en palabras', 'Interpretation in words'], ['Qué progenitores y qué cruzas sobresalen, qué tipo de acción génica domina y qué método de mejora conviene.', 'Which parents and crosses stand out, which gene action prevails and which breeding method suits it.']],
    ['dna', ['Plantas, animales y marcadores', 'Plants, animals and markers'], ['Del dialelo clásico al modelo animal con pedigrí y a la predicción genómica de híbridos.', 'From the classical diallel to the animal model with pedigree and the genomic prediction of hybrids.']],
    ['fig', ['Figuras listas para publicar', 'Publication-ready figures'], ['Editables en colores, fuentes y etiquetas; hasta 900 ppp en PNG, TIFF o SVG.', 'Editable colours, fonts and labels; up to 900 dpi as PNG, TIFF or SVG.']],
    ['doc', ['Informe reproducible', 'Reproducible report'], ['Sección de métodos redactada con los ajustes reales y las citas de cada procedimiento.', 'Methods section written with the actual settings and the citation of every procedure.']],
    ['globe', ['Español e inglés', 'Spanish and English'], ['Toda la interfaz, las interpretaciones y el informe cambian de idioma con un clic.', 'The whole interface, the interpretations and the report switch language with one click.']],
    ['lock', ['Tus datos no salen de tu computadora', 'Your data never leave your computer'], ['Todo se calcula en el navegador, sin instalar nada y sin conexión.', 'Everything is computed in the browser, with nothing to install and no connection needed.']],
  ];

  /* ---------------- comparison of the diallel methodologies ---------------- */
  const Y = (es, en) => ({ c: 'yes', es, en }), N = (es, en) => ({ c: 'no', es, en }), O = (es, en) => ({ c: 'opt', es, en }), P = (es, en) => ({ c: '', es, en });
  const COMPARE_COLS = [
    ['Griffing, modelo I (fijo)', 'Griffing, Model I (fixed)'],
    ['Griffing, modelo II (aleatorio)', 'Griffing, Model II (random)'],
    ['Hayman–Jinks', 'Hayman–Jinks'],
    ['Gardner–Eberhart II y III', 'Gardner–Eberhart II and III'],
  ];
  const COMPARE = [
    [['Pregunta que responde', 'Question it answers'],
      P('¿Qué progenitores y cruzas son mejores en este grupo?', 'Which parents and crosses are best in this set?'),
      P('¿Cuánta varianza aditiva y de dominancia hay en la población de la que vienen los progenitores?', 'How much additive and dominance variance is there in the population the parents came from?'),
      P('¿Cómo actúan los genes: grado y dirección de la dominancia, número de grupos de genes?', 'How do the genes act: degree and direction of dominance, number of gene groups?'),
      P('¿Cuánta heterosis hay y de qué tipo, entre variedades o poblaciones?', 'How much heterosis is there, and of which kind, between varieties or populations?')],
    [['Progenitores', 'Parents'],
      P('Elegidos a propósito; las conclusiones valen solo para ellos', 'Chosen on purpose; conclusions apply to them only'),
      P('Muestra aleatoria de una población de referencia', 'Random sample from a reference population'),
      P('Líneas homocigóticas (endogámicas)', 'Homozygous (inbred) lines'),
      P('Variedades o poblaciones en equilibrio; también líneas', 'Varieties or populations in equilibrium; also lines')],
    [['Métodos de Griffing aplicables', 'Applicable Griffing methods'],
      P('1, 2, 3 y 4', '1, 2, 3 and 4'), P('1, 2, 3 y 4; para la población ancestral, mejor 3 o 4', '1, 2, 3 and 4; for the ancestral population, preferably 3 or 4'),
      P('Requiere progenitores: 1 o 2', 'Needs the parents: 1 or 2'),
      P('Medio dialelo con progenitores (como el 2)', 'Half diallel with parents (as in Method 2)')],
    [['Especies', 'Species'],
      P('Autógamas, alógamas y poliploides', 'Selfers, outcrossers and polyploids'), P('Autógamas, alógamas y poliploides', 'Selfers, outcrossers and polyploids'),
      O('Solo diploides con progenitores endogámicos', 'Diploids with inbred parents only'), P('Autógamas, alógamas y poliploides', 'Selfers, outcrossers and polyploids')],
    [['Efectos recíprocos', 'Reciprocal effects'],
      Y('Se estiman, con partición materna y no materna (métodos 1 y 3)', 'Estimated, with maternal and non-maternal split (Methods 1 and 3)'), Y('Varianza recíproca, materna y no materna (métodos 1 y 3)', 'Reciprocal, maternal and non-maternal variance (Methods 1 and 3)'),
      N('Se suponen ausentes; se promedian', 'Assumed absent; averaged'), O('Solo si se añaden al modelo', 'Only if added to the model')],
    [['Heterosis', 'Heterosis'],
      O('Solo como contraste progenitores contra cruzas', 'Only as the parents-versus-crosses contrast'), O('No se estima directamente', 'Not estimated directly'),
      O('Dirección y grado de dominancia (h², b₁)', 'Direction and degree of dominance (h², b₁)'), Y('Promedio, de cada variedad y específica', 'Average, per variety and specific')],
    [['Epistasis y ligamiento', 'Epistasis and linkage'],
      O('No los separa: quedan dentro de ACG y ACE', 'Not separated: absorbed into GCA and SCA'), O('Sesgan σ²A y σ²D si existen', 'Bias σ²A and σ²D if present'),
      N('Supuestos ausentes; se prueban con b = 1 y t²', 'Assumed absent; tested with b = 1 and t²'), O('Quedan dentro de la heterosis específica', 'Absorbed into specific heterosis')],
    [['Estima', 'Estimates'],
      P('ĝᵢ, ŝᵢⱼ, r̂ᵢⱼ (m̂ᵢ, n̂ᵢⱼ) y sus errores estándar', 'ĝᵢ, ŝᵢⱼ, r̂ᵢⱼ (m̂ᵢ, n̂ᵢⱼ) and their standard errors'),
      P('σ²ACG, σ²ACE, σ²R → σ²A, σ²D, h², razón de Baker', 'σ²GCA, σ²SCA, σ²R → σ²A, σ²D, h², Baker\'s ratio'),
      P('D, H₁, H₂, F, h², E, (H₁/D)½, H₂/4H₁, KD/KR, orden de dominancia', 'D, H₁, H₂, F, h², E, (H₁/D)½, H₂/4H₁, KD/KR, dominance order'),
      P('μᵥ, vⱼ, ' + HBAR + ', hⱼ, sⱼⱼ′ (II); ACG y ACE de las cruzas (III)', 'μᵥ, vⱼ, ' + HBAR + ', hⱼ, sⱼⱼ′ (II); GCA and SCA of the crosses (III)')],
    [['Equivalencias exactas', 'Exact equivalences'],
      P('Método 1: ACG, ACE y recíprocos = ítems a, b y c + d de Hayman; método 2: ACG y ACE = variedades y heterosis total del análisis II', 'Method 1: GCA, SCA and reciprocals = Hayman\'s items a, b and c + d; Method 2: GCA and SCA = varieties and total heterosis of Analysis II'),
      P('Con progenitores endogámicos: σ²ACG = ¼(D + H₁ − H₂ − F) y σ²ACE = ¼H₂', 'With inbred parents: σ²GCA = ¼(D + H₁ − H₂ − F) and σ²SCA = ¼H₂'),
      P('b₁, b₂ y b₃ del medio dialelo = ' + HBAR + ', hⱼ y sⱼⱼ′ de Gardner–Eberhart; c = materno, d = recíproco restante', 'Half-diallel b₁, b₂ and b₃ = Gardner–Eberhart ' + HBAR + ', hⱼ and sⱼⱼ′; c = maternal, d = remaining reciprocal'),
      P('ĝⱼ (III) = ½v̂ⱼ + ĥⱼ (II) = ĝⱼ del método 4; sⱼⱼ′ = ACE del método 4', 'ĝⱼ (III) = ½v̂ⱼ + ĥⱼ (II) = Method 4 ĝⱼ; sⱼⱼ′ = Method 4 SCA')],
  ];

  /* ---------------- references ---------------- */
  const REFS = [
    ['dia', 'Sprague, G.F. & Tatum, L.A. (1942)', 'General vs. specific combining ability in single crosses of corn. <i>Journal of the American Society of Agronomy</i> 34: 923–932.'],
    ['dia', 'Griffing, B. (1956a)', 'A generalised treatment of the use of diallel crosses in quantitative inheritance. <i>Heredity</i> 10: 31–50.'],
    ['dia', 'Griffing, B. (1956b)', 'Concept of general and specific combining ability in relation to diallel crossing systems. <i>Australian Journal of Biological Sciences</i> 9: 463–493.'],
    ['dia', 'Hayman, B.I. (1954a)', 'The analysis of variance of diallel tables. <i>Biometrics</i> 10: 235–244.'],
    ['dia', 'Hayman, B.I. (1954b)', 'The theory and analysis of diallel crosses. <i>Genetics</i> 39: 789–809.'],
    ['dia', 'Jinks, J.L. (1954)', 'The analysis of continuous variation in a diallel cross of <i>Nicotiana rustica</i> varieties. <i>Genetics</i> 39: 767–788.'],
    ['dia', 'Gardner, C.O. & Eberhart, S.A. (1966)', 'Analysis and interpretation of the variety cross diallel and related populations. <i>Biometrics</i> 22: 439–452.'],
    ['dia', 'Kempthorne, O. & Curnow, R.N. (1961)', 'The partial diallel cross. <i>Biometrics</i> 17: 229–250.'],
    ['dia', 'Morley Jones, R. (1965)', 'Analysis of variance of the half diallel table. <i>Heredity</i> 20: 117–121.'],
    ['dia', 'Cockerham, C.C. (1963)', 'Estimation of genetic variances. In: Hanson, W.D. & Robinson, H.F. (eds.) <i>Statistical Genetics and Plant Breeding</i>. NAS-NRC Publ. 982, pp. 53–94.'],
    ['dia', 'Topham, P.B. (1966)', 'Diallel analysis involving maternal and maternal interaction effects. <i>Heredity</i> 21: 665–674.'],
    ['dia', 'Kuehl, R.O., Rawlings, J.O. & Cockerham, C.C. (1968)', 'Reference populations for diallel experiments. <i>Biometrics</i> 24: 881–901.'],
    ['dia', 'Walters, D.E. & Gale, J.S. (1977)', 'A note on the Hayman analysis of variance for a full diallel table. <i>Heredity</i> 38: 401–407.'],
    ['dia', 'Baker, R.J. (1978)', 'Issues in diallel analysis. <i>Crop Science</i> 18: 533–536.'],
    ['dia', 'Wright, A.J. (1985)', 'Diallel designs, analyses, and reference populations. <i>Heredity</i> 54: 307–311.'],
    ['dia', 'Christie, B.R. & Shattuck, V.I. (1992)', 'The diallel cross: design, analysis, and use for plant breeders. <i>Plant Breeding Reviews</i> 9: 9–36.'],
    ['dia', 'Saavedra Guevara, C., Pérez López, D.J., González Huerta, A., Franco Martínez, J.R.P., Rubí Arriaga, M. & Ramírez Dávila, J.F. (2021)', 'Métodos de Griffing: revisión sobre su importancia y aplicación en fitomejoramiento convencional. <i>Revista Mexicana de Ciencias Agrícolas</i> 12: 1275–1286.'],
    ['dia', 'Möhring, J., Melchinger, A.E. & Piepho, H.P. (2011)', 'REML-based diallel analysis. <i>Crop Science</i> 51: 470–478.'],
    ['dia', 'Eisen, E.J., Hörstgen-Schwark, G., Saxton, A.M. & Bandy, T.R. (1983)', 'Genetic interpretation and analysis of diallel crosses with animals. <i>Theoretical and Applied Genetics</i> 65: 17–23.'],
    ['mat', 'Comstock, R.E. & Robinson, H.F. (1948)', 'The components of genetic variance in populations of biparental progenies and their use in estimating the average degree of dominance. <i>Biometrics</i> 4: 254–266.'],
    ['mat', 'Comstock, R.E. & Robinson, H.F. (1952)', 'Estimation of average dominance of genes. In: Gowen, J.W. (ed.) <i>Heterosis</i>. Iowa State College Press, Ames, pp. 494–516.'],
    ['mat', 'Kempthorne, O. (1957)', '<i>An Introduction to Genetic Statistics</i>. Wiley, New York.'],
    ['mat', 'Kearsey, M.J. & Jinks, J.L. (1968)', 'A general method of detecting additive, dominance and epistatic variation for metrical traits. I. Theory. <i>Heredity</i> 23: 403–409.'],
    ['gen', 'Mather, K. (1949)', '<i>Biometrical Genetics: The Study of Continuous Variation</i>. Methuen, London.'],
    ['gen', 'Cavalli, L.L. (1952)', 'An analysis of linkage in quantitative inheritance. In: Reeve, E.C.R. & Waddington, C.H. (eds.) <i>Quantitative Inheritance</i>. HMSO, London, pp. 135–144.'],
    ['gen', 'Hayman, B.I. (1958)', 'The separation of epistatic from additive and dominance variation in generation means. <i>Heredity</i> 12: 371–390.'],
    ['gen', 'Jinks, J.L. & Jones, R.M. (1958)', 'Estimation of the components of heterosis. <i>Genetics</i> 43: 223–234.'],
    ['gen', 'Mather, K. & Jinks, J.L. (1982)', '<i>Biometrical Genetics</i>, 3rd ed. Chapman & Hall, London.'],
    ['gen', 'Lande, R. (1981)', 'The minimum number of genes contributing to quantitative variation between and within populations. <i>Genetics</i> 99: 541–553.'],
    ['sel', 'Falconer, D.S. & Mackay, T.F.C. (1996)', '<i>Introduction to Quantitative Genetics</i>, 4th ed. Longman, Harlow.'],
    ['sel', 'Hallauer, A.R., Carena, M.J. & Miranda Filho, J.B. (2010)', '<i>Quantitative Genetics in Maize Breeding</i>. Springer, New York.'],
    ['sel', 'Sprague, G.F. & Eberhart, S.A. (1977)', 'Corn breeding. In: Sprague, G.F. (ed.) <i>Corn and Corn Improvement</i>, 2nd ed. American Society of Agronomy, Madison, pp. 305–362.'],
    ['sel', 'Johnson, H.W., Robinson, H.F. & Comstock, R.E. (1955)', 'Estimates of genetic and environmental variability in soybeans. <i>Agronomy Journal</i> 47: 314–318.'],
    ['sel', 'Holland, J.B., Nyquist, W.E. & Cervantes-Martínez, C.T. (2003)', 'Estimating and interpreting heritability for plant breeding: an update. <i>Plant Breeding Reviews</i> 22: 9–112.'],
    ['sel', 'Cullis, B.R., Smith, A.B. & Coombes, N.E. (2006)', 'On the design of early generation variety trials with correlated data. <i>Journal of Agricultural, Biological, and Environmental Statistics</i> 11: 381–393.'],
    ['sel', 'Bulmer, M.G. (1971)', 'The effect of selection on genetic variability. <i>The American Naturalist</i> 105: 201–211.'],
    ['sel', 'Smith, H.F. (1936)', 'A discriminant function for plant selection. <i>Annals of Eugenics</i> 7: 240–250.'],
    ['sel', 'Hazel, L.N. (1943)', 'The genetic basis for constructing selection indexes. <i>Genetics</i> 28: 476–490.'],
    ['sel', 'Pesek, J. & Baker, R.J. (1969)', 'Desired improvement in relation to selection indices. <i>Canadian Journal of Plant Science</i> 49: 803–804.'],
    ['sel', 'Cerón-Rojas, J.J. & Crossa, J. (2018)', '<i>Linear Selection Indices in Modern Plant Breeding</i>. Springer, Cham.'],
    ['sel', 'Kempthorne, O. & Nordskog, A.W. (1959)', 'Restricted selection indices. <i>Biometrics</i> 15: 10–19.'],
    ['sel', 'Elston, R.C. (1963)', 'A weight-free index for the purpose of ranking or selection with respect to several traits at a time. <i>Biometrics</i> 19: 85–97.'],
    ['sel', 'Mulamba, N.N. & Mock, J.J. (1978)', 'Improvement of yield potential of the Eto Blanco maize (<i>Zea mays</i> L.) population by breeding for plant traits. <i>Egyptian Journal of Genetics and Cytology</i> 7: 40–51.'],
    ['sel', 'Cockerham, C.C. (1954)', 'An extension of the concept of partitioning hereditary variance for analysis of covariances among relatives when epistasis is present. <i>Genetics</i> 39: 859–882.'],
    ['sel', 'Dewey, D.R. & Lu, K.H. (1959)', 'A correlation and path-coefficient analysis of components of crested wheatgrass seed production. <i>Agronomy Journal</i> 51: 515–518.'],
    ['gxe', 'Finlay, K.W. & Wilkinson, G.N. (1963)', 'The analysis of adaptation in a plant-breeding programme. <i>Australian Journal of Agricultural Research</i> 14: 742–754.'],
    ['gxe', 'Eberhart, S.A. & Russell, W.A. (1966)', 'Stability parameters for comparing varieties. <i>Crop Science</i> 6: 36–40.'],
    ['gxe', 'Shukla, G.K. (1972)', 'Some statistical aspects of partitioning genotype-environmental components of variability. <i>Heredity</i> 29: 237–245.'],
    ['gxe', 'Wricke, G. (1962)', 'Über eine Methode zur Erfassung der ökologischen Streubreite in Feldversuchen. <i>Zeitschrift für Pflanzenzüchtung</i> 47: 92–96.'],
    ['gxe', 'Lin, C.S. & Binns, M.R. (1988)', 'A superiority measure of cultivar performance for cultivar × location data. <i>Canadian Journal of Plant Science</i> 68: 193–198.'],
    ['gxe', 'Gauch, H.G. (1988)', 'Model selection and validation for yield trials with interaction. <i>Biometrics</i> 44: 705–715.'],
    ['gxe', 'Yan, W., Hunt, L.A., Sheng, Q. & Szlavnics, Z. (2000)', 'Cultivar evaluation and mega-environment investigation based on the GGE biplot. <i>Crop Science</i> 40: 597–605.'],
    ['mix', 'Henderson, C.R. (1975)', 'Best linear unbiased estimation and prediction under a selection model. <i>Biometrics</i> 31: 423–447.'],
    ['mix', 'Henderson, C.R. (1976)', 'A simple method for computing the inverse of a numerator relationship matrix used in prediction of breeding values. <i>Biometrics</i> 32: 69–83.'],
    ['mix', 'Patterson, H.D. & Thompson, R. (1971)', 'Recovery of inter-block information when block sizes are unequal. <i>Biometrika</i> 58: 545–554.'],
    ['mix', 'Gilmour, A.R., Thompson, R. & Cullis, B.R. (1995)', 'Average information REML: an efficient algorithm for variance parameter estimation in linear mixed models. <i>Biometrics</i> 51: 1440–1450.'],
    ['mix', 'Meuwissen, T.H.E. & Luo, Z. (1992)', 'Computing inbreeding coefficients in large populations. <i>Genetics Selection Evolution</i> 24: 305–313.'],
    ['mix', 'Dickerson, G.E. (1969)', 'Experimental approaches in utilising breed resources. <i>Animal Breeding Abstracts</i> 37: 191–202.'],
    ['gen2', 'Jenkins, M.T. (1934)', 'Methods of estimating the performance of double crosses in corn. <i>Journal of the American Society of Agronomy</i> 26: 199–204.'],
    ['gen2', 'Meuwissen, T.H.E., Hayes, B.J. & Goddard, M.E. (2001)', 'Prediction of total genetic value using genome-wide dense marker maps. <i>Genetics</i> 157: 1819–1829.'],
    ['gen2', 'VanRaden, P.M. (2008)', 'Efficient methods to compute genomic predictions. <i>Journal of Dairy Science</i> 91: 4414–4423.'],
    ['gen2', 'Bernardo, R. (1994)', 'Prediction of maize single-cross performance using RFLPs and information from related hybrids. <i>Crop Science</i> 34: 20–25.'],
    ['gen2', 'Technow, F., Riedelsheimer, C., Schrag, T.A. & Melchinger, A.E. (2012)', 'Genomic prediction of hybrid performance in maize with models incorporating dominance and population specific marker effects. <i>Theoretical and Applied Genetics</i> 125: 1181–1194.'],
  ];

  /* ---------------- renderers ---------------- */
  const two = pair => L2(pair[0], pair[1]);

  function renderStepper() {
    const nav = el('stepper');
    if (!nav) return;
    nav.innerHTML = STEPS.map(s => `<button type="button" class="step-btn${s.n === 1 ? ' active' : ''}" data-step="${s.n}"${s.ready ? '' : ' disabled'}><span class="step-num">${s.n}</span>${L2(s.es, s.en)}</button>`).join('');
  }

  function renderFeatures() {
    const g = el('featureGrid');
    if (!g) return;
    g.innerHTML = '';
    BLOCKS.forEach(b => {
      const card = mk('div', { class: 'feature', tabindex: '0', role: 'button' });
      const ready = !(document.querySelector(`.step-btn[data-step="${b.n}"]`) || {}).disabled;
      card.innerHTML = `<div class="f-num">${b.n}</div>` + '' +
        `<div class="f-art">${Art[b.art] ? Art[b.art]() : ''}</div><div class="f-tag">${two(b.tag)}${ready ? '' : ` <span class="f-soon">${L2('en construcción', 'coming next')}</span>`}</div><h3>${two(b.t)}</h3><p>${two(b.d)}</p>`;
      const open = () => {
        const btn = document.querySelector('.step-btn[data-step="' + b.n + '"]');
        if (btn && !btn.disabled) goStep(b.n);
        else { const m = el('homeMessages'); if (m) { clearMessages(m); showMessage(m, 'info', L2(`El bloque ${b.n} se construye en una etapa posterior; la portada ya muestra lo que hará.`, `Block ${b.n} is built in a later stage; the home page already shows what it will do.`)); m.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      g.appendChild(card);
    });
  }

  function renderMaterials() {
    const g = el('materialStrip');
    if (!g) return;
    g.innerHTML = MATERIALS.map(m => `<div class="material">${Art[m.art]()}<div class="mt-t">${two(m.t)}</div><div class="mt-s">${two(m.s)}</div><span class="mt-k ${m.kc}">${two(m.k)}</span></div>`).join('');
  }

  let famFilter = 'all';
  function renderMethods() {
    const g = el('methodGallery'), f = el('methodFilter');
    if (!g) return;
    if (f && !f.dataset.built) {
      f.dataset.built = '1';
      f.innerHTML = `<button class="chip on" data-fam="all">${L2('todos', 'all')} · ${METHODS.length}</button>` +
        Object.keys(FAMS).map(k => `<button class="chip" data-fam="${k}">${two(FAMS[k])} · ${METHODS.filter(m => m.fam === k).length}</button>`).join('');
      f.addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        famFilter = b.dataset.fam;
        els('.chip', f).forEach(c => c.classList.toggle('on', c === b));
        renderMethods();
      });
    }
    g.innerHTML = METHODS.filter(m => famFilter === 'all' || m.fam === famFilter).map(m =>
      `<div class="method-card"><span class="m-fam ${m.fam}">${two(FAMS[m.fam])}</span>${Art[m.art] ? Art[m.art]() : ''}<div class="m-name">${two(m.n)}</div><div class="m-sub">${two(m.s)}</div></div>`).join('');
  }

  function renderBring() {
    const g = el('bringGrid');
    if (!g) return;
    g.innerHTML = BRING.map(b => `<div class="bring"><div class="b-ic">${ICONS[b[0]]}</div><div><b>${two(b[1])}</b><span>${two(b[2])}</span></div></div>`).join('');
  }

  function renderCompare() {
    const wrap = el('methodCompare');
    if (!wrap) return;
    let html = '<table><thead><tr><th></th>' + COMPARE_COLS.map(c => `<th>${two(c)}</th>`).join('') + '</tr></thead><tbody>';
    COMPARE.forEach(row => {
      html += `<tr><td>${two(row[0])}</td>` + row.slice(1).map(c => `<td>${c.c ? `<span class="${c.c}">${c.c === 'yes' ? '●' : c.c === 'no' ? '○' : '◐'}</span> ` : ''}${L2(c.es, c.en)}</td>`).join('') + '</tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';
  }

  let refFilter = 'all';
  function renderRefs() {
    const g = el('refList'), f = el('refFilter');
    if (!g) return;
    if (f && !f.dataset.built) {
      f.dataset.built = '1';
      f.innerHTML = `<button class="chip on" data-fam="all">${L2('todas', 'all')} · ${REFS.length}</button>` +
        Object.keys(FAMS).map(k => `<button class="chip" data-fam="${k}">${two(FAMS[k])}</button>`).join('');
      f.addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        refFilter = b.dataset.fam;
        els('.chip', f).forEach(c => c.classList.toggle('on', c === b));
        renderRefs();
      });
    }
    g.innerHTML = REFS.filter(r => refFilter === 'all' || r[0] === refFilter).map(r => `<li><b>${r[1]}</b> ${r[2]}</li>`).join('');
  }

  /* illustrations that contain translated labels are redrawn when the language changes */
  function renderArt() {
    const h = el('heroArt'); if (h) h.innerHTML = Art.hero();
    const figs = { theoryMethodsFig: 'theoryMethods', theoryWrVrFig: 'theoryWrVr', theorySelFig: 'selection', theoryGenFig: 'generationMeans', theoryGxeFig: 'gge', theoryPedFig: 'pedigree', theoryHetFig: 'heterosis', theoryMatFig: 'nc2', theoryGenomicFig: 'hybridPrediction' };
    for (const id in figs) { const n = el(id); if (n) { const cap = n.querySelector('.cap'); n.innerHTML = Art[figs[id]](); if (cap) n.appendChild(cap); } }
    const b = el('brandLogo');
    if (b) b.innerHTML = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 5 C 13 11, 19 21, 25 27" stroke="var(--primary)" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      <path d="M25 5 C 19 11, 13 21, 7 27" stroke="var(--leaf)" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      <circle cx="16" cy="16" r="4.6" fill="var(--gold)" stroke="var(--card-bg)" stroke-width="1.6"/>
      <circle cx="7" cy="5" r="2.6" fill="var(--primary)"/><circle cx="25" cy="5" r="2.6" fill="var(--leaf)"/></svg>`;
  }

  /* ---------------- navigation ---------------- */
  function wire() {
    const nav = el('stepper');
    if (nav) nav.addEventListener('click', e => { const b = e.target.closest('.step-btn'); if (b && !b.disabled) goStep(b.dataset.step); });
    const brand = el('brand');
    if (brand) brand.addEventListener('click', e => { e.preventDefault(); goStep(1); });
    const scrollTo = id => { const n = el(id); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const on = (id, fn) => { const n = el(id); if (n) n.addEventListener('click', fn); };
    on('startBtn', () => {
      const b = document.querySelector('.step-btn[data-step="3"]');
      if (b && !b.disabled) goStep(3);
      else { const m = el('homeMessages'); if (m) { clearMessages(m); showMessage(m, 'info', L2('La carga de datos llega con el Bloque 3. Mientras tanto, prueba los laboratorios y la teoría de esta página.', 'Data import arrives with Block 3. Meanwhile, try the labs and the theory on this page.')); m.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
    });
    on('simBtn', () => scrollTo('labs'));
    on('theoryBtn', () => { scrollTo('theory'); const first = document.querySelector('#theory .acc'); if (first) first.open = true; });
    on('citeBtn', () => scrollTo('cite'));
    on('copyCite', () => {
      const t = el('citeText');
      if (!t || !navigator.clipboard) return;
      const txt = [...t.querySelectorAll('[data-l="' + I18N.lang + '"]')].map(n => n.textContent).join('') || t.textContent;
      navigator.clipboard.writeText(txt.trim()).then(() => {
        const b = el('copyCite'); if (b) { b.textContent = T('✓ Copiada', '✓ Copied'); setTimeout(() => I18N.apply(b.parentNode), 1800); }
      });
    });
    document.addEventListener('langchange', renderArt);
    document.addEventListener('themechange', renderArt);
  }

  function init() {
    renderStepper();
    renderArt();
    renderFeatures();
    renderMaterials();
    renderMethods();
    renderBring();
    renderCompare();
    renderRefs();
    wire();
    I18N.apply();
    if (window.initSuiteBar) initSuiteBar();   /* common bar of the LABG Suite, now that the block bar exists */
  }

  document.addEventListener('DOMContentLoaded', init);
  window.Home = { BLOCKS, METHODS, REFS, MATERIALS };
})();
