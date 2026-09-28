# BreedingPro

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23005938.svg)](https://doi.org/10.5281/zenodo.23005938)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

**Plant and animal breeding, from the cross to the decision — without writing code.** All twelve blocks are
complete (version 1.0.1).

**Online version:** https://luisangelbg.github.io/BreedingPro/ ·
**User manual (Spanish):** [PDF](manual/BreedingPro%20User's%20Manual.pdf) ·
[HTML](https://luisangelbg.github.io/BreedingPro/manual/es/manual-completo.html)

A web platform (HTML + JavaScript, no installation; it also runs offline from a local copy) for the experiments of a
breeding programme: it plans the crosses and the field trial, recognises the design of the table that comes back
from the field, estimates combining ability, gene action, heritability and stability, predicts breeding values from
a pedigree or from markers, and ends in a report with editable figures, methods written with the settings actually
used, and their references.

The same workflow serves plant and animal breeding: diallels and mating designs, generation means, selection
indices, genotype × environment interaction, the animal model and crossbreeding parameters, genomic prediction and
hybrid prediction. The interface, the figures and the report are available in Spanish and English, with a light or
dark theme.

## How to open it

1. Double-click **`index.html`**. It opens in the default browser, on the home page of Block 1. Every example data
   set is embedded in the code, so everything works from the local copy, without a server or an internet connection.
2. If your institution blocks pages opened as local files, double-click **`Open BreedingPro.bat`** (or run
   `server.ps1` with PowerShell): it starts a small server on your own computer and opens `http://localhost:9200`.
   Run it as administrator to reach it from a tablet on the same Wi-Fi network; it prints the address.
3. The tests open the same way: double-click **`tests/index.html`**; all of them should come out green.

## The twelve blocks

| Block | Content | Status |
|---|---|---|
| 1 | Home: diallel laboratory (parents with explicit genes, plots with error, Griffing and Hayman analyses) and selection laboratory (observed response against R = h²S), theory in plain language, 63 references, how to cite | ✅ done |
| 2 | Planning: crossing plan for 11 mating designs, seed and pollinations, season calendar; randomized complete blocks, α-lattice, completely randomized and augmented designs; field book; standard errors, detectable differences and power of the F tests | ✅ done |
| 3 | Data: spreadsheets and delimited text, a built-in data sheet, role of each column, recognition of the mating and field designs, data quality and outliers, analysis of each environment (ANOVA or REML) and combined analysis, adjusted means and trial heritability | ✅ done |
| 4 | Griffing diallels: methods 1 to 4, models I and II, GCA, SCA and reciprocal (maternal and non-maternal) effects with exact standard errors, σ²A, σ²D, Baker's ratio, best parents and crosses, several environments | ✅ done |
| 5 | Hayman–Jinks (or Morley Jones) partition, genetic components D, H₁, H₂, F, h² and E, Wr–Vr graph and order of dominance; Gardner–Eberhart analyses II and III, heterosis and the equivalences between methods | ✅ done |
| 6 | Mating designs: North Carolina I, II and III, triple test cross, line × tester and partial diallels, with expected mean squares computed for the actual experiment, effects, components and epistasis | ✅ done |
| 7 | Generation means and variances: scaling tests A–D, joint scaling test with the model sequence in two metrics, D, H, F and E, heterosis (including standard heterosis against a check), inbreeding depression and effective factors | ✅ done |
| 8 | Genetic parameters with exact confidence intervals, genotypic and phenotypic correlations, path analysis, eight selection indices and the expected gain of recurrent selection methods | ✅ done |
| 9 | Genotype × environment: regression on the environmental index, ecovalence, stability variance, superiority, reliability, rank statistics, AMMI with WAAS, GGE biplot views and a two-stage REML analysis | ✅ done |
| 10 | Pedigree with selfing, inbreeding and relationships; animal and sire models with permanent environment and maternal effects; breeding values and their reliability; BLUP of trial entries; Dickerson crossbreeding parameters and predictions of crosses, rotations and composites | ✅ done |
| 11 | Genomics: marker quality control, genomic relationship matrix, GBLUP and marker effects, cross-validation, response per year and prediction of untested single, three-way and double crosses | ✅ done |
| 12 | Report with the results of every block, methods written with the settings used and their references; PDF, HTML and a ZIP package with tables, workbooks, figures up to 900 dpi and data | ✅ done |

## What runs where

Everything is computed in the browser with plain JavaScript: no server, no upload, and the data never leave the
computer. The only third-party component is an open-source reader and writer of spreadsheet files (.xlsx, .ods),
bundled in `vendor/` under its own Apache License 2.0, which must be kept with it; it is not part of the original work
of this program. Its notice, and the source and licence of every published example data set, are in
`vendor/THIRD-PARTY-NOTICES.txt`.

## Example data

The app includes 21 data sets in Block 3 (17 published, 4 simulated) and others in Blocks 2, 10 and 11. The published
ones reproduce tables of open-access articles and textbooks; the simulated ones were generated with fixed seeds and
come with their true values, so each method can be checked against the truth. If you publish something made with an
example, cite the original work (appendix F of the manual lists them all).

## User manual

`manual/` contains the user manual in Spanish: 229 letter-size pages with the theory, a worked example for every
block, 22 decision rules, a glossary, troubleshooting tables and 142 references. It is written in HTML by parts
(`manual/es/`) and printed once to `manual/BreedingPro User's Manual.pdf`; `manual/LEEME.md` explains how it is
built.

## How to cite

Barrera-Guzmán, L. Á. (2026). *BreedingPro: plataforma en el navegador para el análisis de cruzas dialélicas, diseños
de apareamiento, parámetros genéticos y predicción en el mejoramiento de plantas y animales* (versión 1.0.1)
[Computer software]. https://doi.org/10.5281/zenodo.23005938

That DOI is the concept DOI: it always resolves to the latest version. Each release also has its own DOI
(v1.0.0: 10.5281/zenodo.23005939).

Please cite also the original articles of the methods you use: the methods section of the Block 12 report names
them and lists their references. See `CITATION.cff`.

## Licence

GNU General Public License, version 3 or later (`LICENSE`). The user manual is © 2026 Luis Ángel Barrera-Guzmán.
