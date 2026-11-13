/* Matriz de correlaciones de «Mis datos» (hasta 10 variables) con p ajustado por Holm */
function holmAjuste(ps) {
  const m = ps.length, ord = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), adj = new Array(m);
  let mx = 0;
  ord.forEach((o, k) => { mx = Math.max(mx, Math.min(1, (m - k) * o[0])); adj[o[1]] = mx; });
  return adj;
}
function calcularMatriz(nombres, cols, metodo, completas) {
  const k = nombres.length, celdas = [], ps = [], idx = [];
  const idsOk = completas ? cols[0].map((_, i) => cols.every(c => c[i] != null && !isNaN(c[i]))) : null;
  for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
    const x = [], y = [];
    for (let i = 0; i < cols[a].length; i++) {
      const u = cols[a][i], v = cols[b][i];
      if (u == null || v == null || isNaN(u) || isNaN(v)) continue;
      if (idsOk && !idsOk[i]) continue;
      x.push(u); y.push(v);
    }
    let r = NaN, p = NaN;
    if (x.length >= 3) {
      r = metodo === 'spearman' ? correlacionSpearman(x, y) : correlacionPearson(x, y);
      if (isFinite(r)) p = pruebaSignificanciaR(r, x.length).pValor;
    }
    celdas.push({ a, b, r, p, n: x.length }); if (isFinite(p)) { ps.push(p); idx.push(celdas.length - 1); }
  }
  const adj = holmAjuste(ps); idx.forEach((ci, q) => { celdas[ci].padj = adj[q]; });
  return { nombres, celdas, metodo, k, completas };
}
function colorRho(r) {
  if (!isFinite(r)) return 'transparent';
  const a = Math.min(1, Math.abs(r)); return r >= 0 ? `rgba(0,212,255,${(0.08 + 0.55 * a).toFixed(2)})` : `rgba(255,107,157,${(0.08 + 0.55 * a).toFixed(2)})`;
}
function fmtP(p) { return p == null || !isFinite(p) ? '—' : p < 0.001 ? '<0.001' : p.toFixed(3); }
function fmtR(r) { return isFinite(r) ? r.toFixed(3) : '—'; }
function htmlMatriz(M) {
  const k = M.k, get = (a, b) => M.celdas.find(c => c.a === Math.min(a, b) && c.b === Math.max(a, b));
  let h = '<div style="overflow-x:auto"><table class="stats-table" style="text-align:center"><tr><td class="label"></td>' + M.nombres.map(n => `<th>${n}</th>`).join('') + '</tr>';
  for (let a = 0; a < k; a++) {
    h += `<tr><td class="label"><b>${M.nombres[a]}</b></td>`;
    for (let b = 0; b < k; b++) {
      if (a === b) { h += '<td style="opacity:.4">1</td>'; continue; }
      const c = get(a, b), sig = c.padj != null && c.padj < 0.05;
      h += `<td style="background:${colorRho(c.r)};cursor:pointer;${sig ? 'font-weight:700' : ''}" title="Clic para el análisis completo de este par" onclick="analizarPar(${Math.min(a,b)},${Math.max(a,b)})">${fmtR(c.r)}${sig ? ' *' : ''}<br><small style="opacity:.7">n=${c.n}</small></td>`;
    }
    h += '</tr>';
  }
  return h + '</table></div>';
}
let MATRIZ_ACT = null;
function calcularMatrizUI() {
  const err = document.getElementById('error-box'); err.style.display = 'none';
  const vars = matrizVars.valor();
  if (vars.length < 2) { err.textContent = '⚠ Elige al menos 2 variables numéricas para la matriz.'; err.style.display = 'block'; return; }
  const metodo = document.getElementById('mx-metodo').value, completas = document.getElementById('mx-completas').checked;
  const cols = vars.map(v => HPDatos.valores(v));
  const M = calcularMatriz(vars, cols, metodo, completas); MATRIZ_ACT = M;
  const panel = document.getElementById('resultados-panel');
  const filas = M.celdas.slice().sort((p, q) => (isFinite(p.p) ? p.p : 2) - (isFinite(q.p) ? q.p : 2)).map(c => `<tr><td class="label">${M.nombres[c.a]} – ${M.nombres[c.b]}</td><td class="value">${fmtR(c.r)}</td><td class="value">${c.n}</td><td class="value">${fmtP(c.p)}</td><td class="value">${fmtP(c.padj)}</td></tr>`).join('');
  panel.innerHTML = `<h3>Matriz de correlaciones (${metodo === 'spearman' ? 'Spearman' : 'Pearson'})</h3>
    <div class="resumen-n"><span class="chip">${M.k} variables</span><span class="chip">${M.celdas.length} pares</span><span class="chip">${completas ? 'solo filas completas' : 'por pares de datos'}</span></div>
    ${htmlMatriz(M)}
    <p style="font-size:.74rem;color:var(--text3);margin:.6rem 0">* p ajustado por Holm &lt; 0,05. Azul = positiva, rosa = negativa. Haz clic en una celda para ver el análisis completo del par (Pearson, Spearman, Kendall y diagrama).</p>
    <p style="font-size:.74rem;color:#ffcc66;margin:.3rem 0 .8rem">⚠ Análisis exploratorio: al probar ${M.celdas.length} pares a la vez aumenta la probabilidad de hallazgos falsos. Interprete con el p ajustado y con el tamaño de r, no solo con la significancia.</p>
    <table class="stats-table"><tr><td class="label"><b>Par</b></td><td class="value"><b>r</b></td><td class="value"><b>n</b></td><td class="value"><b>p</b></td><td class="value"><b>p ajustado (Holm)</b></td></tr>${filas}</table>
    <div style="margin-top:.8rem"><button class="calc-btn" style="width:auto;padding:.4rem 1rem;font-size:.8rem" onclick="copiarMatriz()">Copiar matriz (Excel)</button></div>
    <details style="margin-top:1rem"><summary style="cursor:pointer;color:var(--accent)">Código para obtener esta matriz en R y Python</summary>
    <p style="font-size:.78rem;margin:.6rem 0 .3rem">R</p><pre id="mx-r" style="white-space:pre-wrap;font-size:.74rem;background:var(--bg3);padding:.6rem;border-radius:8px;overflow:auto"></pre>
    <p style="font-size:.78rem;margin:.6rem 0 .3rem">Python</p><pre id="mx-py" style="white-space:pre-wrap;font-size:.74rem;background:var(--bg3);padding:.6rem;border-radius:8px;overflow:auto"></pre></details>`;
  const vs = vars.map(v => '"' + v + '"').join(', '), met = metodo;
  document.getElementById('mx-r').textContent = `vars <- c(${vs})\nm <- datos[vars]\n${completas ? 'm <- na.omit(m)\n' : ''}pares <- combn(vars, 2, simplify = FALSE)\nres <- do.call(rbind, lapply(pares, function(p) {\n  t <- cor.test(m[[p[1]]], m[[p[2]]], method = "${met}", exact = FALSE)\n  data.frame(x = p[1], y = p[2], r = unname(t$estimate), n = sum(complete.cases(m[, p])), p = t$p.value)\n}))\nres$p_holm <- p.adjust(res$p, method = "holm")\nprint(res, digits = 4)\nprint(round(cor(m, method = "${met}", use = "${completas ? 'complete.obs' : 'pairwise.complete.obs'}"), 3))`;
  document.getElementById('mx-py').textContent = `import itertools, pandas as pd\nfrom scipy import stats\nfrom statsmodels.stats.multitest import multipletests\nvars = [${vs}]\nm = datos[vars]${completas ? '.dropna()' : ''}\nfilas = []\nfor a, b in itertools.combinations(vars, 2):\n    d = m[[a, b]].dropna()\n    r, p = stats.${met === 'spearman' ? 'spearmanr' : 'pearsonr'}(d[a], d[b])\n    filas.append((a, b, r, len(d), p))\nres = pd.DataFrame(filas, columns=["x", "y", "r", "n", "p"])\nres["p_holm"] = multipletests(res["p"], method="holm")[1]\nprint(res.round(4))\nprint(m.corr(method="${met}").round(3))`;
}
function analizarPar(a, b) {
  const M = MATRIZ_ACT; if (!M) return;
  const cols = [HPDatos.valores(M.nombres[a]), HPDatos.valores(M.nombres[b])], x = [], y = [];
  for (let i = 0; i < cols[0].length; i++) if (cols[0][i] != null && cols[1][i] != null) { x.push(cols[0][i]); y.push(cols[1][i]); }
  document.getElementById('datos-x').value = x.join(', '); document.getElementById('datos-y').value = y.join(', ');
  calcularTodo(); document.getElementById('resultados-panel').scrollIntoView({ behavior: 'smooth' });
}
function copiarMatriz() {
  const M = MATRIZ_ACT; if (!M) return; const get = (a, b) => M.celdas.find(c => c.a === Math.min(a, b) && c.b === Math.max(a, b));
  const L = [[''].concat(M.nombres)];
  for (let a = 0; a < M.k; a++) L.push([M.nombres[a]].concat(M.nombres.map((_, b) => a === b ? '1' : fmtR(get(a, b).r).replace('.', ','))));
  const t = L.map(l => l.join('\t')).join('\n');
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => alert('Matriz copiada. Pégala en Excel.')).catch(() => prompt('Copia la matriz:', t));
}
let matrizVars;
function iniciarMatriz() {
  HPDatos.panel(document.getElementById('hpd-panel'), { alError: mostrarErrorArchivo });
  matrizVars = HPDatos.selector(document.getElementById('hpd-vars'), { clave: 'corr-vars', tipo: 'num', multi: true, max: 10, etiqueta: 'Variables para la matriz de correlaciones', alCambiar: () => {} });
  const mostrar = () => { document.getElementById('hpd-multi').style.display = HPDatos.hayDatos() ? 'block' : 'none'; };
  HPDatos.onCambio(mostrar); mostrar();
}
if (typeof module !== 'undefined') module.exports = { holmAjuste };
