/* Bloque 12: una tabla y una figura del informe */
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
  const f = await enMarco("Aptitud combinatoria general");
  { const d = f.contentDocument; const h8 = [...d.querySelectorAll("h3")].find(x => x.textContent.trim().startsWith("Comparaciones y diferencias")); let n = h8; const fig = [...d.querySelectorAll("figcaption")].find(x => x.textContent.trim().startsWith("Figura 6")).closest("figure"); while (n && n !== fig && !n.contains(fig)) { const nx = n.nextElementSibling; n.style.display = "none"; n = nx; } await W(400); }
  { const d = f.contentDocument, fr = f.getBoundingClientRect(); const h = [...d.querySelectorAll("h3")].find(x => x.textContent.trim().startsWith("Aptitud combinatoria general")); const c = [...d.querySelectorAll("figcaption")].find(x => x.textContent.trim().startsWith("Figura 6")); const a = h.getBoundingClientRect(), b = c.getBoundingClientRect(); window.__recorte = [fr.left + 2, fr.top + a.top - 14, fr.width - 4, b.bottom - a.top + 28].map(Math.round).join(","); }
})()
