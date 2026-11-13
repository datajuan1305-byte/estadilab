/* HPDatos v2 — «Mis datos»: base de datos en la pestaña del navegador.
 *
 * Se carga un archivo CSV/Excel una sola vez y queda disponible en todas las calculadoras
 * mientras la pestaña esté abierta (sessionStorage). Nada se envía a ningún servidor y todo
 * se borra al cerrar la pestaña o con «Quitar datos».
 *
 *  HPDatos.panel(el, op)       Panel con el resumen de la base (cargar, editar variables, quitar).
 *  HPDatos.selector(el, spec)  Selector inline de variables: { clave, tipo:'num'|'cat'|'any', multi, max, etiqueta, alCambiar(nombres) }
 *  HPDatos.elegir(op)          Ventana por roles (para el motor de pruebas): { roles, agrupar, pareado, alAplicar }
 *  HPDatos.ds()                Base derivada (variables con tipo y etiquetas, filas usadas)
 *  HPDatos.valores(nombre)     Valores de una variable en las filas usadas (num → número|null; cat → texto|null)
 *  HPDatos.matriz(nombres, o)  Columnas alineadas; o.completas=true elimina filas con vacíos
 *  HPDatos.onCambio(fn)        Avisa cuando cambia la base
 */
(function (global) {
  'use strict';
  var H = {};
  var ESC = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var letra = function (j) { var s = ''; j++; while (j > 0) { var m = (j - 1) % 26; s = String.fromCharCode(65 + m) + s; j = Math.floor((j - 1) / 26); } return s; };
  var norm = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ''); };
  var vacio = function (v) { return v == null || (typeof v === 'string' && v.trim() === ''); };

  /* ───────── números y lectura de archivos ───────── */
  function numDe(v) {
    if (v == null) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var t = String(v).trim().replace(/\s/g, '');
    if (t === '' || !/^[-+]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?$/.test(t)) return null;
    var n = Number(t.replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  H.numDe = numDe;

  function parseTexto(txt) {
    txt = txt.replace(/^﻿/, '');
    var lineas = txt.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    var m = lineas.slice(0, 20).join('\n');
    var cuenta = { ';': (m.match(/;/g) || []).length, '\t': (m.match(/\t/g) || []).length, ',': (m.match(/,/g) || []).length };
    var sep = cuenta['\t'] >= cuenta[';'] && cuenta['\t'] >= cuenta[','] && cuenta['\t'] > 0 ? '\t' : cuenta[';'] >= cuenta[','] && cuenta[';'] > 0 ? ';' : cuenta[','] > 0 ? ',' : null;
    return lineas.map(function (l) {
      if (!sep) return l.trim().split(/\s+/);
      var o = [], cur = '', q = false;
      for (var i = 0; i < l.length; i++) {
        var c = l[i];
        if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (c === sep && !q) { o.push(cur.trim()); cur = ''; }
        else cur += c;
      }
      o.push(cur.trim());
      return o.map(function (x) { return x === '' ? null : x; });
    });
  }
  function normalizar(filas) {
    var ancho = 0;
    filas.forEach(function (f) { if (f && f.length > ancho) ancho = f.length; });
    return filas.map(function (f) { var o = []; for (var j = 0; j < ancho; j++) { var v = f ? f[j] : null; o.push(vacio(v) ? null : v); } return o; })
      .filter(function (f) { return f.some(function (v) { return v != null; }); });
  }
  H.leerArchivo = function (file) {
    return new Promise(function (ok, no) {
      var n = file.name.toLowerCase(), rd = new FileReader();
      rd.onerror = function () { no(new Error('No se pudo leer el archivo. Intente de nuevo.')); };
      if (/\.(csv|txt|tsv)$/.test(n)) {
        rd.onload = function (e) { ok({ archivo: file.name, hojas: [{ nombre: 'Datos', filas: normalizar(parseTexto(String(e.target.result))) }] }); };
        rd.readAsText(file);
      } else if (/\.xlsx?$/.test(n)) {
        if (typeof XLSX === 'undefined') return no(new Error('No se pudo cargar el lector de Excel. Revise su conexión a internet e intente de nuevo.'));
        rd.onload = function (e) {
          try {
            var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            var hojas = wb.SheetNames.map(function (nm) { return { nombre: nm, filas: normalizar(XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: null, blankrows: false, raw: true })) }; }).filter(function (h) { return h.filas.length; });
            if (!hojas.length) return no(new Error('El archivo no tiene datos.'));
            ok({ archivo: file.name, hojas: hojas });
          } catch (x) { no(new Error('No se pudo leer el archivo Excel. Verifique que no esté dañado ni protegido con contraseña.')); }
        };
        rd.readAsArrayBuffer(file);
      } else no(new Error('Formato no soportado. Suba un archivo .csv, .txt, .xlsx o .xls.'));
    });
  };

  /* ───────── análisis de la hoja ───────── */
  function detectarEncabezado(filas) {
    if (filas.length < 2) return false;
    var f0 = filas[0];
    if (!f0.some(function (v) { return v != null && numDe(v) == null; })) return false;
    var numCols = 0;
    for (var j = 0; j < f0.length; j++) {
      var cu = filas.slice(1).map(function (f) { return f[j]; }).filter(function (v) { return v != null; });
      if (cu.length && cu.filter(function (v) { return numDe(v) != null; }).length >= 0.7 * cu.length) numCols++;
    }
    if (numCols > 0) return true;
    var vistos = {}, unicos = true;
    f0.forEach(function (v) { if (v != null) { if (vistos[v]) unicos = false; vistos[v] = 1; } });
    return unicos;
  }
  function infoColumnas(filas, header) {
    var ancho = filas.length ? filas[0].length : 0, cu = header ? filas.slice(1) : filas, cols = [], usados = {};
    for (var j = 0; j < ancho; j++) {
      var vals = cu.map(function (f) { return f[j]; });
      var ne = vals.filter(function (v) { return v != null; }), nn = ne.filter(function (v) { return numDe(v) != null; });
      var dist = {}; ne.forEach(function (v) { dist[String(v)] = 1; });
      var nd = Object.keys(dist).length;
      var tipo = ne.length === 0 ? 'vacia' : nn.length >= 0.9 * ne.length ? 'num' : 'texto';
      var ent = tipo === 'num' && nn.every(function (v) { return Math.round(numDe(v)) === numDe(v); });
      var nombre = header && filas[0][j] != null ? String(filas[0][j]).trim() : '';
      if (!nombre) nombre = 'Columna ' + letra(j);
      if (usados[nombre]) { var k = 2; while (usados[nombre + ' (' + k + ')']) k++; nombre = nombre + ' (' + k + ')'; }
      usados[nombre] = 1;
      cols.push({ j: j, nombre: nombre, tipoAuto0: tipo, noVacias: ne.length, nDist: nd, posibleCodigo: tipo === 'num' && ent && nd <= 8 && ne.length >= 6, dist: Object.keys(dist) });
    }
    return cols;
  }
  // Leyenda estilo SPSS: «Sexo: 1 = Femenino, 2 = Masculino»
  function parseLeyenda(s) {
    var m = String(s).match(/^\s*([^:=]{1,60}?)\s*:\s*(.+)$/); if (!m) return null;
    var partes = m[2].split(/\s*[;,]\s*(?=[-\w.]+\s*=)/), mapa = {}, k = 0;
    partes.forEach(function (p) { var q = p.match(/^\s*([-\w.]+)\s*=\s*(.+?)\s*$/); if (q) { mapa[q[1]] = q[2]; k++; } });
    return k >= 2 ? { nombre: m[1].trim(), mapa: mapa } : null;
  }
  function detectarLeyenda(filas, cols) {
    var res = {}, colsLey = {}, porCol = {};
    filas.forEach(function (f) { f.forEach(function (v, j) { if (typeof v === 'string') { var L = parseLeyenda(v); if (L) { res[norm(L.nombre)] = L.mapa; porCol[j] = (porCol[j] || 0) + 1; } } }); });
    Object.keys(porCol).forEach(function (j) {
      var c = cols[+j]; if (!c) return;
      var total = filas.filter(function (f) { return f[+j] != null; }).length;
      if (porCol[j] >= 1 && total - 1 <= porCol[j]) colsLey[+j] = 1;   // solo encabezado + leyendas
    });
    return { mapas: res, cols: colsLey };
  }

  /* ───────── almacén ───────── */
  var KEY = 'hpdatos:v2', ST = null, cargado = false, oyentes = [], avisoMem = false;
  function leerStore() {
    if (cargado) return ST; cargado = true;
    try { var t = sessionStorage.getItem(KEY); if (t) ST = JSON.parse(t); } catch (e) { ST = null; }
    return ST;
  }
  function guardar() {
    try { if (ST) sessionStorage.setItem(KEY, JSON.stringify(ST)); else sessionStorage.removeItem(KEY); avisoMem = false; }
    catch (e) { avisoMem = true; }
  }
  function emitir() { cacheDS = null; guardar(); oyentes.slice().forEach(function (f) { try { f(); } catch (e) { } }); }
  H.onCambio = function (fn) { oyentes.push(fn); };

  var cacheDS = null;
  H.ds = function () {
    var st = leerStore(); if (!st) return null; if (cacheDS) return cacheDS;
    var hoja = st.hojas[st.hoja], filas = hoja.filas, header = st.header;
    var info = infoColumnas(filas, header), ley = detectarLeyenda(filas, info);
    var cu = header ? filas.slice(1) : filas, cols = [];
    info.forEach(function (c) {
      if (c.tipoAuto0 === 'vacia' || ley.cols[c.j]) return;
      var mapaAuto = ley.mapas[norm(c.nombre)] || null;
      var tipoAuto = mapaAuto ? 'cat' : c.tipoAuto0 === 'num' ? 'num' : 'cat';
      var tipo = st.tipos[c.nombre] || tipoAuto;
      var et = st.etiquetas[c.nombre] !== undefined ? st.etiquetas[c.nombre] : (mapaAuto || {});
      cols.push({ j: c.j, nombre: c.nombre, tipo: tipo, tipoAuto: tipoAuto, etiquetas: et, etiquetasAuto: !!mapaAuto && st.etiquetas[c.nombre] === undefined, posibleCodigo: c.posibleCodigo, nDist: c.nDist, noVacias: c.noVacias, numerica: c.tipoAuto0 === 'num' });
    });
    var porNombre = {}; cols.forEach(function (c) { porNombre[c.nombre] = c; });
    var etq = function (c, raw) { var k = typeof raw === 'number' ? String(raw) : String(raw).trim(); return c.etiquetas && c.etiquetas[k] != null ? c.etiquetas[k] : k; };
    var usadas = [];
    cu.forEach(function (f, i) {
      if (st.desde && i + 1 < st.desde) return; if (st.hasta && i + 1 > st.hasta) return;
      if (st.fCol && st.fVal !== '') { var c = porNombre[st.fCol]; if (c) { var v = f[c.j]; if (v == null || etq(c, v) !== st.fVal) return; } }
      usadas.push(i);
    });
    cacheDS = { archivo: st.archivo, hoja: hoja.nombre, hojas: st.hojas.map(function (h) { return h.nombre; }), header: header, cols: cols, porNombre: porNombre, cuerpo: cu, usadas: usadas, nFilas: cu.length, etq: etq, filtro: st.fCol && st.fVal !== '' ? { col: st.fCol, val: st.fVal } : null, desde: st.desde, hasta: st.hasta };
    return cacheDS;
  };
  H.valores = function (nombre) {
    var d = H.ds(); if (!d) return []; var c = d.porNombre[nombre]; if (!c) return [];
    return d.usadas.map(function (i) { var v = d.cuerpo[i][c.j]; if (v == null) return null; return c.tipo === 'num' ? numDe(v) : d.etq(c, v); });
  };
  H.matriz = function (nombres, o) {
    o = o || {}; var cols = nombres.map(H.valores), n = cols.length ? cols[0].length : 0, ok = [];
    for (var i = 0; i < n; i++) { if (!o.completas || cols.every(function (c) { return c[i] != null; })) ok.push(i); }
    return { nombres: nombres, cols: cols.map(function (c) { return ok.map(function (i) { return c[i]; }); }), n: ok.length };
  };
  H.hayDatos = function () { return !!leerStore(); };
  H.cargarArchivo = function (file) {
    return H.leerArchivo(file).then(function (datos) {
      var hoja0 = datos.hojas[0];
      ST = { archivo: datos.archivo, hojas: datos.hojas, hoja: 0, header: detectarEncabezado(hoja0.filas), tipos: {}, etiquetas: {}, desde: 0, hasta: 0, fCol: '', fVal: '' };
      cargado = true; try { Object.keys(sessionStorage).filter(function (k) { return k.indexOf('hpd:sel:') === 0; }).forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) { }
      emitir();
    });
  };
  H.cargarFilas = function (filas, nombre) {
    var f = normalizar(filas);
    ST = { archivo: nombre, hojas: [{ nombre: 'Datos', filas: f }], hoja: 0, header: true, tipos: {}, etiquetas: {}, desde: 0, hasta: 0, fCol: '', fVal: '' };
    cargado = true; emitir();
  };
  H.holm = function (ps) { var m = ps.length, ord = ps.map(function (p, i) { return [p, i]; }).sort(function (a, b) { return a[0] - b[0]; }), adj = new Array(m), mx = 0; ord.forEach(function (o, k) { mx = Math.max(mx, Math.min(1, (m - k) * o[0])); adj[o[1]] = mx; }); return adj; };
  H.quitar = function () { ST = null; cargado = true; try { Object.keys(sessionStorage).filter(function (k) { return k.indexOf('hpd:sel:') === 0; }).forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) { } emitir(); };

  /* ───────── CSS ───────── */
  var CSS = '.hpd-ov{position:fixed;inset:0;background:rgba(5,8,18,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px}' +
    '.hpd-m{background:var(--bg2,#141b2d);color:var(--text,#e8edf8);border:1px solid var(--border,#2a3a5c);border-radius:12px;width:min(980px,100%);max-height:94vh;display:flex;flex-direction:column;font-family:inherit;box-shadow:0 12px 50px rgba(0,0,0,.5)}' +
    '.hpd-m header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border,#2a3a5c)}.hpd-m h3{margin:0;font-size:1rem}' +
    '.hpd-x{background:none;border:none;color:var(--text2,#8a9bb8);font-size:1.2rem;cursor:pointer}' +
    '.hpd-b{padding:12px 16px;overflow:auto;flex:1}.hpd-f{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid var(--border,#2a3a5c)}' +
    '.hpd-m select,.hpd-m input[type=number],.hpd-m input[type=text],.hpd-sel select{background:var(--bg3,#0e1424);color:var(--text,#e8edf8);border:1px solid var(--border,#2a3a5c);border-radius:6px;padding:.35rem .5rem;font-size:.82rem;max-width:100%;font-family:inherit}' +
    '.hpd-row{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:0 0 10px;font-size:.84rem}.hpd-row label{display:flex;align-items:center;gap:6px}' +
    '.hpd-ay{font-size:.8rem;opacity:.8;margin:0 0 10px}.hpd-rol{border:1px solid var(--border,#2a3a5c);border-left-width:4px;border-radius:8px;padding:8px 10px;margin:0 0 8px;font-size:.84rem}' +
    '.hpd-rol b{display:block;margin-bottom:4px}.hpd-chips{display:flex;flex-wrap:wrap;gap:4px 12px}.hpd-chips label{display:flex;align-items:center;gap:4px;font-size:.82rem}' +
    '.hpd-av{margin:0 0 10px;font-size:.82rem}.hpd-av summary{cursor:pointer;color:var(--accent,#00d4ff)}.hpd-av .hpd-row{margin-top:8px}' +
    '.hpd-tw{overflow:auto;max-height:36vh;border:1px solid var(--border,#2a3a5c);border-radius:8px}' +
    '.hpd-t{border-collapse:collapse;font-size:.76rem;width:100%}.hpd-t th,.hpd-t td{padding:3px 8px;border-bottom:1px solid var(--border,#2a3a5c);white-space:nowrap;text-align:left}' +
    '.hpd-t th{position:sticky;top:0;background:var(--bg3,#0e1424);z-index:1;vertical-align:bottom}.hpd-t small{display:block;font-weight:400;opacity:.7}' +
    '.hpd-t td.sel,.hpd-t th.sel{background:rgba(0,212,255,.1)}.hpd-t input[type=text]{width:100%;min-width:150px}.hpd-t td.n{opacity:.6}' +
    '.hpd-r{margin:10px 0 0;font-size:.84rem}.hpd-r .w{color:#ffcc66}.hpd-r .e{color:#ff6b6b}' +
    '.hpd-btn{border:1px solid var(--border,#2a3a5c);background:transparent;color:var(--text,#e8edf8);border-radius:8px;padding:.5rem 1rem;cursor:pointer;font-size:.85rem;font-family:inherit}' +
    '.hpd-btn.s{padding:.3rem .7rem;font-size:.78rem}.hpd-btn.p{background:var(--accent,#00d4ff);color:#06101f;border-color:transparent;font-weight:600}.hpd-btn[disabled]{opacity:.4;cursor:not-allowed}' +
    '.hpd-pan{border:1px solid var(--border,#2a3a5c);border-radius:10px;padding:.7rem .9rem;margin:0 0 1rem;background:var(--bg3,#0e1424);font-size:.82rem;color:var(--text,#e8edf8)}' +
    '.hpd-pan .t{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between}.hpd-pan .bs{display:flex;flex-wrap:wrap;gap:6px}' +
    '.hpd-pan .vs{margin-top:.5rem;display:flex;flex-wrap:wrap;gap:4px}.hpd-chip{border:1px solid var(--border,#2a3a5c);border-radius:999px;padding:1px 9px;font-size:.72rem;opacity:.9;cursor:pointer;background:none;color:inherit;font-family:inherit}' +
    '.hpd-pan .nota{font-size:.72rem;opacity:.7;margin-top:.4rem}.hpd-drop{display:block;text-align:center;cursor:pointer;border:1.5px dashed var(--border,#2a3a5c);border-radius:10px;padding:.9rem;margin:0 0 1rem;font-size:.82rem;color:var(--text2,#8a9bb8)}' +
    '.hpd-drop:hover{border-color:var(--accent,#00d4ff)}.hpd-drop strong{display:block;color:var(--text,#e8edf8);margin:.2rem 0}' +
    '.hpd-sel{margin:0 0 .8rem;font-size:.8rem;color:var(--text2,#8a9bb8)}.hpd-sel>b{display:block;margin-bottom:.3rem;font-weight:600}.hpd-sel .hpd-chips label{color:var(--text,#e8edf8)}.hpd-sel .h{font-size:.72rem;opacity:.75;margin-top:.25rem}' +
    '@media(max-width:640px){.hpd-ov{padding:0}.hpd-m{max-height:100vh;height:100vh;border-radius:0}}';
  function css() { if (!document.getElementById('hpd-css')) { var st = document.createElement('style'); st.id = 'hpd-css'; st.textContent = CSS; document.head.appendChild(st); } }
  var COLORES = ['#00d4ff', '#00ff9d', '#ffb347', '#c792ea', '#ff6b9d', '#7ec8e3'];
  var TIPOS = { num: 'numérica', cat: 'categórica', ord: 'ordinal' };

  function modal(titulo, html, botones) {
    css();
    var ov = document.createElement('div'); ov.className = 'hpd-ov';
    ov.innerHTML = '<div class="hpd-m" role="dialog" aria-modal="true" aria-label="' + ESC(titulo) + '"><header><h3>' + ESC(titulo) + '</h3><button type="button" class="hpd-x" aria-label="Cerrar">✕</button></header><div class="hpd-b">' + html + '</div><div class="hpd-f"></div></div>';
    document.body.appendChild(ov);
    function cerrar() { document.removeEventListener('keydown', esc); ov.remove(); }
    function esc(e) { if (e.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', esc);
    ov.querySelector('.hpd-x').onclick = cerrar;
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) cerrar(); });
    var pie = ov.querySelector('.hpd-f');
    return { ov: ov, body: ov.querySelector('.hpd-b'), pie: pie, cerrar: cerrar };
  }

  /* ───────── editor: hoja, variables (tipo y etiquetas), filas ───────── */
  H.editor = function () {
    var d = H.ds(); if (!d) return; var st = leerStore();
    var M = modal('Mis datos: variables, etiquetas y filas', '', null), body = M.body;
    M.pie.innerHTML = '<button type="button" class="hpd-btn p">Listo</button>'; M.pie.firstChild.onclick = M.cerrar;
    function pintar() {
      d = H.ds(); var h = '';
      h += '<p class="hpd-ay">Revise cómo se interpreta cada variable. Las variables con códigos (como Sexo = 1 o 2) deben ser <b>categóricas</b>; así las pruebas las tratan como grupos y no como mediciones. Las etiquetas se escriben como <code>1=Femenino; 2=Masculino</code>.</p>';
      h += '<div class="hpd-row"><span>Archivo: <b>' + ESC(d.archivo) + '</b></span>';
      if (d.hojas.length > 1) h += '<label>Hoja: <select class="hoja">' + d.hojas.map(function (n, i) { return '<option value="' + i + '"' + (i === st.hoja ? ' selected' : '') + '>' + ESC(n) + '</option>'; }).join('') + '</select></label>';
      h += '<label><input type="checkbox" class="hdr"' + (st.header ? ' checked' : '') + '> La primera fila contiene los nombres de las columnas</label></div>';
      h += '<div class="hpd-tw"><table class="hpd-t"><thead><tr><th>Variable</th><th>Tipo</th><th>Etiquetas de valores</th><th>Ejemplos</th></tr></thead><tbody>';
      d.cols.forEach(function (c, i) {
        var et = Object.keys(c.etiquetas || {}).map(function (k) { return k + '=' + c.etiquetas[k]; }).join('; ');
        var ej = d.cuerpo.slice(0, 40).map(function (f) { return f[c.j]; }).filter(function (v) { return v != null; }).slice(0, 4).map(function (v) { return String(typeof v === 'number' ? +v.toPrecision(8) : v); }).join(', ');
        h += '<tr><td><b>' + ESC(c.nombre) + '</b>' + (c.posibleCodigo ? '<small>pocos valores (' + c.nDist + '): ¿código?</small>' : '') + (c.etiquetasAuto ? '<small>etiquetas leídas de la leyenda</small>' : '') + '</td>' +
          '<td><select class="tp" data-i="' + i + '">' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (c.tipo === k ? ' selected' : '') + (k === 'num' && !c.numerica ? ' disabled' : '') + '>' + TIPOS[k] + '</option>'; }).join('') + '</select></td>' +
          '<td><input type="text" class="et" data-i="' + i + '" value="' + ESC(et) + '" placeholder="1=Femenino; 2=Masculino"></td><td class="n">' + ESC(ej) + '</td></tr>';
      });
      h += '</tbody></table></div>';
      var cats = d.cols.filter(function (c) { return c.nDist <= 40 && c.noVacias >= Math.max(2, Math.ceil(d.nFilas * 0.5)); });
      h += '<details class="hpd-av"' + (d.filtro || d.desde || d.hasta ? ' open' : '') + '><summary>Filas: rango y filtro (se aplican a todas las calculadoras)</summary>';
      h += '<div class="hpd-row"><label>Desde la fila <input type="number" class="d" min="1" max="' + d.nFilas + '" value="' + (st.desde || 1) + '" style="width:5.5em"></label><label>hasta la fila <input type="number" class="ha" min="1" max="' + d.nFilas + '" value="' + (st.hasta || d.nFilas) + '" style="width:5.5em"></label><span style="opacity:.7">de ' + d.nFilas + ' filas</span></div>';
      h += '<div class="hpd-row"><label>Solo filas donde <select class="fc"><option value="">— sin filtro —</option>' + cats.map(function (c) { return '<option value="' + ESC(c.nombre) + '"' + (st.fCol === c.nombre ? ' selected' : '') + '>' + ESC(c.nombre) + '</option>'; }).join('') + '</select></label>';
      if (st.fCol && d.porNombre[st.fCol]) { var cc = d.porNombre[st.fCol], vs = []; d.cuerpo.forEach(function (f) { var v = f[cc.j]; if (v != null) { var e = d.etq(cc, v); if (vs.indexOf(e) < 0) vs.push(e); } }); h += '<label>es igual a <select class="fv"><option value="">— elegir —</option>' + vs.slice(0, 60).map(function (v) { return '<option value="' + ESC(v) + '"' + (st.fVal === v ? ' selected' : '') + '>' + ESC(v) + '</option>'; }).join('') + '</select></label>'; }
      h += '</div><div class="hpd-row"><b>' + d.usadas.length + '</b> de ' + d.nFilas + ' filas en uso.</div></details>';
      body.innerHTML = h; conectar();
    }
    function conectar() {
      var q = function (s) { return body.querySelector(s); };
      var sh = q('.hoja'); if (sh) sh.onchange = function () { st.hoja = +sh.value; st.header = detectarEncabezado(st.hojas[st.hoja].filas); st.tipos = {}; st.etiquetas = {}; st.desde = 0; st.hasta = 0; st.fCol = ''; st.fVal = ''; emitir(); pintar(); };
      q('.hdr').onchange = function () { st.header = this.checked; st.tipos = {}; st.etiquetas = {}; st.fCol = ''; st.fVal = ''; emitir(); pintar(); };
      body.querySelectorAll('.tp').forEach(function (s) { s.onchange = function () { var c = d.cols[+s.dataset.i]; st.tipos[c.nombre] = s.value; emitir(); pintar(); }; });
      body.querySelectorAll('.et').forEach(function (inp) {
        inp.onchange = function () {
          var c = d.cols[+inp.dataset.i], mapa = {};
          inp.value.split(/\s*;\s*|\s*,\s*(?=[-\w.]+\s*=)/).forEach(function (p) { var m = p.match(/^\s*([-\w.]+)\s*=\s*(.+?)\s*$/); if (m) mapa[m[1]] = m[2]; });
          st.etiquetas[c.nombre] = mapa; if (Object.keys(mapa).length && c.numerica && c.tipo === 'num' && !st.tipos[c.nombre]) st.tipos[c.nombre] = 'cat';
          emitir(); pintar();
        };
      });
      var dd = q('.d'), ha = q('.ha');
      dd.onchange = function () { var v = Math.max(1, Math.min(+dd.value || 1, d.nFilas)); st.desde = v === 1 ? 0 : v; emitir(); pintar(); };
      ha.onchange = function () { var v = Math.max(1, Math.min(+ha.value || d.nFilas, d.nFilas)); st.hasta = v === d.nFilas ? 0 : v; emitir(); pintar(); };
      q('.fc').onchange = function () { st.fCol = this.value; st.fVal = ''; emitir(); pintar(); };
      var fv = q('.fv'); if (fv) fv.onchange = function () { st.fVal = fv.value; emitir(); pintar(); };
    }
    pintar();
  };

  /* ───────── panel «Mis datos» ───────── */
  H.panel = function (el, op) {
    op = op || {}; css();
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.txt,.tsv,.xlsx,.xls'; inp.style.display = 'none';
    inp.onchange = function () { var f = inp.files[0]; if (!f) return; H.cargarArchivo(f).then(function () { if (op.alCargar) op.alCargar(); }).catch(function (e) { if (op.alError) op.alError(e.message); else mostrarError(e.message); }); inp.value = ''; };
    function mostrarError(m) { var b = el.querySelector('.hpd-err'); if (b) { b.textContent = '⚠ ' + m; b.style.display = 'block'; } }
    function pintar() {
      var d = H.ds(), h = '';
      if (!d) {
        h = '<label class="hpd-drop"><span>📂</span><strong>Cargar mis datos (CSV o Excel)</strong>' + ESC(op.texto || 'Se carga una sola vez y queda disponible en todas las calculadoras mientras tengas esta pestaña abierta. Los datos no salen de tu navegador.') + '</label><div class="hpd-err" style="display:none;color:#ff6b6b;font-size:.8rem;margin:-.5rem 0 .8rem"></div>';
        el.innerHTML = h; el.querySelector('.hpd-drop').appendChild(inp); return;
      }
      h = '<div class="hpd-pan"><div class="t"><div>📊 <b>Mis datos</b> · ' + ESC(d.archivo) + (d.hojas.length > 1 ? ' · hoja «' + ESC(d.hoja) + '»' : '') + ' · <b>' + d.usadas.length + '</b>' + (d.usadas.length !== d.nFilas ? ' de ' + d.nFilas : '') + ' filas · ' + d.cols.length + ' variables' + (d.filtro ? ' · filtro: ' + ESC(d.filtro.col) + ' = ' + ESC(d.filtro.val) : '') + '</div>' +
        '<div class="bs"><button type="button" class="hpd-btn s ed">Variables y etiquetas</button><label class="hpd-btn s" style="margin:0">Cambiar archivo</label><button type="button" class="hpd-btn s qt">Quitar datos</button></div></div>' +
        '<div class="vs">' + d.cols.map(function (c) { return '<button type="button" class="hpd-chip ed" title="Clic para editar el tipo y las etiquetas">' + (c.tipo === 'num' ? '#' : '◐') + ' ' + ESC(c.nombre) + '</button>'; }).join('') + '</div>' +
        '<div class="nota">Los datos se quedan en este navegador y se borran al cerrar la pestaña.' + (avisoMem ? ' (Base muy grande: no se conservará al cambiar de página.)' : '') + '</div><div class="hpd-err" style="display:none;color:#ff6b6b;font-size:.8rem;margin-top:.4rem"></div></div>';
      el.innerHTML = h;
      el.querySelectorAll('.ed').forEach(function (b) { b.onclick = H.editor; });
      el.querySelector('.qt').onclick = function () { H.quitar(); };
      var lab = el.querySelector('label.hpd-btn'); lab.appendChild(inp);
    }
    H.onCambio(pintar); pintar();
  };

  /* ───────── selector inline de variables ───────── */
  H.selector = function (el, spec) {
    var clave = 'hpd:sel:' + (spec.clave || el.id || 'x'), max = spec.max || (spec.multi ? 10 : 1);
    var API = {};
    function guardarSel(v) { try { sessionStorage.setItem(clave, JSON.stringify(v)); } catch (e) { } }
    function leerSel() { try { return JSON.parse(sessionStorage.getItem(clave) || '[]'); } catch (e) { return []; } }
    function elegibles() { var d = H.ds(); if (!d) return []; return d.cols.filter(function (c) { if (spec.maxDist && c.tipo !== 'num' && c.nDist > spec.maxDist) return false; return spec.tipo === 'any' || (spec.tipo === 'cat' ? c.tipo !== 'num' : c.tipo === 'num'); }); }
    var sel = leerSel();
    function pintar(notif) {
      var d = H.ds(); if (!d) { el.innerHTML = ''; sel = []; if (notif && spec.alCambiar) spec.alCambiar([]); return; }
      var el0 = elegibles(), nombres = el0.map(function (c) { return c.nombre; });
      sel = sel.filter(function (n) { return nombres.indexOf(n) >= 0; });
      var h = '<div class="hpd-sel"><b>' + ESC(spec.etiqueta || 'Variable') + (spec.multi ? ' <span style="font-weight:400;opacity:.7">(hasta ' + max + ')</span>' : '') + '</b>';
      if (!el0.length) h += '<span style="color:#ffcc66">No hay variables ' + (spec.tipo === 'cat' ? 'categóricas' : 'numéricas') + ' en «Mis datos». Puede cambiar el tipo en «Variables y etiquetas».</span>';
      else if (spec.multi) h += '<div class="hpd-chips">' + el0.map(function (c) { return '<label><input type="checkbox" value="' + ESC(c.nombre) + '"' + (sel.indexOf(c.nombre) >= 0 ? ' checked' : '') + '> ' + ESC(c.nombre) + '</label>'; }).join('') + '</div><div class="h"></div>';
      else h += '<select>' + '<option value="">— elegir variable —</option>' + el0.map(function (c) { return '<option value="' + ESC(c.nombre) + '"' + (sel[0] === c.nombre ? ' selected' : '') + '>' + ESC(c.nombre) + (spec.tipo !== 'num' && spec.tipo !== 'cat' ? ' (' + TIPOS[c.tipo] + ')' : '') + '</option>'; }).join('') + '</select>';
      h += '</div>'; el.innerHTML = h;
      if (spec.multi) el.querySelectorAll('input').forEach(function (i) {
        i.onchange = function () {
          if (i.checked) { if (sel.length >= max) { i.checked = false; el.querySelector('.h').textContent = 'Máximo ' + max + ' variables a la vez.'; return; } sel.push(i.value); }
          else sel = sel.filter(function (n) { return n !== i.value; });
          // conservar el orden de la base
          sel = nombres.filter(function (n) { return sel.indexOf(n) >= 0; }); guardarSel(sel); if (spec.alCambiar) spec.alCambiar(sel.slice());
        };
      });
      else { var s = el.querySelector('select'); if (s) s.onchange = function () { sel = s.value ? [s.value] : []; guardarSel(sel); if (spec.alCambiar) spec.alCambiar(sel.slice()); }; }
      if (notif && spec.alCambiar) spec.alCambiar(sel.slice());
    }
    API.valor = function () { return sel.slice(); };
    API.establecer = function (n) { sel = n.slice(); guardarSel(sel); pintar(true); };
    H.onCambio(function () { pintar(true); });
    pintar(true);
    return API;
  };

  /* ───────── ventana por roles (motor de pruebas) ───────── */
  H.elegir = function (op) {
    var d = H.ds();
    if (!d) return;
    var roles = op.roles && op.roles.length ? op.roles : [{ id: 'cols', label: 'Columnas a usar', tipo: 'num', multi: true, min: 1, max: 12 }];
    roles.forEach(function (r) { r.min = r.min != null ? r.min : (r.opcional ? 0 : 1); r.max = r.max != null ? r.max : (r.multi ? 12 : 1); });
    var S = { asign: {}, gCol: '' }; roles.forEach(function (r) { S.asign[r.id] = []; });
    var M = modal(op.titulo || 'Elegir variables de Mis datos', '', null), body = M.body;
    M.pie.innerHTML = '<button type="button" class="hpd-btn c">Cancelar</button><button type="button" class="hpd-btn p a">Usar estos datos</button>';
    var btnA = M.pie.querySelector('.a'); M.pie.querySelector('.c').onclick = M.cerrar;
    var elegibles = function (r) { return d.cols.filter(function (c) { return r.tipo === 'cat' ? true : c.tipo === 'num'; }); };
    var valCol = function (c, i) { var v = d.cuerpo[i][c.j]; if (v == null) return null; return c.tipo === 'num' ? numDe(v) : d.etq(c, v); };

    function calcular() {
      var agr = op.agrupar && S.gCol !== '' ? d.porNombre[S.gCol] : null, out = { archivo: d.archivo, hoja: d.hoja, roles: {}, columnas: [], errores: [], avisos: [] };
      var rolValor = roles.filter(function (r) { return r.tipo === 'num'; })[0];
      roles.forEach(function (r) {
        var k = S.asign[r.id].length, minEf = (agr && r === rolValor) ? 1 : r.min;
        if (k < minEf) out.errores.push('Elija ' + (minEf === 1 ? 'una variable' : 'al menos ' + minEf + ' variables') + ' para «' + r.label + '».');
        if (k > r.max) out.errores.push('«' + r.label + '» admite como máximo ' + r.max + ' variable' + (r.max === 1 ? '' : 's') + '.');
      });
      if (agr && rolValor) { if (S.asign[rolValor.id].length > 1) out.errores.push('Para dividir en grupos use una sola variable de valores.'); if (S.asign[rolValor.id].indexOf(agr.nombre) >= 0) out.errores.push('La variable de grupos debe ser distinta de la de valores.'); }
      var todas = []; roles.forEach(function (r) { S.asign[r.id].forEach(function (nm) { todas.push({ r: r, c: d.porNombre[nm] }); }); });
      var listwise = op.pareado || !!agr, usadas = d.usadas, ok = usadas;
      if (listwise) ok = usadas.filter(function (i) { return todas.every(function (x) { var v = valCol(x.c, i); return v != null; }) && (!agr || valCol(agr, i) != null); });
      var vacias = usadas.length - ok.length;
      roles.forEach(function (r) {
        var lista = [];
        if (agr && r.tipo === 'num') {
          var nm0 = S.asign[r.id][0]; if (!nm0) { out.roles[r.id] = []; return; }
          var c0 = d.porNombre[nm0], gr = {}, orden = [];
          var lbl = {}; ok.forEach(function (i) { var raw = d.cuerpo[i][agr.j], g = String(raw); lbl[g] = valCol(agr, i); if (!gr[g]) { gr[g] = []; orden.push(g); } gr[g].push(valCol(c0, i)); });
          if (orden.every(function (g) { return numDe(g) != null; })) orden.sort(function (a, b) { return numDe(a) - numDe(b); });
          var etiqueta = agr.tipo === 'num' ? function (g) { return agr.nombre + ' = ' + g; } : function (g) { return String(lbl[g]); };
          if (orden.length > (op.maxGrupos || 12)) out.errores.push('La variable «' + agr.nombre + '» tiene ' + orden.length + ' valores distintos (máximo ' + (op.maxGrupos || 12) + ' grupos).');
          if (orden.length < 2) out.errores.push('La variable «' + agr.nombre + '» tiene un solo valor entre las filas en uso: no se pueden formar grupos.');
          lista = orden.map(function (g) { return { nombre: etiqueta(g), valores: gr[g] }; });
        } else {
          S.asign[r.id].forEach(function (nm) {
            var c = d.porNombre[nm], ids = listwise ? ok : usadas.filter(function (i) { return valCol(c, i) != null; });
            if (!listwise) vacias = Math.max(vacias, usadas.length - ids.length);
            lista.push({ nombre: nm, valores: ids.map(function (i) { return valCol(c, i); }) });
          });
        }
        out.roles[r.id] = lista; lista.forEach(function (c) { out.columnas.push(c); });
      });
      out.n = listwise ? ok.length : (out.columnas.length ? Math.max.apply(null, out.columnas.map(function (c) { return c.valores.length; })) : 0);
      out.omitidas = { vacias: vacias };
      var cols = out.columnas, alto = cols.length ? Math.max.apply(null, cols.map(function (c) { return c.valores.length; })) : 0, fm = [cols.map(function (c) { return c.nombre; })];
      for (var q = 0; q < alto; q++) fm.push(cols.map(function (c) { return q < c.valores.length ? c.valores[q] : null; }));
      out.filas = fm;
      todas.forEach(function (x) { if (x.r.tipo === 'num' && x.c.posibleCodigo) out.avisos.push('«' + x.c.nombre + '» tiene pocos valores distintos (' + x.c.nDist + '): parece un código de categoría. Si es una categoría, cambie su tipo en «Variables y etiquetas».'); });
      if (out.n === 0 && !out.errores.length) out.errores.push('No quedan filas con datos válidos con esta selección.');
      return out;
    }
    function pintar() {
      var h = '';
      if (op.ayuda) h += '<p class="hpd-ay">' + ESC(op.ayuda) + '</p>';
      h += '<div class="hpd-row"><span>Mis datos: <b>' + ESC(d.archivo) + '</b> · ' + d.usadas.length + ' de ' + d.nFilas + ' filas' + (d.filtro ? ' (filtro: ' + ESC(d.filtro.col) + ' = ' + ESC(d.filtro.val) + ')' : '') + '</span></div>';
      roles.forEach(function (r, ri) {
        var el = elegibles(r), sel = S.asign[r.id];
        h += '<div class="hpd-rol" style="border-left-color:' + COLORES[ri % COLORES.length] + '"><b>' + ESC(r.label) + (r.tipo === 'cat' ? ' <small>(categorías o texto)</small>' : '') + '</b>';
        if (!el.length) h += '<span style="color:#ffcc66">No hay variables ' + (r.tipo === 'cat' ? '' : 'numéricas ') + 'en «Mis datos».</span>';
        else if (r.multi && r.max > 1) h += '<div class="hpd-chips">' + el.map(function (c) { return '<label><input type="checkbox" data-r="' + ESC(r.id) + '" value="' + ESC(c.nombre) + '"' + (sel.indexOf(c.nombre) >= 0 ? ' checked' : '') + '> ' + ESC(c.nombre) + '</label>'; }).join('') + '</div>';
        else h += '<select class="rol" data-r="' + ESC(r.id) + '"><option value="">— elegir variable —</option>' + el.map(function (c) { return '<option value="' + ESC(c.nombre) + '"' + (sel[0] === c.nombre ? ' selected' : '') + '>' + ESC(c.nombre) + (c.tipo === 'num' ? '' : ' (' + TIPOS[c.tipo] + ')') + '</option>'; }).join('') + '</select>';
        h += '</div>';
      });
      if (op.agrupar) {
        var cats = d.cols.filter(function (c) { return c.nDist >= 2 && c.nDist <= (op.maxGrupos || 12) && c.noVacias >= Math.max(2, Math.ceil(d.nFilas * 0.5)); });
        h += '<div class="hpd-row"><label>Dividir los valores en grupos según la variable <select class="gc"><option value="">— no dividir —</option>' + cats.map(function (c) { return '<option value="' + ESC(c.nombre) + '"' + (S.gCol === c.nombre ? ' selected' : '') + '>' + ESC(c.nombre) + ' (' + c.nDist + ' valores)</option>'; }).join('') + '</select></label><span style="opacity:.7">Ejemplo: «Calificación» según «Sexo».</span></div>';
      }
      h += '<div class="hpd-r"></div>';
      body.innerHTML = h; conectar(); resumen();
    }
    function resumen() {
      var o = calcular(), box = body.querySelector('.hpd-r'), t = '';
      if (o.errores.length) t += o.errores.map(function (e) { return '<div class="e">⚠ ' + ESC(e) + '</div>'; }).join('');
      else {
        t += '<div>✓ Se usarán <b>' + o.n + '</b> ' + (o.n === 1 ? 'fila' : 'filas') + (o.omitidas.vacias ? '. Omitidas por celdas vacías: ' + o.omitidas.vacias : '') + '.</div>';
        if (op.agrupar && S.gCol !== '') t += '<div>Grupos: ' + o.columnas.map(function (c) { return ESC(c.nombre) + ' (n=' + c.valores.length + ')'; }).join(' · ') + '</div>';
      }
      (o.avisos || []).forEach(function (a) { t += '<div class="w">ℹ ' + ESC(a) + '</div>'; });
      box.innerHTML = t; btnA.disabled = o.errores.length > 0;
    }
    function conectar() {
      body.querySelectorAll('select.rol').forEach(function (s) { s.onchange = function () { S.asign[s.dataset.r] = s.value === '' ? [] : [s.value]; pintar(); }; });
      body.querySelectorAll('.hpd-chips input').forEach(function (c) { c.onchange = function () { var a = S.asign[c.dataset.r], k = a.indexOf(c.value); if (c.checked && k < 0) a.push(c.value); if (!c.checked && k >= 0) a.splice(k, 1); pintar(); }; });
      var gc = body.querySelector('.gc'); if (gc) gc.onchange = function () { S.gCol = gc.value; pintar(); };
    }
    btnA.onclick = function () { var o = calcular(); if (o.errores.length) return; M.cerrar(); op.alAplicar(o); };
    pintar();
  };

  /* Compatibilidad: abrir desde <input type=file>: carga a «Mis datos» y abre la ventana por roles */
  H.abrir = function (ev, op) {
    var f = ev && ev.target && ev.target.files && ev.target.files[0], inp = ev && ev.target;
    if (!f) { if (H.hayDatos()) H.elegir(op); return; }
    H.cargarArchivo(f).then(function () { H.elegir(op); }).catch(function (e) { if (op.alError) op.alError(e.message); else alert(e.message); }).then(function () { if (inp) inp.value = ''; });
  };

  /* Auto-inicio: [data-hpd-panel] recibe el panel; [data-hpd-usar] se muestra solo si hay datos cargados */
  function auto() {
    document.querySelectorAll('[data-hpd-panel]').forEach(function (e) { if (!e.dataset.hpdListo) { e.dataset.hpdListo = 1; H.panel(e, {}); } });
    var ver = function () { var h = H.hayDatos(); document.querySelectorAll('[data-hpd-usar]').forEach(function (e) { e.style.display = h ? '' : 'none'; }); };
    ver(); H.onCambio(ver);
    if (typeof MutationObserver !== 'undefined' && !H._mo) { H._mo = new MutationObserver(function () { if (document.querySelector('[data-hpd-panel]:not([data-hpd-listo]),[data-hpd-usar]:not([data-hpd-vis])')) { document.querySelectorAll('[data-hpd-usar]').forEach(function (e) { e.dataset.hpdVis = 1; }); auto(); } }); H._mo.observe(document.body, { childList: true, subtree: true }); }
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto(); }

  if (typeof module !== 'undefined') module.exports = { numDe: numDe, parseTexto: parseTexto, detectarEncabezado: detectarEncabezado, infoColumnas: infoColumnas, normalizar: normalizar, parseLeyenda: parseLeyenda, detectarLeyenda: detectarLeyenda };
  global.HPDatos = H;
})(typeof window !== 'undefined' ? window : globalThis);
