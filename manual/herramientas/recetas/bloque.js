/* Bloque 4 con el dialelo 8 × 8 del libro de texto: análisis de varianza del dialelo */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  goStep(3); await W(400);
  document.querySelector('[data-fam="all"]').click();
  document.querySelector('[data-ex="singh8"]').click(); await W(3500);
  goStep(4); await W(2500);
  const c = document.getElementById('b4Anova');
  window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' });
  await W(500);
})()
