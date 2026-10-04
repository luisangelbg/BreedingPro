# Changelog

## Unreleased

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
