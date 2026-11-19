/* HPTabla — cuadrícula para escribir o pegar una tabla de contingencia (r × c, hasta 20 × 20).
 *   HPTabla.montar(el, { valor, cuadrada, max, nombres:[fila,col], alCambiar(json) }) → { set(textoOJson), get() }
 *   HPTabla.leer(textoOJson) → { T, filas, cols, vf, vc }  (lanza Error con mensaje en español si es inválida)
 * El valor guardado es un JSON; también se entiende texto pegado (tabulaciones, ; o espacios).
 */
(function (global) {
  'use strict';
  var ESC = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var esN = function (t) { return /^\s*-?\d+([.,]\d+)?\s*$/.test(String(t)); };
  var MAXD = 20;

  function vacia(nf, nc) { var T = []; for (var i = 0; i < nf; i++) { T.push([]); for (var j = 0; j < nc; j++) T[i].push(''); } return T; }
  function estadoBase(nf, nc) { return { nf: nf, nc: nc, vf: '', vc: '', filas: [], cols: [], T: vacia(nf, nc) }; }

  // ───────── texto → estado ─────────
  function dividir(l) { return l.indexOf('\t') >= 0 ? l.split('\t') : (l.indexOf(';') >= 0 ? l.split(';') : l.trim().split(/\s+/)); }
  function desdeTexto(txt) {
    var lin = String(txt || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lin.length) throw new Error('No hay datos para leer.');
    var M = lin.map(function (l) { return dividir(l).map(function (c) { return c.trim(); }); });
    var hl = M[0].length, ancho = Math.max.apply(null, M.map(function (f) { return f.length; }));
    M = M.map(function (f) { var o = f.slice(); while (o.length < ancho) o.push(''); return o; });
    var colLab = M[0].some(function (c) { return c !== '' && !esN(c); }) && M.length >= 2;
    var cuerpo = colLab ? M.slice(1) : M;
    var rowLab = cuerpo.length > 0 && cuerpo.every(function (f) { return f[0] !== '' && !esN(f[0]); });
    var cols = null, filas = null;
    if (colLab) { cols = M[0].slice(0, hl); if (rowLab && hl === ancho) cols = cols.slice(1); }
    var T = cuerpo.map(function (f) { return (rowLab ? f.slice(1) : f).map(function (c) { return c.replace(',', '.'); }); });
    if (rowLab) filas = cuerpo.map(function (f) { return f[0].replace(/_/g, ' '); });
    var nc = T[0].length; if (cols && cols.length > nc) cols = cols.slice(0, nc);
    var st = estadoBase(T.length, nc); st.T = T;
    st.filas = filas || []; st.cols = (cols || []).map(function (c) { return c.replace(/_/g, ' '); });
    return st;
  }
  function normaliza(st) {
    st.nf = Math.max(2, Math.min(MAXD, st.nf | 0)); st.nc = Math.max(2, Math.min(MAXD, st.nc | 0));
    st.filas = (st.filas || []).slice(0, st.nf); st.cols = (st.cols || []).slice(0, st.nc);
    while (st.filas.length < st.nf) st.filas.push(''); while (st.cols.length < st.nc) st.cols.push('');
    var T = st.T || []; st.T = [];
    for (var i = 0; i < st.nf; i++) { st.T.push([]); for (var j = 0; j < st.nc; j++) st.T[i].push(T[i] && T[i][j] != null ? String(T[i][j]) : ''); }
    st.vf = st.vf || ''; st.vc = st.vc || ''; return st;
  }
  function analizar(x) {
    if (x && typeof x === 'object') return normaliza(x);
    var t = String(x || '').trim(); if (!t) throw new Error('Escriba la tabla de frecuencias en la cuadrícula.');
    if (t.charAt(0) === '{') { try { return normaliza(JSON.parse(t)); } catch (e) { throw new Error('No se pudo leer la tabla guardada.'); } }
    return normaliza(desdeTexto(t));
  }

  // ───────── validación ─────────
  function leer(x) {
    var st = analizar(x), nf = st.nf, nc = st.nc, T = [], i, j;
    var nomF = st.filas.map(function (n, k) { return (n || '').trim() || 'Fila ' + (k + 1); });
    var nomC = st.cols.map(function (n, k) { return (n || '').trim() || 'Col. ' + (k + 1); });
    var dup = function (a, que) { var s = {}; a.forEach(function (n) { if (s[n]) throw new Error('Hay dos ' + que + ' con el mismo nombre («' + n + '»). Use nombres distintos.'); s[n] = 1; }); };
    dup(nomF, 'filas'); dup(nomC, 'columnas');
    for (i = 0; i < nf; i++) { T.push([]); for (j = 0; j < nc; j++) {
      var raw = String(st.T[i][j]).trim();
      if (raw === '') throw new Error('Falta la celda «' + nomF[i] + '» × «' + nomC[j] + '». Si no hay casos, escriba 0.');
      if (!esN(raw) || /[.,]\d*[1-9]/.test(raw)) throw new Error('La celda «' + nomF[i] + '» × «' + nomC[j] + '» (' + raw + ') debe ser un conteo entero, no un porcentaje ni un decimal.');
      var v = Number(raw.replace(',', '.')); if (v < 0) throw new Error('Las frecuencias no pueden ser negativas («' + nomF[i] + '» × «' + nomC[j] + '»).');
      T[i].push(v);
    } }
    for (i = 0; i < nf; i++) if (T[i].reduce(function (s, v) { return s + v; }, 0) === 0) throw new Error('La fila «' + nomF[i] + '» suma 0. Quítela (reduzca las filas) o escriba sus conteos.');
    for (j = 0; j < nc; j++) if (T.reduce(function (s, f) { return s + f[j]; }, 0) === 0) throw new Error('La columna «' + nomC[j] + '» suma 0. Quítela (reduzca las columnas) o escriba sus conteos.');
    return { T: T, filas: nomF, cols: nomC, vf: st.vf, vc: st.vc };
  }

  // ───────── CSS ─────────
  var CSS = '.hpt{font-size:.82rem}.hpt .bar{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;margin:0 0 .6rem;color:var(--text2,#8a9bb8)}' +
    '.hpt .dim{display:flex;align-items:center;gap:.3rem}.hpt .dim b{color:var(--text,#e8edf8);font-weight:600}.hpt button{background:var(--bg3,#0e1424);color:var(--text,#e8edf8);border:1px solid var(--border,#2a3a5c);border-radius:8px;padding:.3rem .65rem;font-family:inherit;font-size:.78rem;cursor:pointer}' +
    '.hpt button:hover{border-color:var(--accent,#00d4ff)}.hpt .dim button{width:1.8rem;padding:.25rem 0;font-size:1rem;line-height:1}' +
    '.hpt input{background:var(--bg3,#0e1424);color:var(--text,#e8edf8);border:1px solid var(--border,#2a3a5c);border-radius:6px;padding:.35rem .45rem;font-family:inherit;font-size:.8rem;outline:none;min-width:0}.hpt input:focus{border-color:var(--accent,#00d4ff)}' +
    '.hpt .nom{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin:0 0 .7rem}.hpt .nom label{display:block;font-size:.72rem;color:var(--text2,#8a9bb8)}.hpt .nom input{width:100%;margin-top:.15rem}' +
    '.hpt .tw{overflow:auto;max-width:100%;border:1px solid var(--border,#2a3a5c);border-radius:10px}.hpt table{border-collapse:collapse;width:100%}' +
    '.hpt td,.hpt th{padding:3px;border-bottom:1px solid var(--border,#2a3a5c);border-right:1px solid var(--border,#2a3a5c);text-align:center}' +
    '.hpt .c{width:4.6rem;min-width:3.6rem;text-align:right;font-family:"Space Mono",monospace}.hpt .l{width:7rem;min-width:5rem;text-align:left}.hpt thead .l{text-align:center}' +
    '.hpt .tot{background:rgba(0,212,255,.06);color:var(--text2,#8a9bb8);font-family:"Space Mono",monospace;font-size:.78rem;padding:3px 8px;white-space:nowrap}.hpt .esq{font-size:.68rem;color:var(--text3,#4a5a78);padding:3px 6px;text-align:left}' +
    '.hpt .mal{border-color:#ff6b6b!important}.hpt .ay{font-size:.72rem;color:var(--text3,#6b7c9c);margin:.45rem 0 0;line-height:1.5}.hpt .msg{font-size:.76rem;color:#ffcc66;margin:.4rem 0 0;min-height:1em}';
  function css() { if (!document.getElementById('hpt-css')) { var s = document.createElement('style'); s.id = 'hpt-css'; s.textContent = CSS; document.head.appendChild(s); } }

  // ───────── componente ─────────
  function montar(el, op) {
    op = op || {}; css();
    var cuad = !!op.cuadrada, max = Math.min(MAXD, op.max || MAXD), nombres = op.nombres || ['Variable de las filas', 'Variable de las columnas'];
    var st;
    try { st = op.valor ? analizar(op.valor) : estadoBase(cuad ? Math.min(3, max) : 2, cuad ? Math.min(3, max) : 2); } catch (e) { st = estadoBase(cuad ? Math.min(3, max) : 2, cuad ? Math.min(3, max) : 2); }
    if (cuad) { st.nc = st.nf = Math.max(st.nf, st.nc); st = normaliza(st); }
    var host = el;
    function emitir() { if (op.alCambiar) op.alCambiar(JSON.stringify(st)); }
    function sumas() {
      var rt = [], ct = [], n = 0, i, j; for (j = 0; j < st.nc; j++) ct.push(0);
      for (i = 0; i < st.nf; i++) { var s = 0; for (j = 0; j < st.nc; j++) { var v = Number(String(st.T[i][j]).replace(',', '.')); if (String(st.T[i][j]).trim() !== '' && isFinite(v)) { s += v; ct[j] += v; } } rt.push(s); n += s; }
      return { rt: rt, ct: ct, n: n };
    }
    function pintarSumas() {
      var s = sumas(), q = function (sel) { return host.querySelector(sel); };
      s.rt.forEach(function (v, i) { var e = q('[data-rt="' + i + '"]'); if (e) e.textContent = v; });
      s.ct.forEach(function (v, j) { var e = q('[data-ct="' + j + '"]'); if (e) e.textContent = v; });
      var g = q('[data-n]'); if (g) g.textContent = s.n;
    }
    function marcar() { host.querySelectorAll('.cel').forEach(function (e) { var t = e.value.trim(); e.classList.toggle('mal', t !== '' && (!esN(t) || /[.,]\d*[1-9]/.test(t) || Number(t.replace(',', '.')) < 0)); }); }
    function pintar() {
      var i, j, h = '';
      h += '<div class="hpt"><div class="bar">';
      if (cuad) h += '<span class="dim">Categorías: <button type="button" data-d="n-">−</button><b>' + st.nf + '</b><button type="button" data-d="n+">+</button></span>';
      else h += '<span class="dim">Filas: <button type="button" data-d="f-">−</button><b>' + st.nf + '</b><button type="button" data-d="f+">+</button></span><span class="dim">Columnas: <button type="button" data-d="c-">−</button><b>' + st.nc + '</b><button type="button" data-d="c+">+</button></span>';
      h += '<button type="button" data-a="t">⇄ Intercambiar filas y columnas</button><button type="button" data-a="l">Limpiar</button></div>';
      h += '<div class="nom"><label>' + ESC(nombres[0]) + ' (opcional)<input type="text" data-k="vf" maxlength="40" value="' + ESC(st.vf) + '" placeholder="Ej: Jornada"></label><label>' + ESC(nombres[1]) + ' (opcional)<input type="text" data-k="vc" maxlength="40" value="' + ESC(st.vc) + '" placeholder="Ej: Resultado"></label></div>';
      h += '<div class="tw"><table><thead><tr><th class="esq">' + (st.vf || st.vc ? ESC((st.vf || 'filas') + ' ↓ / ' + (st.vc || 'columnas') + ' →') : 'filas ↓ / columnas →') + '</th>';
      for (j = 0; j < st.nc; j++) h += '<th>' + (cuad ? '<span class="tot" style="display:block">' + ESC(st.filas[j] || 'Cat. ' + (j + 1)) + '</span>' : '<input class="l" type="text" data-c="' + j + '" maxlength="30" value="' + ESC(st.cols[j]) + '" placeholder="Columna ' + (j + 1) + '" aria-label="Nombre de la columna ' + (j + 1) + '">') + '</th>';
      h += '<th class="tot">Total</th></tr></thead><tbody>';
      for (i = 0; i < st.nf; i++) {
        h += '<tr><td><input class="l" type="text" data-r="' + i + '" maxlength="30" value="' + ESC(st.filas[i]) + '" placeholder="' + (cuad ? 'Categoría ' : 'Fila ') + (i + 1) + '" aria-label="Nombre de la fila ' + (i + 1) + '"></td>';
        for (j = 0; j < st.nc; j++) h += '<td><input class="c cel" type="text" inputmode="numeric" data-i="' + i + '" data-j="' + j + '" value="' + ESC(st.T[i][j]) + '" aria-label="Frecuencia fila ' + (i + 1) + ', columna ' + (j + 1) + '"></td>';
        h += '<td class="tot" data-rt="' + i + '">0</td></tr>';
      }
      h += '<tr><td class="tot">Total</td>'; for (j = 0; j < st.nc; j++) h += '<td class="tot" data-ct="' + j + '">0</td>'; h += '<td class="tot" data-n>0</td></tr></tbody></table></div>';
      h += '<p class="ay">' + (cuad ? 'Cada fila es la categoría asignada por el evaluador 1 (o la situación «antes») y cada columna la del evaluador 2 («después»): las categorías son las mismas en ambos ejes. ' : 'Cada fila es una categoría de una variable y cada columna una categoría de la otra; cada celda es el <b>número de casos</b> que cumplen ambas. ') + 'Puede <b>copiar la tabla en Excel y pegarla</b> en cualquier celda (con o sin nombres). Tamaño: de 2 × 2 hasta ' + max + ' × ' + max + '.</p><div class="msg" data-msg></div></div>';
      host.innerHTML = h; conectar(); pintarSumas(); marcar();
    }
    function msg(t) { var m = host.querySelector('[data-msg]'); if (m) { m.textContent = t || ''; if (t) setTimeout(function () { if (m.textContent === t) m.textContent = ''; }, 6000); } }
    function dims(nf, nc) {
      nf = Math.max(2, Math.min(max, nf)); nc = Math.max(2, Math.min(max, nc)); if (cuad) nc = nf;
      st.nf = nf; st.nc = nc; st = normaliza(st); if (cuad) st.cols = st.filas.slice(); pintar(); emitir();
    }
    function pegar(i0, j0, texto) {
      var M = String(texto).replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; }).map(function (l) { return dividir(l).map(function (c) { return c.trim(); }); });
      if (M.length === 1 && M[0].length === 1) return false;
      var p; try { p = desdeTexto(texto); } catch (e) { return false; }
      var conNombres = p.cols.length > 0 || p.filas.length > 0;
      if (i0 === 0 && j0 === 0 || conNombres) {
        var nf = Math.min(max, Math.max(2, p.nf)), nc = Math.min(max, Math.max(2, p.nc)); if (cuad) nf = nc = Math.max(nf, nc);
        if (p.nf > max || p.nc > max) msg('La tabla pegada es mayor que ' + max + ' × ' + max + ': se recortó.');
        st.nf = nf; st.nc = nc; st.T = p.T; if (p.filas.length) st.filas = p.filas; if (p.cols.length && !cuad) st.cols = p.cols; if (cuad) st.cols = st.filas.slice(); st = normaliza(st);
      } else {
        var nf2 = Math.min(max, Math.max(st.nf, i0 + p.nf)), nc2 = Math.min(max, Math.max(st.nc, j0 + p.nc)); if (cuad) nf2 = nc2 = Math.max(nf2, nc2);
        st.nf = nf2; st.nc = nc2; st = normaliza(st); p.T.forEach(function (f, a) { f.forEach(function (v, b) { if (i0 + a < st.nf && j0 + b < st.nc) st.T[i0 + a][j0 + b] = v; }); });
        if (cuad) st.cols = st.filas.slice();
      }
      pintar(); emitir(); return true;
    }
    function conectar() {
      host.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () { var d = b.dataset.d; dims(st.nf + (d === 'f+' || d === 'n+' ? 1 : d === 'f-' || d === 'n-' ? -1 : 0), st.nc + (d === 'c+' || d === 'n+' ? 1 : d === 'c-' || d === 'n-' ? -1 : 0)); }; });
      host.querySelector('[data-a="l"]').onclick = function () { st.T = vacia(st.nf, st.nc); pintar(); emitir(); };
      host.querySelector('[data-a="t"]').onclick = function () {
        var T = vacia(st.nc, st.nf), i, j; for (i = 0; i < st.nf; i++) for (j = 0; j < st.nc; j++) T[j][i] = st.T[i][j];
        var f = st.filas, c = st.cols, vf = st.vf; st.nf = T.length; st.nc = T[0].length; st.T = T; st.filas = c; st.cols = f; st.vf = st.vc; st.vc = vf; st = normaliza(st); pintar(); emitir();
      };
      host.querySelectorAll('[data-k]').forEach(function (e) { if (e.tagName === 'INPUT') e.oninput = function () { st[e.dataset.k] = e.value; emitir(); }; });
      host.querySelectorAll('input[data-c]').forEach(function (e) { e.oninput = function () { st.cols[+e.dataset.c] = e.value; emitir(); }; });
      host.querySelectorAll('input[data-r]').forEach(function (e) { e.oninput = function () { st.filas[+e.dataset.r] = e.value; if (cuad) { st.cols = st.filas.slice(); var th = host.querySelectorAll('thead th .tot'); if (th[+e.dataset.r]) th[+e.dataset.r].textContent = e.value || 'Cat. ' + (+e.dataset.r + 1); } emitir(); }; });
      host.querySelectorAll('.cel').forEach(function (e) {
        e.oninput = function () { st.T[+e.dataset.i][+e.dataset.j] = e.value; pintarSumas(); marcar(); emitir(); };
        e.onkeydown = function (ev) {
          var i = +e.dataset.i, j = +e.dataset.j, ir = null;
          if (ev.key === 'Enter' || ev.key === 'ArrowDown') ir = [i + 1, j]; else if (ev.key === 'ArrowUp') ir = [i - 1, j];
          else if (ev.key === 'ArrowRight' && e.selectionStart === e.value.length) ir = [i, j + 1]; else if (ev.key === 'ArrowLeft' && e.selectionStart === 0) ir = [i, j - 1];
          if (ir) { var t = host.querySelector('.cel[data-i="' + ir[0] + '"][data-j="' + ir[1] + '"]'); if (t) { ev.preventDefault(); t.focus(); t.select(); } }
        };
      });
      host.querySelectorAll('input').forEach(function (e) {
        e.addEventListener('paste', function (ev) {
          var txt = (ev.clipboardData || window.clipboardData).getData('text'); if (!txt || !/[\t\n;]/.test(txt.trim())) return;
          var i0 = e.dataset.i != null ? +e.dataset.i : 0, j0 = e.dataset.j != null ? +e.dataset.j : 0;
          if (pegar(i0, j0, txt)) ev.preventDefault();
        });
      });
    }
    pintar();
    return { set: function (x) { try { st = analizar(x); if (cuad) { st.nc = st.nf = Math.max(st.nf, st.nc); st = normaliza(st); st.cols = st.filas.slice(); } pintar(); } catch (e) { msg(e.message); } }, get: function () { return JSON.stringify(st); }, aviso: msg };
  }
  global.HPTabla = { montar: montar, leer: leer, desdeTexto: desdeTexto };
  if (typeof module !== 'undefined') module.exports = global.HPTabla;
})(typeof window !== 'undefined' ? window : globalThis);
