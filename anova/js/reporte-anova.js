/* Reportes del ANOVA de un factor — Estadilab
   Genera el informe en tres formatos a partir del objeto de resultados R de la calculadora:
   - html(R, ctx)   → documento HTML autónomo (se imprime / guarda como PDF desde el navegador)
   - latex(R, ctx)  → archivo .tex (amsmath, booktabs, pgfplots) listo para Overleaf / pdflatex
   - docx(R, ctx)   → Blob .docx (usa la biblioteca "docx", cargada bajo demanda) */
const ReporteANOVA = (function () {
  const NOM = { tukey: 'Tukey HSD', duncan: 'Duncan', snk: 'Student-Newman-Keuls (SNK)', lsd: 'DMS (LSD de Fisher)', bonferroni: 'Bonferroni', scheffe: 'Scheffé' };
  const n = (v, d = 3) => (v === null || v === undefined || isNaN(v) || !isFinite(v)) ? '—' : v.toFixed(d).replace('.', ',');
  const p = v => (v === null || v === undefined || isNaN(v)) ? '—' : (v < 0.0001 ? '< 0,0001' : v.toFixed(4).replace('.', ','));
  const h = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoy = () => new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Modelo común de contenido ──
  function modelo(R, ctx) {
    const A = R.A, a = R.alpha, sig = A.p < a, s = R.sup || {};
    const M = { fecha: hoy(), alpha: a, contexto: (ctx || '').trim(), metodo: R.comp.metodo, metodoNombre: NOM[R.comp.metodo] };
    M.k = A.k; M.N = A.N;
    M.decision = sig ? `Se rechaza H₀ (p ${A.p < 0.0001 ? '< 0,0001' : '= ' + p(A.p)} < α = ${n(a, 2)}): al menos una media difiere.` : `No se rechaza H₀ (p = ${p(A.p)} ≥ α = ${n(a, 2)}): no hay evidencia de diferencias entre las medias.`;
    M.anova = [['Entre tratamientos', n(A.ssb), A.dfB, n(A.msb), n(A.F), p(A.p)], ['Error (dentro)', n(A.ssw), A.dfW, n(A.msw), '', ''], ['Total', n(A.sst), A.N - 1, '', '', '']];
    M.efectos = { eta2: n(A.eta2, 4), omega2: n(A.omega2, 4), sp: n(A.sp, 4) };
    M.desc = R.nombres.map((nm, i) => [nm, A.n[i], n(A.medias[i]), n(A.sd[i]), R.comp.letras[i]]);
    const ords = R.comp.metodo === 'duncan' || R.comp.metodo === 'snk';
    M.ords = ords;
    M.pares = R.comp.pares.map(q => [R.nombres[q.i] + ' − ' + R.nombres[q.j], n(q.diff), n(q.se), ords ? String(q.pasos) : (q.ic ? `[${n(q.ic[0])} ; ${n(q.ic[1])}]` : '—'), ords ? n(q.rangoCritico) : p(q.p), ords ? p(q.p) : null, q.sig ? 'Diferentes' : 'Iguales']);
    const ok = (v, cond) => v === null || v === undefined ? 'No evaluable' : (cond ? 'Se cumple' : 'No se cumple');
    M.supuestos = [];
    if (s.sw) M.supuestos.push(['Normalidad de residuos (Shapiro-Wilk)', 'W = ' + n(s.sw.W, 4), p(s.sw.p), ok(s.sw, s.sw.p >= a)]);
    if (s.lev) M.supuestos.push(['Varianzas iguales (Levene, mediana)', 'W = ' + n(s.lev.W), p(s.lev.p), ok(s.lev, s.lev.p >= a)]);
    if (s.bart && !isNaN(s.bart.chi2)) M.supuestos.push(['Varianzas iguales (Bartlett)', 'χ² = ' + n(s.bart.chi2), p(s.bart.p), ok(s.bart, s.bart.p >= a)]);
    if (s.dw) M.supuestos.push(['Independencia (Durbin-Watson)', 'DW = ' + n(s.dw.dw), p(s.dw.p), ok(s.dw, s.dw.p >= a)]);
    M.ruta = R.ruta ? { titulo: R.ruta.titulo, texto: R.ruta.texto, pasos: R.ruta.pasos } : null;
    M.alt = [['ANOVA clásico (F)', p(A.p), A.p < a ? 'Hay diferencias' : 'Sin diferencias']];
    if (R.welch) M.alt.push(['ANOVA de Welch', p(R.welch.p), R.welch.p < a ? 'Hay diferencias' : 'Sin diferencias']);
    if (R.kw) M.alt.push([`Kruskal-Wallis (H = ${n(R.kw.H)}, gl = ${R.kw.df})`, p(R.kw.p), R.kw.p < a ? 'Hay diferencias' : 'Sin diferencias']);
    M.potObs = R.pot && R.pot.obs !== undefined ? n(R.pot.obs, 4) : null;
    M.datos = R.nombres.map((nm, i) => [nm, R.grupos[i].map(x => String(x).replace('.', ',')).join('; ')]);
    try { M.conclusion = generarResumenAnova(armarPayloadAnova({}, R, ctx || '', '')); } catch (e) { M.conclusion = M.decision; }
    return M;
  }

  // ── Gráfico (canvas, fondo blanco, apto para impresión) ──
  function graficoPNG(R, ancho, alto) {
    ancho = ancho || 900; alto = alto || 460;
    const c = document.createElement('canvas'); c.width = ancho; c.height = alto; const g = c.getContext('2d'), A = R.A;
    g.fillStyle = '#fff'; g.fillRect(0, 0, ancho, alto);
    const L = 70, Rr = 20, T = 30, B = 70, W = ancho - L - Rr, H = alto - T - B;
    const ic = A.medias.map((m, i) => { const t = Math.sqrt(A.msw / A.n[i]) * MV.invT(1 - R.alpha / 2, A.dfW); return [m - t, m + t]; });
    const todos = [].concat(...R.grupos, ...ic.map(x => x[0]), ...ic.map(x => x[1]));
    let lo = Math.min(...todos), hi = Math.max(...todos); const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad * 1.4;
    const y = v => T + H - (v - lo) / (hi - lo) * H, k = R.nombres.length, bw = W / k;
    g.strokeStyle = '#d0d7e2'; g.fillStyle = '#4a5568'; g.font = '13px sans-serif'; g.textAlign = 'right';
    const paso = (() => { const r = (hi - lo) / 6, e = Math.pow(10, Math.floor(Math.log10(r))), f = r / e; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e; })();
    for (let v = Math.ceil(lo / paso) * paso; v <= hi; v += paso) { g.beginPath(); g.moveTo(L, y(v)); g.lineTo(L + W, y(v)); g.stroke(); g.fillText(v.toFixed(Math.max(0, -Math.floor(Math.log10(paso)))).replace('.', ','), L - 8, y(v) + 4); }
    g.strokeStyle = '#1a2340'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L, T); g.lineTo(L, T + H); g.lineTo(L + W, T + H); g.stroke();
    const col = ['#2b6cb0', '#6b46c1', '#2f855a', '#c53030', '#b7791f', '#dd6b20', '#2c7a7b', '#805ad5', '#68d391', '#d53f8c'];
    R.nombres.forEach((nm, i) => {
      const cx = L + bw * (i + 0.5), cl = col[i % col.length], base = Math.max(lo, 0 > lo ? lo : lo);
      g.fillStyle = cl + '55'; g.strokeStyle = cl; g.lineWidth = 2; const top = y(A.medias[i]), bot = y(Math.max(lo, Math.min(0, hi)));
      g.fillRect(cx - bw * 0.28, Math.min(top, bot), bw * 0.56, Math.abs(bot - top)); g.strokeRect(cx - bw * 0.28, Math.min(top, bot), bw * 0.56, Math.abs(bot - top));
      g.strokeStyle = '#1a2340'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, y(ic[i][0])); g.lineTo(cx, y(ic[i][1])); g.moveTo(cx - 9, y(ic[i][0])); g.lineTo(cx + 9, y(ic[i][0])); g.moveTo(cx - 9, y(ic[i][1])); g.lineTo(cx + 9, y(ic[i][1])); g.stroke();
      g.fillStyle = cl; R.grupos[i].forEach((v, j) => { g.beginPath(); g.arc(cx + ((j % 7) - 3) * 9, y(v), 3.4, 0, 6.2832); g.fill(); });
      g.fillStyle = '#1a2340'; g.font = 'bold 17px sans-serif'; g.textAlign = 'center'; g.fillText(R.comp.letras[i], cx, y(ic[i][1]) - 9);
      g.font = '13px sans-serif'; g.fillStyle = '#2d3748'; const t = nm.length > 16 ? nm.slice(0, 15) + '…' : nm; g.fillText(t, cx, T + H + 22);
    });
    g.fillStyle = '#4a5568'; g.font = '13px sans-serif'; g.textAlign = 'center';
    g.fillText(`Barras: media · Bigotes: IC ${n((1 - R.alpha) * 100, 0)} % · Puntos: datos · Letras iguales = sin diferencia (${NOM[R.comp.metodo]})`, L + W / 2, alto - 12);
    g.save(); g.translate(18, T + H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('Respuesta', 0, 0); g.restore();
    return c.toDataURL('image/png');
  }

  // ───────────────────────── HTML / PDF ─────────────────────────
  function tablaHTML(cab, filas, claseIzq) {
    return `<table><thead><tr>${cab.map((c, i) => `<th${i < (claseIzq || 1) ? ' class="l"' : ''}>${h(c)}</th>`).join('')}</tr></thead><tbody>${filas.map(f => `<tr>${f.map((c, i) => `<td${i < (claseIzq || 1) ? ' class="l"' : ''}>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function html(R, ctx) {
    const M = modelo(R, ctx), img = graficoPNG(R);
    const sb = (x, y) => `<msub><mi>${x}</mi><mtext>${y}</mtext></msub>`, fr = (a, c) => `<mfrac><mrow>${a}</mrow><mrow>${c}</mrow></mfrac>`;
    const f1 = `<math><mi>F</mi><mo>=</mo>${fr(sb('CM', 'trat'), sb('CM', 'error'))}<mo>=</mo>${fr(sb('SC', 'trat') + '<mo>/</mo><mo>(</mo><mi>k</mi><mo>−</mo><mn>1</mn><mo>)</mo>', sb('SC', 'error') + '<mo>/</mo><mo>(</mo><mi>N</mi><mo>−</mo><mi>k</mi><mo>)</mo>')}</math>`;
    const f2 = `<math><msup><mi>η</mi><mn>2</mn></msup><mo>=</mo>${fr(sb('SC', 'trat'), sb('SC', 'total'))}<mspace width="2em"/><msup><mi>ω</mi><mn>2</mn></msup><mo>=</mo>${fr(sb('SC', 'trat') + '<mo>−</mo><mo>(</mo><mi>k</mi><mo>−</mo><mn>1</mn><mo>)</mo>' + sb('CM', 'error'), sb('SC', 'total') + '<mo>+</mo>' + sb('CM', 'error'))}</math>`;
    const css = `@page{size:A4;margin:18mm 16mm}*{box-sizing:border-box}body{font:11pt/1.5 'Segoe UI',Arial,sans-serif;color:#1a202c;max-width:820px;margin:0 auto;padding:18px}h1{font-size:20pt;margin:0 0 4px;color:#14305e}h2{font-size:13pt;color:#14305e;border-bottom:2px solid #c9d6ee;padding-bottom:3px;margin:20px 0 8px}.meta{color:#4a5568;font-size:10pt;margin-bottom:12px}table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:6px 0 10px;page-break-inside:avoid}th{background:#14305e;color:#fff;padding:5px 7px;text-align:right}td{padding:4px 7px;border-bottom:1px solid #dde4f0;text-align:right}th.l,td.l{text-align:left}tr:nth-child(even) td{background:#f5f8fd}.box{border-left:4px solid #2b6cb0;background:#eef4fc;padding:8px 12px;margin:8px 0;page-break-inside:avoid}.dec{font-weight:600}.formula{text-align:center;margin:8px 0;font-size:12pt}img{max-width:100%;page-break-inside:avoid}.nota{font-size:9pt;color:#4a5568}.foot{margin-top:24px;border-top:1px solid #cbd5e0;padding-top:8px;font-size:9pt;color:#4a5568}.noprint{margin-bottom:14px}.noprint button{font:600 13px sans-serif;padding:8px 16px;border:0;border-radius:6px;background:#14305e;color:#fff;cursor:pointer}@media print{.noprint{display:none}body{padding:0}}`;
    const pares = M.ords ? tablaHTML(['Par', 'Diferencia', 'EE', 'Pasos', 'Rango crítico', 'p', 'Conclusión'], M.pares.map(r => [r[0], r[1], r[2], r[3], r[4], r[5], r[6]])) : tablaHTML(['Par', 'Diferencia', 'EE', 'IC de la diferencia', 'p ajustado', 'Conclusión'], M.pares.map(r => [r[0], r[1], r[2], r[3], r[4], r[6]]));
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe ANOVA de un factor</title><style>${css}</style></head><body>
<div class="noprint"><button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button></div>
<h1>Informe de análisis de varianza (ANOVA) de un factor</h1>
<div class="meta">Generado con Estadilab · ${h(M.fecha)} · α = ${n(M.alpha, 2)} · k = ${M.k} tratamientos · N = ${M.N} observaciones</div>
${M.contexto ? `<div class="box"><b>Contexto:</b> ${h(M.contexto)}</div>` : ''}
<h2>1. Modelo e hipótesis</h2>
<p>Modelo: y<sub>ij</sub> = μ + τ<sub>i</sub> + ε<sub>ij</sub>, con ε<sub>ij</sub> ~ N(0, σ²) independientes. H₀: μ₁ = μ₂ = … = μ<sub>k</sub> frente a H₁: al menos una media difiere.</p>
<div class="formula">${f1}</div><div class="formula">${f2}</div>
<h2>2. Datos</h2>${tablaHTML(['Tratamiento', 'Observaciones'], M.datos)}
<h2>3. Resultados del ANOVA</h2>${tablaHTML(['Fuente', 'SC', 'gl', 'CM', 'F', 'p'], M.anova)}
<div class="box dec">${h(M.decision)} Tamaño del efecto: η² = ${M.efectos.eta2}; ω² = ${M.efectos.omega2}. Desviación estándar combinada = ${M.efectos.sp}.</div>
<h2>4. Medias y grupos homogéneos (${h(M.metodoNombre)})</h2>${tablaHTML(['Tratamiento', 'n', 'Media', 'Desv. est.', 'Grupo'], M.desc)}
<p class="nota">Los tratamientos que comparten una letra no difieren significativamente (α = ${n(M.alpha, 2)}).</p><img alt="Gráfico de medias" src="${img}">
<h2>5. Comparaciones por pares — ${h(M.metodoNombre)}</h2>${pares}
<h2>6. Verificación de supuestos</h2>${M.supuestos.length ? tablaHTML(['Prueba', 'Estadístico', 'p', 'Resultado'], M.supuestos) : '<p class="nota">Datos insuficientes para evaluar los supuestos.</p>'}
${M.ruta ? `<div class="box"><b>${h(M.ruta.titulo)}</b><br>${h(M.ruta.texto)}<ol>${M.ruta.pasos.map(x => `<li>${h(x)}</li>`).join('')}</ol></div>` : ''}
<h2>7. Pruebas alternativas</h2>${tablaHTML(['Prueba global', 'p', 'Conclusión'], M.alt)}
${M.potObs ? `<p class="nota">Potencia observada (a posteriori): ${M.potObs}. Úsala solo como referencia; para planear un experimento calcula la potencia antes de recolectar datos.</p>` : ''}
<h2>8. Conclusión</h2><div class="box">${h(M.conclusion).replace(/\n/g, '<br>')}</div>
<div class="foot">Informe generado automáticamente por la calculadora ANOVA de Estadilab (herramientaspro.com.co). Resultado orientativo: valide las decisiones importantes con un profesional en estadística. Referencias: Montgomery, D. C. (2017). <i>Design and Analysis of Experiments</i>. Wiley; Kutner et al. (2005). <i>Applied Linear Statistical Models</i>. McGraw-Hill.</div>
</body></html>`;
  }
  function imprimir(R, ctx) {
    const w = window.open('', '_blank'); if (!w) { alert('Permite las ventanas emergentes para generar el PDF.'); return; }
    w.document.open(); w.document.write(html(R, ctx)); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 500);
  }

  // ───────────────────────── LaTeX ─────────────────────────
  const tx = s => String(s).replace(/\\/g, '\\textbackslash{}').replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}').replace(/</g, '$<$').replace(/>/g, '$>$').replace(/≥/g, '$\\geq$').replace(/≤/g, '$\\leq$').replace(/₀/g, '$_0$').replace(/—/g, '---').replace(/−/g, '$-$').replace(/χ²/g, '$\\chi^2$').replace(/η²/g, '$\\eta^2$').replace(/ω²/g, '$\\omega^2$').replace(/α/g, '$\\alpha$').replace(/σ/g, '$\\sigma$').replace(/μ/g, '$\\mu$').replace(/Δ/g, '$\\Delta$').replace(/λ/g, '$\\lambda$').replace(/²/g, '$^2$').replace(/°/g, '$^\\circ$').replace(/±/g, '$\\pm$').replace(/…/g, '\\ldots{}').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/→/g, '$\\rightarrow$').replace(/·/g, '$\\cdot$').replace(/×/g, '$\\times$').replace(/√/g, '$\\surd$').replace(/[^\x00-\x7F\u00C0-\u017F]/g, '?');
  const tab = (cab, filas, fmt) => { const nc = cab.length; fmt = fmt || ('l' + 'r'.repeat(nc - 1)); return `\\begin{table}[H]\\centering\\small\n\\begin{tabular}{${fmt}}\\toprule\n${cab.map(c => /^\$[^$]+\$$/.test(c) ? `\\textbf{${c}}` : `\\textbf{${tx(c)}}`).join(' & ')} \\\\ \\midrule\n${filas.map(f => f.map(c => tx(c)).join(' & ') + ' \\\\').join('\n')}\n\\bottomrule\\end{tabular}\\end{table}\n`; };
  const nlx = s => String(s).replace('—', '--');
  function latex(R, ctx) {
    const M = modelo(R, ctx), A = R.A, k = R.nombres.length;
    const lista = R.nombres.map((nm, i) => `(${i + 1},${(A.medias[i]).toFixed(5)}) +- (0,${(Math.sqrt(A.msw / A.n[i]) * MV.invT(1 - R.alpha / 2, A.dfW)).toFixed(5)}) [${R.comp.letras[i]}]`);
    const sym = R.nombres.map(nm => '{' + tx(nm).replace(/[,]/g, '') + '}').join(',');
    const pares = M.ords ? tab(['Par', 'Diferencia', 'EE', 'Pasos', 'Rango crítico', '$p$', 'Conclusión'], M.pares, 'lrrrrrl') : tab(['Par', 'Diferencia', 'EE', 'IC de la diferencia', '$p$ ajustado', 'Conclusión'], M.pares.map(r => [r[0], r[1], r[2], r[3], r[4], r[6]]), 'lrrrrl');
    const L = String.raw;
    return [
      L`% Informe ANOVA de un factor — generado por Estadilab (herramientaspro.com.co)`,
      L`% Compila con pdflatex o súbelo a Overleaf. Requiere los paquetes: babel, amsmath, booktabs, float, pgfplots.`,
      L`\documentclass[11pt,a4paper]{article}`,
      L`\usepackage[utf8]{inputenc}\usepackage[T1]{fontenc}\usepackage[spanish]{babel}`,
      L`\usepackage{amsmath,amssymb,booktabs,float,geometry,pgfplots,enumitem}`,
      L`\geometry{margin=2.3cm}\pgfplotsset{compat=1.16}\decimalpoint`,
      L`\title{Informe de an\'alisis de varianza (ANOVA) de un factor}`,
      L`\author{Generado con Estadilab}`,
      L`\date{${tx(M.fecha)}}`,
      L`\begin{document}\maketitle`,
      M.contexto ? L`\noindent\textbf{Contexto.} ${tx(M.contexto)}\par\medskip` : '',
      L`\noindent Nivel de significancia $\alpha=${n(M.alpha, 2).replace(',', '{,}')}$; $k=${k}$ tratamientos; $N=${A.N}$ observaciones.`,
      L`\section{Modelo e hip\'otesis}`,
      L`\[ y_{ij}=\mu+\tau_i+\varepsilon_{ij},\qquad \varepsilon_{ij}\sim N(0,\sigma^2)\ \text{independientes},\quad i=1,\dots,k;\ j=1,\dots,n_i \]`,
      L`\[ H_0:\ \mu_1=\mu_2=\cdots=\mu_k \qquad\text{frente a}\qquad H_1:\ \text{al menos una media difiere} \]`,
      L`\[ F=\frac{CM_{\text{trat}}}{CM_{\text{error}}}=\frac{SC_{\text{trat}}/(k-1)}{SC_{\text{error}}/(N-k)},\qquad \eta^2=\frac{SC_{\text{trat}}}{SC_{\text{total}}},\qquad \omega^2=\frac{SC_{\text{trat}}-(k-1)CM_{\text{error}}}{SC_{\text{total}}+CM_{\text{error}}} \]`,
      L`\section{Datos}`,
      tab(['Tratamiento', 'Observaciones'], M.datos, 'lp{11cm}'),
      L`\section{Resultados del ANOVA}`,
      tab(['Fuente', 'SC', 'gl', 'CM', '$F$', '$p$'], M.anova),
      L`\noindent ${tx(M.decision)} Tama\~no del efecto: $\eta^2=${M.efectos.eta2.replace(',', '{,}')}$, $\omega^2=${M.efectos.omega2.replace(',', '{,}')}$.`,
      L`\section{Medias y grupos homog\'eneos (${tx(M.metodoNombre)})}`,
      tab(['Tratamiento', '$n$', 'Media', 'Desv. est.', 'Grupo'], M.desc),
      L`\noindent Los tratamientos que comparten una letra no difieren significativamente.`,
      L`\begin{figure}[H]\centering\begin{tikzpicture}\begin{axis}[ybar,width=0.92\textwidth,height=7cm,xtick={${R.nombres.map((_, i) => i + 1).join(',')}},xticklabels={${sym}},x tick label style={font=\footnotesize,rotate=${k > 4 ? 25 : 0},anchor=${k > 4 ? 'east' : 'north'}},ymajorgrids,ylabel={Respuesta},enlarge x limits=0.18,nodes near coords={\pgfplotspointmeta},nodes near coords style={font=\bfseries,yshift=2pt},point meta=explicit symbolic,bar width=0.9cm]`,
      L`\addplot+[fill=blue!30,draw=blue!60!black,error bars/.cd,y dir=both,y explicit] coordinates {${lista.join(' ')}};`,
      L`\end{axis}\end{tikzpicture}\caption{Media por tratamiento con IC del ${n((1 - R.alpha) * 100, 0)}\,\% y letras de grupos homog\'eneos.}\end{figure}`,
      L`\section{Comparaciones por pares: ${tx(M.metodoNombre)}}`,
      pares,
      L`\section{Verificaci\'on de supuestos}`,
      M.supuestos.length ? tab(['Prueba', 'Estadístico', '$p$', 'Resultado'], M.supuestos, 'lrrl') : L`Datos insuficientes para evaluar los supuestos.`,
      M.ruta ? L`\noindent\textbf{${tx(M.ruta.titulo)}.} ${tx(M.ruta.texto)}\begin{enumerate}[leftmargin=*]${M.ruta.pasos.map(x => L`\item ${tx(x)}`).join('')}\end{enumerate}` : '',
      L`\section{Pruebas alternativas}`,
      tab(['Prueba global', '$p$', 'Conclusión'], M.alt, 'lrl'),
      M.potObs ? L`\noindent Potencia observada (a posteriori): ${M.potObs.replace(',', '{,}')}.` : '',
      L`\section{Conclusi\'on}`,
      tx(M.conclusion).replace(/\n+/g, '\n\n'),
      L`\vfill\noindent{\footnotesize Informe generado por la calculadora ANOVA de Estadilab (herramientaspro.com.co). Resultado orientativo: valide las decisiones importantes con un profesional en estad\'istica. Referencias: Montgomery, D.~C. (2017), \emph{Design and Analysis of Experiments}, Wiley; Kutner et al.\ (2005), \emph{Applied Linear Statistical Models}, McGraw-Hill.}`,
      L`\end{document}`, ''
    ].join('\n');
  }

  // ───────────────────────── Word (.docx) ─────────────────────────
  const DOCX_URL = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js';
  function cargarDocx() {
    return new Promise((ok, err) => {
      if (window.docx) return ok(window.docx);
      const s = document.createElement('script'); s.src = DOCX_URL; s.onload = () => ok(window.docx); s.onerror = () => err(new Error('No se pudo cargar la biblioteca de Word. Revisa tu conexión.')); document.head.appendChild(s);
    });
  }
  async function docx(R, ctx) {
    const D = await cargarDocx(), M = modelo(R, ctx);
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun, BorderStyle, ShadingType } = D;
    const kids = [];
    const P = (t, o) => new Paragraph(Object.assign({ children: [new TextRun({ text: t, bold: o && o.bold, italics: o && o.italics, size: o && o.size })], spacing: { after: 100 } }, o && o.p));
    const H2 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 } });
    const tabla = (cab, filas, izq) => {
      izq = izq || 1; const w = Math.floor(9000 / cab.length);
      const cel = (t, i, head) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: head ? { type: ShadingType.CLEAR, fill: '14305E', color: 'auto' } : undefined, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [new Paragraph({ alignment: i < izq ? AlignmentType.LEFT : AlignmentType.RIGHT, children: [new TextRun({ text: String(t), bold: head, color: head ? 'FFFFFF' : undefined, size: 18 })] })] });
      return new Table({ width: { size: 9000, type: WidthType.DXA }, rows: [new TableRow({ tableHeader: true, children: cab.map((c, i) => cel(c, i, true)) })].concat(filas.map(f => new TableRow({ children: f.map((c, i) => cel(c, i, false)) }))) });
    };
    const gap = () => new Paragraph({ text: '', spacing: { after: 80 } });
    kids.push(new Paragraph({ text: 'Informe de análisis de varianza (ANOVA) de un factor', heading: HeadingLevel.TITLE }));
    kids.push(P(`Generado con Estadilab · ${M.fecha} · α = ${n(M.alpha, 2)} · k = ${M.k} tratamientos · N = ${M.N} observaciones`, { italics: true, size: 18 }));
    if (M.contexto) kids.push(P('Contexto: ' + M.contexto));
    kids.push(H2('1. Modelo e hipótesis'));
    kids.push(P('Modelo: yij = μ + τi + εij, con εij ~ N(0, σ²) independientes. H₀: μ₁ = μ₂ = … = μk frente a H₁: al menos una media difiere.'));
    // Fórmulas como texto con subíndices (se muestran igual en Word, LibreOffice y Google Docs)
    const fx = partes => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: partes.map(t => Array.isArray(t) ? new TextRun({ text: t[0], subScript: true, size: 24 }) : new TextRun({ text: t, size: 24 })) });
    kids.push(fx(['F = CM', ['trat'], ' / CM', ['error'], ' = [SC', ['trat'], ' / (k − 1)] / [SC', ['error'], ' / (N − k)]']));
    kids.push(fx(['η² = SC', ['trat'], ' / SC', ['total'], '      ω² = [SC', ['trat'], ' − (k − 1)·CM', ['error'], '] / [SC', ['total'], ' + CM', ['error'], ']']));
    kids.push(H2('2. Datos')); kids.push(tabla(['Tratamiento', 'Observaciones'], M.datos)); kids.push(gap());
    kids.push(H2('3. Resultados del ANOVA')); kids.push(tabla(['Fuente', 'SC', 'gl', 'CM', 'F', 'p'], M.anova)); kids.push(gap());
    kids.push(P(`${M.decision} Tamaño del efecto: η² = ${M.efectos.eta2}; ω² = ${M.efectos.omega2}. Desviación estándar combinada = ${M.efectos.sp}.`, { bold: true }));
    kids.push(H2(`4. Medias y grupos homogéneos (${M.metodoNombre})`)); kids.push(tabla(['Tratamiento', 'n', 'Media', 'Desv. est.', 'Grupo'], M.desc)); kids.push(gap());
    kids.push(P(`Los tratamientos que comparten una letra no difieren significativamente (α = ${n(M.alpha, 2)}).`, { italics: true, size: 18 }));
    try {
      const png = graficoPNG(R, 900, 460).split(',')[1], bin = atob(png), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: u8, transformation: { width: 560, height: 286 }, type: 'png' })] }));
    } catch (e) { }
    kids.push(H2(`5. Comparaciones por pares — ${M.metodoNombre}`));
    kids.push(M.ords ? tabla(['Par', 'Diferencia', 'EE', 'Pasos', 'Rango crítico', 'p', 'Conclusión'], M.pares) : tabla(['Par', 'Diferencia', 'EE', 'IC de la diferencia', 'p ajustado', 'Conclusión'], M.pares.map(r => [r[0], r[1], r[2], r[3], r[4], r[6]]))); kids.push(gap());
    kids.push(H2('6. Verificación de supuestos'));
    if (M.supuestos.length) kids.push(tabla(['Prueba', 'Estadístico', 'p', 'Resultado'], M.supuestos));
    kids.push(gap());
    if (M.ruta) { kids.push(P(M.ruta.titulo, { bold: true })); kids.push(P(M.ruta.texto)); M.ruta.pasos.forEach((x, i) => kids.push(P(`${i + 1}. ${x}`))); }
    kids.push(H2('7. Pruebas alternativas')); kids.push(tabla(['Prueba global', 'p', 'Conclusión'], M.alt)); kids.push(gap());
    if (M.potObs) kids.push(P(`Potencia observada (a posteriori): ${M.potObs}.`, { italics: true, size: 18 }));
    kids.push(H2('8. Conclusión')); M.conclusion.split(/\n+/).forEach(t => kids.push(P(t)));
    kids.push(gap());
    kids.push(P('Informe generado por la calculadora ANOVA de Estadilab (herramientaspro.com.co). Resultado orientativo: valide las decisiones importantes con un profesional en estadística. Referencias: Montgomery, D. C. (2017). Design and Analysis of Experiments. Wiley; Kutner et al. (2005). Applied Linear Statistical Models. McGraw-Hill.', { size: 16, italics: true }));
    const doc = new Document({ creator: 'Estadilab', title: 'Informe ANOVA de un factor', styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } }, sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
    return Packer.toBlob(doc);
  }

  function descargar(contenido, nombre, tipo) {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  return { modelo, html, imprimir, latex, docx, descargar, graficoPNG };
})();
if (typeof module !== 'undefined') module.exports = ReporteANOVA;
