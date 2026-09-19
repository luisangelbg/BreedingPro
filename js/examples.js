/* BreedingPro — Block 3 examples: published datasets (with their source and
   licence) and two simulated trials whose true parameters are known.
   The published tables are in js/exdata.js, in long format; every example is
   read through the same importer as a user's file. */

const Examples = {};

const CITE = {
  remexca20: 'Pérez López DJ, Saavedra Guevara C, Rubí Arriaga M, Franco Martínez JRP, Gutiérrez Rodríguez F, González Huerta A (2020). Revista Mexicana de Ciencias Agrícolas 11(4): 829–840. doi:10.29312/remexca.v11i4.2249',
  hayman54: 'Hayman BI (1954). The analysis of variance of diallel tables. Biometrics 10: 235–244 (Table 5).',
  onofri: 'Onofri A, Terzaroli N, Russi L (2021). Theoretical and Applied Genetics 134: 585–601. doi:10.1007/s00122-020-03716-8',
  singh: 'Singh RK, Chaudhary BD (1979). Biometrical Methods in Quantitative Genetic Analysis. Kalyani Publishers, New Delhi.',
  griffing56: 'Griffing B (1956). Concept of general and specific combining ability in relation to diallel crossing systems. Australian Journal of Biological Sciences 9: 463–493.',
  lonnquist: 'Lonnquist JH, Gardner CO (1961). Heterosis in intervarietal crosses in maize and its implication in breeding procedures. Crop Science 1: 179–183.',
  ge66: 'Gardner CO, Eberhart SA (1966). Analysis and interpretation of the variety cross diallel and related populations. Biometrics 22: 439–452.',
  remexca22: 'Jasso-Bobadilla G, González-Huerta A, Pérez-López DJ, Franco-Martínez JRP, Rubí-Arriaga M, Mejía-Carranza J (2022). Revista Mexicana de Ciencias Agrícolas 13(1): 41–52. doi:10.29312/remexca.v13i1.3097',
  comstock48: 'Comstock RE, Robinson HF (1948). The components of genetic variance in populations of biparental progenies and their use in estimating the average degree of dominance. Biometrics 4: 254–266.',
  comstock52: 'Comstock RE, Robinson HF (1952). Estimation of average dominance of genes. In: Heterosis, Iowa State College Press, pp. 494–516.',
  kempthorne57: 'Kempthorne O (1957). An Introduction to Genetic Statistics. Wiley, New York.',
  kempthorne61: 'Kempthorne O, Curnow RN (1961). The partial diallel cross. Biometrics 17: 229–250.',
  patterson76: 'Patterson HD, Williams ER (1976). A new class of resolvable incomplete block designs. Biometrika 63: 83–92.',
  mather: 'Mather K, Jinks JL (1982). Biometrical Genetics, 3rd ed. Chapman and Hall, London.',
  gale77: 'Gale JS, Mather K, Jinks JL (1977). Joint scaling tests. Heredity 38: 47–51 (Table 1, set 1). doi:10.1038/hdy.1977.6',
  olivoto: 'Olivoto T. Maize hybrids evaluated for 15 ear and plant traits; data distributed with free software under the GNU General Public License v3 by its author.',
  olivotoOat: 'Olivoto T. Oat genotypes in 14 environments, grain yield and hectolitre mass; data distributed with free software under the GNU General Public License v3 by its author.',
  kang93: 'Kang MS (1993). Simultaneous selection for yield and stability in crop performance trials: consequences for growers. Agronomy Journal 85: 754–757; Kang MS, Magari R (1995). Agronomy Journal 87: 276–277. Example data distributed with free software under the GPL.',
  henderson76: 'Henderson CR (1976). A simple method for computing the inverse of a numerator relationship matrix used in prediction of breeding values. Biometrics 32: 69–83.',
  kearsey68: 'Kearsey MJ, Jinks JL (1968). A general method of detecting additive, dominance and epistatic variation for metrical traits. I. Theory. Heredity 23: 403–409.',
};
Examples.CITE = CITE;

const LIC = {
  ccbync: { es: 'Artículo de acceso abierto con licencia CC BY-NC 4.0: uso no comercial y con atribución.', en: 'Open-access article under a CC BY-NC 4.0 licence: non-commercial use with attribution.' },
  gpl: { es: 'Transcripción distribuida con licencia GPL en software libre; los datos provienen de la obra citada.', en: 'Transcription distributed under the GPL in free software; the data come from the work cited.' },
  ccby: { es: 'Datos de la obra citada; copia abierta con licencia CC BY 4.0.', en: 'Data from the work cited; open copy under a CC BY 4.0 licence.' },
  sim: { es: 'Datos simulados por BreedingPro con semilla fija; libres de derechos.', en: 'Data simulated by BreedingPro with a fixed seed; free of rights.' },
  stats: { es: 'Estadísticas publicadas en la obra citada (n, media y varianza de cada generación); los valores por planta los reconstruyó BreedingPro con esos momentos exactos.', en: 'Statistics published in the work cited (n, mean and variance of every generation); the values per plant were rebuilt by BreedingPro with those exact moments.' },
};

Examples.LIST = [
  {
    id: 'maize4', family: 'diallel', art: 'griffing1',
    title: { es: 'Maíz: dialelo completo 4 × 4', en: 'Maize: full 4 × 4 diallel' },
    sub: { es: 'Griffing 1 · bloques completos, 6 repeticiones · 96 parcelas · peso volumétrico del grano (g/L)', en: 'Griffing 1 · complete blocks, 6 replicates · 96 plots · grain test weight (g/L)' },
    cite: [CITE.remexca20], license: LIC.ccbync,
    note: { es: 'Los autores publican el análisis completo: repeticiones SC = 3365.677, error CM = 264.024, efectos de ACG −6.073, −13.823, 20.010 y −0.115.', en: 'The authors publish the full analysis: replicates SS = 3365.677, error MS = 264.024, GCA effects −6.073, −13.823, 20.010 and −0.115.' },
    expect: { field: 'rcbd', mating: 'griffing', method: 1, anova: { rep: 3365.67708, entry: 47825.48958, residual: 19801.82292 } },
  },
  {
    id: 'hayman54', family: 'diallel', art: 'haymanAnova',
    title: { es: 'Nicotiana rustica: dialelo 8 × 8 de Hayman', en: 'Nicotiana rustica: Hayman\'s 8 × 8 diallel' },
    sub: { es: 'Griffing 1 · 2 bloques · 128 parcelas · días a floración', en: 'Griffing 1 · 2 blocks · 128 plots · flowering time' },
    cite: [CITE.hayman54, CITE.onofri], license: LIC.ccby,
    note: { es: 'El ejemplo clásico del análisis de Hayman: bloques SC = 142, residual SC = 26 260 con 63 gl.', en: 'The classic example of Hayman\'s analysis: blocks SS = 142, residual SS = 26 260 with 63 df.' },
    expect: { field: 'rcbd', mating: 'griffing', method: 1, anova: { rep: 142, entry: 399067, residual: 26260 }, tol: 1 },
  },
  {
    id: 'singh8', family: 'diallel', art: 'griffing2',
    title: { es: 'Dialelo completo 8 × 8 (libro de texto)', en: 'Full 8 × 8 diallel (textbook)' },
    sub: { es: 'Griffing 1 (y sus subconjuntos 2, 3 y 4) · 4 repeticiones · 256 parcelas · rendimiento', en: 'Griffing 1 (and its subsets 2, 3 and 4) · 4 replicates · 256 plots · yield' },
    cite: [CITE.singh], license: LIC.gpl,
    note: { es: 'Dos transcripciones públicas difieren en dos celdas (progenitor 5, rep. 2: 52.48 o 52.49; cruza 1 × 7, rep. 4: 120.68 o 120.69); aquí se usa la segunda.', en: 'Two public transcriptions differ in two cells (parent 5, rep 2: 52.48 or 52.49; cross 1 × 7, rep 4: 120.68 or 120.69); the second is used here.' },
    expect: { field: 'rcbd', mating: 'griffing', method: 1 },
  },
  {
    id: 'dial2env', family: 'diallel', art: 'gardnerEberhart',
    title: { es: 'Dialelo con progenitores en dos ambientes', en: 'Diallel with parents in two environments' },
    sub: { es: 'Griffing 2 / Gardner–Eberhart II · 5 progenitores · 2 ambientes × 2 bloques · 60 parcelas', en: 'Griffing 2 / Gardner–Eberhart II · 5 parents · 2 environments × 2 blocks · 60 plots' },
    cite: [CITE.onofri], license: LIC.ccby,
    note: { es: 'Análisis combinado publicado: ambientes × bloques SC = 8.99, error SC = 13.24 con 28 gl.', en: 'Published combined analysis: environments × blocks SS = 8.99, error SS = 13.24 with 28 df.' },
    expect: { field: 'rcbd', mating: 'griffing', method: 2, multiEnv: true },
  },
  {
    id: 'griffing56', family: 'diallel', art: 'griffing4',
    title: { es: 'Maíz: medias de 36 cruzas simples', en: 'Maize: means of 36 single crosses' },
    sub: { es: 'Griffing 4 · 9 progenitores · medias por entrada, 3 variables', en: 'Griffing 4 · 9 parents · entry means, 3 traits' },
    cite: [CITE.griffing56], license: LIC.gpl,
    note: { es: 'Solo hay medias: el cuadrado medio del error del experimento original (21.05 con 2558 gl, escala de medias) se incluye para las pruebas F.', en: 'Only means are available: the error mean square of the original experiment (21.05 with 2558 df, means scale) is included for the F tests.' },
    external: { Yield: { ms: 21.05, df: 2558, scale: 'means', r: 1 } },
    expect: { field: 'means', mating: 'griffing', method: 4 },
  },
  {
    id: 'lonnquist61', family: 'diallel', art: 'heterosis',
    title: { es: 'Cruzas entre variedades de maíz', en: 'Maize intervarietal crosses' },
    sub: { es: 'Gardner–Eberhart II · 6 variedades y sus 15 cruzas · medias', en: 'Gardner–Eberhart II · 6 varieties and their 15 crosses · means' },
    cite: [CITE.lonnquist, CITE.ge66, CITE.onofri], license: LIC.ccby,
    note: { es: 'Medias ajustadas por bloques; error del experimento original: 7.10 con 60 gl.', en: 'Means adjusted for blocks; error of the original experiment: 7.10 with 60 df.' },
    external: { Yield: { ms: 7.10, df: 60, scale: 'means', r: 1 } },
    expect: { field: 'means', mating: 'griffing', method: 2 },
  },
  {
    id: 'partial8', family: 'partial', art: 'partialDiallel',
    title: { es: 'Maíz: dialelo parcial de 8 líneas', en: 'Maize: partial diallel of 8 lines' },
    sub: { es: 'Kempthorne–Curnow, s = 5 · 20 cruzas · 4 repeticiones · rendimiento (t/ha)', en: 'Kempthorne–Curnow, s = 5 · 20 crosses · 4 replicates · yield (t/ha)' },
    cite: [CITE.remexca22, CITE.kempthorne61], license: LIC.ccbync,
    note: { es: 'Los nombres de las cruzas vienen escritos como «1x3»: el importador los separa en hembra y macho.', en: 'Cross names are written as "1x3": the importer splits them into female and male.' },
    expect: { field: 'rcbd', mating: 'partial', s: 5, anova: { rep: 17.074, entry: 22.438, residual: 47.384 }, tol: 0.002 },
  },
  {
    id: 'nc1', family: 'nc', art: 'nc1',
    title: { es: 'Carolina del Norte I', en: 'North Carolina I' },
    sub: { es: '2 conjuntos × 3 machos × 2 hembras por macho · 2 repeticiones · 3 plantas por parcela', en: '2 sets × 3 males × 2 females per male · 2 replicates · 3 plants per plot' },
    cite: [CITE.singh, CITE.comstock48], license: LIC.gpl,
    note: { es: 'Las hembras repiten códigos entre machos (1 y 2): el diseño se declara como Carolina del Norte I para anidarlas.', en: 'Females repeat codes across males (1 and 2): the design is declared as North Carolina I to nest them.' },
    override: { mating: 'nc1' },
    expect: { field: 'rcbd', mating: 'nc1', plantLevel: true },
  },
  {
    id: 'nc2', family: 'nc', art: 'nc2',
    title: { es: 'Papa: Carolina del Norte II', en: 'Potato: North Carolina II' },
    sub: { es: '2 conjuntos × 5 machos × 5 hembras · 3 repeticiones · 150 parcelas · rendimiento', en: '2 sets × 5 males × 5 females · 3 replicates · 150 plots · yield' },
    cite: ['International Potato Center (CIP), locality Majes, Peru; data distributed with free software under the GPL.', CITE.comstock48], license: LIC.gpl,
    note: { es: 'Machos y hembras son plantas distintas aunque compartan códigos numéricos.', en: 'Males and females are different plants even when they share numeric codes.' },
    override: { mating: 'nc2' },
    expect: { field: 'rcbd', mating: 'nc2', anova: { rep: 144345 + 847836, residual: 1783762 }, tol: 1 },
  },
  {
    id: 'nc3', family: 'nc', art: 'nc3',
    title: { es: 'Carolina del Norte III', en: 'North Carolina III' },
    sub: { es: '4 conjuntos × 4 plantas F₂ × probadores P₁ y P₂ · 2 repeticiones', en: '4 sets × 4 F₂ plants × testers P₁ and P₂ · 2 replicates' },
    cite: [CITE.singh, CITE.comstock52], license: LIC.gpl,
    roles: { F2: 'female', Tester: 'male' },
    override: { mating: 'nc3' },
    expect: { field: 'rcbd', mating: 'nc3' },
  },
  {
    id: 'simTTC', family: 'nc', art: 'ttc', simulated: true,
    title: { es: 'Simulado: cruza triple de prueba', en: 'Simulated: triple test cross' },
    sub: { es: '30 plantas F₂ × P₁, P₂ y F₁ · 3 repeticiones · 270 parcelas · peso (g)', en: '30 F₂ plants × P₁, P₂ and F₁ · 3 replicates · 270 plots · weight (g)' },
    cite: [CITE.kearsey68], license: LIC.sim,
    note: { es: 'Ocho loci independientes con a = 1.2 y d = 1.0, sin epistasis: D = 11.52, H = 8, σ²A = 5.76, σ²D = 2, √(H/D) = 0.833 y error de parcela 4.', en: 'Eight independent loci with a = 1.2 and d = 1.0, without epistasis: D = 11.52, H = 8, σ²A = 5.76, σ²D = 2, √(H/D) = 0.833 and a plot error of 4.' },
    roles: { F2: 'female', Tester: 'male' },
    override: { mating: 'ttc' },
    expect: { field: 'rcbd', mating: 'ttc' },
  },
  {
    id: 'lxt', family: 'lxt', art: 'lineTester',
    title: { es: 'Línea × probador con progenitores', en: 'Line × tester with parents' },
    sub: { es: '5 líneas × 3 probadores + 8 progenitores · 4 repeticiones · 92 parcelas', en: '5 lines × 3 testers + 8 parents · 4 replicates · 92 plots' },
    cite: [CITE.singh, CITE.kempthorne57], license: LIC.gpl,
    expect: { field: 'rcbd', mating: 'lxt', anova: { rep: 83.00012, entry: 32552.93739, residual: 6010.29798 }, tol: 0.001 },
  },
  {
    id: 'maize13', family: 'traits', art: 'selIndex',
    title: { es: 'Maíz: 13 híbridos y 15 variables', en: 'Maize: 13 hybrids and 15 traits' },
    sub: { es: 'Ensayo de genotipos · bloques completos, 3 repeticiones · 39 parcelas', en: 'Genotype trial · complete blocks, 3 replicates · 39 plots' },
    cite: [CITE.olivoto], license: LIC.gpl,
    note: { es: 'Variables: PH altura de planta, EH altura de mazorca, EP posición de la mazorca, EL y ED largo y diámetro de mazorca, CL, CD y CW largo, diámetro y peso del olote, KW peso de grano por mazorca, NR hileras, NKR granos por hilera, CDED razón olote/mazorca, PERK porcentaje de grano, TKW peso de mil granos, NKE granos por mazorca.', en: 'Traits: PH plant height, EH ear height, EP ear position, EL and ED ear length and diameter, CL, CD and CW cob length, diameter and weight, KW kernel weight per ear, NR rows, NKR kernels per row, CDED cob/ear diameter ratio, PERK percentage of kernels, TKW thousand-kernel weight, NKE kernels per ear.' },
    expect: { field: 'rcbd', mating: 'none' },
  },
  {
    id: 'maize13env', family: 'met', art: 'selection',
    title: { es: 'Maíz: 13 híbridos en 4 ambientes', en: 'Maize: 13 hybrids in 4 environments' },
    sub: { es: 'Ensayo multiambiente · bloques completos, 3 repeticiones · 156 parcelas · 15 variables', en: 'Multi-environment trial · complete blocks, 3 replicates · 156 plots · 15 traits' },
    cite: [CITE.olivoto], license: LIC.gpl,
    note: { es: 'Las mismas 15 variables de mazorca y planta en cuatro ambientes: sirve para la heredabilidad con interacción genotipo × ambiente, las correlaciones, el análisis de sendas y los índices de selección.', en: 'The same 15 ear and plant traits in four environments: useful for heritability with genotype × environment interaction, correlations, path analysis and selection indices.' },
    expect: { field: 'rcbd', mating: 'none', multiEnv: true },
  },
  {
    id: 'oat14', family: 'met', art: 'stability',
    title: { es: 'Avena: 10 genotipos en 14 ambientes', en: 'Oat: 10 genotypes in 14 environments' },
    sub: { es: 'Ensayo multiambiente · bloques completos, 3 repeticiones · 420 parcelas · rendimiento (GY) y peso hectolítrico (HM)', en: 'Multi-environment trial · complete blocks, 3 replicates · 420 plots · grain yield (GY) and hectolitre mass (HM)' },
    cite: [CITE.olivotoOat], license: LIC.gpl,
    note: { es: 'Catorce ambientes permiten las regresiones de estabilidad con 12 grados de libertad por genotipo, AMMI y el biplot GGE.', en: 'Fourteen environments allow the stability regressions with 12 degrees of freedom per genotype, AMMI and the GGE biplot.' },
    expect: { field: 'rcbd', mating: 'none', multiEnv: true },
  },
  {
    id: 'plrv28', family: 'met', art: 'ammi',
    title: { es: 'Papa: 28 clones en 6 localidades', en: 'Potato: 28 clones in 6 localities' },
    sub: { es: 'Población PLRV · bloques completos, 3 repeticiones · 504 parcelas · rendimiento (t/ha)', en: 'PLRV population · complete blocks, 3 replicates · 504 plots · yield (t/ha)' },
    cite: ['International Potato Center (CIP), Lima, Peru: clones of the PLRV population in Ayacucho, Huancayo, La Molina and San Ramón (2002–2003); data distributed with free software under the GPL.'], license: LIC.gpl,
    note: { es: 'El ejemplo clásico de AMMI: cinco ejes con 13368.6, 6427.6, 2241.9, 1027.6 y 696.1 de suma de cuadrados.', en: 'The classic AMMI example: five axes with sums of squares 13368.6, 6427.6, 2241.9, 1027.6 and 696.1.' },
    expect: { field: 'rcbd', mating: 'none', multiEnv: true },
  },
  {
    id: 'stb17', family: 'met', art: 'reactionNorms',
    title: { es: 'Medias de 17 genotipos en 12 ambientes', en: 'Means of 17 genotypes in 12 environments' },
    sub: { es: 'Solo medias · 4 repeticiones · error combinado 1.8 con 576 gl · rendimiento', en: 'Means only · 4 replicates · pooled error 1.8 with 576 df · yield' },
    cite: [CITE.kang93], license: LIC.gpl,
    note: { es: 'Tabla de medias con que se ilustra la estadística de rendimiento y estabilidad de Kang (1993); el cuadrado medio del error combinado (1.8, escala de parcela, r = 4) va incluido para las pruebas.', en: 'The table of means used to illustrate Kang\'s (1993) yield–stability statistic; the pooled error mean square (1.8, plot scale, r = 4) is included for the tests.' },
    external: { Rendimiento: { ms: 1.8, df: 576, scale: 'plot', r: 4 } },
    expect: { field: 'means', mating: 'none', multiEnv: true },
  },
  {
    id: 'simLines', family: 'met', art: 'pedigree', simulated: true,
    title: { es: 'Simulado: líneas endogámicas con pedigrí', en: 'Simulated: inbred lines with a pedigree' },
    sub: { es: '8 progenitores + 60 líneas F₆ de 12 cruzas · 3 localidades × 2 repeticiones · 408 parcelas', en: '8 parents + 60 F₆ lines from 12 crosses · 3 locations × 2 replicates · 408 plots' },
    cite: [CITE.henderson76], license: LIC.sim,
    note: { es: 'Valores verdaderos conocidos: aditivo σ²a = 0.3 con el parentesco del pedigrí, no aditivo 0.1, G × A 0.1 y error 0.4 (t/ha). El pedigrí (progenitores y generaciones de autofecundación) se usa en el Bloque 10 para el BLUP de las líneas.', en: 'Known true values: additive σ²a = 0.3 with the pedigree relationships, non-additive 0.1, G × E 0.1 and error 0.4 (t/ha). The pedigree (parents and generations of selfing) is used in Block 10 for the BLUP of the lines.' },
    expect: { field: 'rcbd', mating: 'none', multiEnv: true },
  },
  {
    id: 'simAlpha', family: 'met', art: 'fieldPlan', simulated: true,
    title: { es: 'Simulado: dialelo en látice α, 3 localidades', en: 'Simulated: diallel in an α-lattice, 3 locations' },
    sub: { es: 'Griffing 2 · 10 progenitores + 5 testigos · k = 6, 2 repeticiones · 360 parcelas · 2 variables', en: 'Griffing 2 · 10 parents + 5 checks · k = 6, 2 replicates · 360 plots · 2 traits' },
    cite: [CITE.patterson76], license: LIC.sim,
    note: { es: 'Libreta generada en el Bloque 2 y llenada con un modelo conocido: σ²ACG = 0.16, σ²ACE = 0.09, σ²bloques = 0.20, σ²e = 0.36 (t/ha). En la muestra sorteada, los 10 efectos de ACG tienen varianza 0.052 y las 45 ACE, 0.069. Las cruzas promedian 7.5 t/ha y los progenitores endogámicos 4.2: en los métodos con progenitores esa heterosis se suma a la ACE.', en: 'Field book generated in Block 2 and filled from a known model: σ²GCA = 0.16, σ²SCA = 0.09, σ²blocks = 0.20, σ²e = 0.36 (t/ha). In the sample drawn, the 10 GCA effects have variance 0.052 and the 45 SCA effects 0.069. Crosses average 7.5 t/ha and the inbred parents 4.2: in the methods with parents that heterosis adds to SCA.' },
    expect: { field: 'alpha', mating: 'griffing', method: 2, multiEnv: true },
  },
  {
    id: 'gale77', family: 'generations', art: 'generationMeans',
    title: { es: 'Nicotiana rustica: seis generaciones', en: 'Nicotiana rustica: six generations' },
    sub: { es: 'P₁, P₂, F₁, F₂, RC₁, RC₂ · 160 plantas · altura final', en: 'P₁, P₂, F₁, F₂, BC₁, BC₂ · 160 plants · final height' },
    cite: [CITE.gale77], license: LIC.stats,
    note: { es: 'El artículo publica n, media y varianza de cada generación; los valores de cada planta se reconstruyeron con esa media y esa varianza exactas, que es todo lo que usan estos análisis. Prueba conjunta publicada: χ² = 9.4378 con 3 gl; m = 11.0036 ± 0.1914, [d] = 3.6349 ± 0.1924, [h] = 0.5937 ± 0.2813.', en: 'The paper publishes n, mean and variance of every generation; the value of every plant was rebuilt with that exact mean and variance, which is all these analyses use. Published joint scaling test: χ² = 9.4378 with 3 df; m = 11.0036 ± 0.1914, [d] = 3.6349 ± 0.1924, [h] = 0.5937 ± 0.2813.' },
    expect: { field: 'crd', mating: 'generations' },
  },
  {
    id: 'simGen', family: 'generations', art: 'generationMeans', simulated: true,
    title: { es: 'Simulado: medias generacionales por planta', en: 'Simulated: generation means, plant by plant' },
    sub: { es: 'P₁, P₂, F₁, F₂, RC₁, RC₂ y un testigo · 3 bloques · 360 plantas · altura (cm)', en: 'P₁, P₂, F₁, F₂, BC₁, BC₂ and a check · 3 blocks · 360 plants · height (cm)' },
    cite: [CITE.mather], license: LIC.sim,
    note: { es: 'Modelo verdadero: m = 50, [d] = 8, [h] = 6, [i] = 3, [j] = 0, [l] = −2; D = 10, H = 6, F = 2, E = 4. El testigo, una variedad uniforme, tiene media 51: la F₁ (media 54) lo supera en 3.', en: 'True model: m = 50, [d] = 8, [h] = 6, [i] = 3, [j] = 0, [l] = −2; D = 10, H = 6, F = 2, E = 4. The check, a uniform variety, has mean 51: the F₁ (mean 54) beats it by 3.' },
    expect: { field: 'rcbd', mating: 'generations', plantLevel: true },
  },
];

/* ---------------- simulations ---------------- */
Examples.simAlpha = () => {
  const r = rng(20260917);
  const parents = Array.from({ length: 10 }, (_, i) => 'P' + (i + 1));
  const checks = ['Testigo A', 'Testigo B', 'Testigo C', 'Testigo D', 'Testigo E'];
  const plan = Mating.build({ design: 'griffing', method: 2, parents, checks, F: 1 });
  const field = Field.generate(plan.entries, { design: 'alpha', reps: 2, k: 6, blocks: 6, locations: ['Chapultepec', 'Valle Verde', 'Los Altos'], seed: 4242, plotsPerRow: 0, arrangement: 'stacked', numbering: 'serpentine' });
  const book = Field.book(plan, field, { lang: 'es', traits: ['Rendimiento', 'DiasFlor'], typeName: e => P2.typeName(e) });
  const truth = { sigma2gca: 0.16, sigma2sca: 0.09, sigma2block: 0.2, sigma2e: 0.36, muCross: 7.5, muParent: 4.2, checks: [7.0, 7.8, 6.5, 8.2, 7.2], env: [0, -1.0, 0.8] };
  const g = parents.map(() => Math.sqrt(truth.sigma2gca) * randn(r));
  const gd = parents.map(() => 1.5 * randn(r));
  const sca = new Map(), scad = new Map();
  plan.entries.forEach(e => { if (e.type === 'F1') { sca.set(e.code, Math.sqrt(truth.sigma2sca) * randn(r)); scad.set(e.code, 0.8 * randn(r)); } });
  const inbred = parents.map((_, i) => 1.2 * g[i] + 0.3 * randn(r));
  truth.gca = Object.fromEntries(parents.map((p, i) => [p, g[i]]));
  truth.sca = Object.fromEntries(sca);
  const locEff = field.locations.map((_, l) => ({ ge: parents.map(() => 0.17 * randn(r)), rep: [0, 1].map(() => 0.3 * randn(r)), blocks: new Map() }));
  const ix = new Map(parents.map((p, i) => [p, i]));
  book.rows.forEach(row => {
    const l = field.locations.findIndex(L => L.name === row[0]);
    const E = locEff[l];
    const rep = row[2], block = row[3], type = plan.entries.find(e => e.code === row[7]);
    const bk = rep + '|' + block;
    if (!E.blocks.has(bk)) E.blocks.set(bk, Math.sqrt(truth.sigma2block) * randn(r));
    let y, d;
    if (type.type === 'check') { const c = checks.indexOf(type.code); y = truth.checks[c]; d = 72 + 2 * c; }
    else if (type.type === 'parent') { const i = ix.get(type.female); y = truth.muParent + inbred[i] + E.ge[i]; d = 80 + gd[i] * 1.3; }
    else { const i = ix.get(type.female), j = ix.get(type.male); y = truth.muCross + g[i] + g[j] + sca.get(type.code) + E.ge[i] + E.ge[j] + 0.17 * randn(r); d = 74 + gd[i] + gd[j] + scad.get(type.code); }
    y += truth.env[l] + E.rep[rep - 1] + E.blocks.get(bk) + Math.sqrt(truth.sigma2e) * randn(r);
    d += [0, 3, -2][l] + 0.6 * E.blocks.get(bk) + 1.4 * randn(r);
    row[11] = +y.toFixed(2); row[12] = Math.round(d);
  });
  return { rows: [[book.meta], book.header].concat(book.rows), truth };
};

Examples.simGen = () => {
  const r = rng(1977);
  const t = { m: 50, d: 8, h: 6, i: 3, j: 0, l: -2, D: 10, H: 6, F: 2, E: 4 };
  const mean = { P1: t.m + t.d + t.i, P2: t.m - t.d + t.i, F1: t.m + t.h + t.l, F2: t.m + t.h / 2 + t.l / 4, BC1: t.m + t.d / 2 + t.h / 2 + t.i / 4 + t.j / 4 + t.l / 4, BC2: t.m - t.d / 2 + t.h / 2 + t.i / 4 - t.j / 4 + t.l / 4 };
  const gvar = { P1: 0, P2: 0, F1: 0, F2: t.D / 2 + t.H / 4, BC1: t.D / 4 + t.H / 4 - t.F / 2, BC2: t.D / 4 + t.H / 4 + t.F / 2 };
  const plants = { P1: 10, P2: 10, F1: 10, F2: 40, BC1: 20, BC2: 20 };
  const rows = [['Bloque', 'Generacion', 'Planta', 'Altura']];
  const blockEff = [];
  for (let b = 1; b <= 3; b++) {
    const be = 1.2 * randn(r);
    blockEff.push(be);
    Object.keys(mean).forEach(gname => {
      const pe = 0.6 * randn(r);
      for (let k = 1; k <= plants[gname]; k++) {
        const y = mean[gname] + be + pe + Math.sqrt(gvar[gname]) * randn(r) + Math.sqrt(t.E) * randn(r);
        rows.push([b, gname, k, +y.toFixed(1)]);
      }
    });
  }
  /* a check (a commercial variety, uniform) with a plot of 10 plants in every block, drawn
     with its own random stream so the generations stay exactly as they were */
  const r2 = rng(1978);
  t.check = 51;
  for (let b = 1; b <= 3; b++) {
    const pe = 0.6 * randn(r2);
    for (let k = 1; k <= 10; k++) rows.push([b, 'Testigo', k, +(t.check + blockEff[b - 1] + pe + Math.sqrt(t.E) * randn(r2)).toFixed(1)]);
  }
  return { rows, truth: t };
};

/* A triple test cross with known parameters: every F₂ plant is crossed to P₁, to P₂ and to
   their F₁. Eight independent loci with equal effects a and d and no epistasis, so
   L₁ + L₂ − 2L₃ is exactly zero in the genetic values and the test has nothing to find. */
Examples.simTTC = () => {
  const r = rng(2026);
  const k = 8, a = 1.2, d = 1.0;                       /* Mather's notation, per locus */
  const t = { loci: k, a, d, D: k * a * a, H: k * d * d, sigma2A: k * a * a / 2, sigma2D: k * d * d / 4, E: 4, mu: 60, plants: 30, reps: 3 };
  t.dominance = Math.sqrt(t.H / t.D);
  t.Fcomp = k * a * d;                                 /* F = Σ a·d over the loci */
  const rows = [['Rep', 'F2', 'Tester', 'Peso']];
  const blockEff = [];
  for (let b = 1; b <= t.reps; b++) blockEff.push(1.5 * randn(r));
  const plants = [];
  for (let i = 1; i <= t.plants; i++) {
    /* the genotype of the F₂ plant: ¼ A₁A₁, ½ A₁A₂, ¼ A₂A₂ at every locus */
    let L1 = 0, L2 = 0;
    for (let l = 0; l < k; l++) {
      const u = r();
      const g = u < 0.25 ? 1 : u < 0.75 ? 0 : -1;      /* 1 = A₁A₁, 0 = A₁A₂, −1 = A₂A₂ */
      if (g === 1) { L1 += a; L2 += d; }
      else if (g === 0) { L1 += (a + d) / 2; L2 += (d - a) / 2; }
      else { L1 += d; L2 += -a; }
    }
    plants.push({ i, L1, L2, L3: (L1 + L2) / 2 });     /* no epistasis: L₃ is the mean of L₁ and L₂ */
  }
  for (let b = 1; b <= t.reps; b++) {
    plants.forEach(p => {
      [['P1', p.L1], ['P2', p.L2], ['F1', p.L3]].forEach(([tester, value]) => {
        const y = t.mu + value + blockEff[b - 1] + Math.sqrt(t.E) * randn(r);
        rows.push([b, 'F2-' + p.i, tester, +y.toFixed(2)]);
      });
    });
  }
  return { rows, truth: t };
};

/* Gale, Mather & Jinks (1977), Table 1, set 1: Nicotiana rustica final height. The paper
   publishes the number of plants, the mean and the variance of every generation, which is all
   the joint scaling test uses; the individual values are rebuilt from a fixed standard pattern
   rescaled to that exact mean and variance, so every analysis gives the published numbers. */
Examples.gale77 = () => {
  const r = rng(1977);
  const table = [['P1', 10, 13.955, 1.6686], ['P2', 10, 7.575, 0.6596], ['F1', 20, 11.570, 0.5630], ['F2', 40, 11.501, 2.1184], ['BC1', 40, 13.603, 3.0806], ['BC2', 40, 9.219, 1.2957]];
  const rows = [['Generacion', 'Planta', 'Altura']];
  table.forEach(([g, n, mean, s2]) => {
    const z = Array.from({ length: n }, () => randn(r));
    const mz = z.reduce((s, v) => s + v, 0) / n;
    const vz = z.reduce((s, v) => s + (v - mz) * (v - mz), 0) / (n - 1);
    const k = Math.sqrt(s2 / vz);
    z.forEach((v, i) => rows.push([g, i + 1, mean + k * (v - mz)]));
  });
  return { rows, truth: { table, chi2: 9.4378, df: 3 } };
};

/* Inbred lines with a pedigree: 8 unrelated inbred founders, 12 biparental crosses and 5 lines per
   cross derived by 5 generations of selfing (F₆), all 68 evaluated in 3 locations with 2 replicates.
   True values: additive Aσ²a (σ²a = 0.3, so the founders vary with 2σ²a), a non-additive part
   σ²i = 0.1, G × E 0.1 and plot error 0.4 (t/ha). The pedigree is used in Block 10. */
Examples.simLines = () => {
  const r = rng(20260918);
  const t = { sigma2a: 0.3, sigma2i: 0.1, sigma2ge: 0.1, sigma2e: 0.4, selfing: 5, env: { Norte: 6.0, Centro: 7.5, Sur: 5.0 } };
  const Fline = 1 - Math.pow(0.5, t.selfing);
  const founders = Array.from({ length: 8 }, (_, i) => 'P' + (i + 1));
  const a = new Map(founders.map(p => [p, Math.sqrt(2 * t.sigma2a) * randn(r)]));
  const pairs = [[1, 2], [1, 3], [2, 4], [3, 4], [5, 6], [5, 7], [6, 8], [7, 8], [1, 5], [2, 6], [3, 7], [4, 8]];
  const ped = [['Genotipo', 'Progenitor1', 'Progenitor2', 'Autofecundaciones', 'F0']];
  founders.forEach(p => ped.push([p, '', '', 0, 1]));
  let k = 0;
  pairs.forEach(([s, d]) => {
    for (let j = 0; j < 5; j++) {
      const id = 'L' + String(++k).padStart(2, '0');
      /* Mendelian sampling of a line from two unrelated inbred parents: b = F_line */
      a.set(id, 0.5 * (a.get('P' + s) + a.get('P' + d)) + Math.sqrt(Fline * t.sigma2a) * randn(r));
      ped.push([id, 'P' + s, 'P' + d, t.selfing, '']);
    }
  });
  const entries = [...a.keys()];
  const nonAdd = new Map(entries.map(e => [e, Math.sqrt(t.sigma2i) * randn(r)]));
  const rows = [['Localidad', 'Rep', 'Genotipo', 'Rendimiento']];
  Object.entries(t.env).forEach(([loc, mu]) => {
    const rep = [0, 0.3 * randn(r)];
    const ge = new Map(entries.map(e => [e, Math.sqrt(t.sigma2ge) * randn(r)]));
    [1, 2].forEach(q => entries.forEach(e => {
      const y = mu + rep[q - 1] + a.get(e) + nonAdd.get(e) + ge.get(e) + Math.sqrt(t.sigma2e) * randn(r);
      rows.push([loc, q, e, +y.toFixed(3)]);
    }));
  });
  t.a = Object.fromEntries(a);
  t.nonAdd = Object.fromEntries(nonAdd);
  return { rows, truth: t, pedigree: ped };
};

/* A sheep flock (animal-model data): 20 sires and 150 dams as founders, three years of lambs
   (one or two per ewe), sires and dams of each year drawn at random from the lambs of the year
   before. Weaning weight = 30 + 2 (males) + year + a + e with σ²a = 30 and σ²e = 70 (h² = 0.3);
   breeding values follow the pedigree exactly: aᵢ = ½(a_s + a_d) + mᵢ, Var(mᵢ) = bᵢσ²a. */
Examples.simFlock = () => {
  const r = rng(314159);
  const t = { sigma2a: 30, sigma2e: 70, mu: 30, male: 2, year: { 2021: 0, 2022: -1.5, 2023: 1.0 } };
  let sires = Array.from({ length: 20 }, (_, i) => 'S' + (i + 1));
  let dams = Array.from({ length: 150 }, (_, i) => 'D' + (i + 1));
  const pedRows = sires.concat(dams).map(id => ({ id, sire: null, dam: null }));
  const lambs = [];
  let serial = 0;
  Object.keys(t.year).forEach(yr => {
    const born = [];
    dams.forEach((d, j) => {
      const s = sires[j % sires.length];
      const n = r() < 0.4 ? 2 : 1;
      for (let q = 0; q < n; q++) {
        const id = 'A' + String(++serial).padStart(4, '0');
        const sex = r() < 0.5 ? 'M' : 'H';
        pedRows.push({ id, sire: s, dam: d });
        born.push({ id, sire: s, dam: d, sex, year: yr });
      }
    });
    lambs.push(...born);
    const males = shuffle(born.filter(x => x.sex === 'M').map(x => x.id), r), females = shuffle(born.filter(x => x.sex === 'H').map(x => x.id), r);
    sires = males.slice(0, 20);
    dams = females.slice(0, Math.min(150, females.length));
  });
  const P = PED.build(pedRows).ped;
  const a = new Float64Array(P.n);
  for (let k = 0; k < P.n; k++) {
    const s = P.sire[k], d = P.dam[k];
    a[k] = 0.5 * ((s >= 0 ? a[s] : 0) + (d >= 0 ? a[d] : 0)) + Math.sqrt(P.b[k] * t.sigma2a) * randn(r);
  }
  const rows = [['Animal', 'Padre', 'Madre', 'Sexo', 'Año', 'Peso']];
  lambs.forEach(x => {
    const y = t.mu + (x.sex === 'M' ? t.male : 0) + t.year[x.year] + a[P.index.get(x.id)] + Math.sqrt(t.sigma2e) * randn(r);
    rows.push([x.id, x.sire, x.dam, x.sex, x.year, +y.toFixed(2)]);
  });
  t.a = Object.fromEntries(P.ids.map((id, k) => [id, a[k]]));
  return { rows, truth: t };
};

/* rows (header first) of an example */
Examples.rows = id => {
  if (id === 'simLines') return Examples.simLines();
  if (id === 'gale77') return Examples.gale77();
  if (id === 'simTTC') return Examples.simTTC();
  if (id === 'simAlpha') return Examples.simAlpha();
  if (id === 'simGen') return Examples.simGen();
  const text = window.EXDATA && window.EXDATA[id];
  if (!text) return null;
  return { rows: Data.parseDelimited(text) };
};
Examples.get = id => Examples.LIST.find(x => x.id === id);

window.Examples = Examples;
