/* Código R/Python + reportes (PDF, Word, LaTeX) — Estadilab
   Módulo compartido por las herramientas de Estadística.
   Cada herramienta entrega una "spec":
   {
     titulo, subtitulo, contexto, nombreBase,
     secciones: [ { h:'1. Título', items:[ item, ... ] }, ... ],
     pie: 'texto de referencias',
     codigoR, codigoPy
   }
   item = { p:'texto' } | { box:'texto' } | { nota:'texto' }
        | { formula:{ html, tex, parts } }         // parts: ['F = CM', ['trat'], ...] (arreglos = subíndice)
        | { tabla:{ cab:[], filas:[[]], izq:1, fmt:'lrr' } }   // cab con $...$ se pasa tal cual a LaTeX
        | { img:'data:image/png;base64,...', w:560, h:286 }
        | { pgf:'\\begin{tikzpicture}...' }        // solo LaTeX (si hay img se usa en HTML/Word)
        | { lista:['a','b'] }
*/
const HPCodigo = (function () {
  const h = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hoy = () => new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const fmt = (v, d = 3) => (v === null || v === undefined || typeof v !== 'number' || isNaN(v) || !isFinite(v)) ? '—' : v.toFixed(d).replace('.', ',');
  const fp = v => (v === null || v === undefined || isNaN(v)) ? '—' : (v < 0.0001 ? '< 0,0001' : v.toFixed(4).replace('.', ','));
  const num = (v, d = 12) => (typeof v === 'number' && isFinite(v)) ? String(+v.toPrecision(d)) : 'NA';
  const rStr = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const rVec = a => 'c(' + a.map(v => num(v)).join(', ') + ')';
  const pyVec = a => '[' + a.map(v => num(v)).join(', ') + ']';

  // ───────────────────────── HTML ─────────────────────────
  function tablaHTML(t) {
    const iz = t.izq == null ? 1 : t.izq;
    return `<table><thead><tr>${t.cab.map((c, i) => `<th${i < iz ? ' class="l"' : ''}>${h(String(c).replace(/\$/g, ''))}</th>`).join('')}</tr></thead><tbody>${t.filas.map(f => `<tr>${f.map((c, i) => `<td${i < iz ? ' class="l"' : ''}>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function itemHTML(it) {
    if (it.p != null) return `<p>${h(it.p)}</p>`;
    if (it.box != null) return `<div class="box">${h(it.box).replace(/\n/g, '<br>')}</div>`;
    if (it.nota != null) return `<p class="nota">${h(it.nota)}</p>`;
    if (it.formula) return `<div class="formula">${it.formula.html || h(it.formula.txt || '')}</div>`;
    if (it.tabla) return tablaHTML(it.tabla);
    if (it.img) return `<img alt="Gráfico" src="${it.img}">`;
    if (it.lista) return `<ul>${it.lista.map(x => `<li>${h(x)}</li>`).join('')}</ul>`;
    return '';
  }
  const CSS = `@page{size:A4;margin:18mm 16mm}*{box-sizing:border-box}body{font:11pt/1.5 'Segoe UI',Arial,sans-serif;color:#1a202c;max-width:820px;margin:0 auto;padding:18px}h1{font-size:20pt;margin:0 0 4px;color:#14305e}h2{font-size:13pt;color:#14305e;border-bottom:2px solid #c9d6ee;padding-bottom:3px;margin:20px 0 8px}.meta{color:#4a5568;font-size:9.5pt;margin-bottom:12px}table{border-collapse:collapse;width:100%;margin:8px 0;font-size:10pt}th{background:#14305e;color:#fff;padding:5px 8px;text-align:right}td{padding:4px 8px;text-align:right;border-bottom:1px solid #dbe3f3}th.l,td.l{text-align:left}tr:nth-child(even) td{background:#f4f7fc}.box{background:#eef3fc;border-left:4px solid #2b5fb4;padding:8px 12px;margin:10px 0}.formula{text-align:center;margin:10px 0;font-size:12pt}.nota{font-size:9.5pt;color:#4a5568;font-style:italic}img{max-width:100%;display:block;margin:10px auto}.foot{margin-top:24px;font-size:8.5pt;color:#4a5568;border-top:1px solid #c9d6ee;padding-top:6px}.noprint{margin-bottom:12px}.noprint button{padding:6px 14px;font-size:11pt;cursor:pointer}@media print{.noprint{display:none}body{padding:0}}`;
  function html(S) {
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${h(S.titulo)}</title><style>${CSS}</style></head><body>
<div class="noprint"><button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button></div>
<h1>${h(S.titulo)}</h1>
<div class="meta">Generado con Estadilab · ${h(hoy())}${S.subtitulo ? ' · ' + h(S.subtitulo) : ''}</div>
${S.contexto ? `<div class="box"><b>Contexto:</b> ${h(S.contexto)}</div>` : ''}
${S.secciones.map(s => `<h2>${h(s.h)}</h2>${s.items.map(itemHTML).join('')}`).join('\n')}
<div class="foot">${h(S.pie || '')} Informe generado automáticamente por Estadilab (herramientaspro.com.co). Resultado orientativo: valide las decisiones importantes con un profesional en estadística.</div>
</body></html>`;
  }
  function imprimir(S) {
    const w = window.open('', '_blank'); if (!w) { alert('Permite las ventanas emergentes para generar el PDF.'); return; }
    w.document.open(); w.document.write(html(S)); w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 500);
  }

  // ───────────────────────── LaTeX ─────────────────────────
  const tx = s => String(s == null ? '' : s).replace(/\\/g, '\\textbackslash{}').replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}').replace(/</g, '$<$').replace(/>/g, '$>$').replace(/≥/g, '$\\geq$').replace(/≤/g, '$\\leq$').replace(/₀/g, '$_0$').replace(/₁/g, '$_1$').replace(/₂/g, '$_2$').replace(/—/g, '---').replace(/−/g, '$-$').replace(/α/g, '$\\alpha$').replace(/β/g, '$\\beta$').replace(/χ/g, '$\\chi$').replace(/μ/g, '$\\mu$').replace(/σ/g, '$\\sigma$').replace(/ρ/g, '$\\rho$').replace(/η/g, '$\\eta$').replace(/ω/g, '$\\omega$').replace(/²/g, '$^2$').replace(/ŷ/g, '$\\hat{y}$').replace(/±/g, '$\\pm$').replace(/×/g, '$\\times$').replace(/·/g, '$\\cdot$').replace(/\u2260/g, '$\\neq$').replace(/̄/g, '').replace(/…/g, '\\dots{}');
  const cabTex = c => /^\$[^$]+\$$/.test(c) ? `\\textbf{${c}}` : `\\textbf{${tx(c)}}`;
  function tabTex(t) {
    const nc = t.cab.length, f = t.fmt || ('l' + 'r'.repeat(nc - 1));
    return `\\begin{table}[H]\\centering\\small\n\\begin{tabular}{${f}}\\toprule\n${t.cab.map(cabTex).join(' & ')} \\\\ \\midrule\n${t.filas.map(r => r.map(c => tx(c)).join(' & ')).join(' \\\\\n')} \\\\ \\bottomrule\n\\end{tabular}\\end{table}`;
  }
  function itemTex(it) {
    if (it.p != null) return tx(it.p) + '\n';
    if (it.box != null) return `\\begin{quote}\\small ${tx(it.box).replace(/\n+/g, '\\\\ ')}\\end{quote}`;
    if (it.nota != null) return `\\noindent{\\small\\emph{${tx(it.nota)}}}\\par`;
    if (it.formula) return it.formula.tex ? `\\[ ${it.formula.tex} \\]` : '';
    if (it.tabla) return tabTex(it.tabla);
    if (it.pgf) return `\\begin{figure}[H]\\centering${it.pgf}\\end{figure}`;
    if (it.lista) return `\\begin{itemize}${it.lista.map(x => `\\item ${tx(x)}`).join(' ')}\\end{itemize}`;
    return '';
  }
  function latex(S) {
    const L = String.raw;
    const usaPgf = S.secciones.some(s => s.items.some(i => i.pgf));
    return [
      L`% ${S.titulo} — generado por Estadilab (herramientaspro.com.co)`,
      L`% Compila con pdflatex o súbelo a Overleaf. Paquetes: babel, amsmath, booktabs, float${usaPgf ? ', pgfplots' : ''}.`,
      L`\documentclass[11pt,a4paper]{article}`,
      L`\usepackage[utf8]{inputenc}\usepackage[T1]{fontenc}\usepackage[spanish]{babel}`,
      L`\usepackage{amsmath,amssymb,booktabs,float,geometry,enumitem${usaPgf ? ',pgfplots' : ''}}`,
      L`\geometry{margin=2.3cm}${usaPgf ? L`\pgfplotsset{compat=1.16}` : ''}\decimalpoint`,
      L`\title{${tx(S.titulo)}}`,
      L`\author{Generado con Estadilab}`,
      L`\date{${tx(hoy())}}`,
      L`\begin{document}\maketitle`,
      S.subtitulo ? L`\noindent ${tx(S.subtitulo)}\par\medskip` : '',
      S.contexto ? L`\noindent\textbf{Contexto.} ${tx(S.contexto)}\par\medskip` : '',
      ...S.secciones.map(s => L`\section{${tx(s.h.replace(/^\d+\.\s*/, ''))}}` + '\n' + s.items.map(itemTex).join('\n')),
      L`\vfill\noindent{\footnotesize ${tx(S.pie || '')} Informe generado por Estadilab (herramientaspro.com.co). Resultado orientativo: valide las decisiones importantes con un profesional en estad\'istica.}`,
      L`\end{document}`, ''
    ].join('\n');
  }

  // ───────────────────────── Word ─────────────────────────
  const DOCX_URL = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js';
  function cargarDocx() {
    return new Promise((ok, err) => {
      if (window.docx) return ok(window.docx);
      const s = document.createElement('script'); s.src = DOCX_URL; s.onload = () => ok(window.docx); s.onerror = () => err(new Error('No se pudo cargar la biblioteca de Word. Revisa tu conexión.')); document.head.appendChild(s);
    });
  }
  async function docx(S) {
    const D = await cargarDocx();
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun, ShadingType } = D;
    const kids = [];
    const P = (t, o) => new Paragraph(Object.assign({ children: [new TextRun({ text: String(t), bold: o && o.bold, italics: o && o.italics, size: o && o.size })], spacing: { after: 100 } }, o && o.p));
    const H2 = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 } });
    const gap = () => new Paragraph({ text: '', spacing: { after: 80 } });
    const tabla = t => {
      const iz = t.izq == null ? 1 : t.izq, w = Math.floor(9000 / t.cab.length);
      const cel = (txt, i, head) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: head ? { type: ShadingType.CLEAR, fill: '14305E', color: 'auto' } : undefined, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [new Paragraph({ alignment: i < iz ? AlignmentType.LEFT : AlignmentType.RIGHT, children: [new TextRun({ text: String(txt).replace(/\$/g, ''), bold: head, color: head ? 'FFFFFF' : undefined, size: 19 })] })] });
      return new Table({ width: { size: 9000, type: WidthType.DXA }, rows: [new TableRow({ tableHeader: true, children: t.cab.map((c, i) => cel(c, i, true)) })].concat(t.filas.map(f => new TableRow({ children: f.map((c, i) => cel(c, i, false)) }))) });
    };
    const fx = partes => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: partes.map(t => Array.isArray(t) ? new TextRun({ text: t[0], subScript: true, size: 24 }) : new TextRun({ text: t, size: 24 })) });
    kids.push(new Paragraph({ text: S.titulo, heading: HeadingLevel.TITLE }));
    kids.push(P(`Generado con Estadilab · ${hoy()}${S.subtitulo ? ' · ' + S.subtitulo : ''}`, { italics: true, size: 18 }));
    if (S.contexto) kids.push(P('Contexto: ' + S.contexto));
    S.secciones.forEach(s => {
      kids.push(H2(s.h));
      s.items.forEach(it => {
        if (it.p != null) kids.push(P(it.p));
        else if (it.box != null) String(it.box).split(/\n+/).forEach(t => kids.push(P(t, { bold: true })));
        else if (it.nota != null) kids.push(P(it.nota, { italics: true, size: 18 }));
        else if (it.formula) kids.push(it.formula.parts ? fx(it.formula.parts) : P(it.formula.txt || '', { p: { alignment: AlignmentType.CENTER } }));
        else if (it.tabla) { kids.push(tabla(it.tabla)); kids.push(gap()); }
        else if (it.lista) it.lista.forEach(x => kids.push(P('• ' + x)));
        else if (it.img) {
          try {
            const bin = atob(it.img.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: u8, transformation: { width: it.w || 560, height: it.h || 300 }, type: 'png' })] }));
          } catch (e) { }
        }
      });
    });
    kids.push(gap());
    kids.push(P((S.pie || '') + ' Informe generado por Estadilab (herramientaspro.com.co). Resultado orientativo: valide las decisiones importantes con un profesional en estadística.', { italics: true, size: 16 }));
    const doc = new Document({ creator: 'Estadilab', title: S.titulo, styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } }, sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: kids }] });
    return Packer.toBlob(doc);
  }

  function descargar(contenido, nombre, tipo) {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  // Gráfico PNG genérico en canvas: dispersión con recta, o barras con barras de error
  function lienzo(w, hh) { const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); return [c, g]; }
  function dispersionPNG(x, y, recta, xl, yl) {
    const W = 900, H = 520, m = { l: 80, r: 30, t: 30, b: 70 }, [c, g] = lienzo(W, H);
    const xs = x.concat(recta ? recta.map(p => p[0]) : []), ys = y.concat(recta ? recta.map(p => p[1]) : []);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const px = (x1 - x0) * 0.06 || 1, py = (y1 - y0) * 0.08 || 1; x0 -= px; x1 += px; y0 -= py; y1 += py;
    const X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    g.strokeStyle = '#e1e7f3'; g.fillStyle = '#4a5568'; g.font = '16px Arial'; g.lineWidth = 1;
    for (let i = 0; i <= 5; i++) { const vx = x0 + (x1 - x0) * i / 5, vy = y0 + (y1 - y0) * i / 5; g.beginPath(); g.moveTo(X(vx), m.t); g.lineTo(X(vx), H - m.b); g.moveTo(m.l, Y(vy)); g.lineTo(W - m.r, Y(vy)); g.stroke(); g.textAlign = 'center'; g.fillText(+vx.toPrecision(3), X(vx), H - m.b + 22); g.textAlign = 'right'; g.fillText(+vy.toPrecision(3), m.l - 8, Y(vy) + 5); }
    g.strokeStyle = '#1a202c'; g.strokeRect(m.l, m.t, W - m.l - m.r, H - m.t - m.b);
    if (recta) { g.strokeStyle = '#d64545'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(recta[0][0]), Y(recta[0][1])); g.lineTo(X(recta[1][0]), Y(recta[1][1])); g.stroke(); }
    g.fillStyle = '#2b5fb4'; x.forEach((v, i) => { g.beginPath(); g.arc(X(v), Y(y[i]), 5, 0, 7); g.fill(); });
    g.fillStyle = '#1a202c'; g.font = 'bold 17px Arial'; g.textAlign = 'center'; g.fillText(xl || 'X', (m.l + W - m.r) / 2, H - 20);
    g.save(); g.translate(22, (m.t + H - m.b) / 2); g.rotate(-Math.PI / 2); g.fillText(yl || 'Y', 0, 0); g.restore();
    return c.toDataURL('image/png');
  }
  function barrasPNG(etiquetas, medias, errores, etiq2, yl) {
    const W = 900, H = 520, m = { l: 80, r: 30, t: 30, b: 80 }, [c, g] = lienzo(W, H);
    const lo = Math.min(0, ...medias.map((v, i) => v - (errores ? errores[i] : 0))), hi = Math.max(...medias.map((v, i) => v + (errores ? errores[i] : 0)));
    const y0 = lo, y1 = hi + (hi - lo) * 0.1 || 1, Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b), bw = (W - m.l - m.r) / etiquetas.length;
    g.font = '16px Arial'; g.fillStyle = '#4a5568'; g.strokeStyle = '#e1e7f3';
    for (let i = 0; i <= 5; i++) { const v = y0 + (y1 - y0) * i / 5; g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(W - m.r, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(+v.toPrecision(3), m.l - 8, Y(v) + 5); }
    etiquetas.forEach((e, i) => { const cx = m.l + bw * (i + 0.5); g.fillStyle = '#7ea2dd'; g.fillRect(cx - bw * 0.3, Y(Math.max(medias[i], 0)), bw * 0.6, Math.abs(Y(medias[i]) - Y(0))); g.strokeStyle = '#14305e'; g.lineWidth = 2; if (errores) { g.beginPath(); g.moveTo(cx, Y(medias[i] - errores[i])); g.lineTo(cx, Y(medias[i] + errores[i])); g.stroke(); } g.fillStyle = '#1a202c'; g.textAlign = 'center'; g.font = '15px Arial'; g.fillText(String(e).slice(0, 16), cx, H - m.b + 24); if (etiq2) { g.font = 'bold 18px Arial'; g.fillText(etiq2[i], cx, Y(medias[i] + (errores ? errores[i] : 0)) - 8); } });
    g.strokeStyle = '#1a202c'; g.strokeRect(m.l, m.t, W - m.l - m.r, H - m.t - m.b);
    g.fillStyle = '#1a202c'; g.font = 'bold 17px Arial'; g.save(); g.translate(22, (m.t + H - m.b) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(yl || 'Valor', 0, 0); g.restore();
    return c.toDataURL('image/png');
  }

  // ───────────────────────── Interfaz ─────────────────────────
  const CSS_UI = `.hpc{margin-top:1.4rem;padding:1rem;border:1px solid var(--border,#2a3a5c);border-radius:10px;background:rgba(127,127,127,.06)}.hpc h3{margin:0 0 .3rem;font-size:1rem}.hpc .sub{font-size:.8rem;opacity:.75;margin:0 0 .7rem}.hpc .fila{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.5rem 0}.hpc select,.hpc button{font:inherit;font-size:.85rem;padding:.4rem .8rem;border-radius:7px;border:1px solid var(--border,#2a3a5c);background:var(--surface,#1a2340);color:inherit;cursor:pointer}.hpc button:hover{border-color:var(--accent,#00d4ff)}.hpc{min-width:0;max-width:100%;box-sizing:border-box}.hpc pre{display:block;width:0;min-width:100%;box-sizing:border-box;margin:.5rem 0;padding:.8rem;max-height:340px;overflow:auto;border-radius:8px;background:#0b1224;color:#d7e3ff;font:12px/1.5 'Space Mono',Consolas,monospace;white-space:pre}.hpc .msg{font-size:.8rem;min-height:1.1em;opacity:.85}.hpc .lbl{font-size:.8rem;opacity:.75}.hpc a{color:var(--accent,#00d4ff)}`;
  let _uid = 0;
  function montar(el, spec) {
    if (!el) return;
    if (!document.getElementById('hpc-css')) { const s = document.createElement('style'); s.id = 'hpc-css'; s.textContent = CSS_UI; document.head.appendChild(s); }
    // spec puede ser un objeto o una función (se reevalúa en cada acción, así toma el contexto escrito después)
    const get = () => typeof spec === 'function' ? spec() : spec, S0 = get();
    const id = 'hpc' + (++_uid), base = S0.nombreBase || 'analisis';
    const lenguajes = [['r', 'R'], ['py', 'Python']].filter(l => S0['codigo' + (l[0] === 'r' ? 'R' : 'Py')]);
    el.innerHTML = `<div class="hpc" id="${id}"><h3>💻 Código y reporte</h3>
<p class="sub">Reproduce este análisis en R o Python con tus datos ya incluidos, y descarga el informe listo para entregar.</p>
<div class="fila"><span class="lbl">Lenguaje:</span><select data-k="lang">${lenguajes.map(l => `<option value="${l[0]}">${l[1]}</option>`).join('')}</select>
<button data-k="copiar">📋 Copiar código</button><button data-k="bajar">⬇ Descargar código</button></div>
<pre data-k="codigo"></pre>
<div class="fila"><span class="lbl">Informe:</span><button data-k="pdf">🖨️ PDF</button><button data-k="word">📄 Word (.docx)</button><button data-k="tex">∑ LaTeX (.tex)</button><button data-k="texc">📋 Copiar LaTeX</button></div>
<div class="msg" data-k="msg"></div>
<p class="sub">R: RStudio. Python: Google Colab o Jupyter (los paquetes que falten se instalan solos). LaTeX: súbelo a <a href="https://www.overleaf.com" target="_blank" rel="noopener">Overleaf</a>.</p></div>`;
    const q = k => el.querySelector(`[data-k="${k}"]`), msg = t => { q('msg').textContent = t; if (t) setTimeout(() => { if (q('msg').textContent === t) q('msg').textContent = ''; }, 4000); };
    const cod = () => q('lang').value === 'r' ? S0.codigoR : S0.codigoPy;
    const pintar = () => { q('codigo').textContent = cod(); };
    pintar();
    q('lang').onchange = pintar;
    q('copiar').onclick = () => { navigator.clipboard.writeText(cod()).then(() => msg('✓ Código copiado'), () => msg('No se pudo copiar; selecciónalo manualmente.')); };
    q('bajar').onclick = () => { const r = q('lang').value === 'r'; descargar(cod(), base + (r ? '.R' : '.py')); msg('✓ Descargado ' + base + (r ? '.R' : '.py')); };
    q('pdf').onclick = () => imprimir(get());
    q('word').onclick = async () => { msg('Generando Word…'); try { descargar(await docx(get()), 'informe_' + base + '.docx'); msg('✓ Informe Word descargado'); } catch (e) { msg('⚠ ' + e.message); } };
    q('tex').onclick = () => { descargar(latex(get()), 'informe_' + base + '.tex', 'application/x-tex;charset=utf-8'); msg('✓ Archivo .tex descargado'); };
    q('texc').onclick = () => { navigator.clipboard.writeText(latex(get())).then(() => msg('✓ LaTeX copiado'), () => msg('No se pudo copiar.')); };
  }

  return { montar, html, latex, docx, imprimir, descargar, tx, fmt, fp, num, rStr, rVec, pyVec, h, hoy, dispersionPNG, barrasPNG };
})();
if (typeof module !== 'undefined') module.exports = HPCodigo;
