/* Bloque 10: tarjeta 4 con el experimento simulado de tres razas */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).filter(n => n.offsetParent !== null).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const $ = id => document.getElementById(id);
  const ex10 = async id => { goStep(10); await W(2500); document.querySelector(`[data-ex10="${id}"]`).click(); await W(1500); };
  const run = async () => { $("b10Run").click(); for (let k = 0; k < 160; k++) { await W(500); if (B10.fit && !$("b10Run").disabled) break; } await W(1500); };
  const xex = async id => { goStep(10); await W(2500); document.querySelector(`[data-xex="${id}"]`).click(); await W(1500); };
  const filas = (host, n) => { const t = $(host).querySelector("table"); return [t.querySelector("thead")].concat([...t.querySelectorAll("tbody tr")].slice(0, n)); };
  document.querySelectorAll(".book-scroll").forEach(n => { n.style.maxHeight = "none"; });
  await xex("sim3");
  const c = $("b10Cross"); c.querySelectorAll("textarea").forEach(t => { t.style.height = (t.scrollHeight + 4) + "px"; }); await W(300); irA(c); await W(400);
  caja([c.querySelector("h2"), c.querySelector("p.hint"), $("b10XExRow"), c.querySelector(".form-grid"), $("b10XEst")], 10);
})()
