/* HPDatos — selector de hoja, columnas y filas para archivos CSV/Excel.
 * Se usa en todas las calculadoras que cargan datos. Todo ocurre en el navegador:
 * el archivo no se envía a ningún servidor.
 *
 * HPDatos.abrir(event, opciones)         ← desde <input type="file" onchange="...">
 * HPDatos.abrirArchivo(file, opciones)
 *
 * opciones = {
 *   titulo:  'Elegir datos del archivo',
 *   ayuda:   'texto breve opcional',
 *   roles:   [{ id, label, tipo:'num'|'cat', multi:false, min:1, max:1, opcional:false }],
 *   pareado: true,       // elimina filas con vacíos en cualquiera de las columnas elegidas
 *   agrupar: false,      // permite dividir la columna numérica en grupos según otra columna
 *   maxGrupos: 12,
 *   alAplicar: function(res){...}
 * }
 * res = { archivo, hoja, n, filasTotales, omitidas, roles: { id: [ {nombre, valores:[...] } ] },
 *         columnas: [ {nombre, valores} ]  // todas las columnas elegidas, en orden
 *         filas: [[...]]                   // encabezado + datos, de las columnas elegidas }
 */
(function (global) {
  'use strict';
  var H = {};
  var ESC = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var letra = function (j) { var s = ''; j++; while (j > 0) { var m = (j - 1) % 26; s = String.fromCharCode(65 + m) + s; j = Math.floor((j - 1) / 26); } return s; };

  /* ───────── lectura de archivos ───────── */
  function numDe(v) {
    if (v == null) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var t = String(v).trim().replace(/\s/g, '');
    if (t === '' || !/^[-+]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?$/.test(t)) return null;
    var n = Number(t.replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  H.numDe = numDe;
  var vacio = function (v) { return v == null || (typeof v === 'string' && v.trim() === ''); };

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
        rd.onload = function (e) { ok({ nombre: file.name, hojas: [{ nombre: 'Datos', filas: normalizar(parseTexto(String(e.target.result))) }] }); };
        rd.readAsText(file);
      } else if (/\.xlsx?$/.test(n)) {
        if (typeof XLSX === 'undefined') return no(new Error('No se pudo cargar el lector de Excel. Revise su conexión a internet e intente de nuevo.'));
        rd.onload = function (e) {
          try {
            var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            var hojas = wb.SheetNames.map(function (nm) {
              return { nombre: nm, filas: normalizar(XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, defval: null, blankrows: false, raw: true })) };
            }).filter(function (h) { return h.filas.length; });
            if (!hojas.length) return no(new Error('El archivo no tiene datos.'));
            ok({ nombre: file.name, hojas: hojas });
          } catch (x) { no(new Error('No se pudo leer el archivo Excel. Verifique que no esté dañado ni protegido con contraseña.')); }
        };
        rd.readAsArrayBuffer(file);
      } else no(new Error('Formato no soportado. Suba un archivo .csv, .txt, .xlsx o .xls.'));
    });
  };

  /* ───────── análisis de la hoja ───────── */
  function detectarEncabezado(filas) {
    if (filas.length < 2) return false;
    var f0 = filas[0], hayTexto = f0.some(function (v) { return v != null && numDe(v) == null; });
    if (!hayTexto) return false;
    var ancho = f0.length, numCols = 0;
    for (var j = 0; j < ancho; j++) {
      var cuerpo = filas.slice(1).map(function (f) { return f[j]; }).filter(function (v) { return v != null; });
      if (cuerpo.length && cuerpo.filter(function (v) { return numDe(v) != null; }).length >= 0.7 * cuerpo.length) numCols++;
    }
    if (numCols > 0) return true;
    var vistos = {}, unicos = true;
    f0.forEach(function (v) { if (v != null) { if (vistos[v]) unicos = false; vistos[v] = 1; } });
    return unicos;
  }

  function infoColumnas(filas, header) {
    var ancho = filas.length ? filas[0].length : 0, cuerpo = header ? filas.slice(1) : filas, cols = [];
    for (var j = 0; j < ancho; j++) {
      var vals = cuerpo.map(function (f) { return f[j]; });
      var ne = vals.filter(function (v) { return v != null; }), nn = ne.filter(function (v) { return numDe(v) != null; });
      var dist = {}; ne.forEach(function (v) { dist[String(v)] = 1; });
      var nd = Object.keys(dist).length;
      var tipo = ne.length === 0 ? 'vacia' : nn.length >= 0.9 * ne.length ? 'num' : 'texto';
      var ent = tipo === 'num' && nn.every(function (v) { return Math.round(numDe(v)) === numDe(v); });
      var nombre = header && filas[0][j] != null ? String(filas[0][j]).trim() : 'Columna ' + letra(j);
      cols.push({ j: j, nombre: nombre || 'Columna ' + letra(j), tipo: tipo, noVacias: ne.length, nDist: nd, posibleCodigo: tipo === 'num' && ent && nd <= 8 && ne.length >= 6, dist: nd <= 40 ? Object.keys(dist) : null });
    }
    return cols;
  }

  /* ───────── interfaz ───────── */
  var CSS = '.hpd-ov{position:fixed;inset:0;background:rgba(5,8,18,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px}' +
    '.hpd-m{background:var(--bg2,#141b2d);color:var(--text,#e8edf8);border:1px solid var(--border,#2a3a5c);border-radius:12px;width:min(980px,100%);max-height:94vh;display:flex;flex-direction:column;font-family:inherit;box-shadow:0 12px 50px rgba(0,0,0,.5)}' +
    '.hpd-m header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border,#2a3a5c)}.hpd-m h3{margin:0;font-size:1rem}' +
    '.hpd-x{background:none;border:none;color:var(--text2,#8a9bb8);font-size:1.2rem;cursor:pointer}' +
    '.hpd-b{padding:12px 16px;overflow:auto;flex:1}.hpd-f{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid var(--border,#2a3a5c)}' +
    '.hpd-m select,.hpd-m input[type=number],.hpd-m input[type=text]{background:var(--bg3,#0e1424);color:var(--text,#e8edf8);border:1px solid var(--border,#2a3a5c);border-radius:6px;padding:.35rem .5rem;font-size:.82rem;max-width:100%}' +
    '.hpd-row{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:0 0 10px;font-size:.84rem}.hpd-row label{display:flex;align-items:center;gap:6px}' +
    '.hpd-ay{font-size:.8rem;opacity:.8;margin:0 0 10px}.hpd-rol{border:1px solid var(--border,#2a3a5c);border-left-width:4px;border-radius:8px;padding:8px 10px;margin:0 0 8px;font-size:.84rem}' +
    '.hpd-rol b{display:block;margin-bottom:4px}.hpd-chips{display:flex;flex-wrap:wrap;gap:4px 12px}.hpd-chips label{display:flex;align-items:center;gap:4px;font-size:.82rem}' +
    '.hpd-av{margin:0 0 10px;font-size:.82rem}.hpd-av summary{cursor:pointer;color:var(--accent,#00d4ff)}.hpd-av .hpd-row{margin-top:8px}' +
    '.hpd-tw{overflow:auto;max-height:36vh;border:1px solid var(--border,#2a3a5c);border-radius:8px}' +
    '.hpd-t{border-collapse:collapse;font-size:.76rem;width:100%}.hpd-t th,.hpd-t td{padding:3px 8px;border-bottom:1px solid var(--border,#2a3a5c);white-space:nowrap;text-align:left}' +
    '.hpd-t th{position:sticky;top:0;background:var(--bg3,#0e1424);z-index:1;vertical-align:bottom}.hpd-t small{display:block;font-weight:400;opacity:.7}' +
    '.hpd-t .n{opacity:.55;text-align:right}.hpd-t tr.of td{opacity:.3}.hpd-t td.sel,.hpd-t th.sel{background:rgba(0,212,255,.1)}' +
    '.hpd-r{margin:10px 0 0;font-size:.84rem}.hpd-r .w{color:#ffcc66}.hpd-r .e{color:#ff6b6b}' +
    '.hpd-btn{border:1px solid var(--border,#2a3a5c);background:transparent;color:var(--text,#e8edf8);border-radius:8px;padding:.5rem 1rem;cursor:pointer;font-size:.85rem}' +
    '.hpd-btn.p{background:var(--accent,#00d4ff);color:#06101f;border-color:transparent;font-weight:600}.hpd-btn[disabled]{opacity:.4;cursor:not-allowed}' +
    '@media(max-width:640px){.hpd-ov{padding:0}.hpd-m{max-height:100vh;height:100vh;border-radius:0}}';
  var COLORES = ['#00d4ff', '#00ff9d', '#ffb347', '#c792ea', '#ff6b9d', '#7ec8e3'];
  var MAXF = 300;

  function abrirDialogo(datos, op) {
    if (!document.getElementById('hpd-css')) { var st = document.createElement('style'); st.id = 'hpd-css'; st.textContent = CSS; document.head.appendChild(st); }
    var roles = op.roles && op.roles.length ? op.roles : [{ id: 'cols', label: 'Columnas a usar', tipo: 'num', multi: true, min: 1, max: 12 }];
    roles.forEach(function (r) { r.min = r.min != null ? r.min : (r.opcional ? 0 : 1); r.max = r.max != null ? r.max : (r.multi ? 12 : 1); });
    var S = { hoja: 0, header: true, filas: null, cols: null, asign: {}, excl: {}, desde: 1, hasta: 1, fCol: '', fVal: '', gCol: '' };
    roles.forEach(function (r) { S.asign[r.id] = []; });

    var ov = document.createElement('div'); ov.className = 'hpd-ov';
    ov.innerHTML = '<div class="hpd-m" role="dialog" aria-modal="true" aria-label="' + ESC(op.titulo || 'Elegir datos') + '"><header><h3>' + ESC(op.titulo || 'Elegir datos del archivo') + '</h3><button type="button" class="hpd-x" aria-label="Cerrar">✕</button></header><div class="hpd-b"></div><div class="hpd-f"><button type="button" class="hpd-btn c">Cancelar</button><button type="button" class="hpd-btn p a">Usar estos datos</button></div></div>';
    document.body.appendChild(ov);
    var body = ov.querySelector('.hpd-b'), btnA = ov.querySelector('.a');
    function cerrar() { document.removeEventListener('keydown', esc); ov.remove(); }
    function esc(e) { if (e.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', esc);
    ov.querySelector('.hpd-x').onclick = cerrar; ov.querySelector('.c').onclick = cerrar;
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) cerrar(); });

    function elegibles(r) { return S.cols.filter(function (c) { return c.tipo !== 'vacia' && (r.tipo === 'cat' ? true : c.tipo === 'num'); }); }
    function cargarHoja(i) {
      S.hoja = i; var f = datos.hojas[i].filas; S.header = detectarEncabezado(f); S.filas = f;
      S.excl = {}; S.fCol = ''; S.fVal = ''; S.gCol = ''; S.desde = 1;
      reclasificar(true);
    }
    function reclasificar(reiniciarAsign) {
      S.cols = infoColumnas(S.filas, S.header);
      var nf = S.header ? S.filas.length - 1 : S.filas.length; S.hasta = nf; S.desde = 1;
      if (reiniciarAsign) {
        roles.forEach(function (r) { S.asign[r.id] = []; });
        // autoselección solo cuando la hoja tiene exactamente las columnas necesarias (evita usar una columna por error)
        var usadas = {}, necesarias = 0, candidatas = S.cols.filter(function (c) { return c.tipo === 'num'; }).length;
        roles.forEach(function (r) { if (!r.opcional) necesarias += r.min; });
        if (candidatas <= necesarias) roles.forEach(function (r) { if (r.opcional) return; var el = elegibles(r).filter(function (c) { return !usadas[c.j]; }); for (var q = 0; q < r.min && q < el.length; q++) { S.asign[r.id].push(el[q].j); usadas[el[q].j] = 1; } });
      }
      pintar();
    }
    function cuerpo() { return S.header ? S.filas.slice(1) : S.filas; }
    function pasaFiltro(f, idx) {
      if (idx + 1 < S.desde || idx + 1 > S.hasta) return false;
      if (S.excl[idx]) return false;
      if (S.fCol !== '' && S.fVal !== '') { var v = f[+S.fCol]; if (String(v) !== S.fVal) return false; }
      return true;
    }

    function calcular() {
      var cu = cuerpo(), usadasFilas = [], rango = 0, desm = 0;
      cu.forEach(function (f, i) {
        if (i + 1 < S.desde || i + 1 > S.hasta) { rango++; return; }
        if (S.fCol !== '' && S.fVal !== '' && String(f[+S.fCol]) !== S.fVal) { rango++; return; }
        if (S.excl[i]) { desm++; return; }
        usadasFilas.push(i);
      });
      var agr = op.agrupar && S.gCol !== '' ? +S.gCol : null;
      var out = { archivo: datos.nombre, hoja: datos.hojas[S.hoja].nombre, roles: {}, columnas: [], errores: [], avisos: [], filasTotales: cu.length };
      var todasCols = [];
      roles.forEach(function (r) { S.asign[r.id].forEach(function (j) { todasCols.push({ r: r, j: j }); }); });
      // validación por rol
      var rolValor = roles.filter(function (r) { return r.tipo === 'num'; })[0];
      roles.forEach(function (r) {
        var k = S.asign[r.id].length, minEf = (agr != null && r === rolValor) ? 1 : r.min;
        if (k < minEf) out.errores.push('Elija ' + (minEf === 1 ? 'una columna' : 'al menos ' + minEf + ' columnas') + ' para «' + r.label + '».');
        if (k > r.max) out.errores.push('«' + r.label + '» admite como máximo ' + r.max + ' columna' + (r.max === 1 ? '' : 's') + '.');
      });
      if (agr != null) {
        var vr = roles.filter(function (r) { return r.tipo === 'num'; })[0];
        if (vr && S.asign[vr.id].length > 1) out.errores.push('Para dividir en grupos use una sola columna de valores.');
        if (vr && S.asign[vr.id].indexOf(agr) >= 0) out.errores.push('La columna de grupos debe ser distinta de la de valores.');
      }
      // filas válidas (listwise si pareado o hay agrupación)
      var listwise = op.pareado || agr != null, vaciasOmit = 0;
      var colsLista = todasCols.map(function (x) { return x.j; }); if (agr != null) colsLista.push(agr);
      var filasOk = usadasFilas;
      if (listwise) {
        filasOk = usadasFilas.filter(function (i) { return todasCols.every(function (x) { var v = cu[i][x.j]; return x.r.tipo === 'cat' ? v != null : numDe(v) != null; }) && (agr == null || cu[i][agr] != null); });
        vaciasOmit = usadasFilas.length - filasOk.length;
      }
      var val = function (r, i, j) { var v = cu[i][j]; return r.tipo === 'cat' ? String(v) : numDe(v); };
      var nombreDe = function (j) { return S.cols[j].nombre; };
      roles.forEach(function (r) {
        var lista = [];
        if (agr != null && r.tipo === 'num') {
          var j0 = S.asign[r.id][0]; if (j0 == null) { out.roles[r.id] = []; return; }
          var gr = {}, orden = [];
          filasOk.forEach(function (i) { var g = String(cu[i][agr]); if (!gr[g]) { gr[g] = []; orden.push(g); } gr[g].push(val(r, i, j0)); });
          if (orden.every(function (g) { return numDe(g) != null; })) orden.sort(function (a, b) { return numDe(a) - numDe(b); });
          var etiqueta = S.cols[agr].tipo === 'num' ? function (g) { return nombreDe(agr) + ' = ' + g; } : function (g) { return g; };
          if (orden.length > (op.maxGrupos || 12)) out.errores.push('La columna «' + nombreDe(agr) + '» tiene ' + orden.length + ' valores distintos (máximo ' + (op.maxGrupos || 12) + ' grupos). Elija otra columna.');
          if (orden.length < 2) out.errores.push('La columna «' + nombreDe(agr) + '» tiene un solo valor entre las filas elegidas: no se pueden formar grupos.');
          lista = orden.map(function (g) { return { nombre: etiqueta(g), valores: gr[g] }; });
        } else {
          S.asign[r.id].forEach(function (j) {
            var ids = listwise ? filasOk : usadasFilas.filter(function (i) { var v = cu[i][j]; return r.tipo === 'cat' ? v != null : numDe(v) != null; });
            if (!listwise) vaciasOmit = Math.max(vaciasOmit, usadasFilas.length - ids.length);
            lista.push({ nombre: nombreDe(j), valores: ids.map(function (i) { return val(r, i, j); }) });
          });
        }
        out.roles[r.id] = lista;
        lista.forEach(function (c) { out.columnas.push(c); });
      });
      out.n = listwise ? filasOk.length : out.columnas.length ? Math.max.apply(null, out.columnas.map(function (c) { return c.valores.length; })) : 0;
      out.omitidas = { fuera: rango, desmarcadas: desm, vacias: vaciasOmit };
      // matriz tipo hoja (encabezado + filas) para motores que leen "filas"
      var cols = out.columnas, alto = cols.length ? Math.max.apply(null, cols.map(function (c) { return c.valores.length; })) : 0, fm = [cols.map(function (c) { return c.nombre; })];
      for (var q = 0; q < alto; q++) fm.push(cols.map(function (c) { return q < c.valores.length ? c.valores[q] : null; }));
      out.filas = fm;
      // advertencias por columnas numéricas con texto
      todasCols.forEach(function (x) {
        if (x.r.tipo === 'num' && S.cols[x.j].tipo === 'num' && S.cols[x.j].noVacias > 0) { /* ok */ }
        if (S.cols[x.j].posibleCodigo && x.r.tipo === 'num') out.avisos.push('«' + nombreDe(x.j) + '» tiene pocos valores distintos (' + S.cols[x.j].nDist + '): parece un código de categoría, no una medición.');
      });
      if (out.n === 0 && !out.errores.length) out.errores.push('No quedan filas con datos válidos con esta selección.');
      return out;
    }

    function pintar() {
      var nf = cuerpo().length, hojas = datos.hojas;
      var h = '';
      if (op.ayuda) h += '<p class="hpd-ay">' + ESC(op.ayuda) + '</p>';
      h += '<div class="hpd-row"><span>Archivo: <b>' + ESC(datos.nombre) + '</b></span>';
      if (hojas.length > 1) h += '<label>Hoja: <select class="hoja">' + hojas.map(function (x, i) { return '<option value="' + i + '"' + (i === S.hoja ? ' selected' : '') + '>' + ESC(x.nombre) + '</option>'; }).join('') + '</select></label>';
      h += '<label><input type="checkbox" class="hdr"' + (S.header ? ' checked' : '') + '> La primera fila contiene los nombres de las columnas</label></div>';
      roles.forEach(function (r, ri) {
        var el = elegibles(r), sel = S.asign[r.id];
        h += '<div class="hpd-rol" style="border-left-color:' + COLORES[ri % COLORES.length] + '"><b>' + ESC(r.label) + (r.tipo === 'cat' ? ' <small>(categorías o texto)</small>' : '') + '</b>';
        if (!el.length) h += '<span class="w">No hay columnas ' + (r.tipo === 'cat' ? '' : 'numéricas ') + 'en esta hoja.</span>';
        else if (r.multi && r.max > 1) h += '<div class="hpd-chips">' + el.map(function (c) { return '<label><input type="checkbox" data-r="' + ESC(r.id) + '" data-j="' + c.j + '"' + (sel.indexOf(c.j) >= 0 ? ' checked' : '') + '> ' + ESC(c.nombre) + '</label>'; }).join('') + '</div>';
        else h += '<select class="rol" data-r="' + ESC(r.id) + '">' + (r.opcional || true ? '<option value="">— elegir columna —</option>' : '') + el.map(function (c) { return '<option value="' + c.j + '"' + (sel[0] === c.j ? ' selected' : '') + '>' + ESC(c.nombre) + (c.tipo === 'num' ? '' : ' (texto)') + '</option>'; }).join('') + '</select>';
        h += '</div>';
      });
      var minNo = Math.max(2, Math.ceil(nf * 0.5));
      var catCols = S.cols.filter(function (c) { return c.tipo !== 'vacia' && c.nDist <= 40 && c.nDist >= 1 && c.noVacias >= minNo; });
      h += '<details class="hpd-av"' + (S.desde > 1 || S.hasta < nf || S.fCol !== '' || S.gCol !== '' ? ' open' : '') + '><summary>Elegir filas, filtrar o dividir en grupos</summary>';
      h += '<div class="hpd-row"><label>Usar desde la fila <input type="number" class="d" min="1" max="' + nf + '" value="' + S.desde + '" style="width:5.5em"></label><label>hasta la fila <input type="number" class="ha" min="1" max="' + nf + '" value="' + S.hasta + '" style="width:5.5em"></label><span style="opacity:.7">(de ' + nf + ' filas de datos)</span></div>';
      h += '<div class="hpd-row"><label>Solo filas donde <select class="fc"><option value="">— sin filtro —</option>' + catCols.map(function (c) { return '<option value="' + c.j + '"' + (S.fCol === String(c.j) ? ' selected' : '') + '>' + ESC(c.nombre) + '</option>'; }).join('') + '</select></label>';
      if (S.fCol !== '') { var cc = S.cols[+S.fCol]; h += '<label>es igual a <select class="fv"><option value="">— elegir —</option>' + (cc.dist || []).map(function (v) { return '<option value="' + ESC(v) + '"' + (S.fVal === v ? ' selected' : '') + '>' + ESC(v) + '</option>'; }).join('') + '</select></label>'; }
      h += '</div>';
      if (op.agrupar) h += '<div class="hpd-row"><label>Dividir los valores en grupos según la columna <select class="gc"><option value="">— no dividir —</option>' + catCols.filter(function (c) { return c.nDist >= 2 && c.nDist <= (op.maxGrupos || 12); }).map(function (c) { return '<option value="' + c.j + '"' + (S.gCol === String(c.j) ? ' selected' : '') + '>' + ESC(c.nombre) + ' (' + c.nDist + ' valores)</option>'; }).join('') + '</select></label><span style="opacity:.7">Ejemplo: «Calificación» según «Sexo».</span></div>';
      h += '<div class="hpd-row" style="opacity:.8">Las casillas de la tabla permiten excluir filas una por una.</div></details>';
      // tabla
      var asignadas = {}; roles.forEach(function (r, ri) { S.asign[r.id].forEach(function (j) { asignadas[j] = ri; }); }); if (S.gCol !== '') asignadas[+S.gCol] = 5;
      var cu = cuerpo(), ver = Math.min(cu.length, MAXF), colsVer = S.cols.filter(function (c) { return c.tipo !== 'vacia'; });
      h += '<div class="hpd-tw"><table class="hpd-t"><thead><tr><th>#</th><th></th>' + colsVer.map(function (c) { var a = asignadas[c.j]; return '<th class="' + (a != null ? 'sel' : '') + '" style="' + (a != null ? 'box-shadow:inset 0 -3px 0 ' + COLORES[a % COLORES.length] : '') + '">' + ESC(c.nombre) + '<small>' + (c.tipo === 'num' ? (c.posibleCodigo ? 'numérica · ¿código?' : 'numérica') : 'texto') + '</small></th>'; }).join('') + '</tr></thead><tbody>';
      for (var i = 0; i < ver; i++) {
        var ok = pasaFiltro(cu[i], i);
        h += '<tr class="' + (ok ? '' : 'of') + '"><td class="n">' + (i + 1) + '</td><td><input type="checkbox" class="rw" data-i="' + i + '"' + (S.excl[i] ? '' : ' checked') + '></td>' + colsVer.map(function (c) { var v = cu[i][c.j]; return '<td class="' + (asignadas[c.j] != null ? 'sel' : '') + '">' + (v == null ? '<span style="opacity:.3">·</span>' : ESC(typeof v === 'number' ? +v.toPrecision(10) : v)) + '</td>'; }).join('') + '</tr>';
      }
      h += '</tbody></table></div>' + (cu.length > ver ? '<p class="hpd-ay">Se muestran las primeras ' + ver + ' de ' + cu.length + ' filas; el rango y el filtro se aplican a todas.</p>' : '');
      h += '<div class="hpd-r"></div>';
      body.innerHTML = h;
      conectar(); resumen();
    }

    function resumen() {
      var o = calcular(), box = body.querySelector('.hpd-r'), t = '';
      if (o.errores.length) t += o.errores.map(function (e) { return '<div class="e">⚠ ' + ESC(e) + '</div>'; }).join('');
      else {
        t += '<div>✓ Se usarán <b>' + o.n + '</b> ' + (o.n === 1 ? 'fila' : 'filas') + ' de ' + o.filasTotales + '.';
        var om = []; if (o.omitidas.fuera) om.push(o.omitidas.fuera + ' fuera del rango o del filtro'); if (o.omitidas.desmarcadas) om.push(o.omitidas.desmarcadas + ' excluidas con la casilla'); if (o.omitidas.vacias) om.push(o.omitidas.vacias + ' con celdas vacías o no numéricas');
        if (om.length) t += ' Omitidas: ' + om.join(', ') + '.';
        t += '</div>';
        if (op.agrupar && S.gCol !== '') t += '<div>Grupos: ' + o.columnas.map(function (c) { return ESC(c.nombre) + ' (n=' + c.valores.length + ')'; }).join(' · ') + '</div>';
      }
      (o.avisos || []).forEach(function (a) { t += '<div class="w">ℹ ' + ESC(a) + '</div>'; });
      box.innerHTML = t; btnA.disabled = o.errores.length > 0; S.ultimo = o;
    }

    function conectar() {
      var q = function (s) { return body.querySelector(s); };
      var sh = q('.hoja'); if (sh) sh.onchange = function () { cargarHoja(+sh.value); };
      q('.hdr').onchange = function () { S.header = this.checked; reclasificar(true); };
      body.querySelectorAll('select.rol').forEach(function (s) { s.onchange = function () { S.asign[s.dataset.r] = s.value === '' ? [] : [+s.value]; pintar(); }; });
      body.querySelectorAll('.hpd-chips input').forEach(function (c) { c.onchange = function () { var a = S.asign[c.dataset.r], j = +c.dataset.j, k = a.indexOf(j); if (c.checked && k < 0) a.push(j); if (!c.checked && k >= 0) a.splice(k, 1); pintar(); }; });
      var d = q('.d'), ha = q('.ha');
      d.onchange = function () { S.desde = Math.max(1, Math.min(+d.value || 1, S.hasta)); pintar(); };
      ha.onchange = function () { var nf = cuerpo().length; S.hasta = Math.max(S.desde, Math.min(+ha.value || nf, nf)); pintar(); };
      var fc = q('.fc'); fc.onchange = function () { S.fCol = fc.value; S.fVal = ''; pintar(); };
      var fv = q('.fv'); if (fv) fv.onchange = function () { S.fVal = fv.value; pintar(); };
      var gc = q('.gc'); if (gc) gc.onchange = function () { S.gCol = gc.value; pintar(); };
      body.querySelectorAll('.rw').forEach(function (c) { c.onchange = function () { var i = +c.dataset.i; if (c.checked) delete S.excl[i]; else S.excl[i] = 1; var tr = c.closest('tr'); tr.className = pasaFiltro(cuerpo()[i], i) ? '' : 'of'; resumen(); }; });
    }

    btnA.onclick = function () { var o = calcular(); if (o.errores.length) return; cerrar(); op.alAplicar(o); };
    cargarHoja(0);
    var primero = body.querySelector('select.rol, .hpd-chips input'); if (primero) primero.focus();
  }

  H.abrirArchivo = function (file, op) {
    return H.leerArchivo(file).then(function (datos) { abrirDialogo(datos, op); }).catch(function (e) { if (op.alError) op.alError(e.message); else alert(e.message); });
  };
  H.abrir = function (ev, op) {
    var f = ev && ev.target && ev.target.files && ev.target.files[0]; if (!f) return;
    var inp = ev.target;
    H.abrirArchivo(f, op).then(function () { inp.value = ''; });
  };
  if (typeof module !== 'undefined') module.exports = { numDe: numDe, parseTexto: parseTexto, detectarEncabezado: detectarEncabezado, infoColumnas: infoColumnas, normalizar: normalizar };
  global.HPDatos = H;
})(typeof window !== 'undefined' ? window : globalThis);
