/* Bloque 11: matriz G del trigo */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).filter(n => n.offsetParent !== null).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const $ = id => document.getElementById(id);
  const hasta = async (f, max) => { for (let k = 0; k < (max || 900); k++) { if (f()) return; await W(300); } };
  const ex11 = async id => { goStep(11); await W(2500); document.querySelector(`[data-ex11="${id}"]`).click(); await W(3000); };
  const gblup = async () => { $("b11RunG").click(); await hasta(() => B11.fit && !$("b11RunG").disabled); await W(1200); };
  const validar = async () => { $("b11RunCv").click(); await W(400); await hasta(() => B11.cv && !$("b11RunCv").disabled, 3000); await W(1200); };
  const hibridos = async () => { $("b11RunH").click(); await hasta(() => B11.hres && !$("b11RunH").disabled, 3000); await W(1500); };
  const valHib = async () => { $("b11RunHcv").click(); await W(400); await hasta(() => B11.hcv && !$("b11RunHcv").disabled, 3000); await W(1000); };
  const filas = (host, n) => { const t = $(host).querySelector("table"); return [t.querySelector("thead")].concat([...t.querySelectorAll("tbody tr")].slice(0, n)); };
  const chico = async (id, w, h) => { const a = Fig.registry[id]; a.cfg.width = w; a.cfg.height = h; a.redraw(); await W(600); };
  document.querySelectorAll(".book-scroll").forEach(n => { n.style.maxHeight = "none"; });
  await ex11("wheat");
  await chico("b11FigG", 640, 620);
  const f = $("b11FigG"); irA(f); await W(400);
  caja([f.querySelector("svg")], 4);
})()
