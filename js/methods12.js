/* BreedingPro — Block 12: the methods section, drafted from the settings actually used in every
   block, with the original reference of every procedure. Each block contributes one paragraph;
   every citation it makes is collected, and only those enter the reference list. */

(function () {
  const MT = { last: null };
  window.MT = MT;

  /* ---------- references: surnames, year, full reference ---------- */
  const R = (a, y, full) => ({ a, y, full });
  MT.REF = {
    griffing56a: R(['Griffing'], '1956a', 'Griffing B (1956a). A generalised treatment of the use of diallel crosses in quantitative inheritance. Heredity 10: 31–50.'),
    griffing56b: R(['Griffing'], '1956b', 'Griffing B (1956b). Concept of general and specific combining ability in relation to diallel crossing systems. Australian Journal of Biological Sciences 9: 463–493.'),
    sprague42: R(['Sprague', 'Tatum'], '1942', 'Sprague GF, Tatum LA (1942). General vs. specific combining ability in single crosses of corn. Journal of the American Society of Agronomy 34: 923–932.'),
    hayman54a: R(['Hayman'], '1954a', 'Hayman BI (1954a). The analysis of variance of diallel tables. Biometrics 10: 235–244.'),
    hayman54b: R(['Hayman'], '1954b', 'Hayman BI (1954b). The theory and analysis of diallel crosses. Genetics 39: 789–809.'),
    jinks54: R(['Jinks'], '1954', 'Jinks JL (1954). The analysis of continuous variation in a diallel cross of Nicotiana rustica varieties. Genetics 39: 767–788.'),
    morley65: R(['Morley Jones'], '1965', 'Morley Jones R (1965). Analysis of variance of the half diallel table. Heredity 20: 117–121.'),
    walters77: R(['Walters', 'Gale'], '1977', 'Walters DE, Gale JS (1977). A note on the Hayman analysis of variance for a full diallel table. Heredity 38: 401–407.'),
    ge66: R(['Gardner', 'Eberhart'], '1966', 'Gardner CO, Eberhart SA (1966). Analysis and interpretation of the variety cross diallel and related populations. Biometrics 22: 439–452.'),
    cockerham63: R(['Cockerham'], '1963', 'Cockerham CC (1963). Estimation of genetic variances. In: Hanson WD, Robinson HF (eds.) Statistical Genetics and Plant Breeding. NAS-NRC Publ. 982, Washington, pp. 53–94.'),
    baker78: R(['Baker'], '1978', 'Baker RJ (1978). Issues in diallel analysis. Crop Science 18: 533–536.'),
    wright85: R(['Wright'], '1985', 'Wright AJ (1985). Diallel designs, analyses, and reference populations. Heredity 54: 307–311.'),
    singh73: R(['Singh'], '1973', 'Singh D (1973). Diallel analysis for combining ability over several environments. II. Indian Journal of Genetics and Plant Breeding 33: 469–481.'),
    kempthorne61: R(['Kempthorne', 'Curnow'], '1961', 'Kempthorne O, Curnow RN (1961). The partial diallel cross. Biometrics 17: 229–250.'),
    comstock48: R(['Comstock', 'Robinson'], '1948', 'Comstock RE, Robinson HF (1948). The components of genetic variance in populations of biparental progenies and their use in estimating the average degree of dominance. Biometrics 4: 254–266.'),
    comstock52: R(['Comstock', 'Robinson'], '1952', 'Comstock RE, Robinson HF (1952). Estimation of average dominance of genes. In: Gowen JW (ed.) Heterosis. Iowa State College Press, Ames, pp. 494–516.'),
    kempthorne57: R(['Kempthorne'], '1957', 'Kempthorne O (1957). An Introduction to Genetic Statistics. John Wiley & Sons, New York.'),
    kearsey68: R(['Kearsey', 'Jinks'], '1968', 'Kearsey MJ, Jinks JL (1968). A general method of detecting additive, dominance and epistatic variation for metrical traits. I. Theory. Heredity 23: 403–409.'),
    kearsey96: R(['Kearsey', 'Pooni'], '1996', 'Kearsey MJ, Pooni HS (1996). The Genetical Analysis of Quantitative Traits. Chapman & Hall, London.'),
    hallauer10: R(['Hallauer', 'Carena', 'Miranda Filho'], '2010', 'Hallauer AR, Carena MJ, Miranda Filho JB (2010). Quantitative Genetics in Maize Breeding, 3rd ed. Springer, New York.'),
    mather49: R(['Mather'], '1949', 'Mather K (1949). Biometrical Genetics: The Study of Continuous Variation. Methuen, London.'),
    cavalli52: R(['Cavalli'], '1952', 'Cavalli LL (1952). An analysis of linkage in quantitative inheritance. In: Reeve ECR, Waddington CH (eds.) Quantitative Inheritance. HMSO, London, pp. 135–144.'),
    warner52: R(['Warner'], '1952', 'Warner JN (1952). A method for estimating heritability. Agronomy Journal 44: 427–430.'),
    hayman58: R(['Hayman'], '1958', 'Hayman BI (1958). The separation of epistatic from additive and dominance variation in generation means. Heredity 12: 371–390.'),
    jinks58: R(['Jinks', 'Jones'], '1958', 'Jinks JL, Jones RM (1958). Estimation of the components of heterosis. Genetics 43: 223–234.'),
    gale77: R(['Gale', 'Mather', 'Jinks'], '1977', 'Gale JS, Mather K, Jinks JL (1977). Joint scaling tests. Heredity 38: 47–51.'),
    mather82: R(['Mather', 'Jinks'], '1982', 'Mather K, Jinks JL (1982). Biometrical Genetics, 3rd ed. Chapman & Hall, London.'),
    lande81: R(['Lande'], '1981', 'Lande R (1981). The minimum number of genes contributing to quantitative variation between and within populations. Genetics 99: 541–553.'),
    cockerham86: R(['Cockerham'], '1986', 'Cockerham CC (1986). Modifications in estimating the number of genes for a quantitative character. Genetics 114: 659–664.'),
    smith36: R(['Smith'], '1936', 'Smith HF (1936). A discriminant function for plant selection. Annals of Eugenics 7: 240–250.'),
    hazel43: R(['Hazel'], '1943', 'Hazel LN (1943). The genetic basis for constructing selection indexes. Genetics 28: 476–490.'),
    burton53: R(['Burton', 'DeVane'], '1953', 'Burton GW, DeVane EH (1953). Estimating heritability in tall fescue from replicated clonal material. Agronomy Journal 45: 478–481.'),
    johnson55: R(['Johnson', 'Robinson', 'Comstock'], '1955', 'Johnson HW, Robinson HF, Comstock RE (1955). Estimates of genetic and environmental variability in soybeans. Agronomy Journal 47: 314–318.'),
    kempthorne59: R(['Kempthorne', 'Nordskog'], '1959', 'Kempthorne O, Nordskog AW (1959). Restricted selection indices. Biometrics 15: 10–19.'),
    dewey59: R(['Dewey', 'Lu'], '1959', 'Dewey DR, Lu KH (1959). A correlation and path-coefficient analysis of components of crested wheatgrass seed production. Agronomy Journal 51: 515–518.'),
    elston63: R(['Elston'], '1963', 'Elston RC (1963). A weight-free index for the purpose of ranking or selection with respect to several traits at a time. Biometrics 19: 85–97.'),
    pesek69: R(['Pesek', 'Baker'], '1969', 'Pesek J, Baker RJ (1969). Desired improvement in relation to selection indices. Canadian Journal of Plant Science 49: 803–804.'),
    sprague77: R(['Sprague', 'Eberhart'], '1977', 'Sprague GF, Eberhart SA (1977). Corn breeding. In: Sprague GF (ed.) Corn and Corn Improvement, 2nd ed. American Society of Agronomy, Madison, pp. 305–362.'),
    mulamba78: R(['Mulamba', 'Mock'], '1978', 'Mulamba NN, Mock JJ (1978). Improvement of yield potential of the Eto Blanco maize population by breeding for plant traits. Egyptian Journal of Genetics and Cytology 7: 40–51.'),
    knapp85: R(['Knapp', 'Stroup', 'Ross'], '1985', 'Knapp SJ, Stroup WW, Ross WM (1985). Exact confidence intervals for heritability on a progeny mean basis. Crop Science 25: 192–194.'),
    fehr87: R(['Fehr'], '1987', 'Fehr WR (1987). Principles of Cultivar Development, vol. 1. Macmillan, New York.'),
    holland03: R(['Holland', 'Nyquist', 'Cervantes-Martínez'], '2003', 'Holland JB, Nyquist WE, Cervantes-Martínez CT (2003). Estimating and interpreting heritability for plant breeding: an update. Plant Breeding Reviews 22: 9–112.'),
    ceron18: R(['Cerón-Rojas', 'Crossa'], '2018', 'Cerón-Rojas JJ, Crossa J (2018). Linear Selection Indices in Modern Plant Breeding. Springer, Cham.'),
    bulmer71: R(['Bulmer'], '1971', 'Bulmer MG (1971). The effect of selection on genetic variability. The American Naturalist 105: 201–211.'),
    burrows72: R(['Burrows'], '1972', 'Burrows PM (1972). Expected selection differentials for directional selection. Biometrics 28: 1091–1100.'),
    schaeffer: R(['Schaeffer'], '2019', 'Schaeffer LR (2019). Animal Models. University of Guelph, Guelph.'),
    tukey49: R(['Tukey'], '1949', 'Tukey JW (1949). One degree of freedom for non-additivity. Biometrics 5: 232–242.'),
    patterson76: R(['Patterson', 'Williams'], '1976', 'Patterson HD, Williams ER (1976). A new class of resolvable incomplete block designs. Biometrika 63: 83–92.'),
    patterson71: R(['Patterson', 'Thompson'], '1971', 'Patterson HD, Thompson R (1971). Recovery of inter-block information when block sizes are unequal. Biometrika 58: 545–554.'),
    gilmour95: R(['Gilmour', 'Thompson', 'Cullis'], '1995', 'Gilmour AR, Thompson R, Cullis BR (1995). Average information REML: an efficient algorithm for variance parameter estimation in linear mixed models. Biometrics 51: 1440–1450.'),
    federer56: R(['Federer'], '1956', 'Federer WT (1956). Augmented (or hoonuiaku) designs. Hawaiian Planters’ Record 55: 191–208.'),
    cook82: R(['Cook', 'Weisberg'], '1982', 'Cook RD, Weisberg S (1982). Residuals and Influence in Regression. Chapman & Hall, New York.'),
    cullis06: R(['Cullis', 'Smith', 'Coombes'], '2006', 'Cullis BR, Smith AB, Coombes NE (2006). On the design of early generation variety trials with correlated data. Journal of Agricultural, Biological and Environmental Statistics 11: 381–393.'),
    mohring09: R(['Möhring', 'Piepho'], '2009', 'Möhring J, Piepho HP (2009). Comparison of weighting in two-stage analysis of plant breeding trials. Crop Science 49: 1977–1988.'),
    bartlett37: R(['Bartlett'], '1937', 'Bartlett MS (1937). Properties of sufficiency and statistical tests. Proceedings of the Royal Society of London A 160: 268–282.'),
    steel97: R(['Steel', 'Torrie', 'Dickey'], '1997', 'Steel RGD, Torrie JH, Dickey DA (1997). Principles and Procedures of Statistics: A Biometrical Approach, 3rd ed. McGraw-Hill, New York.'),
    finlay63: R(['Finlay', 'Wilkinson'], '1963', 'Finlay KW, Wilkinson GN (1963). The analysis of adaptation in a plant-breeding programme. Australian Journal of Agricultural Research 14: 742–754.'),
    wricke62: R(['Wricke'], '1962', 'Wricke G (1962). Über eine Methode zur Erfassung der ökologischen Streubreite in Feldversuchen. Zeitschrift für Pflanzenzüchtung 47: 92–96.'),
    eberhart66: R(['Eberhart', 'Russell'], '1966', 'Eberhart SA, Russell WA (1966). Stability parameters for comparing varieties. Crop Science 6: 36–40.'),
    gollob68: R(['Gollob'], '1968', 'Gollob HF (1968). A statistical model which combines features of factor analytic and analysis of variance techniques. Psychometrika 33: 73–115.'),
    perkins68: R(['Perkins', 'Jinks'], '1968', 'Perkins JM, Jinks JL (1968). Environmental and genotype-environmental components of variability. III. Multiple lines and crosses. Heredity 23: 339–356.'),
    shukla72: R(['Shukla'], '1972', 'Shukla GK (1972). Some statistical aspects of partitioning genotype-environmental components of variability. Heredity 29: 237–245.'),
    huehn79: R(['Huehn'], '1979', 'Huehn M (1979). Beiträge zur Erfassung der phänotypischen Stabilität. EDV in Medizin und Biologie 10: 112–117.'),
    nassar87: R(['Nassar', 'Huehn'], '1987', 'Nassar R, Huehn M (1987). Studies on estimation of phenotypic stability: tests of significance for nonparametric measures of phenotypic stability. Biometrics 43: 45–53.'),
    gauch88: R(['Gauch'], '1988', 'Gauch HG (1988). Model selection and validation for yield trials with interaction. Biometrics 44: 705–715.'),
    lin88: R(['Lin', 'Binns'], '1988', 'Lin CS, Binns MR (1988). A superiority measure of cultivar performance for cultivar × location data. Canadian Journal of Plant Science 68: 193–198.'),
    gauch90: R(['Gauch', 'Zobel'], '1990', 'Gauch HG, Zobel RW (1990). Imputing missing yield trial data. Theoretical and Applied Genetics 79: 753–761.'),
    annicchiarico92: R(['Annicchiarico'], '1992', 'Annicchiarico P (1992). Cultivar adaptation and recommendation from alfalfa trials in Northern Italy. Journal of Genetics and Breeding 46: 269–278.'),
    cornelius92: R(['Cornelius', 'Seyedsadr', 'Crossa'], '1992', 'Cornelius PL, Seyedsadr M, Crossa J (1992). Using the shifted multiplicative model to search for “separability” in crop cultivar trials. Theoretical and Applied Genetics 84: 161–172.'),
    kang93: R(['Kang'], '1993', 'Kang MS (1993). Simultaneous selection for yield and stability in crop performance trials: consequences for growers. Agronomy Journal 85: 754–757.'),
    purchase00: R(['Purchase', 'Hatting', 'van Deventer'], '2000', 'Purchase JL, Hatting H, van Deventer CS (2000). Genotype × environment interaction of winter wheat in South Africa: II. Stability analysis of yield performance. South African Journal of Plant and Soil 17: 101–107.'),
    yan00: R(['Yan', 'Hunt', 'Sheng', 'Szlavnics'], '2000', 'Yan W, Hunt LA, Sheng Q, Szlavnics Z (2000). Cultivar evaluation and mega-environment investigation based on the GGE biplot. Crop Science 40: 597–605.'),
    yan06: R(['Yan', 'Tinker'], '2006', 'Yan W, Tinker NA (2006). Biplot analysis of multi-environment trial data: principles and applications. Canadian Journal of Plant Science 86: 623–645.'),
    farshadfar08: R(['Farshadfar'], '2008', 'Farshadfar E (2008). Incorporation of AMMI stability value and grain yield in a single non-parametric index (GSI) in bread wheat. Pakistan Journal of Biological Sciences 11: 1791–1796.'),
    olivoto19: R(['Olivoto', 'Lúcio', 'da Silva', 'Marchioro', 'de Souza', 'Jost'], '2019', 'Olivoto T, Lúcio AD, da Silva JAG, Marchioro VS, de Souza VQ, Jost E (2019). Mean performance and stability in multi-environment trials I: combining features of AMMI and BLUP techniques. Agronomy Journal 111: 2949–2960.'),
    smith05: R(['Smith', 'Cullis', 'Thompson'], '2005', 'Smith AB, Cullis BR, Thompson R (2005). The analysis of crop cultivar breeding and evaluation trials: an overview of current mixed model approaches. Journal of Agricultural Science 143: 449–462.'),
    henderson75: R(['Henderson'], '1975', 'Henderson CR (1975). Best linear unbiased estimation and prediction under a selection model. Biometrics 31: 423–447.'),
    henderson76: R(['Henderson'], '1976', 'Henderson CR (1976). A simple method for computing the inverse of a numerator relationship matrix used in prediction of breeding values. Biometrics 32: 69–83.'),
    quaas76: R(['Quaas'], '1976', 'Quaas RL (1976). Computing the diagonal elements and inverse of a large numerator relationship matrix. Biometrics 32: 949–953.'),
    meuwissen92: R(['Meuwissen', 'Luo'], '1992', 'Meuwissen THE, Luo Z (1992). Computing inbreeding coefficients in large populations. Genetics Selection Evolution 24: 305–313.'),
    willham63: R(['Willham'], '1963', 'Willham RL (1963). The covariance between relatives for characters composed of components contributed by related individuals. Biometrics 19: 18–27.'),
    self87: R(['Self', 'Liang'], '1987', 'Self SG, Liang KY (1987). Asymptotic properties of maximum likelihood estimators and likelihood ratio tests under nonstandard conditions. Journal of the American Statistical Association 82: 605–610.'),
    dickerson69: R(['Dickerson'], '1969', 'Dickerson GE (1969). Experimental approaches in utilising breed resources. Animal Breeding Abstracts 37: 191–202.'),
    dickerson73: R(['Dickerson'], '1973', 'Dickerson GE (1973). Inbreeding and heterosis in animals. In: Proceedings of the Animal Breeding and Genetics Symposium in Honor of Dr. J. L. Lush. American Society of Animal Science, Champaign, pp. 54–77.'),
    kinghorn80: R(['Kinghorn'], '1980', 'Kinghorn B (1980). The expression of “recombination loss” in quantitative traits. Zeitschrift für Tierzüchtung und Züchtungsbiologie 97: 138–143.'),
    eisen83: R(['Eisen', 'Hörstgen-Schwark', 'Saxton', 'Bandy'], '1983', 'Eisen EJ, Hörstgen-Schwark G, Saxton AM, Bandy TR (1983). Genetic interpretation and analysis of diallel crosses with animals. Theoretical and Applied Genetics 65: 17–23.'),
    oakey06: R(['Oakey', 'Verbyla', 'Pitchford', 'Cullis', 'Kuchel'], '2006', 'Oakey H, Verbyla A, Pitchford W, Cullis B, Kuchel H (2006). Joint modeling of additive and non-additive genetic line effects in single field trials. Theoretical and Applied Genetics 113: 809–819.'),
    mrode14: R(['Mrode'], '2014', 'Mrode RA (2014). Linear Models for the Prediction of Animal Breeding Values, 3rd ed. CABI, Wallingford.'),
    jenkins34: R(['Jenkins'], '1934', 'Jenkins MT (1934). Methods of estimating the performance of double crosses in corn. Journal of the American Society of Agronomy 26: 199–204.'),
    bernardo94: R(['Bernardo'], '1994', 'Bernardo R (1994). Prediction of maize single-cross performance using RFLPs and information from related hybrids. Crop Science 34: 20–25.'),
    meuwissen01: R(['Meuwissen', 'Hayes', 'Goddard'], '2001', 'Meuwissen THE, Hayes BJ, Goddard ME (2001). Prediction of total genetic value using genome-wide dense marker maps. Genetics 157: 1819–1829.'),
    habier07: R(['Habier', 'Fernando', 'Dekkers'], '2007', 'Habier D, Fernando RL, Dekkers JCM (2007). The impact of genetic relationship information on genome-assisted breeding values. Genetics 177: 2389–2397.'),
    vanraden08: R(['VanRaden'], '2008', 'VanRaden PM (2008). Efficient methods to compute genomic predictions. Journal of Dairy Science 91: 4414–4423.'),
    aguilar10: R(['Aguilar', 'Misztal', 'Johnson', 'Legarra', 'Tsuruta', 'Lawlor'], '2010', 'Aguilar I, Misztal I, Johnson DL, Legarra A, Tsuruta S, Lawlor TJ (2010). A unified approach to utilize phenotypic, full pedigree, and genomic information for genetic evaluation of Holstein final score. Journal of Dairy Science 93: 743–752.'),
    heffner10: R(['Heffner', 'Lorenz', 'Jannink', 'Sorrells'], '2010', 'Heffner EL, Lorenz AJ, Jannink JL, Sorrells ME (2010). Plant breeding with genomic selection: gain per unit time and cost. Crop Science 50: 1681–1690.'),
    burgueno12: R(['Burgueño', 'de los Campos', 'Weigel', 'Crossa'], '2012', 'Burgueño J, de los Campos G, Weigel K, Crossa J (2012). Genomic prediction of breeding values when modeling genotype × environment interaction using pedigree and dense molecular markers. Crop Science 52: 707–719.'),
    technow12: R(['Technow', 'Riedelsheimer', 'Schrag', 'Melchinger'], '2012', 'Technow F, Riedelsheimer C, Schrag TA, Melchinger AE (2012). Genomic prediction of hybrid performance in maize with models incorporating dominance and population specific marker effects. Theoretical and Applied Genetics 125: 1181–1194.'),
    technow14: R(['Technow', 'Schrag', 'Schipprack', 'Bauer', 'Simianer', 'Melchinger'], '2014', 'Technow F, Schrag TA, Schipprack W, Bauer E, Simianer H, Melchinger AE (2014). Genome properties and prospects of genomic prediction of hybrid performance in a breeding program of maize. Genetics 197: 1343–1355.'),
    legarra16: R(['Legarra'], '2016', 'Legarra A (2016). Comparing estimates of genetic variance across different relationship models. Theoretical Population Biology 107: 26–30.'),
    feldmann22: R(['Feldmann', 'Piepho', 'Knapp'], '2022', 'Feldmann MJ, Piepho HP, Knapp SJ (2022). Average semivariance directly yields accurate estimates of the genomic variance in complex trait analyses. G3 Genes|Genomes|Genetics 12: jkac080.'),
    crossa10: R(['Crossa', 'de los Campos', 'Pérez', 'Gianola', 'Burgueño', 'Araus', 'Makumbi', 'Singh', 'Dreisigacker', 'Yan', 'Arief', 'Bänziger', 'Braun'], '2010', 'Crossa J, de los Campos G, Pérez P, Gianola D, Burgueño J, Araus JL, Makumbi D, Singh RP, Dreisigacker S, Yan J, Arief V, Bänziger M, Braun HJ (2010). Prediction of genetic values of quantitative traits in plant breeding using pedigree and molecular markers. Genetics 186: 713–724.'),
  };

  /* narrative "Griffing (1956a)" and parenthetical "(Griffing 1956a; …)", in the language of the app */
  let cited = new Set();
  const names = r => (r.a.length === 1 ? r.a[0] : r.a.length === 2 ? `${r.a[0]} ${T('y', '&')} ${r.a[1]}` : `${r.a[0]} et al.`);
  const ref = k => { const r = MT.REF[k]; if (!r) throw new Error('reference ' + k); cited.add(k); return r; };
  MT.c = k => { const r = ref(k); return `${names(r)} (${r.y})`; };
  /* English possessive: "Tukey's (1949)", "Cornelius et al.'s (1992)" */
  MT.cp = k => { const r = ref(k); return `${names(r)}'s (${r.y})`; };
  MT.p = (...ks) => `(${ks.map(k => { const r = ref(k); return `${names(r)} ${r.y}`; }).join('; ')})`;
  MT.cite = (...ks) => ks.map(k => { const r = ref(k); return `${names(r)} ${r.y}`; }).join('; ');

  MT.REF.williams62 = R(['Williams'], '1962', 'Williams JS (1962). The evaluation of a selection index. Biometrics 18: 375–393.');

  /* ---------- helpers ---------- */
  const n0 = v => fmtNum(v, 0), n3 = v => fmtNum(v, 3);
  const list = arr => { arr = arr.filter(Boolean); if (arr.length < 2) return arr.join(''); return arr.slice(0, -1).join(', ') + ` ${T('y', 'and')} ` + arr[arr.length - 1]; };
  const P = s => `<p>${s}</p>`;
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const shown = id => RP.shownCard ? RP.shownCard(id) : true;
  const MATING = {
    griffing: { es: 'dialelo', en: 'diallel' }, partial: { es: 'dialelo parcial', en: 'partial diallel' },
    nc1: { es: 'diseño Carolina del Norte I', en: 'North Carolina Design I' }, nc2: { es: 'diseño Carolina del Norte II', en: 'North Carolina Design II' },
    nc3: { es: 'diseño Carolina del Norte III', en: 'North Carolina Design III' }, ttc: { es: 'cruza triple de prueba', en: 'triple test cross' },
    lxt: { es: 'diseño línea × probador', en: 'line × tester design' }, generations: { es: 'conjunto de medias generacionales', en: 'set of generation means' },
    none: { es: 'ensayo de genotipos', en: 'genotype trial' },
  };
  const fieldName = k => T({
    crd: { es: 'un diseño completamente al azar', en: 'a completely randomised design' }, rcbd: { es: 'bloques completos al azar', en: 'randomised complete blocks' },
    alpha: { es: 'un látice α', en: 'an α-lattice' }, ibd: { es: 'bloques incompletos', en: 'incomplete blocks' }, augmented: { es: 'bloques aumentados', en: 'augmented blocks' },
    rowcol: { es: 'un diseño de filas y columnas', en: 'a row–column design' }, means: { es: 'medias por entrada', en: 'entry means' }, unreplicated: { es: 'parcelas sin repetición', en: 'unreplicated plots' },
  }[k] || { es: k, en: k });

  /* ---------- the data ---------- */
  MT.dataParagraph = () => {
    const D = state.data;
    if (!D || !D.ds) return '';
    const m = D.mating, f = D.field, ds = D.ds;
    const envs = f.envs || [];
    const reps = [...new Set(envs.map(E => (E.reps ? E.reps.length : 0)))].filter(x => x > 0);
    const designs = [...new Set(envs.map(E => E.design))].map(fieldName);
    const nEnt = m.entries ? m.entries.length : 0;
    let parents = '';
    if (m.design === 'partial') parents = T(` de ${m.p} progenitores`, ` of ${m.p} parents`);
    else if (m.design === 'griffing') parents =T(` de ${m.p} progenitores (método ${m.method} de Griffing)`, ` of ${m.p} parents (Griffing's Method ${m.method})`);
    else if (m.design === 'lxt') parents = T(` de ${m.lines.length} líneas y ${m.testers.length} probadores`, ` of ${m.lines.length} lines and ${m.testers.length} testers`);
    else if (['nc1', 'nc2'].includes(m.design)) parents = T(` con ${m.males.length} machos y ${m.females.length} hembras`, ` with ${m.males.length} males and ${m.females.length} females`);
    else if (m.design === 'generations') parents = T(` (${m.generations.join(', ')})`, ` (${m.generations.join(', ')})`);
    const nTraits = D.traits.length;
    return P(T(
      `Los datos comprendieron ${n0(ds.records.length)} registros de ${nTraits === 1 ? 'una variable' : nTraits + ' variables'} (${esc(D.traits.join(', '))}) en ${nEnt} entradas${m.checks && m.checks.length ? (m.checks.length === 1 ? ' (una de ellas, testigo)' : ` (${m.checks.length} de ellas, testigos)`) : ''} de un ${T(MATING[m.design] || MATING.none)}${parents}, evaluadas en ${envs.length === 1 ? 'un ambiente' : envs.length + ' ambientes'} bajo ${list(designs)}${reps.some(x => x > 1) ? ` con ${list(reps.map(String))} repeticiones` : ''}${f.plantLevel ? '; los datos se tomaron por planta' : ''}${D.excluded && D.excluded.size ? `; ${pl(D.excluded.size, 'parcela se excluyó', 'parcelas se excluyeron')} del análisis como valores atípicos o por decisión del usuario` : ''}. El diseño de apareamiento y el de campo se reconocieron a partir de las columnas de la tabla${window.B3 && B3.declared ? ' y de la declaración contenida en el archivo' : ''}.`,
      `The data comprised ${n0(ds.records.length)} records of ${nTraits === 1 ? 'one trait' : nTraits + ' traits'} (${esc(D.traits.join(', '))}) on ${nEnt} entries${m.checks && m.checks.length ? (m.checks.length === 1 ? ' (one of them a check)' : ` (${m.checks.length} of them checks)`) : ''} of a ${T(MATING[m.design] || MATING.none)}${parents}, evaluated in ${envs.length === 1 ? 'one environment' : envs.length + ' environments'} under ${list(designs)}${reps.some(x => x > 1) ? ` with ${list(reps.map(String))} replicates` : ''}${f.plantLevel ? '; data were recorded per plant' : ''}${D.excluded && D.excluded.size ? `; ${pl(D.excluded.size, 'plot was excluded', 'plots were excluded')} from the analysis as outliers or by the user` : ''}. The mating and field designs were recognised from the columns of the table${window.B3 && B3.declared ? ' and from the declaration contained in the file' : ''}.`));
  };

  /* ---------- the paragraphs ---------- */
  MT.blocks = {};           // n → () => html paragraph(s) of that block, or '' when there is nothing to say

  /* Block 2 · planning */
  MT.blocks[2] = () => {
    const plan = B2.plan;
    if (!plan) return '';
    const c = plan.cfg;
    const nPar = c.parents ? c.parents.length : c.lines ? c.lines.length + c.testers.length : c.design === 'nc1' ? c.m * c.sets * (1 + c.f) : c.design === 'nc2' ? c.sets * (c.m + c.f) : c.design === 'generations' ? 2 : 2 + (c.n || 0);
    /* only the reference of the design actually planned is cited */
    const refKey = { griffing: 'griffing56b', partial: 'kempthorne61', nc1: 'comstock48', nc2: 'comstock48', nc3: 'comstock52', ttc: 'kearsey68', lxt: 'kempthorne57', generations: 'mather82' }[plan.design];
    const which = refKey ? MT.p(refKey) : '';
    const out = [];
    out.push(T(
      `Se planeó un ${T(MATING[plan.design] || MATING.none)}${plan.design === 'griffing' ? ` según el método ${c.method} de Griffing` : ''} ${which} con ${nPar} progenitores, ${plan.crosses.length} cruzas y ${plan.entries.length} entradas${c.checks && c.checks.length ? ` (incluidos ${c.checks.length} testigos)` : ''}; se calcularon las polinizaciones, las plantas por progenitor y la semilla necesarias${B2.seasons ? `, y un calendario de ${pl(B2.seasons.length, 'ciclo', 'ciclos')}` : ''}.`,
      `A ${T(MATING[plan.design] || MATING.none)}${plan.design === 'griffing' ? ` following Griffing's Method ${c.method}` : ''} ${which} was planned with ${nPar} parents, ${plan.crosses.length} crosses and ${plan.entries.length} entries${c.checks && c.checks.length ? ` (including ${c.checks.length} checks)` : ''}; the pollinations, plants per parent and seed required were computed${B2.seasons ? `, together with a calendar of ${pl(B2.seasons.length, 'season', 'seasons')}` : ''}.`));
    const F = B2.field;
    if (F && F.locations && shown('b2Field')) {
      const o = F.options;
      const dz = { rcbd: T('bloques completos al azar', 'randomised complete blocks'), alpha: T('látice α', 'an α-lattice'), crd: T('un diseño completamente al azar', 'a completely randomised design'), augmented: T('bloques aumentados con testigos repetidos', 'augmented blocks with repeated checks') }[F.design] || F.design;
      const ref = F.design === 'alpha' ? ' ' + MT.p('patterson76') : F.design === 'augmented' ? ' ' + MT.p('federer56') : '';
      out.push(T(
        `El ensayo se aleatorizó en ${dz}${ref}${F.design === 'augmented' ? ` (${o.blocks} bloques)` : ` con ${o.reps} repeticiones`}${F.design === 'alpha' && o.k ? ` y bloques de ${o.k} parcelas` : ''} en ${pl(F.locations.length, 'localidad', 'localidades')}, ${n0(F.plotsPerLocation)} parcelas por localidad y ${n0(F.errorDf)} grados de libertad del error; semilla del generador aleatorio ${o.seed}.`,
        `The trial was randomised in ${dz}${ref}${F.design === 'augmented' ? ` (${o.blocks} blocks)` : ` with ${o.reps} replicates`}${F.design === 'alpha' && o.k ? ` and blocks of ${o.k} plots` : ''} at ${pl(F.locations.length, 'location', 'locations')}, ${n0(F.plotsPerLocation)} plots per location and ${n0(F.errorDf)} error degrees of freedom; random seed ${o.seed}.`));
    }
    if (shown('b2Power') && el('b2Alpha')) {
      out.push(T(
        `La potencia de las pruebas F se calculó con la distribución F no central, para α = ${el('b2Alpha').value} y una potencia deseada de ${el('b2TargetPower').value}, a partir de los coeficientes de variación supuestos (CV = ${el('b2CV').value} %).`,
        `The power of the F tests was computed from the non-central F distribution, for α = ${el('b2Alpha').value} and a target power of ${el('b2TargetPower').value}, from the assumed coefficients of variation (CV = ${el('b2CV').value} %).`));
    }
    return out.map(P).join('');
  };

  /* Block 3 · field analysis */
  MT.blocks[3] = () => {
    const D = state.data;
    if (!D) return '';
    const res = [];
    D.traits.forEach((_, i) => { const r = D.results && D.results.get(i); if (r) res.push(r); });
    /* the trait on screen in Block 3 is the one its card shows */
    if (!res.length && D.analysis) { try { const r = D.analysis(window.B3 ? B3.trait : 0); if (r) res.push(r); } catch (e) { /* no analysis for these data */ } }
    const envs = res.flatMap(r => r.envs || []).filter(e => e && !e.error);
    const designs = new Set(envs.map(e => e.design));
    const out = [];
    const parts = [];
    if (designs.has('rcbd')) parts.push(T(`los bloques completos al azar con el modelo y = μ + repetición + entrada + e y la prueba de no aditividad de un grado de libertad de ${MT.c('tukey49')}`, `randomised complete blocks with the model y = μ + replicate + entry + e and ${MT.cp('tukey49')} one-degree-of-freedom test for non-additivity`));
    if (designs.has('alpha') || designs.has('ibd')) parts.push(T(`los bloques incompletos ${MT.p('patterson76')} con análisis de varianza intrabloque y medias estimadas con bloques aleatorios por máxima verosimilitud restringida (REML; ${MT.cite('patterson71')}), con iteraciones de información promedio ${MT.p('gilmour95')}`, `incomplete blocks ${MT.p('patterson76')} with an intra-block analysis of variance and means estimated with random blocks by restricted maximum likelihood (REML; ${MT.cite('patterson71')}), with average-information iterations ${MT.p('gilmour95')}`));
    if (designs.has('augmented')) parts.push(T(`los bloques aumentados con bloques fijos estimados a partir de los testigos repetidos ${MT.p('federer56')}`, `augmented blocks with fixed blocks estimated from the repeated checks ${MT.p('federer56')}`));
    if (designs.has('rowcol')) parts.push(T('filas y columnas dentro de repeticiones como efectos aleatorios (REML)', 'rows and columns within replicates as random effects (REML)'));
    if (designs.has('crd')) parts.push(T('el diseño completamente al azar con el modelo y = μ + entrada + e', 'the completely randomised design with the model y = μ + entry + e'));
    if (!parts.length) return '';
    out.push(T(`Cada variable se analizó por ambiente según su diseño de campo: ${list(parts)}.`, `Every trait was analysed per environment according to its field design: ${list(parts)}.`));
    const plant = envs.some(e => e.within);
    if (plant) out.push(T(`Las parcelas con datos por planta se resumieron con su media y el error de muestreo entre plantas se estimó aparte ${MT.p('steel97')}.`, `Plots with plant-level data were summarised by their mean and the sampling error between plants was estimated separately ${MT.p('steel97')}.`));
    out.push(T(`Los valores atípicos se buscaron con residuales estudentizados externamente y corrección de Bonferroni ${MT.p('cook82')}.`, `Outliers were searched with externally studentised residuals and a Bonferroni correction ${MT.p('cook82')}.`));
    if (envs.some(e => e.h2)) out.push(T(`La heredabilidad del ensayo se estimó con entradas aleatorias por REML, como H² = σ²g/(σ²g + σ²e/r) y como la H² generalizada de ${MT.c('cullis06')}.`, `Trial heritability was estimated with random entries by REML, as H² = σ²g/(σ²g + σ²e/r) and as the generalised H² of ${MT.c('cullis06')}.`));
    const comb = res.map(r => r.combined).filter(Boolean);
    if (comb.length) {
      const two = comb.some(c => c.twoStage);
      out.push(T(`Los ambientes se combinaron ${two ? `en dos etapas, con las medias ajustadas de cada ambiente y el error combinado ${MT.p('mohring09')}` : 'en un solo modelo con ambientes, repeticiones dentro de ambientes, entradas y su interacción'}; la homogeneidad de los errores se probó con la prueba de ${MT.c('bartlett37')}.`,
        `Environments were combined ${two ? `in two stages, with the adjusted means of each environment and the pooled error ${MT.p('mohring09')}` : 'in one model with environments, replicates within environments, entries and their interaction'}; homogeneity of the errors was tested with ${MT.cp('bartlett37')} test.`));
    }
    return P(out.join(' '));
  };

  /* Block 4 · Griffing */
  MT.blocks[4] = () => {
    const r = B4.res;
    if (!r || !r.main) return '';
    const mt = r.method, e = r.e || 1, g = r.main.genetic || {};
    const out = [];
    const content = { 1: T('progenitores, cruzas F₁ y recíprocas', 'parents, F₁ crosses and reciprocals'), 2: T('progenitores y cruzas F₁ sin recíprocas', 'parents and F₁ crosses without reciprocals'), 3: T('cruzas F₁ y recíprocas sin progenitores', 'F₁ crosses and reciprocals without parents'), 4: T('solo cruzas F₁', 'F₁ crosses only') }[mt];
    out.push(T(
      `La aptitud combinatoria general (ACG) y específica (ACE; ${MT.cite('sprague42')}) de los ${r.p} progenitores se estimó con el método ${mt} de ${MT.c('griffing56b')} (${content}), modelo ${B4.model} (${B4.model === 'I' ? 'progenitores fijos' : 'progenitores aleatorios'}), por mínimos cuadrados ponderados por el número de parcelas de cada entrada con las restricciones de Griffing; con datos completos y balanceados el procedimiento coincide con sus fórmulas cerradas${r.complete === false || r.balanced === false ? ', y con cruzas faltantes o repeticiones desiguales ajusta los errores estándar' : ''}.`,
      `General (GCA) and specific combining ability (SCA; ${MT.cite('sprague42')}) of the ${r.p} parents were estimated with ${MT.c('griffing56b')} Method ${mt} (${content}), Model ${B4.model} (${B4.model === 'I' ? 'fixed parents' : 'random parents'}), by least squares weighted by the number of plots of each entry under Griffing's restrictions; with complete balanced data the procedure agrees with his closed forms${r.complete === false || r.balanced === false ? ', and with missing crosses or unequal replication it adjusts the standard errors' : ''}.`));
    if (mt === 1 || mt === 3) out.push(T(`Los efectos recíprocos se dividieron en maternos y no maternos ${MT.p('cockerham63')}${B4.recip === 'average' ? '' : ''}.`, `Reciprocal effects were split into maternal and non-maternal parts ${MT.p('cockerham63')}.`));
    else if (B4.recip === 'average') out.push(T('Cuando existían las dos orientaciones de una cruza se promediaron.', 'When both orientations of a cross were present they were averaged.'));
    if (e > 1) out.push(T(`Los ${e} ambientes se analizaron en dos etapas (medias ajustadas de cada ambiente y error combinado), con ambientes ${B4.envMode === 'random' ? 'aleatorios: cada efecto se probó contra su interacción con el ambiente y la ACG del modelo II con una F aproximada con grados de libertad de Satterthwaite ' + MT.p('singh73') : 'fijos'}.`,
      `The ${e} environments were analysed in two stages (adjusted means of each environment and pooled error), with ${B4.envMode === 'random' ? 'random environments: every effect was tested against its interaction with the environment and Model II GCA with a quasi-F with Satterthwaite degrees of freedom ' + MT.p('singh73') : 'fixed environments'}.`));
    out.push(T(
      `Los componentes de varianza se obtuvieron de los cuadrados medios esperados y se tradujeron a σ²A = 4σ²ACG/(1 + F) y σ²D = 4σ²ACE/(1 + F)² con F = ${n3(B4.F)} ${MT.p('wright85')}; se calculó la razón de ${MT.c('baker78')}. Las pruebas usaron α = ${B4.alpha}.`,
      `Variance components were obtained from the expected mean squares and translated into σ²A = 4σ²GCA/(1 + F) and σ²D = 4σ²SCA/(1 + F)² with F = ${n3(B4.F)} ${MT.p('wright85')}; ${MT.cp('baker78')} ratio was computed. Tests used α = ${B4.alpha}.`));
    if (shown('b4Compare') && B4.compare) out.push(T('Como comprobación, los cuatro métodos de Griffing se ajustaron sobre los mismos datos.', 'As a check, the four Griffing methods were fitted to the same data.'));
    return P(out.join(' '));
  };

  /* Block 5 · Hayman–Jinks and Gardner–Eberhart */
  MT.blocks[5] = () => {
    const r = B5.res;
    if (!r || !r.anova) return '';
    const out = [];
    out.push(r.half
      ? T(`La tabla dialélica media de ${r.p} progenitores se analizó con la partición de varianza de ${MT.c('morley65')}`, `The half diallel table of ${r.p} parents was analysed with the analysis of variance of ${MT.c('morley65')}`)
      : T(`La tabla dialélica completa de ${r.p} progenitores se analizó con la partición de ${MT.c('hayman54a')} en los ítems a, b₁, b₂, b₃, c y d, más el ítem génico de ${MT.c('walters77')}`, `The full diallel table of ${r.p} parents was analysed with ${MT.cp('hayman54a')} partition into items a, b₁, b₂, b₃, c and d, plus the genic item of ${MT.c('walters77')}`));
    out[0] += T(`, con pruebas contra ${B5.error === 'blocks' ? 'la interacción de cada ítem con los bloques' : 'el error experimental combinado'}.`, `, testing against ${B5.error === 'blocks' ? 'the interaction of every item with blocks' : 'the pooled experimental error'}.`);
    if (r.components) out.push(T(
      `Los componentes genéticos D, H₁, H₂, F, h² y E y la regresión de Wr sobre Vr siguieron a ${MT.c('hayman54b')} y ${MT.c('jinks54')}, con las correcciones ${B5.corr === 'classic' ? 'clásicas para recíprocas promediadas' : 'deducidas para cruzas únicas'}; se derivaron el grado medio de dominancia √(H₁/D), la proporción de alelos (H₂/4H₁) y la de dominantes y recesivos, y el orden de dominancia de los progenitores ${MT.p('mather82')}.`,
      `The genetic components D, H₁, H₂, F, h² and E and the regression of Wr on Vr followed ${MT.c('hayman54b')} and ${MT.c('jinks54')}, with ${B5.corr === 'classic' ? 'the classical corrections for averaged reciprocals' : 'the corrections derived for single crosses'}; the mean degree of dominance √(H₁/D), the allele ratio (H₂/4H₁), the dominant-to-recessive ratio and the dominance order of the parents were derived ${MT.p('mather82')}.`));
    if (r.ge2 || r.ge3) out.push(T(`Los efectos de variedad, heterosis media, heterosis de variedad y heterosis específica se estimaron con los análisis II y III de ${MT.c('ge66')} por mínimos cuadrados restringidos, y la heterosis de cada cruza respecto a la media de los progenitores y al mejor progenitor con su error estándar exacto.`,
      `Variety effects, average heterosis, variety heterosis and specific heterosis were estimated with ${MT.c('ge66')} Analyses II and III by restricted least squares, and the heterosis of every cross relative to the mid-parent and the better parent with its exact standard error.`));
    if (shown('b5Equiv')) out.push(T('Las identidades entre las metodologías de Griffing, Hayman y Gardner–Eberhart se verificaron con los propios datos.', 'The identities between the Griffing, Hayman and Gardner–Eberhart methodologies were verified on the data themselves.'));
    return P(out.join(' '));
  };

  /* Block 6 · mating designs */
  MT.blocks[6] = () => {
    const r = B6.res;
    if (!r || !r.rows) return '';
    const d = r.design;
    const ref = { nc1: ['comstock48'], nc2: ['comstock48'], nc3: ['comstock52', 'kearsey68'], ttc: ['kearsey68'], lxt: ['kempthorne57'], partial: ['kempthorne61'] }[d] || [];
    const out = [];
    out.push(T(
      `El ${T(MATING[d] || MATING.none)} ${ref.length ? MT.p(...ref) : ''} se analizó sobre las parcelas, con las capas del diseño de campo y los términos del apareamiento como partición de las entradas (${n0(r.n)} parcelas, ${n0(r.dfe)} grados de libertad del error). Los coeficientes de los cuadrados medios esperados se calcularon como trazas de las matrices del diseño, válidos con celdas faltantes; cada prueba F usó el denominador que indica esa tabla y, cuando no existe uno exacto, una F aproximada con grados de libertad de Satterthwaite.`,
      `The ${T(MATING[d] || MATING.none)} ${ref.length ? MT.p(...ref) : ''} was analysed on the plots, with the strata of the field design and the mating terms as a partition of the entries (${n0(r.n)} plots, ${n0(r.dfe)} error degrees of freedom). Coefficients of the expected mean squares were computed as traces of the design matrices, valid with missing cells; every F test used the denominator given by that table and, when no exact one exists, a quasi-F with Satterthwaite degrees of freedom.`));
    if (r.genetic) out.push(T(
      `Los componentes se tradujeron a covarianzas de medios hermanos y hermanos completos y a σ²A y σ²D con coeficiente de endogamia F = ${n3(r.genetic.F)} ${MT.p('hallauer10')}; los errores estándar se obtuvieron como combinaciones lineales de cuadrados medios (Σc²·2CM²/gl).`,
      `Components were translated into half-sib and full-sib covariances and into σ²A and σ²D with inbreeding coefficient F = ${n3(r.genetic.F)} ${MT.p('hallauer10')}; standard errors were obtained as linear combinations of mean squares (Σc²·2MS²/df).`));
    if ((d === 'nc3' || d === 'ttc') && r.sd) out.push(T(`Las sumas y diferencias de las retrocruzas se usaron para separar los componentes aditivo y de dominancia${d === 'ttc' ? ' y para probar la epistasis' : ''} ${MT.p('kearsey68', 'kearsey96')}.`, `Sums and differences of the backcrosses were used to separate the additive and dominance components${d === 'ttc' ? ' and to test for epistasis' : ''} ${MT.p('kearsey68', 'kearsey96')}.`));
    if (d === 'partial') out.push(T(`Las ACG y ACE del dialelo parcial se estimaron con el método 4 de ${MT.c('griffing56b')} sobre las cruzas muestreadas.`, `GCA and SCA of the partial diallel were estimated with ${MT.c('griffing56b')} Method 4 on the sampled crosses.`));
    return P(out.join(' '));
  };

  /* Block 7 · generation means and variances */
  MT.blocks[7] = () => {
    const r = B7.res;
    if (!r || !r.models) return '';
    const gens = (r.stats || []).map(s => s.gen);
    const ch = r.models.chosen;
    const out = [];
    out.push(T(
      `Las medias de ${gens.length} generaciones (${esc(gens.join(', '))}) se analizaron con las pruebas de escala A, B, C y D de ${MT.c('mather49')} y la prueba conjunta de escala de ${MT.c('cavalli52')} por mínimos cuadrados ponderados con w = 1/V(media) ${MT.p('gale77')}, en la métrica ${B7.metric === 'H' ? `F₂ de ${MT.c('hayman58')}` : `F∞ de ${MT.c('mather82')}`}${ch ? `; el modelo elegido (${esc(ch.params.join(', '))}) tuvo χ² = ${n3(ch.chi2)} con ${ch.df} gl` : ''}. La varianza de cada media se estimó ${B7.weights === 'plants' ? 'con la varianza entre individuos dividida entre n' : B7.weights === 'plots' ? 'entre medias de parcela' : 'según el diseño: entre medias de parcela cuando había parcelas repetidas y, si no, con la varianza entre individuos dividida entre n'}.`,
      `The means of ${gens.length} generations (${esc(gens.join(', '))}) were analysed with ${MT.cp('mather49')} A, B, C and D scaling tests and ${MT.cp('cavalli52')} joint scaling test by weighted least squares with w = 1/V(mean) ${MT.p('gale77')}, in the ${B7.metric === 'H' ? `F₂ metric of ${MT.c('hayman58')}` : `F∞ metric of ${MT.c('mather82')}`}${ch ? `; the chosen model (${esc(ch.params.join(', '))}) had χ² = ${n3(ch.chi2)} with ${ch.df} df` : ''}. The variance of every mean was estimated ${B7.weights === 'plants' ? 'from the variance among individuals divided by n' : B7.weights === 'plots' ? 'among plot means' : 'from the design: among plot means when plots were replicated, otherwise from the variance among individuals divided by n'}.`));
    if (r.variances) out.push(T(`Las varianzas generacionales dieron D, H, F y E por mínimos cuadrados ponderados iterados, las heredabilidades en sentido amplio y estrecho y la de ${MT.c('warner52')}.`, `Generation variances gave D, H, F and E by iterated weighted least squares, broad- and narrow-sense heritabilities and that of ${MT.c('warner52')}.`));
    const fac = r.factors && r.factors.list && r.factors.list.length;
    if (r.heterosis || fac) out.push(T(`Se calcularon la heterosis respecto a la media y al mejor progenitor, la depresión endogámica${fac ? ` y el número mínimo de factores efectivos ${MT.p('lande81', 'cockerham86')}` : ''} ${MT.p('jinks58')}.`, `Heterosis relative to the mid-parent and the better parent, inbreeding depression${fac ? ` and the minimum number of effective factors ${MT.p('lande81', 'cockerham86')}` : ''} were computed ${MT.p('jinks58')}.`));
    const shs = r.heterosis ? r.heterosis.list.filter(x => x.check) : [];
    if (shs.length) {
      const nm = esc(shs.map(x => x.check).join(', '));
      out.push(T(`La heterosis estándar se midió como la diferencia entre la F₁ y ${shs.length === 1 ? 'el testigo' : 'cada testigo'} (${nm}), en porcentaje de la media del testigo, con el error de parcela de todo el ensayo; los testigos no entraron en las pruebas de escala ni en los modelos.`,
        `Standard heterosis was measured as the difference between the F₁ and ${shs.length === 1 ? 'the check' : 'each check'} (${nm}), as a percentage of the check mean, with the plot error of the whole trial; the checks did not enter the scaling tests or the models.`));
    }
    return P(out.join(' '));
  };

  /* Block 8 · genetic parameters and selection */
  MT.blocks[8] = () => {
    const r = B8.res;
    if (!r || !r.params) return '';
    const out = [];
    const ok = r.params.filter(p => !p.missing);
    const multi = ok.some(p => p.multi);
    out.push(T(
      `${ok.length === 1 ? `Para la variable ${esc(ok[0].name)}` : `Para ${ok.length} variables`} se estimaron σ²G${multi ? ', σ²GA' : ''} y σ²e a partir de los cuadrados medios, la heredabilidad en base de parcela y de medias de entrada con su intervalo exacto de ${MT.c('knapp85')}, los coeficientes de variación genética y fenotípica ${MT.p('burton53')} y la ganancia genética esperada ${MT.p('johnson55')}, con una proporción seleccionada de ${fmtNum(100 * B8.p, 1)} % (i = ${fmtNum(r.intensity.k, 3)}${B8.intensity === 'finite' ? ', intensidad exacta para una población finita' : ''}).`,
      `${ok.length === 1 ? `For the trait ${esc(ok[0].name)}` : `For ${ok.length} traits`}, σ²G${multi ? ', σ²GE' : ''} and σ²e were estimated from the mean squares, together with heritability on a plot and an entry-mean basis with the exact interval of ${MT.c('knapp85')}, the genetic and phenotypic coefficients of variation ${MT.p('burton53')} and the expected genetic advance ${MT.p('johnson55')}, with a selected proportion of ${fmtNum(100 * B8.p, 1)} % (i = ${fmtNum(r.intensity.k, 3)}${B8.intensity === 'finite' ? ', exact intensity for a finite population' : ''}).`));
    const incomplete = state.data && state.data.field && state.data.field.envs.some(E => ['alpha', 'ibd', 'rowcol'].includes(E.design));
    if (incomplete && ok.some(p => p.a && p.a.reml)) out.push(T(`Con bloques incompletos se añadió la heredabilidad generalizada de ${MT.c('cullis06')}.`, `With incomplete blocks the generalised heritability of ${MT.c('cullis06')} was added.`));
    if (shown('b8Corr')) out.push(T(`Las correlaciones genéticas, fenotípicas y ambientales se obtuvieron de los productos cruzados medios (análisis de la suma de cada par de variables en el mismo diseño) con errores estándar por el método delta; el análisis de sendas dividió las correlaciones en efectos directos e indirectos ${MT.p('dewey59')}.`,
      `Genetic, phenotypic and environmental correlations were obtained from mean cross-products (analysis of the sum of every pair of traits in the same design) with standard errors by the delta method; path analysis split the correlations into direct and indirect effects ${MT.p('dewey59')}.`));
    if (shown('b8Index') && B8.indices && B8.indices.list) {
      const keys = B8.indices.list.filter(x => !x.invalid).map(x => x.key);
      /* functions, so that only the indices actually built are cited */
      const nm = {
        sh: () => `Smith–Hazel ${MT.p('smith36', 'hazel43')}`,
        base: () => `${T('base', 'base')} ${MT.p('williams62')}`,
        restricted: () => `${T('restringido', 'restricted')} ${MT.p('kempthorne59')}`,
        ppg: () => `${T('de ganancias proporcionales', 'predetermined proportional gains')} ${MT.p('ceron18')}`,
        desired: () => `${T('de ganancias deseadas', 'desired gains')} ${MT.p('pesek69')}`,
        esim: () => `${T('de valores propios', 'eigen selection index')} (ESIM; ${MT.cite('ceron18')})`,
      };
      const names12 = keys.filter(k => nm[k]).map(k => nm[k]());
      out.push(T(`Se construyeron los índices de selección ${list(names12)}, con la matriz genética doblada canónicamente para hacerla compatible con la fenotípica.`, `The selection indices ${list(names12)} were built, with the genetic matrix bent canonically to make it compatible with the phenotypic one.`));
      const rk = B8.rankIndex;
      if (shown('b8Sel') && B8.selection) out.push(T(`Los genotipos se ordenaron por ${rk === 'rank' ? `la suma de rangos ${MT.p('mulamba78')}` : rk === 'elston' ? `el índice multiplicativo de ${MT.c('elston63')}` : 'el índice elegido'} y se seleccionaron ${B8.selection.nSel}.`, `Genotypes were ranked by ${rk === 'rank' ? `the rank sum ${MT.p('mulamba78')}` : rk === 'elston' ? `${MT.cp('elston63')} multiplicative index` : 'the chosen index'} and ${B8.selection.nSel} were selected.`));
    }
    if (shown('b8Fehr') && B8.fehr && (B8.fehr.from === 'b6' || B8.fehr.user)) out.push(T(`La ganancia esperada por ciclo y por año de los métodos de selección recurrente se calculó con los coeficientes de ${MT.c('sprague77')} tabulados por ${MT.c('fehr87')}${B8.fehr.from === 'b6' ? ', con σ²A y σ²D del Bloque 6' : ''}.`,
      `The expected gain per cycle and per year of the recurrent selection methods was computed with the coefficients of ${MT.c('sprague77')} tabulated by ${MT.c('fehr87')}${B8.fehr.from === 'b6' ? ', with σ²A and σ²D from Block 6' : ''}.`));
    return P(out.join(' '));
  };

  /* Block 9 · genotype × environment */
  MT.blocks[9] = () => {
    const r = B9.res;
    if (!r || r.error) return '';
    const out = [];
    out.push(T(
      `La tabla de ${r.g} genotipos × ${r.e} ambientes se formó con las medias ajustadas de cada ambiente${r.tab && !r.tab.meansOnly ? ' y el error combinado en escala de parcela' : ''}${r.imp && r.imp.n ? `; ${pl(r.imp.n, 'celda faltante se estimó', 'celdas faltantes se estimaron')} por EM-AMMI${r.imp.axes} ${MT.p('gauch90')}` : ''}.`,
      `The table of ${r.g} genotypes × ${r.e} environments was formed with the adjusted means of each environment${r.tab && !r.tab.meansOnly ? ' and the pooled error on the plot scale' : ''}${r.imp && r.imp.n ? `; ${pl(r.imp.n, 'missing cell was estimated', 'missing cells were estimated')} by EM-AMMI${r.imp.axes} ${MT.p('gauch90')}` : ''}.`));
    const st = [];
    if (r.reg) st.push(T(`la regresión sobre el índice ambiental ${MT.p('finlay63', 'eberhart66', 'perkins68')}`, `regression on the environmental index ${MT.p('finlay63', 'eberhart66', 'perkins68')}`));
    if (r.vars) st.push(T(`la ecovalencia ${MT.p('wricke62')} y la varianza de estabilidad ${MT.p('shukla72')}`, `ecovalence ${MT.p('wricke62')} and stability variance ${MT.p('shukla72')}`));
    if (r.sup) st.push(T(`el índice de superioridad ${MT.p('lin88')}`, `the superiority index ${MT.p('lin88')}`));
    if (r.ann) st.push(T(`el índice de confiabilidad ${MT.p('annicchiarico92')}`, `the reliability index ${MT.p('annicchiarico92')}`));
    if (r.huehn) st.push(T(`las estadísticas no paramétricas de rangos ${MT.p('huehn79', 'nassar87')}`, `non-parametric rank statistics ${MT.p('huehn79', 'nassar87')}`));
    if (r.kang) st.push(T(`la estadística de rendimiento y estabilidad ${MT.p('kang93')}`, `the yield–stability statistic ${MT.p('kang93')}`));
    if (st.length) out.push(T(`La estabilidad se describió con ${list(st)}.`, `Stability was described with ${list(st)}.`));
    if (r.ammi) out.push(T(
      `El modelo AMMI ${MT.p('gauch88')} retuvo ${pl(r.ammi.p, 'eje multiplicativo', 'ejes multiplicativos')} según ${r.ammi.axesRule === 'gollob' ? `la F de ${MT.c('gollob68')}` : `la prueba F_R de ${MT.c('cornelius92')}`}; se calcularon el valor de estabilidad AMMI ${MT.p('purchase00')}, el índice YSI ${MT.p('farshadfar08')} y el promedio ponderado de puntajes absolutos WAAS y WAASY ${MT.p('olivoto19')}.`,
      `The AMMI model ${MT.p('gauch88')} retained ${pl(r.ammi.p, 'multiplicative axis', 'multiplicative axes')} according to ${r.ammi.axesRule === 'gollob' ? `${MT.cp('gollob68')} F` : `${MT.cp('cornelius92')} F_R test`}; the AMMI stability value ${MT.p('purchase00')}, the YSI index ${MT.p('farshadfar08')} and the weighted average of absolute scores WAAS and WAASY ${MT.p('olivoto19')} were computed.`));
    if (shown('b9Gge')) out.push(T(`El biplot GGE ${MT.p('yan00', 'yan06')} se construyó con los datos centrados por ambiente${B9.scaling === 'sd' ? ' y escalados por su desviación estándar' : ''}.`, `The GGE biplot ${MT.p('yan00', 'yan06')} was built from environment-centred data${B9.scaling === 'sd' ? ' scaled by their standard deviation' : ''}.`));
    if (r.stage2) out.push(T(`La varianza de la interacción σ²GA se estimó en dos etapas por REML, ponderando cada ambiente por su error ${MT.p('smith05', 'mohring09')}.`, `The interaction variance σ²GE was estimated in two stages by REML, weighting every environment by its error ${MT.p('smith05', 'mohring09')}.`));
    return P(out.join(' '));
  };

  /* Block 10 · mixed models, BLUP and crossbreeding */
  MT.blocks[10] = () => {
    const out = [];
    if (B10.ped && shown('b10Data')) {
      const s = PED.stats(B10.ped);
      out.push(T(
        `El pedigrí (${n0(s.n)} individuos, ${n0(s.founders)} fundadores, ${s.generations} generaciones${B10.selfing ? ', con autofecundación' : ''}) se ordenó topológicamente; la consanguinidad se calculó con el método de ${MT.c('meuwissen92')}${B10.selfing ? ', incluidas las líneas derivadas por autofecundación y los fundadores endogámicos' : ''}, y la inversa de la matriz de parentesco con las reglas de ${MT.c('henderson76')} y ${MT.c('quaas76')}.`,
        `The pedigree (${n0(s.n)} individuals, ${n0(s.founders)} founders, ${s.generations} generations${B10.selfing ? ', with selfing' : ''}) was sorted topologically; inbreeding was computed with the method of ${MT.c('meuwissen92')}${B10.selfing ? ', including lines derived by selfing and inbred founders' : ''}, and the inverse relationship matrix with the rules of ${MT.c('henderson76')} and ${MT.c('quaas76')}.`));
    }
    const f = B10.fit;
    if (f && shown('b10Model')) {
      const keys = f.comp.map(c => c.key);
      const extra = [keys.includes('pe') ? T('ambiente permanente', 'permanent environment') : '', keys.includes('maternal') ? T(`efecto genético materno ${MT.p('willham63')}`, `maternal genetic effect ${MT.p('willham63')}`) : ''].filter(Boolean);
      out.push(T(
        `Los valores genéticos se predijeron por BLUP ${MT.p('henderson75')} con un modelo ${f.model === 'sire' ? 'de padres' : 'animal'}${extra.length ? ` con ${list(extra)}` : ''} (${n0(f.n)} registros)${f.given ? ', con las varianzas dadas por el usuario' : `; las varianzas se estimaron por REML ${MT.p('patterson71')} con información promedio ${MT.p('gilmour95')}`}. La confiabilidad se calculó como 1 − PEV/[(1 + F)σ²a]${B10.lrt ? ` y cada efecto aleatorio se probó por razón de verosimilitud con la mezcla ½χ²₀ + ½χ²₁ ${MT.p('self87')}` : ''} ${MT.p('mrode14')}.`,
        `Breeding values were predicted by BLUP ${MT.p('henderson75')} with ${f.model === 'sire' ? 'a sire' : 'an animal'} model${extra.length ? ` with ${list(extra)}` : ''} (${n0(f.n)} records)${f.given ? ', with variances given by the user' : `; variances were estimated by REML ${MT.p('patterson71')} with average information ${MT.p('gilmour95')}`}. Reliability was computed as 1 − PEV/[(1 + F)σ²a]${B10.lrt ? ` and every random effect was tested by likelihood ratio with the ½χ²₀ + ½χ²₁ mixture ${MT.p('self87')}` : ''} ${MT.p('mrode14')}.`));
    }
    const t = B10.tRes;
    if (t && shown('b10Trial')) {
      const mdl = t.model === 'AI' ? T(`efectos aditivos con A y no aditivos independientes ${MT.p('oakey06')}`, `additive effects with A and independent non-additive effects ${MT.p('oakey06')}`)
        : t.model === 'A' ? T('el parentesco aditivo del pedigrí (K = A)', 'the additive relationships of the pedigree (K = A)') : T('genotipos independientes (K = I)', 'independent genotypes (K = I)');
      out.push(T(
        `Los ${t.nEntries} genotipos del ensayo del Bloque 3 se predijeron en una etapa sobre las ${n0(t.n)} parcelas con ${mdl}${t.multi ? ' e interacción genotipo × ambiente' : ''}, por REML, con la heredabilidad generalizada de ${MT.c('cullis06')}.`,
        `The ${t.nEntries} genotypes of the Block 3 trial were predicted in one stage on the ${n0(t.n)} plots with ${mdl}${t.multi ? ' and genotype × environment interaction' : ''}, by REML, with the generalised heritability of ${MT.c('cullis06')}.`));
    }
    const x = B10.x;
    if (x && x.user && x.preds && shown('b10Cross')) {
      if (x.mode === 'estimate' && x.res) {
        const kinds = new Set(x.res.par.map(p => p.kind || p.key));
        out.push(T(
          `Los parámetros de cruzamiento de ${MT.c('dickerson69')} (efectos aditivos directos${[...kinds].some(k => /gM|mat/.test(k)) ? ' y maternos' : ''} de raza, heterosis directa${[...kinds].some(k => /hM/.test(k)) ? ' y materna' : ''}${[...kinds].some(k => /rI/.test(k)) ? ' y pérdida por recombinación' : ''}) se estimaron por mínimos cuadrados ponderados con la restricción de suma cero de los efectos de raza ${MT.p('dickerson73', 'kinghorn80')}${x.res.diallel ? `, y el dialelo de razas se descompuso según ${MT.c('eisen83')}` : ''}; se predijeron ${x.preds.length} cruzas o sistemas con sus errores estándar.`,
          `The crossbreeding parameters of ${MT.c('dickerson69')} (direct${[...kinds].some(k => /gM|mat/.test(k)) ? ' and maternal' : ''} additive breed effects, direct${[...kinds].some(k => /hM/.test(k)) ? ' and maternal' : ''} heterosis${[...kinds].some(k => /rI/.test(k)) ? ' and recombination loss' : ''}) were estimated by weighted least squares with sum-to-zero breed effects ${MT.p('dickerson73', 'kinghorn80')}${x.res.diallel ? `, and the breed diallel was decomposed after ${MT.c('eisen83')}` : ''}; ${x.preds.length} crosses or systems were predicted with their standard errors.`));
      } else out.push(T(`Se predijeron ${x.preds.length} cruzas o sistemas de cruzamiento con los coeficientes de ${MT.c('dickerson69')} a partir de ${x.mode === 'percent' ? 'las medias de raza y la heterosis en porcentaje' : 'parámetros dados'}.`, `${x.preds.length} crosses or crossbreeding systems were predicted with the coefficients of ${MT.c('dickerson69')} from ${x.mode === 'percent' ? 'breed means and heterosis in percent' : 'given parameters'}.`));
    }
    return out.map(P).join('');
  };

  /* Block 11 · genomics */
  MT.blocks[11] = () => {
    const Q = B11.Q;
    if (!Q) return '';
    const out = [];
    const q = B11.qc;
    const D = B11.D;
    const coding = { dosage: T('dosis 0/1/2', 'dosages 0/1/2'), minus1: T('códigos −1/0/1', 'codes −1/0/1'), binary: T('presencia/ausencia de líneas puras', 'presence/absence in pure lines'), letters: T('letras', 'letters') }[D.coding] || D.coding;
    const src = B11.src && ['wheat'].includes(B11.src.id) ? ' ' + MT.p('crossa10') : B11.src && B11.src.id === 'technow' ? ' ' + MT.p('technow14') : '';
    out.push(T(
      `Los genotipos de ${Q.n} individuos en ${D.m} marcadores (${coding})${src} se depuraron eliminando marcadores con más de ${fmtNum(100 * q.maxMissMarker, 0)} % de datos faltantes, monomórficos o con frecuencia del alelo menor inferior a ${q.minMAF}, e individuos con más de ${fmtNum(100 * q.maxMissInd, 0)} % faltante; quedaron ${Q.m} marcadores y los datos faltantes se reemplazaron por 2p. La matriz de parentesco genómico se calculó con el método ${B11.method === 'vr2' ? 2 : 1} de ${MT.c('vanraden08')}, con una cresta de ${B11.ridge} veces la diagonal media para invertirla${B11.kern && B11.kern.w ? ` y una mezcla con el parentesco del pedigrí (peso ${B11.kern.w}; ${MT.cite('aguilar10')})` : ''}.`,
      `Genotypes of ${Q.n} individuals at ${D.m} markers (${coding})${src} were cleaned by removing markers with more than ${fmtNum(100 * q.maxMissMarker, 0)} % missing data, monomorphic markers or those with minor-allele frequency below ${q.minMAF}, and individuals with more than ${fmtNum(100 * q.maxMissInd, 0)} % missing; ${Q.m} markers remained and missing data were replaced by 2p. The genomic relationship matrix was computed with ${MT.c('vanraden08')} Method ${B11.method === 'vr2' ? 2 : 1}, with a ridge of ${B11.ridge} times the mean diagonal to invert it${B11.kern && B11.kern.w ? ` and a blend with the pedigree relationships (weight ${B11.kern.w}; ${MT.cite('aguilar10')})` : ''}.`));
    const F = B11.fit;
    if (F && shown('b11Gblup')) out.push(T(
      `Los valores genómicos se predijeron por GBLUP ${MT.p('vanraden08', 'meuwissen01')}${B11.phenSource === 'block3' ? ' en una etapa sobre las parcelas del ensayo del Bloque 3' : ''}, con las varianzas estimadas por REML ${MT.p('gilmour95')}${isFinite(F.h2) ? `; la heredabilidad genómica se calculó con la semivarianza media de la matriz de parentesco ${MT.p('legarra16', 'feldmann22')}` : ''}${B11.beta ? `, y los efectos de los marcadores se obtuvieron por la equivalencia con la regresión en cresta sobre los marcadores ${MT.p('habier07')}` : ''}.`,
      `Genomic values were predicted by GBLUP ${MT.p('vanraden08', 'meuwissen01')}${B11.phenSource === 'block3' ? ' in one stage on the plots of the Block 3 trial' : ''}, with variances estimated by REML ${MT.p('gilmour95')}${isFinite(F.h2) ? `; genomic heritability was computed with the average semivariance of the relationship matrix ${MT.p('legarra16', 'feldmann22')}` : ''}${B11.beta ? `, and marker effects were obtained through the equivalence with ridge regression on the markers ${MT.p('habier07')}` : ''}.`));
    const C = B11.cv;
    if (C && shown('b11Cv')) out.push(T(
      `La capacidad predictiva se evaluó por validación cruzada de ${C[0].cv.folds} grupos con ${pl(C[0].cv.reps.length, 'repetición', 'repeticiones')} (esquema CV1; ${MT.cite('burgueno12')})${C[0].cv.refit ? ', reestimando las varianzas en cada conjunto de entrenamiento' : ''}; la exactitud se aproximó con r/√h² y la respuesta por año con i·r·σA/L ${MT.p('heffner10')}.`,
      `Predictive ability was evaluated by ${C[0].cv.folds}-fold cross-validation with ${pl(C[0].cv.reps.length, 'replicate', 'replicates')} (scheme CV1; ${MT.cite('burgueno12')})${C[0].cv.refit ? ', re-estimating the variances in every training set' : ''}; accuracy was approximated by r/√h² and the response per year by i·r·σA/L ${MT.p('heffner10')}.`));
    const H = B11.hres;
    if (H && shown('b11Hyb')) {
      out.push(T(
        `El desempeño de las cruzas simples entre los dos grupos heteróticos (${H.nCross} evaluadas de ${H.ids1.length * H.ids2.length} posibles) se modeló con las ACG de cada grupo, con varianza proporcional al parentesco genómico dentro del grupo${H.sca ? ', y la ACE con el núcleo K₁ ⊗ K₂' : ''} ${MT.p('bernardo94', 'technow12', 'technow14')}; las cruzas no evaluadas se predijeron con esos BLUP.${B11.hcv ? ` La predicción se validó apartando híbridos al azar y líneas completas, con las clases T2, T1 y T0 de ${MT.c('technow14')}.` : ''} Las cruzas triples y dobles se predijeron según ${MT.c('jenkins34')}.`,
        `The performance of single crosses between the two heterotic groups (${H.nCross} tested of ${H.ids1.length * H.ids2.length} possible) was modelled with the GCA of each group, with variance proportional to the genomic relationships within the group${H.sca ? ', and SCA with the kernel K₁ ⊗ K₂' : ''} ${MT.p('bernardo94', 'technow12', 'technow14')}; untested crosses were predicted from those BLUPs.${B11.hcv ? ` Prediction was validated by leaving out random hybrids and whole lines, with the classes T2, T1 and T0 of ${MT.c('technow14')}.` : ''} Three-way and double crosses were predicted after ${MT.c('jenkins34')}.`));
    }
    return out.map(P).join('');
  };

  /* every reference in the list is cited in the text: first surname and year appear together */
  MT.check = last => {
    last = last || MT.last;
    const txt = (last.data || '') + (last.html || '');
    const uncited = last.keys.filter(k => { const r = MT.REF[k]; const re = new RegExp(`${r.a[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^()]{0,80}?\\(?${r.y.slice(0, 4)}${r.y.length > 4 ? r.y.slice(4) + '?' : ''}\\b`); return !re.test(txt); });
    const unknown = [...txt.matchAll(/reference (\w+)/g)].map(m => m[1]);
    return { uncited, unknown };
  };

  MT.build = blocks => {
    cited = new Set();
    const parts = [], missing = [];
    let data = '';
    try { data = MT.dataParagraph ? MT.dataParagraph() : ''; } catch (e) { console.error(e); }
    blocks.forEach(n => {
      const f = MT.blocks[n];
      let h = '';
      try { h = f ? f() : ''; } catch (e) { console.error('methods of block ' + n, e); h = ''; }
      if (h) parts.push({ n, html: h }); else missing.push(n);
    });
    /* the reference list: first author, then year */
    const keys = [...cited].sort((a, b) => { const A = MT.REF[a], B = MT.REF[b]; return A.full.localeCompare(B.full, 'en'); });
    /* a letter after the year (Griffing 1956a, 1956b) only when two works of the same authors and year are both
       cited; with one of them, the plain year in the text and in the list */
    const lone = keys.filter(k => { const r = MT.REF[k]; return /^\d{4}[a-z]$/.test(r.y) && !keys.some(j => j !== k && names(MT.REF[j]) === names(r) && MT.REF[j].y.slice(0, 4) === r.y.slice(0, 4)); });
    const plainYear = s => lone.reduce((acc, k) => { const r = MT.REF[k], nm = names(r), y0 = r.y.slice(0, 4); return acc.split(`${nm} (${r.y})`).join(`${nm} (${y0})`).split(`${nm}'s (${r.y})`).join(`${nm}'s (${y0})`).split(`${nm} ${r.y}`).join(`${nm} ${y0}`); }, s);
    const fullOf = k => (lone.includes(k) ? MT.REF[k].full.replace(`(${MT.REF[k].y})`, `(${MT.REF[k].y.slice(0, 4)})`) : MT.REF[k].full);
    data = plainYear(data);
    parts.forEach(x => { x.html = plainYear(x.html); });
    const html = parts.map(x => `<h3>${esc(T(RP.block(x.n).es, RP.block(x.n).en))}</h3>${x.html}`).join('');
    const refs = keys.map(k => esc(fullOf(k)));
    /* plain text for a manuscript: one paragraph per line, a blank line between them */
    const plain = s => s.replace(/<\/p>\s*<p>/g, '\n\n').replace(/<sub>([^<]*)<\/sub>/g, '$1').replace(/<sup>([^<]*)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    const text = [T('MÉTODOS', 'METHODS'), data ? plain(data) : null]
      .concat(parts.map(x => `${T(RP.block(x.n).es, RP.block(x.n).en)}\n${plain(x.html)}`))
      .concat([T('REFERENCIAS', 'REFERENCES'), keys.map(fullOf).join('\n')])
      .filter(Boolean).join('\n\n') + '\n';
    MT.last = { html, data, refs, keys, text, missing };
    return MT.last;
  };
})();
