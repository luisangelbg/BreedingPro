/* Bloque 12: tarjeta 4, cómo citar */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 104, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).filter(n => n.offsetParent !== null).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); };
  const $ = id => document.getElementById(id);
  const sesion = async () => { goStep(3); await W(600); document.querySelector("[data-fam=\"all\"]").click(); await W(200); document.querySelector("[data-ex=\"maize4\"]").click(); for (let k = 0; k < 80; k++) { await W(250); if (B3.results.size && !$("b3Analysis").classList.contains("is-busy")) break; } await W(1500); for (const s of [4, 5, 8]) { goStep(s); await W(5000); } goStep(12); await W(2500); $("b12Title").value = "Dialelo de maíz 4 × 4: aptitud combinatoria y acción génica"; $("b12Author").value = "Nombre del autor"; };
  const armar = async () => { $("b12Build").click(); await W(4000); };
  const enMarco = async sel => { const f = $("b12Frame"), d = f.contentDocument; const h = [...d.querySelectorAll("h2, h3")].find(x => x.textContent.trim().startsWith(sel)); f.contentWindow.scrollTo(0, h.getBoundingClientRect().top + f.contentWindow.scrollY - 12); await W(600); irA(f); await W(400); return f; };
  await sesion(); await armar();
  const c = $("b12Cite"); irA(c); await W(400);
  caja([c.querySelector("h2"), c.querySelector(".cite-box"), c.querySelector("p.hint")], 10);
})()
