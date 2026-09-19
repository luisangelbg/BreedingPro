/* Bloque 10: matriz de parentesco A (Schaeffer, 29 animales) */
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
  await ex10("schaeffer31");
  { const a = Fig.registry.b10FigA; a.cfg.width = 640; a.cfg.height = 640; a.redraw(); await W(600); }
  const f = $("b10FigA"); irA(f); await W(400);
  { const s = f.querySelector("svg"), sb = s.getBoundingClientRect(); const rs = [...s.querySelectorAll("*")].filter(n => n.getBoundingClientRect && !["defs", "g", "svg", "title", "clipPath"].includes(n.tagName)).map(n => n.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0 && !(r.width > 0.97 * sb.width && r.height > 0.97 * sb.height)); const p = 14, x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); }
})()
