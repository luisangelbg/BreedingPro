/* Bloque 3: tarjeta de carga con todos los ejemplos a la vista */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  goStep(3); await W(500);
  document.querySelector('[data-fam="all"]').click(); await W(400);
  const c = document.getElementById('b3Load');
  window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' });
  await W(400);
})()
