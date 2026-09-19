/* Bloque 4: figura de los efectos de ACG con su editor abierto */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  goStep(3); await W(400);
  document.querySelector('[data-fam="all"]').click();
  document.querySelector('[data-ex="singh8"]').click(); await W(3500);
  goStep(4); await W(2500);
  const f = document.getElementById('b4FigGca');
  const d = f.querySelector('details.fig-editor'); if (d) d.open = true;
  await W(400);
  window.scrollTo({ top: f.getBoundingClientRect().top + window.scrollY - 104, behavior: 'instant' });
  await W(500);
})()
