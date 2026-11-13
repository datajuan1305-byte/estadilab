/* Interfaz de «Pruebas no paramétricas» — Estadilab */
(function () {
  'use strict';
  const P = NPP, TESTS = P.TESTS, TABS = P.TABS, H = HPCodigo;
  const $ = id => document.getElementById(id), esc = H.h;
  const st = { tab: TABS[0].id, sel: {}, vals: {}, alpha: 0.05, chart: null, chart2: null, ultimo: null }; TABS.forEach(t => { st.sel[t.id] = t.tests[0]; });
  const ACC = '#00d4ff', ACC2 = '#7b61ff', GOLD = '#ffd700', GRID = 'rgba(42,58,92,0.45)', TXT = '#8a9bb8';

  // ───────── navegación ─────────
  function hash() { try { history.replaceState(null, '', '#' + st.tab + '/' + st.sel[st.tab]); } catch (e) { } }
  function leerHash() {
    const m = (location.hash || '').replace('#', '').split('/'); const t = TABS.find(x => x.id === m[0]);
    if (t && !t.pronto) { st.tab = t.id; if (m[1] && t.tests.includes(m[1])) st.sel[t.id] = m[1]; }
  }
  function pintarTabs() {
    $('np-tabs').innerHTML = TABS.map((t, i) => `<button class="np-tab${t.id === st.tab ? ' on' : ''}${t.pronto ? ' pronto' : ''}" data-tab="${t.id}" role="tab" aria-selected="${t.id === st.tab}"><span class="num">${i + 1}</span><span class="nm">${esc(t.nombre)}</span>${t.pronto ? '<span class="soon">Pronto</span>' : '<span class="cnt">' + t.tests.length + ' pruebas</span>'}</button>`).join('');
    $('np-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; pintarTodo(); hash(); });
  }
  function pintarPruebas() {
    const t = TABS.find(x => x.id === st.tab), cont = $('np-pruebas');
    $('np-tabdesc').textContent = t.desc;
    if (t.pronto) { cont.innerHTML = ''; $('np-app-body').style.display = 'none'; $('np-pronto').style.display = 'block'; $('np-pronto').innerHTML = '<strong>' + esc(t.nombre) + '</strong> — en desarrollo. ' + esc(t.desc) + ' Estará disponible en la próxima actualización.'; return false; }
    $('np-app-body').style.display = ''; $('np-pronto').style.display = 'none';
    cont.innerHTML = t.tests.map(k => `<button class="np-chip${k === st.sel[st.tab] ? ' on' : ''}" data-t="${k}">${esc(TESTS[k].corto)}</button>`).join('');
    cont.querySelectorAll('button').forEach(b => b.onclick = () => { st.sel[st.tab] = b.dataset.t; pintarTodo(); hash(); });
    return true;
  }
  function pintarTodo() { pintarTabs(); if (!pintarPruebas()) return; pintarInfo(); pintarForm(); limpiarResultado(); }

  // ───────── información de la prueba ─────────
  function pintarInfo() {
    const T = TESTS[st.sel[st.tab]];
    $('np-info').innerHTML = `<h2>${esc(T.nombre)}</h2><p>${esc(T.cuando)}</p><p class="dt"><strong>Datos:</strong> ${esc(T.datos)}</p><details><summary>Supuestos y condiciones</summary><ul>${T.supuestos.map(s => '<li>' + esc(s) + '</li>').join('')}</ul></details>`;
  }

  // ───────── formulario ─────────
  function valores(key) { return st.vals[key] || (st.vals[key] = {}); }
  function pintarForm() {
    const key = st.sel[st.tab], T = TESTS[key], v = valores(key);
    T.campos.forEach(c => { if (!(c.id in v)) v[c.id] = c.def !== undefined ? JSON.parse(JSON.stringify(c.def)) : ''; });
    let h = '';
    T.campos.forEach(c => {
      if (c.show && !c.show(v)) return;
      const id = 'f_' + c.id;
      if (c.type === 'grupos') {
        const gs = v[c.id]; h += '<div class="param-group"><label>' + esc(c.label) + '</label><div id="grp-wrap">' + gs.map((g, i) => `<div class="grp-item"><div class="grp-top"><input type="text" class="grp-n" data-i="${i}" value="${esc(g.n)}" maxlength="30" aria-label="Nombre del grupo ${i + 1}">${gs.length > c.min ? `<button type="button" class="grp-del" data-i="${i}" aria-label="Quitar grupo">✕</button>` : ''}</div><textarea class="grp-v" data-i="${i}" rows="2" placeholder="Valores del grupo, separados por espacios o comas" spellcheck="false">${esc(g.v)}</textarea></div>`).join('') + '</div>' + (gs.length < c.max ? '<button type="button" class="np-sec grp-add">+ Agregar grupo</button>' : '') + '<div class="hint">Cada grupo en su casilla. Puede cambiar los nombres.</div></div>';
        return;
      }
      const val = esc(v[c.id]);
      let ctl;
      if (c.type === 'ta') ctl = `<textarea id="${id}" rows="${c.rows || 3}" placeholder="${esc(c.ph || '')}" spellcheck="false">${val}</textarea>`;
      else if (c.type === 'sel') ctl = `<select id="${id}">${c.opts.map(o => `<option value="${esc(o[0])}"${o[0] === v[c.id] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
      else if (c.type === 'txt') ctl = `<input type="text" id="${id}" value="${val}" maxlength="40">`;
      else ctl = `<input type="number" id="${id}" value="${val}" step="${c.step || 'any'}"${c.min != null ? ' min="' + c.min + '"' : ''} inputmode="decimal">`;
      h += `<div class="param-group"><label for="${id}">${esc(c.label)}</label>${ctl}${c.hint ? '<div class="hint">' + esc(c.hint) + '</div>' : ''}</div>`;
    });
    $('np-campos').innerHTML = h;
    T.campos.filter(c => c.type === 'grupos').forEach(c => {
      const gs = v[c.id], w = $('np-campos');
      w.querySelectorAll('.grp-n').forEach(e => e.addEventListener('input', () => { gs[+e.dataset.i].n = e.value; }));
      w.querySelectorAll('.grp-v').forEach(e => e.addEventListener('input', () => { gs[+e.dataset.i].v = e.value; }));
      w.querySelectorAll('.grp-del').forEach(e => e.onclick = () => { gs.splice(+e.dataset.i, 1); pintarForm(); });
      const add = w.querySelector('.grp-add'); if (add) add.onclick = () => { gs.push({ n: 'Grupo ' + (gs.length + 1), v: '' }); pintarForm(); };
    });
    T.campos.forEach(c => { const el = $('f_' + c.id); if (!el) return; const ev = c.type === 'sel' ? 'change' : 'input'; el.addEventListener(ev, () => { v[c.id] = el.value; if (c.type === 'sel' && T.campos.some(k => k.show)) pintarForm(); }); });
    $('np-archivo-txt').textContent = 'Al cargar el archivo elige la hoja, las columnas y las filas que quieres usar';
    $('np-error').style.display = 'none';
  }
  function setValor(id, txt) { const key = st.sel[st.tab]; valores(key)[id] = txt; const el = $('f_' + id); if (el) el.value = txt; }

  function cargarEjemplo() {
    const key = st.sel[st.tab], T = TESTS[key], v = valores(key);
    Object.keys(T.ejemplo).forEach(k => v[k] = T.ejemplo[k]); pintarForm(); calcular();
  }

  // ───────── archivos ─────────
  function colNums(filas, j) { const o = []; filas.forEach(f => { if (!f) return; const t = f[j]; const n = typeof t === 'number' ? t : parseFloat(String(t == null ? '' : t).replace(',', '.')); if (isFinite(n) && String(t).trim() !== '') o.push(n); }); return o; }
  function aplicarArchivo(filas, nombre) {
    const key = st.sel[st.tab], T = TESTS[key]; let hdr = null;
    if (T.cargar) { let sets; try { sets = T.cargar(filas); } catch (e) { return err(e.message); } Object.keys(sets).forEach(k => setValor(k, sets[k])); pintarForm(); $('np-error').style.display = 'none'; const inf0 = $('np-archivo-info'); inf0.textContent = '✓ Datos cargados desde «' + nombre + '». Revise las casillas y presione Calcular.'; inf0.className = 'archivo-info visible'; return; }
    if (filas.length && filas[0] && filas[0].some(c => c != null && isNaN(parseFloat(String(c).replace(',', '.'))))) { hdr = filas[0].map(c => c == null ? '' : String(c)); filas = filas.slice(1); }
    if (T.tab === 'kind' || T.tab === 'var' || T.tab === 'sup') {
      const ncol = Math.max.apply(null, filas.map(f => f ? f.length : 0)), gs = [];
      for (let j = 0; j < Math.min(ncol, 8); j++) { const c = colNums(filas, j); if (c.length) gs.push({ n: (hdr && hdr[j]) ? hdr[j].slice(0, 30) : 'Grupo ' + (gs.length + 1), v: c.join(' ') }); }
      if (gs.length < 2) return err('No se encontraron al menos dos columnas numéricas en «' + nombre + '».');
      valores(key).grp = gs;
    } else if (T.tab === 'krel') {
      const m = filas.filter(f => f && f.length >= 2 && f.every(c => c != null && isFinite(parseFloat(String(c).replace(',', '.')))));
      if (m.length < 2) return err('No se encontró una tabla numérica en «' + nombre + '».');
      setValor('mat', (hdr ? hdr.join(' ') + '\n' : '') + m.map(f => f.map(c => String(c).replace(',', '.')).join(' ')).join('\n'));
    } else if (T.tab === 'dos' || T.tab === 'rel2') {
      const a = colNums(filas, 0), b = colNums(filas, 1); if (a.length < 2 || b.length < 2) return err('No se encontraron dos columnas numéricas (grupo A y grupo B) en «' + nombre + '».');
      setValor('gA', a.join(' ')); setValor('gB', b.join(' ')); if (hdr) { if (hdr[0]) setValor('nA', hdr[0].slice(0, 40)); if (hdr[1]) setValor('nB', hdr[1].slice(0, 40)); }
    } else {
      const a = colNums(filas, 0); if (a.length < 2) return err('No se encontró una columna numérica en «' + nombre + '».');
      const campo = T.campos.find(c => c.type === 'ta'); if (!campo) return;
      if (key === 'chi2') setValor('modo', 'frec'); setValor(campo.id, a.join(' '));
    }
    pintarForm(); $('np-error').style.display = 'none'; const inf = $('np-archivo-info'); inf.textContent = '✓ Datos cargados desde «' + nombre + '». Revise las casillas y presione Calcular.'; inf.className = 'archivo-info visible';
  }
  function leerArchivo(e) {
    const key = st.sel[st.tab], T = TESTS[key], tab = T.tab, ay = T.archivoTxt || '';
    let roles, agrupar = false, pareado = false, titulo = 'Elegir los datos del archivo', ayuda;
    if (T.cargar) { roles = [{ id: 'c', label: 'Columnas a usar', tipo: 'cat', multi: true, min: 1, max: 12 }]; pareado = true; titulo = 'Elegir las columnas de categorías'; ayuda = ay + '. Si carga una tabla de frecuencias, incluya también la columna con los nombres de las filas.'; }
    else if (tab === 'dos') { roles = [{ id: 'c', label: 'Valores (dos columnas, una por grupo)', tipo: 'num', multi: true, min: 2, max: 2 }]; agrupar = true; ayuda = 'Marque dos columnas numéricas (una por grupo) o elija una sola columna de valores y divídala en dos grupos con otra columna (por ejemplo «Peso» según «Sexo»).'; }
    else if (tab === 'rel2') { roles = [{ id: 'c', label: 'Condición 1 y condición 2 (misma unidad en cada fila)', tipo: 'num', multi: true, min: 2, max: 2 }]; pareado = true; ayuda = 'Marque las dos columnas pareadas. Solo se usan las filas con ambos valores.'; }
    else if (tab === 'kind' || tab === 'var' || tab === 'sup') { roles = [{ id: 'c', label: 'Valores (una columna por grupo)', tipo: 'num', multi: true, min: 2, max: 8 }]; agrupar = true; ayuda = 'Marque una columna numérica por grupo o elija una sola columna de valores y divídala en grupos con otra columna (por ejemplo «Calificación» según «Estado civil»).'; }
    else if (tab === 'krel') { roles = [{ id: 'c', label: 'Mediciones repetidas (una columna por condición)', tipo: 'num', multi: true, min: 2, max: 12 }]; pareado = true; ayuda = 'Cada fila es un sujeto y cada columna una condición. Solo se usan las filas completas.'; }
    else { roles = [{ id: 'c', label: 'Variable a analizar', tipo: 'num' }]; ayuda = 'Elija la hoja, la columna numérica y, si lo necesita, un rango de filas o un filtro.'; }
    HPDatos.abrir(e, {
      titulo, ayuda, roles, agrupar, pareado, maxGrupos: 8, alError: err,
      alAplicar: res => {
        if ((tab === 'dos') && res.roles.c.length !== 2) return err('La prueba compara exactamente dos grupos; la selección tiene ' + res.roles.c.length + '.');
        aplicarArchivo(res.filas, res.archivo);
      }
    });
  }
  function err(m) { const b = $('np-error'); b.textContent = '⚠ ' + m; b.style.display = 'block'; }

  // ───────── cálculo ─────────
  function limpiarResultado() {
    if (st.chart) { st.chart.destroy(); st.chart = null; } if (st.chart2) { st.chart2.destroy(); st.chart2 = null; }
    $('np-res').innerHTML = '<div class="sin-resultado">Ingrese sus datos (o cargue un ejemplo) y presione <strong>Calcular</strong>.</div>';
    st.ultimo = null;
  }
  function calcular() {
    const key = st.sel[st.tab], T = TESTS[key], v = valores(key); st.alpha = Number($('np-alpha').value) || 0.05;
    let d, r, out;
    try { d = T.leer(v); r = T.calc(d); out = T.render(d, r, st.alpha); } catch (e) { err(e.message); return; }
    $('np-error').style.display = 'none'; st.ultimo = { key, T, d, r, out };
    pintarResultado(T, out);
    if (window.gtag) { try { gtag('event', 'np_calcular', { prueba: key }); } catch (e) { } }
  }

  // ───────── resultado ─────────
  function pintarResultado(T, o) {
    const cards = o.cards.map(c => `<div class="coef-card${c.main ? ' principal' : ''}"><div class="nombre">${esc(c.n)}</div><div class="valor">${esc(c.v)}</div><div class="pval">${esc(c.s || '')}</div></div>`).join('');
    const tabla = o.tabla ? `<div class="tw"><table class="np-t"><thead><tr>${o.tabla.cab.map((c, i) => `<th${i ? ' class="r"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${o.tabla.filas.map(f => '<tr>' + f.map((c, i) => `<td${i ? ' class="r"' : ''}>${esc(c)}</td>`).join('') + '</tr>').join('')}</tbody></table></div>` : '';
    const tabla2 = o.tabla2 ? `<h4 class="t2">${esc(o.tabla2.titulo)}</h4><div class="tw"><table class="np-t"><thead><tr>${o.tabla2.cab.map((c, i) => `<th${i ? ' class="r"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${o.tabla2.filas.map(f => '<tr>' + f.map((c, i) => `<td${i ? ' class="r"' : ''}>${esc(c)}</td>`).join('') + '</tr>').join('')}</tbody></table></div>` : '';
    const tabla3 = o.tabla3 ? `<h4 class="t2">${esc(o.tabla3.titulo)}</h4><div class="tw"><table class="np-t"><thead><tr>${o.tabla3.cab.map((c, i) => `<th${i ? ' class="r"' : ''}>${esc(c)}</th>`).join('')}</tr></thead><tbody>${o.tabla3.filas.map(f => '<tr>' + f.map((c, i) => `<td${i ? ' class="r"' : ''}>${esc(c)}</td>`).join('') + '</tr>').join('')}</tbody></table></div>` : '';
    const g = o.grafico && o.grafico.tipo === 'secuencia' ? '<div id="np-seq" class="np-seq"></div>' : '<div class="chart-container"><canvas id="np-chart"></canvas></div>';
    $('np-res').innerHTML = `<h3>Resultado · ${esc(T.nombre)}</h3>
      ${o.sinHip ? '' : `<div class="hipo"><div><b>H₀:</b> ${esc(o.h0)}</div><div><b>H₁:</b> ${esc(o.h1)}</div><div class="al">Nivel de significancia α = ${P.fx(st.alpha, 2)}</div></div>`}
      <div class="coef-grid">${cards}</div>${tabla}${tabla2}${tabla3}
      ${(o.avisos || []).map(a => '<div class="np-aviso">⚠ ' + esc(a) + '</div>').join('')}
      ${g}
      ${o.grafico2 ? '<div class="chart-container"><canvas id="np-chart2"></canvas></div>' : ''}
      <div class="interp"><h4>Interpretación</h4><p>${o.interp}</p></div>
      <details class="det"><summary>Ver todas las medidas</summary><div class="tw"><table class="np-t"><tbody>${o.resumen.map(f => `<tr><td>${esc(f[0])}</td><td class="r">${esc(f[1])}</td></tr>`).join('')}</tbody></table></div></details>
      <div id="np-codigo"></div>`;
    dibujar(o.grafico); if (o.grafico2) dibujar(o.grafico2, true);
    const ctx = $('np-contexto') ? $('np-contexto').value : '';
    H.montar($('np-codigo'), () => especificacion(T, o));
  }

  function plano(html) { const t = document.createElement('div'); t.innerHTML = html; return t.textContent; }
  function especificacion(T, o) {
    const u = st.ultimo, ctx = $('np-contexto') ? $('np-contexto').value.trim() : '';
    return {
      titulo: 'Informe: ' + T.nombre, subtitulo: o.sinHip ? 'Análisis descriptivo' : 'Nivel de significancia α = ' + P.fx(st.alpha, 2), contexto: ctx, nombreBase: 'np_' + u.key,
      secciones: [
        { h: '1. Planteamiento', items: [{ p: T.cuando }].concat(o.sinHip ? [] : [{ box: 'H₀: ' + o.h0 + '\nH₁: ' + o.h1 }]) },
        { h: '2. Datos', items: [{ p: o.datosTxt }] },
        { h: '3. Resultados', items: [{ tabla: { cab: ['Medida', 'Valor'], filas: o.resumen, izq: 1 } }].concat(o.tabla ? [{ tabla: { cab: o.tabla.cab, filas: o.tabla.filas, izq: 1 } }] : []).concat(o.tabla2 ? [{ p: o.tabla2.titulo }, { tabla: { cab: o.tabla2.cab, filas: o.tabla2.filas, izq: 1 } }] : []).concat(o.tabla3 ? [{ p: o.tabla3.titulo }, { tabla: { cab: o.tabla3.cab, filas: o.tabla3.filas, izq: 1 } }] : []) },
        { h: '4. Interpretación', items: [{ box: plano(o.interp) }].concat((o.avisos || []).map(a => ({ nota: a }))) },
        { h: '5. Supuestos', items: [{ lista: T.supuestos }] }],
      pie: T.refs || P.refs || 'Referencias: Siegel, S. y Castellan, N. J. (1988). Nonparametric Statistics for the Behavioral Sciences. McGraw-Hill; Conover, W. J. (1999). Practical Nonparametric Statistics. Wiley; Hollander, M., Wolfe, D. A. y Chicken, E. (2014). Nonparametric Statistical Methods. Wiley; Marsaglia, G., Tsang, W. W. y Wang, J. (2003). Evaluating Kolmogorov\'s distribution. Journal of Statistical Software, 8(18). Cálculos realizados con Estadilab (estadilab.com).',
      codigoR: T.R(u.d, u.r), codigoPy: T.Py(u.d, u.r)
    };
  }

  // ───────── gráficos ─────────
  function opcionesBase(xt, yt) {
    return { responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, plugins: { legend: { labels: { color: TXT, boxWidth: 12, font: { size: 11 } } }, tooltip: { backgroundColor: '#1a2340', borderColor: '#2a3a5c', borderWidth: 1, titleColor: '#e8edf8', bodyColor: TXT } }, scales: { x: { title: { display: !!xt, text: xt || '', color: TXT }, ticks: { color: '#6b7c9c', font: { size: 10 }, maxTicksLimit: 10 }, grid: { color: GRID } }, y: { title: { display: !!yt, text: yt || '', color: TXT }, ticks: { color: '#6b7c9c', font: { size: 10 } }, grid: { color: GRID } } } };
  }
  function dibujar(g, segundo) {
    const slot = segundo ? 'chart2' : 'chart';
    if (st[slot]) { st[slot].destroy(); st[slot] = null; }
    if (!g) return;
    if (g.tipo === 'secuencia') return secuencia(g);
    const cv = $(segundo ? 'np-chart2' : 'np-chart'); if (!cv || typeof Chart === 'undefined') { if (cv) cv.parentNode.innerHTML = '<div class="sin-resultado">No se pudo cargar la librería de gráficos.</div>'; return; }
    let cfg;
    if (g.tipo === 'barras') { cfg = { type: 'bar', data: { labels: g.etiquetas, datasets: [{ label: g.la, data: g.a, backgroundColor: ACC + 'cc', borderColor: ACC, borderWidth: 1 }, { label: g.lb, data: g.b, backgroundColor: ACC2 + 'aa', borderColor: ACC2, borderWidth: 1 }] }, options: opcionesBase('Categoría', 'Frecuencia') }; }
    else if (g.tipo === 'binom') { cfg = { type: 'bar', data: { labels: g.etiquetas, datasets: [{ label: 'P(X = k) bajo H₀', data: g.a, backgroundColor: g.etiquetas.map(k => Number(k) === g.obs ? GOLD : ACC + '99') }] }, options: Object.assign(opcionesBase('Número de éxitos (k)', 'Probabilidad'), { plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2340', titleColor: '#e8edf8', bodyColor: TXT } } }) }; }
    else if (g.tipo === 'bar1') { const o = opcionesBase(g.xt, g.yt); o.plugins.legend = { display: false }; if (g.ymax) { o.scales.y.min = 0; o.scales.y.max = g.ymax; } cfg = { type: 'bar', data: { labels: g.etiquetas, datasets: [{ label: g.etiq, data: g.a, backgroundColor: g.colores }] }, options: o }; }
    else if (g.tipo === 'catbar') { const o = opcionesBase(g.horiz ? g.etiq : '', g.horiz ? '' : g.etiq); if (g.horiz) o.indexAxis = 'y'; o.plugins.legend = { display: false }; cfg = { type: 'bar', data: { labels: g.etiquetas, datasets: [{ label: g.etiq, data: g.a, backgroundColor: g.colores || ACC + 'cc', borderColor: ACC, borderWidth: 1 }] }, options: o }; }
    else if (g.tipo === 'pie') { const pal = ['#00d4ff', '#7b61ff', '#00ff9d', '#ffd700', '#ff6b6b', '#b4a5ff', '#ffa94d', '#6b7c9c', '#4dd0e1', '#f06292']; const tot = g.a.reduce((x, y) => x + y, 0); cfg = { type: 'doughnut', data: { labels: g.etiquetas, datasets: [{ data: g.a, backgroundColor: g.a.map((_, i) => pal[i % pal.length] + 'cc'), borderColor: '#1a2340', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: TXT, boxWidth: 12, font: { size: 11 } } }, tooltip: { backgroundColor: '#1a2340', titleColor: '#e8edf8', bodyColor: TXT, callbacks: { label: c => ' ' + c.label + ': ' + c.parsed + ' (' + (100 * c.parsed / tot).toFixed(1).replace('.', ',') + ' %)' } } } } }; }
    else if (g.tipo === 'pareto') { const o = opcionesBase('', 'Frecuencia'); o.scales.y1 = { position: 'right', min: 0, max: 100, title: { display: true, text: '% acumulado', color: TXT }, ticks: { color: '#6b7c9c', font: { size: 10 } }, grid: { drawOnChartArea: false } }; cfg = { type: 'bar', data: { labels: g.etiquetas, datasets: [{ type: 'bar', label: 'Frecuencia', data: g.a, backgroundColor: ACC + 'cc', yAxisID: 'y' }, { type: 'line', label: '% acumulado', data: g.acum, borderColor: GOLD, backgroundColor: GOLD, yAxisID: 'y1', tension: 0.15, pointRadius: 4 }] }, options: o }; }
    else if (g.tipo === 'apil' || g.tipo === 'agrup') { const cols = [ACC, GOLD, '#00ff9d', '#ff6b6b', '#b4a5ff', '#ffa94d', '#7b61ff', '#6b7c9c'], o = opcionesBase(g.xt || '', g.yt || ''); if (g.tipo === 'apil') { o.scales.x.stacked = true; o.scales.y.stacked = true; o.scales.y.max = 100; } cfg = { type: 'bar', data: { labels: g.etiquetas, datasets: g.series.map((q, i) => ({ label: q.n, data: q.v, backgroundColor: cols[i % 8] + 'cc', borderColor: cols[i % 8], borderWidth: 1 })) }, options: o }; }
    else if (g.tipo === 'ecdf1' || g.tipo === 'ecdf2') cfg = ecdf(g);
    else if (g.tipo === 'tira') cfg = tira(g);
    else if (g.tipo === 'qq') cfg = qqG(g);
    else if (g.tipo === 'hist') cfg = histG(g);
    st[slot] = new Chart(cv, cfg);
  }
  function paso(xs) { const n = xs.length, p = []; p.push({ x: xs[0], y: 0 }); for (let i = 0; i < n; i++) { p.push({ x: xs[i], y: i / n }); p.push({ x: xs[i], y: (i + 1) / n }); } return p; }
  function ecdf(g) {
    const o = opcionesBase('Valor', 'F(x)'); o.scales.x.type = 'linear'; o.scales.y.min = 0; o.scales.y.max = 1; const ds = [];
    if (g.tipo === 'ecdf2') {
      const a = g.a, b = g.b, ext = xs => paso(xs).concat([{ x: Math.max(a[a.length - 1], b[b.length - 1]), y: 1 }]);
      ds.push({ label: g.na, data: ext(a), borderColor: ACC, backgroundColor: ACC, showLine: true, pointRadius: 0, stepped: false, borderWidth: 2 }); ds.push({ label: g.nb, data: ext(b), borderColor: GOLD, backgroundColor: GOLD, showLine: true, pointRadius: 0, borderWidth: 2 });
    } else {
      const xs = g.x, n = xs.length, lo = xs[0], hi = xs[n - 1], pad = (hi - lo || 1) * 0.15, x0 = lo - pad, x1 = hi + pad, pts = []; const F = (function () { const p = g.par; if (g.dist === 'norm') return v => NPM.normCdf((v - p.mu) / p.sd); if (g.dist === 'unif') return v => v <= p.a ? 0 : v >= p.b ? 1 : (v - p.a) / (p.b - p.a); return v => v < 0 ? 0 : 1 - Math.exp(-v / p.media); })();
      for (let i = 0; i <= 120; i++) { const x = x0 + (x1 - x0) * i / 120; pts.push({ x, y: F(x) }); }
      ds.push({ label: 'F empírica', data: [{ x: x0, y: 0 }].concat(paso(xs).slice(1)).concat([{ x: x1, y: 1 }]), borderColor: ACC, backgroundColor: ACC, showLine: true, pointRadius: 0, borderWidth: 2 }); ds.push({ label: 'F teórica', data: pts, borderColor: GOLD, backgroundColor: GOLD, showLine: true, pointRadius: 0, borderWidth: 2, borderDash: [5, 4] });
    }
    return { type: 'scatter', data: { datasets: ds }, options: o };
  }
  function qqG(g) {
    const o = opcionesBase('Cuantiles teóricos (normal)', 'Cuantiles de la muestra'); o.scales.x.type = 'linear'; const xs = g.pts.map(p => p.x), x0 = xs[0] - 0.2, x1 = xs[xs.length - 1] + 0.2;
    o.plugins.title = { display: true, text: 'Gráfico Q-Q normal', color: '#e8edf8', font: { size: 13 } };
    return { type: 'scatter', data: { datasets: [{ label: 'Datos', data: g.pts, backgroundColor: ACC + 'cc', borderColor: ACC, pointRadius: 4 }, { label: 'Recta de referencia (cuartiles)', type: 'line', data: [{ x: x0, y: g.ic + g.sl * x0 }, { x: x1, y: g.ic + g.sl * x1 }], borderColor: GOLD, backgroundColor: GOLD, pointRadius: 0, borderWidth: 2, borderDash: [5, 4] }] }, options: o };
  }
  function histG(g) {
    const o = opcionesBase('Valor', 'Frecuencia'); o.plugins.title = { display: true, text: 'Histograma y curva normal ajustada', color: '#e8edf8', font: { size: 13 } };
    return { type: 'bar', data: { labels: g.cent.map(v => (+v.toPrecision(4)).toString().replace('.', ',')), datasets: [{ label: 'Frecuencia', data: g.c, backgroundColor: ACC + '99', borderColor: ACC, borderWidth: 1, barPercentage: 1, categoryPercentage: 1 }, { label: 'Normal esperada', type: 'line', data: g.pdf.map(v => +v.toFixed(3)), borderColor: GOLD, backgroundColor: GOLD, pointRadius: 2, borderWidth: 2, tension: 0.35 }] }, options: o };
  }
  function tira(g) {
    const cols = [ACC, GOLD, '#00ff9d', '#ff6b6b', '#b4a5ff', '#ffa94d', '#7b61ff', '#6b7c9c'], ds = g.g.map((s, k) => { const cuenta = new Map(); return { label: s.n, data: s.v.map(v => { const c = cuenta.get(v) || 0; cuenta.set(v, c + 1); return { x: v, y: g.g.length - k + (c ? ((c % 2 ? 1 : -1) * Math.ceil(c / 2) * 0.07) : 0) }; }), backgroundColor: cols[k] + 'cc', borderColor: cols[k], pointRadius: 5 }; });
    const o = opcionesBase('Valor', ''); o.scales.y.min = 0.4; o.scales.y.max = g.g.length + 0.6; o.scales.y.ticks = { color: '#6b7c9c', stepSize: 1, callback: v => { const k = g.g.length - v; return Number.isInteger(v) && k >= 0 && g.g[k] ? g.g[k].n.slice(0, 22) : ''; } }; o.layout = { padding: { left: 4 } }; o.scales.y.grid = { color: 'rgba(42,58,92,.25)' }; o.plugins.legend = { display: false };
    return { type: 'scatter', data: { datasets: ds }, options: o };
  }
  function secuencia(g) {
    const max = 160, ind = g.ind.slice(0, max); let h = '<div class="seq-leg"><span class="sq a"></span> ' + esc(g.ea) + ' &nbsp; <span class="sq b"></span> ' + esc(g.eb) + '</div><div class="seq-row">';
    ind.forEach((v, i) => { h += (i && v !== ind[i - 1] ? '<span class="sep"></span>' : '') + '<span class="sq ' + (v ? 'a' : 'b') + '"></span>'; });
    $('np-seq').innerHTML = h + '</div>' + (g.ind.length > max ? '<div class="hint">Se muestran los primeros ' + max + ' de ' + g.ind.length + '.</div>' : '') + '<div class="hint">Cada cuadro es una observación; la separación marca el cambio de racha.</div>';
  }

  // ───────── arranque ─────────
  function init() {
    leerHash();
    $('np-calc').onclick = calcular; $('np-ejemplo').onclick = cargarEjemplo; $('np-archivo').onchange = leerArchivo;
    $('np-alpha').onchange = () => { st.alpha = Number($('np-alpha').value); if (st.ultimo) calcular(); };
    $('np-limpiar').onclick = () => { const key = st.sel[st.tab]; st.vals[key] = {}; pintarForm(); limpiarResultado(); $('np-archivo-info').className = 'archivo-info'; };
    window.addEventListener('hashchange', () => { leerHash(); pintarTodo(); });
    pintarTodo();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
