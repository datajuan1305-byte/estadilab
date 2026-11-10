/* Definición de las herramientas de datos cualitativos — Estadilab (usa np-ui.js) */
const NPP = (function () {
  'use strict';
  const C = CUM, M = NPM;
  const fx = (v, d = 3) => (typeof v === 'number' && isFinite(v)) ? v.toFixed(d).replace('.', ',') : (v === Infinity ? '∞' : '—');
  const fpv = p => (p == null || typeof p !== 'number' || isNaN(p)) ? '—' : (p < 0.0001 ? '< 0,0001' : p.toFixed(4).replace('.', ','));
  const num = v => (typeof v === 'number' && isFinite(v)) ? String(+v.toPrecision(12)) : 'NA';
  const rs = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const decision = (p, a) => p < a ? 'Se rechaza H₀' : 'No se rechaza H₀';
  const NOREJ = ' Esto no demuestra que H₀ sea cierta: solo indica que los datos no aportan evidencia suficiente en su contra (con muestras pequeñas la prueba tiene poca potencia).';
  const concl = (p, a, si, no) => '<strong>' + decision(p, a) + '</strong> (p ' + (p < 0.0001 ? '< 0,0001' : '= ' + fpv(p)) + (p < a ? ' < ' : ' ≥ ') + fx(a, 2) + '). ' + (p < a ? si : no);
  const magnV = (v, df) => { const t = df <= 1 ? [0.1, 0.3, 0.5] : df === 2 ? [0.07, 0.21, 0.35] : [0.06, 0.17, 0.29]; return v < t[0] ? 'muy pequeña' : v < t[1] ? 'pequeña' : v < t[2] ? 'mediana' : 'grande'; };
  const fmtP = fpv;

  // ───────── lectura ─────────
  function partir(txt) { txt = String(txt || '').trim(); if (!txt) return []; return (/[\n;,]/.test(txt) ? txt.split(/[\n;,]+/) : txt.split(/\s+/)).map(s => s.trim()).filter(Boolean); }
  function leerFrecs(txt) {
    const ent = String(txt || '').split(/[\n;,]+/).map(s => s.trim()).filter(Boolean); if (ent.length < 2) throw new Error('Escriba al menos 2 categorías con su frecuencia (una por línea: Etiqueta 18, o Etiqueta:18).');
    const cats = [], f = []; ent.forEach((e, i) => { let m = e.match(/^(.*?)\s*[:=]\s*(-?\d+(?:\.\d+)?)$/) || e.match(/^(.*\S)\s+(-?\d+(?:\.\d+)?)$/); if (m) { cats.push(m[1]); f.push(Number(m[2])); } else if (/^-?\d+(\.\d+)?$/.test(e)) { cats.push('Cat. ' + (i + 1)); f.push(Number(e)); } else throw new Error('No se entiende «' + e + '». Use «Etiqueta 18» o «Etiqueta:18».'); });
    return { cats, f };
  }
  function contar(labels) { const m = new Map(); labels.forEach(l => m.set(l, (m.get(l) || 0) + 1)); return { cats: Array.from(m.keys()), f: Array.from(m.values()) }; }
  function leerTabla(txt) {
    const lineas = String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean); if (lineas.length < 2) throw new Error('Escriba la tabla de frecuencias: una fila por categoría de la variable 1 y una columna por categoría de la variable 2.');
    const tk = l => l.split(/[\t;,]|\s+/).filter(Boolean), esN = t => /^-?\d+(\.\d+)?$/.test(t);
    let filas = lineas.map(tk), colNames = null; if (filas[0].some(t => !esN(t))) { colNames = filas.shift(); }
    const rowNames = [], T = filas.map((f, i) => { let nm = null; if (!esN(f[0])) { nm = f[0]; f = f.slice(1); } rowNames.push(nm); return f.map(t => { if (!esN(t)) throw new Error('«' + t + '» no es una frecuencia válida (fila ' + (i + 1) + '). Las etiquetas no deben tener espacios: use guion bajo.'); return Number(t); }); });
    const c = T[0].length; T.forEach((f, i) => { if (f.length !== c) throw new Error('La fila ' + (i + 1) + ' tiene ' + f.length + ' valores y se esperaban ' + c + '.'); });
    if (colNames && colNames.length === c + 1) colNames = colNames.slice(1); if (colNames && colNames.length !== c) colNames = null;
    return { T, filas: rowNames.map((n, i) => n || 'Fila ' + (i + 1)), cols: colNames || Array.from({ length: c }, (_, j) => 'Col. ' + (j + 1)) };
  }
  function ordenar(cats) { return cats.slice().sort((a, b) => { const na = Number(a), nb = Number(b); return (isFinite(na) && isFinite(nb)) ? na - nb : String(a).localeCompare(String(b), 'es'); }); }
  function cruzar(xt, yt, union) {
    const x = partir(xt), y = partir(yt); if (x.length < 2) throw new Error('Escriba los datos de ambas variables (una etiqueta por observación).'); if (x.length !== y.length) throw new Error('Las dos variables deben tener la misma cantidad de observaciones (' + x.length + ' ≠ ' + y.length + ').');
    let fc = ordenar(Array.from(new Set(x))), cc = ordenar(Array.from(new Set(y))); if (union) { fc = cc = ordenar(Array.from(new Set(x.concat(y)))); }
    const T = fc.map(() => cc.map(() => 0)); x.forEach((a, i) => T[fc.indexOf(a)][cc.indexOf(y[i])]++); return { T, filas: fc, cols: cc };
  }
  const MODO = { id: 'modo', label: 'Formato de los datos', type: 'sel', opts: [['tabla', 'Tabla de frecuencias'], ['crudo', 'Datos sin resumir (dos listas)']], def: 'tabla' };
  const TAB = (label, ph) => ({ id: 'tabla', label, type: 'ta', rows: 5, ph, req: true, show: v => v.modo !== 'crudo' });
  const CRUDO = lab => [{ id: 'x', label: lab[0], type: 'ta', rows: 3, ph: 'Ej: Si No Si Si No Si', show: v => v.modo === 'crudo' }, { id: 'y', label: lab[1], type: 'ta', rows: 3, ph: 'Ej: Si Si Si No No Si', show: v => v.modo === 'crudo' }];
  const leerCruz = (v, union) => v.modo === 'crudo' ? cruzar(v.x, v.y, union) : leerTabla(v.tabla);
  const tablaObs = (q, nf, nc) => ({ cab: [''].concat(nc, ['Total']), filas: q.map((f, i) => [nf[i]].concat(f.map(String), [String(f.reduce((s, v) => s + v, 0))])).concat([['Total'].concat(nc.map((_, j) => String(q.reduce((s, f) => s + f[j], 0))), [String(q.reduce((s, f) => s + f.reduce((a, b) => a + b, 0), 0))])]) });
  const RMATT = (T, nf, nc) => 'tabla <- matrix(c(' + [].concat.apply([], T).join(', ') + '),\n                nrow = ' + T.length + ', byrow = TRUE,\n                dimnames = list(c(' + nf.map(rs).join(', ') + '),\n                                c(' + nc.map(rs).join(', ') + ')))\n';
  const PMATT = (T, nf, nc) => 'import numpy as np\nimport pandas as pd\nfrom scipy import stats as st\n\ntabla = pd.DataFrame(\n    ' + '[' + T.map(f => '[' + f.join(', ') + ']').join(', ') + '],\n    index=' + JSON.stringify(nf) + ', columns=' + JSON.stringify(nc) + ')\n';

  const celdas = f => (f || []).map(c => c == null ? '' : String(c).trim());
  const esNum = t => /^-?\d+([.,]\d+)?$/.test(t);
  function cargarCruz(filas) {
    const F = filas.map(celdas).filter(f => f.some(Boolean)); if (F.length < 2) throw new Error('El archivo no tiene suficientes filas.');
    const num2 = F.filter(f => f.slice(1).filter(esNum).length >= 2).length, ncol = Math.max.apply(null, F.map(f => f.length));
    if (num2 >= 2) return { modo: 'tabla', tabla: F.map(f => f.map(t => t.replace(/\s+/g, '_').replace(',', '.')).join(' ')).join('\n') };
    if (ncol >= 2) { const cuerpo = F.slice(1); return { modo: 'crudo', x: cuerpo.map(f => f[0]).filter(Boolean).join('\n'), y: cuerpo.map(f => f[1]).filter(Boolean).join('\n') }; }
    throw new Error('No se reconoció una tabla de frecuencias ni dos columnas de categorías.');
  }
  const TESTS = {};
  // ══════════ 1. Tabla de frecuencias ══════════
  TESTS.frecuencias = {
    tab: 'frec', nombre: 'Tabla de frecuencias y gráficos', corto: 'Frecuencias y gráficos', cuando: 'Resume una variable cualitativa (nominal u ordinal): frecuencias absolutas y relativas, porcentajes, acumuladas, moda, intervalos de confianza de Wilson y gráficos de barras, circular y de Pareto.',
    datos: 'Una variable categórica, ya contada o como lista de observaciones.',
    supuestos: ['Las categorías son mutuamente excluyentes y exhaustivas.', 'Las observaciones son independientes (los intervalos de confianza lo suponen).', 'Los porcentajes acumulados solo tienen sentido para variables ordinales (con las categorías en su orden natural).'],
    campos: [{ id: 'modo', label: 'Formato de los datos', type: 'sel', opts: [['frec', 'Frecuencias por categoría'], ['crudo', 'Datos sin resumir (una etiqueta por observación)']], def: 'frec' },
      { id: 'datos', label: 'Datos', type: 'ta', rows: 5, ph: 'Frecuencias, una por línea:\nExcelente 18\nBueno 35\nRegular 22\nMalo 9\n\nSin resumir: Bueno Malo Bueno Excelente …', req: true },
      { id: 'nivel', label: 'Tipo de variable', type: 'sel', opts: [['nom', 'Nominal'], ['ord', 'Ordinal (muestra acumuladas)']], def: 'nom' },
      { id: 'orden', label: 'Orden de las categorías', type: 'sel', opts: [['orig', 'El que escribí / primera aparición'], ['desc', 'Mayor a menor frecuencia'], ['asc', 'Menor a mayor frecuencia'], ['alfa', 'Alfabético']], def: 'orig' },
      { id: 'graf', label: 'Gráfico', type: 'sel', opts: [['barras', 'Barras verticales'], ['barrash', 'Barras horizontales'], ['circular', 'Circular (sectores)'], ['pareto', 'Pareto (barras + acumulado)']], def: 'barras' }],
    cargar(filas) {
      const F = filas.map(celdas).filter(f => f.some(Boolean)); if (!F.length) throw new Error('El archivo está vacío.');
      const dos = F.filter(f => f.length >= 2 && f[1] !== '' && esNum(f[1])).length >= Math.max(2, F.length - 1);
      if (dos) { return { modo: 'frec', datos: F.filter(f => esNum(f[1])).map(f => f[0].replace(/[:;,]/g, ' ') + ' ' + f[1].replace(',', '.')).join('\n') }; }
      let col = F.map(f => f[0]).filter(Boolean); const resto = col.slice(1); if (col.length > 6 && !resto.includes(col[0]) && new Set(resto).size < resto.length / 2) col = resto;
      return { modo: 'crudo', datos: col.join('\n') };
    },
    ejemplo: { modo: 'frec', datos: 'Excelente 18\nBueno 35\nRegular 22\nMalo 9\nDeficiente 4', nivel: 'ord', orden: 'orig', graf: 'barras' },
    leer(v) { const q = v.modo === 'crudo' ? (() => { const l = partir(v.datos); if (l.length < 5) throw new Error('Escriba las observaciones separadas por saltos de línea, comas o espacios (mínimo 5).'); return contar(l); })() : leerFrecs(v.datos); return { cats: q.cats, f: q.f, nivel: v.nivel, orden: v.orden, graf: v.graf }; },
    calc(d) { return C.frecuencias(d.cats, d.f, { orden: d.orden === 'orig' ? null : d.orden }); },
    render(d, r, a) {
      const ord = d.nivel === 'ord', mx = r.filas.find(x => x.f === r.moda_f), pc = x => fx(x, 1);
      let t = 'La categoría más frecuente (moda) es <strong>' + r.modas.join(' y ') + '</strong> con ' + (r.enteros ? r.moda_f + ' de ' + r.n + ' observaciones' : fx(r.moda_f, 2)) + ' (' + pc(mx.pct) + ' %; IC 95 % de Wilson [' + pc(100 * mx.ic[0]) + ' %; ' + pc(100 * mx.ic[1]) + ' %]).';
      if (ord) { const med = r.filas.find(x => x.cumPct >= 50); t += ' Por ser ordinal, la mediana se encuentra en la categoría «' + med.nombre + '» (el ' + pc(med.cumPct) + ' % acumulado alcanza o supera el 50 %).'; }
      t += ' La distribución ' + (r.entropiaNorm > 0.9 ? 'es muy pareja entre categorías' : r.entropiaNorm > 0.7 ? 'es moderadamente desigual' : 'está concentrada en pocas categorías') + ' (entropía normalizada ' + fx(r.entropiaNorm, 2) + ').';
      const av = []; if (r.n < 30) av.push('Con n < 30 los intervalos de confianza son amplios: interprete los porcentajes con cautela.'); if (!r.enteros) av.push('Las frecuencias no son enteras: los intervalos de Wilson suponen conteos.');
      const cab = ['Categoría', 'Frecuencia', '% ', 'IC 95 % (Wilson)'].concat(ord ? ['Acum.', '% acum.'] : []);
      const gr = d.graf === 'circular' ? { tipo: 'pie', etiquetas: r.filas.map(x => x.nombre), a: r.filas.map(x => x.f) } : d.graf === 'pareto' ? { tipo: 'pareto', etiquetas: r.filas.map(x => x.nombre), a: r.filas.map(x => x.f), acum: r.filas.map(x => +x.cumPct.toFixed(2)) } : { tipo: 'catbar', etiquetas: r.filas.map(x => x.nombre), a: r.filas.map(x => x.f), horiz: d.graf === 'barrash', etiq: 'Frecuencia' };
      return { cards: [{ n: 'Observaciones (n)', v: String(r.n), s: r.k + ' categorías', main: 1 }, { n: 'Moda', v: r.modas.length > 2 ? r.modas.length + ' categorías' : r.modas.join(' / '), s: pc(mx.pct) + ' %' }, { n: 'Entropía normalizada', v: fx(r.entropiaNorm, 2), s: '1 = distribución pareja' }],
        tabla: { cab, filas: r.filas.map(x => [x.nombre, String(+x.f.toFixed(4)), pc(x.pct), '[' + pc(100 * x.ic[0]) + '; ' + pc(100 * x.ic[1]) + ']'].concat(ord ? [String(+x.cum.toFixed(4)), pc(x.cumPct)] : [])) },
        resumen: [['n', String(r.n)], ['Categorías', String(r.k)], ['Moda', r.modas.join(', ')], ['Entropía normalizada', fx(r.entropiaNorm, 4)], ['χ² de uniformidad', fx(r.chiUnif, 3) + ' (gl = ' + (r.k - 1) + ', p ' + (r.pUnif < 0.0001 ? '< 0,0001' : '= ' + fpv(r.pUnif)) + ')']],
        h0: 'No aplica contraste: es un análisis descriptivo.', h1: 'La prueba de uniformidad (si todas las categorías son igual de probables) está en «Ver todas las medidas».', interp: t, avisos: av, grafico: gr, datosTxt: r.filas.map(x => x.nombre + ': ' + x.f).join(' · '), sinHip: true, pDecision: null };
    },
    R(d, r) { const nm = d.cats, v = d.f; return 'frec <- c(' + nm.map((n, i) => rs(n) + ' = ' + num(v[i])).join(', ') + ')\nn <- sum(frec)\n' + (d.orden === 'desc' ? 'frec <- sort(frec, decreasing = TRUE)\n' : d.orden === 'asc' ? 'frec <- sort(frec)\n' : d.orden === 'alfa' ? 'frec <- frec[order(names(frec))]\n' : '') + '\n# Tabla de frecuencias\ntabla <- data.frame(\n  categoria = names(frec), f = as.vector(frec),\n  porcentaje = round(100 * frec / n, 2),\n  acumulado = cumsum(frec), porc_acum = round(100 * cumsum(frec) / n, 2))\nprint(tabla)\n\n# IC 95 % de Wilson para cada proporción\nt(sapply(frec, function(x) prop.test(x, n, correct = FALSE)$conf.int))\n\n# Gráficos\nbarplot(frec, col = "steelblue", ylab = "Frecuencia")\npie(frec)\n# Pareto\nb <- barplot(frec, col = "steelblue", ylim = c(0, n)); lines(b, cumsum(frec), type = "b", col = "red")\n'; },
    Py(d, r) { return 'import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nfrom statsmodels.stats.proportion import proportion_confint\n\nfrec = pd.Series({' + d.cats.map((n, i) => JSON.stringify(n) + ': ' + num(d.f[i])).join(', ') + '})\n' + (d.orden === 'desc' ? 'frec = frec.sort_values(ascending=False)\n' : d.orden === 'asc' ? 'frec = frec.sort_values()\n' : d.orden === 'alfa' ? 'frec = frec.sort_index()\n' : '') + 'n = frec.sum()\n\ntabla = pd.DataFrame({"f": frec, "%": (100 * frec / n).round(2), "acum": frec.cumsum(), "% acum": (100 * frec.cumsum() / n).round(2)})\nlo, hi = proportion_confint(frec, n, method="wilson")   # IC 95 % de Wilson\ntabla["IC inf %"] = (100 * lo).round(2); tabla["IC sup %"] = (100 * hi).round(2)\nprint(tabla)\n\nfrec.plot.bar(color="steelblue"); plt.ylabel("Frecuencia"); plt.show()\nfrec.plot.pie(); plt.ylabel(""); plt.show()\n'; }
  };

  // ══════════ 2. Ji-cuadrado de independencia ══════════
  const exTabla = 'Aprobó Reprobó\nDiurno 45 15\nNocturno 30 30\nVirtual 25 35';
  TESTS.chi2ind = {
    tab: 'ind', nombre: 'Ji-cuadrado de independencia', corto: 'Ji-cuadrado de independencia', cuando: 'Contrasta si dos variables categóricas están asociadas, a partir de su tabla de contingencia (filas × columnas). También se usa para comparar proporciones entre varios grupos (homogeneidad).',
    datos: 'Dos variables categóricas; frecuencias en una tabla r × c o listas de observaciones.',
    supuestos: ['Observaciones independientes; cada sujeto aparece en una sola celda.', 'Frecuencias esperadas ≥ 5 en al menos el 80 % de las celdas y ninguna menor que 1; si no se cumple, use Fisher.', 'Los datos son conteos, no porcentajes.'],
    campos: [MODO, TAB('Tabla de frecuencias (opcional: primera fila con nombres de columnas y primera columna con nombres de filas, sin espacios)', exTabla)].concat(CRUDO(['Variable 1 (filas): una etiqueta por observación', 'Variable 2 (columnas): mismo orden y cantidad'])).concat([{ id: 'yates', label: 'Corrección de Yates (solo tablas 2×2)', type: 'sel', opts: [['no', 'No aplicar'], ['si', 'Aplicar']], def: 'no' }, { id: 'graf', label: 'Gráfico', type: 'sel', opts: [['apil', 'Barras apiladas (% por fila)'], ['grupo', 'Barras agrupadas (frecuencias)']], def: 'apil' }]),
    cargar: cargarCruz, archivoTxt: 'Tabla de frecuencias (con o sin nombres) o dos columnas de categorías',
    ejemplo: { modo: 'tabla', tabla: exTabla, yates: 'no', graf: 'apil' },
    leer(v) { const q = leerCruz(v, false); return { T: q.T, nf: q.filas, nc: q.cols, yates: v.yates === 'si', graf: v.graf }; },
    calc(d) { return C.chi2ind(d.T, d.yates); },
    render(d, r, a) {
      const rc = []; r.resA.forEach((f, i) => f.forEach((z, j) => { if (Math.abs(z) > 1.96) rc.push(d.nf[i] + ' × ' + d.nc[j] + ' (' + (z > 0 ? 'más' : 'menos') + ' de lo esperado, z = ' + fx(z, 2) + ')'); }));
      let t = concl(r.p, a, 'Hay evidencia de asociación entre las dos variables: la distribución de una cambia según las categorías de la otra.', 'No hay evidencia suficiente de asociación entre las variables.' + NOREJ);
      t += ' Fuerza de la asociación: V de Cramér = ' + fx(r.V, 3) + ' (' + magnV(r.V, Math.min(r.r - 1, r.c - 1)) + ').';
      if (r.p < a && rc.length) t += ' Celdas que más contribuyen (|residuo ajustado| > 1,96): ' + rc.join('; ') + '.';
      const av = []; if (r.pctMenos5 > 0.2 || r.minE < 1) av.push('El ' + Math.round(100 * r.pctMenos5) + ' % de las celdas tiene frecuencia esperada menor que 5 (mínima ' + fx(r.minE, 2) + '): la aproximación χ² no es fiable' + (r.r === 2 && r.c === 2 ? '; use la prueba exacta de Fisher.' : '; agrupe categorías o use Fisher-Freeman-Halton.'));
      const gr = d.graf === 'grupo' ? { tipo: 'agrup', etiquetas: d.nf, series: d.nc.map((n, j) => ({ n, v: d.T.map(f => f[j]) })), yt: 'Frecuencia' } : { tipo: 'apil', etiquetas: d.nf, series: d.nc.map((n, j) => ({ n, v: d.T.map(f => +(100 * f[j] / f.reduce((s, x) => s + x, 0)).toFixed(2)) })), yt: '% dentro de cada fila' };
      return { cards: [{ n: 'χ²' + (r.usaYates ? ' (Yates)' : ''), v: fx(r.stat, 3), s: 'gl = ' + r.df + ' · n = ' + r.n, main: 1 }, { n: 'Valor p', v: fpv(r.p), s: decision(r.p, a) }, { n: 'V de Cramér', v: fx(r.V, 3), s: magnV(r.V, Math.min(r.r - 1, r.c - 1)) }],
        tabla: tablaObs(d.T, d.nf, d.nc),
        tabla2: { titulo: 'Frecuencias esperadas', cab: [''].concat(d.nc), filas: r.E.map((f, i) => [d.nf[i]].concat(f.map(v => fx(v, 2)))) },
        tabla3: { titulo: 'Residuos estandarizados ajustados (|z| > 1,96 indica una celda atípica)', cab: [''].concat(d.nc), filas: r.resA.map((f, i) => [d.nf[i]].concat(f.map(v => fx(v, 2)))) },
        resumen: [['Tabla', r.r + ' × ' + r.c], ['n', String(r.n)], ['χ² de Pearson', fx(r.chi, 4)], ['gl', String(r.df)], ['p (Pearson)', fpv(r.pSinCorr)]].concat(r.usaYates ? [['χ² con corrección de Yates', fx(r.chiY, 4)], ['p (Yates)', fpv(r.p)]] : []).concat([['G de razón de verosimilitud', fx(r.G, 4)], ['p (G)', fpv(r.pG)], ['V de Cramér', fx(r.V, 4)], ['Coef. de contingencia', fx(r.C, 4)]]).concat(r.phi != null ? [['φ', fx(r.phi, 4)]] : []).concat([['Esperada mínima', fx(r.minE, 3)]]),
        h0: 'Las dos variables son independientes (no hay asociación).', h1: 'Las dos variables están asociadas.', interp: t, avisos: av, grafico: gr, datosTxt: d.nf.length + ' × ' + d.nc.length + ' (filas: ' + d.nf.join(', ') + '; columnas: ' + d.nc.join(', ') + ')', pDecision: r.p };
    },
    R(d, r) { return RMATT(d.T, d.nf, d.nc) + '\nres <- chisq.test(tabla, correct = ' + (d.yates ? 'TRUE' : 'FALSE') + ')\nres\nres$expected   # frecuencias esperadas\nres$stdres     # residuos estandarizados ajustados\n\n# V de Cramér\nsqrt(unname(chisq.test(tabla, correct = FALSE)$statistic) / (sum(tabla) * (min(dim(tabla)) - 1)))\n\n# Prueba G (razón de verosimilitud)  install.packages("DescTools")\nDescTools::GTest(tabla)\n'; },
    Py(d, r) { return PMATT(d.T, d.nf, d.nc) + '\nchi2, p, gl, esperadas = st.chi2_contingency(tabla, correction=' + (d.yates ? 'True' : 'False') + ')\nprint("chi2 =", chi2, " gl =", gl, " p =", p)\nprint(pd.DataFrame(esperadas, index=tabla.index, columns=tabla.columns).round(2))\n\n# Residuos estandarizados ajustados y V de Cramér\nn = tabla.values.sum(); fr = tabla.sum(1).values[:, None] / n; fc = tabla.sum(0).values[None, :] / n\nprint(((tabla.values - esperadas) / np.sqrt(esperadas * (1 - fr) * (1 - fc))).round(2))\nprint("V =", st.contingency.association(tabla.values, method="cramer", correction=False))\n\n# Prueba G\nprint(st.chi2_contingency(tabla, correction=False, lambda_="log-likelihood")[:3])\n'; }
  };

  // ══════════ 3. Fisher ══════════
  TESTS.fisher = {
    tab: 'ind', nombre: 'Prueba exacta de Fisher', corto: 'Fisher exacta', cuando: 'Contrasta la asociación entre dos variables categóricas sin depender de la aproximación χ²: es la prueba de elección en tablas 2 × 2 con frecuencias pequeñas. También admite tablas r × c (Fisher-Freeman-Halton).',
    datos: 'Tabla 2 × 2 (o r × c) de frecuencias, o dos listas de observaciones.',
    supuestos: ['Observaciones independientes; cada sujeto en una sola celda.', 'Es exacta: no exige frecuencias esperadas mínimas.', 'En 2 × 2 se informa el odds ratio con su intervalo exacto (estimador condicional de máxima verosimilitud, como R).', 'En tablas r × c grandes el valor p exacto puede aproximarse por simulación.'],
    campos: [MODO, TAB('Tabla de frecuencias (opcional: primera fila con nombres de columnas y primera columna con nombres de filas, sin espacios)', 'Mejoró NoMejoró\nTratado 8 2\nControl 3 7')].concat(CRUDO(['Variable 1 (filas): una etiqueta por observación', 'Variable 2 (columnas): mismo orden y cantidad'])).concat([{ id: 'alt', label: 'Hipótesis alternativa (solo 2×2)', type: 'sel', opts: [['two-sided', 'Bilateral (OR ≠ 1)'], ['greater', 'Unilateral (OR > 1)'], ['less', 'Unilateral (OR < 1)']], def: 'two-sided' }]),
    cargar: cargarCruz, archivoTxt: 'Tabla de frecuencias (con o sin nombres) o dos columnas de categorías',
    ejemplo: { modo: 'tabla', tabla: 'Mejoró NoMejoró\nTratado 8 2\nControl 3 7', alt: 'two-sided' },
    leer(v) { const q = leerCruz(v, false); return { T: q.T, nf: q.filas, nc: q.cols, alt: v.alt }; },
    calc(d) { return (d.T.length === 2 && d.T[0].length === 2) ? C.fisher2x2(d.T, d.alt) : C.fisherRxC(d.T); },
    render(d, r, a) {
      const av = []; let t, cards, resumen, h1;
      if (r.prueba === 'fisher2') {
        const altT = { 'two-sided': 'las dos variables están asociadas', greater: 'el odds ratio es mayor que 1', less: 'el odds ratio es menor que 1' }[r.alt];
        t = concl(r.p, a, 'Hay evidencia de que ' + altT + '.', 'No hay evidencia suficiente de que ' + altT + '.' + NOREJ);
        t += ' Odds ratio condicional (estimador exacto) = ' + fx(r.orMLE, 3) + ', IC 95 % exacto [' + fx(r.orIC[0], 3) + '; ' + fx(r.orIC[1], 3) + ']: los odds de «' + d.nc[0] + '» en «' + d.nf[0] + '» equivalen a ' + fx(r.orMLE, 2) + ' veces los de «' + d.nf[1] + '». Proporciones de «' + d.nc[0] + '»: ' + fx(100 * r.p1, 1) + ' % frente a ' + fx(100 * r.p2, 1) + ' % (riesgo relativo ' + fx(r.rr, 2) + ').';
        if (r.orIC[0] <= 1 && r.orIC[1] >= 1 && r.p < a) av.push('El intervalo del OR incluye 1 aunque el valor p sea < α: los intervalos exactos y la prueba pueden diferir ligeramente en tablas pequeñas.');
        cards = [{ n: 'Valor p (exacto)', v: fpv(r.p), s: decision(r.p, a), main: 1 }, { n: 'Odds ratio (condicional)', v: fx(r.orMLE, 3), s: 'muestral ' + fx(r.orMuestral, 3) }, { n: 'IC 95 % del OR', v: '[' + fx(r.orIC[0], 2) + '; ' + fx(r.orIC[1], 2) + ']', s: r.orIC[0] <= 1 && r.orIC[1] >= 1 ? 'incluye 1' : 'no incluye 1' }];
        resumen = [['Tabla', '2 × 2'], ['n', String(r.n)], ['Valor p exacto', fpv(r.p)], ['Alternativa', r.alt], ['OR muestral (ad/bc)', fx(r.orMuestral, 4)], ['OR condicional (MLE)', fx(r.orMLE, 4)], ['IC 95 % exacto del OR', '[' + fx(r.orIC[0], 4) + '; ' + fx(r.orIC[1], 4) + ']'], ['Proporción fila 1 / fila 2', fx(r.p1, 4) + ' / ' + fx(r.p2, 4)], ['Diferencia de proporciones', fx(r.difP, 4)], ['Riesgo relativo', fx(r.rr, 4)]];
        h1 = { 'two-sided': 'Las variables están asociadas (OR ≠ 1).', greater: 'OR > 1.', less: 'OR < 1.' }[r.alt];
      } else {
        t = concl(r.p, a, 'Hay evidencia de asociación entre las dos variables.', 'No hay evidencia suficiente de asociación entre las variables.' + NOREJ) + ' V de Cramér = ' + fx(r.V, 3) + ' (' + magnV(r.V, Math.min(r.r - 1, r.c - 1)) + ').'; h1 = 'Las variables están asociadas.';
        cards = [{ n: 'Valor p (Fisher-Freeman-Halton)', v: fpv(r.p), s: decision(r.p, a), main: 1 }, { n: 'Método', v: r.metodo.startsWith('Monte') ? 'Simulación' : 'Exacto', s: r.metodo }, { n: 'V de Cramér', v: fx(r.V, 3), s: magnV(r.V, Math.min(r.r - 1, r.c - 1)) }];
        resumen = [['Tabla', r.r + ' × ' + r.c], ['n', String(r.n)], ['Valor p', fpv(r.p)], ['Método', r.metodo], ['V de Cramér', fx(r.V, 4)]];
        if (r.metodo.startsWith('Monte')) av.push('La tabla es demasiado grande para enumerar todas las tablas posibles: el valor p se estimó por simulación (error de ± 0,003 aprox.).');
      }
      return { cards, tabla: tablaObs(d.T, d.nf, d.nc), resumen, h0: 'Las dos variables son independientes (no hay asociación).', h1, interp: t, avisos: av, grafico: { tipo: 'apil', etiquetas: d.nf, series: d.nc.map((n, j) => ({ n, v: d.T.map(f => +(100 * f[j] / (f.reduce((s, x) => s + x, 0) || 1)).toFixed(2)) })), yt: '% dentro de cada fila' }, datosTxt: d.nf.length + ' × ' + d.nc.length + ' (filas: ' + d.nf.join(', ') + '; columnas: ' + d.nc.join(', ') + ')', pDecision: r.p };
    },
    R(d, r) { const f2 = d.T.length === 2 && d.T[0].length === 2; return RMATT(d.T, d.nf, d.nc) + '\n' + (f2 ? 'fisher.test(tabla, alternative = "' + ({ 'two-sided': 'two.sided', greater: 'greater', less: 'less' })[d.alt] + '")   # p exacto, OR condicional e IC 95 %\n' : 'fisher.test(tabla, workspace = 2e7)                      # Fisher-Freeman-Halton exacto\n# Si es muy grande: fisher.test(tabla, simulate.p.value = TRUE, B = 1e5)\n'); },
    Py(d, r) { const f2 = d.T.length === 2 && d.T[0].length === 2; return PMATT(d.T, d.nf, d.nc) + '\n' + (f2 ? 'orr, p = st.fisher_exact(tabla.values, alternative="' + d.alt + '")\nprint("OR muestral =", orr, " p exacto =", p)\n# Nota: SciPy devuelve el OR muestral (ad/bc); R informa el OR condicional (MLE) con su IC exacto.\n' : '# SciPy no incluye Fisher-Freeman-Halton (r × c): use R (fisher.test) o una prueba de permutación:\nfrom scipy.stats import chi2_contingency, permutation_test\nx = np.repeat(np.arange(tabla.shape[0]), tabla.sum(1).values)\ny = np.concatenate([np.repeat(np.arange(tabla.shape[1]), fila) for fila in tabla.values])\nchi = lambda a, b: chi2_contingency(pd.crosstab(a, b).values, correction=False)[0]\nprint(permutation_test((x, y), chi, permutation_type="pairings", n_resamples=20000, alternative="greater").pvalue)\n'); }
  };

  // ══════════ 4. McNemar ══════════
  TESTS.mcnemar = {
    tab: 'par', nombre: 'Prueba de McNemar', corto: 'McNemar', cuando: 'Compara dos mediciones dicotómicas de los mismos sujetos (antes y después, o dos métodos): contrasta si cambió la proporción de «sí» usando solo los pares discordantes.',
    datos: 'Tabla 2 × 2 de pares (filas = primera medición, columnas = segunda medición), o dos listas de observaciones.',
    supuestos: ['Los mismos sujetos se miden dos veces (datos pareados); los sujetos son independientes entre sí.', 'Respuesta dicotómica en ambas mediciones.', 'La versión exacta (binomial) es válida con cualquier número de pares discordantes; la χ² requiere b + c ≥ 25.'],
    campos: [MODO, TAB('Tabla 2 × 2 (filas = antes, columnas = después). Opcional: nombres', 'Si No\nSi 40 15\nNo 5 30')].concat(CRUDO(['Medición 1 (antes): una etiqueta por sujeto', 'Medición 2 (después): mismo orden'])),
    cargar: cargarCruz, archivoTxt: 'Tabla 2×2 o dos columnas (antes y después)',
    ejemplo: { modo: 'tabla', tabla: 'Si No\nSi 40 15\nNo 5 30' },
    leer(v) { const q = leerCruz(v, true); if (q.T.length !== 2 || q.T[0].length !== 2) throw new Error('McNemar requiere exactamente 2 categorías en cada medición (tabla 2 × 2).'); return { T: q.T, nf: q.filas, nc: q.cols }; },
    calc(d) { return C.mcnemar(d.T); },
    render(d, r, a) {
      let t = concl(r.pExacto, a, 'La proporción de «' + d.nf[0] + '» cambió entre las dos mediciones: de ' + fx(100 * r.pm1, 1) + ' % a ' + fx(100 * r.pm2, 1) + ' %.', 'No hay evidencia suficiente de que la proporción de «' + d.nf[0] + '» haya cambiado.' + NOREJ);
      t += ' Hay ' + r.b + ' pares que pasaron de «' + d.nf[0] + '» a «' + d.nc[1] + '» y ' + r.c + ' que pasaron de «' + d.nf[1] + '» a «' + d.nc[0] + '». Odds ratio pareado b/c = ' + fx(r.or, 2) + ' (IC 95 % exacto [' + fx(r.orIC[0], 2) + '; ' + fx(r.orIC[1], 2) + ']).';
      const av = []; if (r.nd < 25) av.push('Hay menos de 25 pares discordantes: use el valor p exacto (el χ² no es fiable).'); av.push('Solo los pares discordantes (b y c) aportan información; los que no cambiaron (a y d) no influyen en la prueba.');
      return { cards: [{ n: 'Discordantes b / c', v: r.b + ' / ' + r.c, s: r.nd + ' pares discordantes', main: 1 }, { n: 'Valor p (exacto)', v: fpv(r.pExacto), s: decision(r.pExacto, a) }, { n: 'OR pareado (b/c)', v: fx(r.or, 2), s: 'IC [' + fx(r.orIC[0], 2) + '; ' + fx(r.orIC[1], 2) + ']' }],
        tabla: tablaObs(d.T, d.nf, d.nc), resumen: [['Pares', String(r.n)], ['Discordantes b / c', r.b + ' / ' + r.c], ['p exacto (binomial)', fpv(r.pExacto)], ['χ² sin corrección', fx(r.chi, 4)], ['p (χ², gl = 1)', fpv(r.pChi)], ['χ² con corrección de continuidad', fx(r.chiC, 4)], ['p (χ² corregido)', fpv(r.pChiC)], ['Proporción «' + d.nf[0] + '» en medición 1', fx(r.pm1, 4)], ['Proporción «' + d.nf[0] + '» en medición 2', fx(r.pm2, 4)], ['OR pareado (b/c)', fx(r.or, 4)]],
        h0: 'La probabilidad de cambiar en un sentido es igual a la de cambiar en el otro (b = c).', h1: 'Los cambios en un sentido son más probables que en el otro.', interp: t, avisos: av, grafico: { tipo: 'catbar', etiquetas: ['Estables (a + d)', d.nf[0] + ' → ' + d.nc[1] + ' (b)', d.nf[1] + ' → ' + d.nc[0] + ' (c)'], a: [r.a + r.d, r.b, r.c], etiq: 'Pares', colores: ['#6b7c9ccc', '#00d4ffcc', '#ffd700cc'] }, datosTxt: 'a = ' + r.a + ', b = ' + r.b + ', c = ' + r.c + ', d = ' + r.d, pDecision: r.pExacto };
    },
    R(d, r) { return RMATT(d.T, d.nf, d.nc) + '\nmcnemar.test(tabla, correct = TRUE)           # χ² con corrección de continuidad\nbinom.test(tabla[1, 2], tabla[1, 2] + tabla[2, 1], p = 0.5)   # versión exacta\n'; },
    Py(d, r) { return PMATT(d.T, d.nf, d.nc) + '\nfrom statsmodels.stats.contingency_tables import mcnemar\n\nprint(mcnemar(tabla.values, exact=True))                      # exacta (binomial)\nprint(mcnemar(tabla.values, exact=False, correction=True))    # χ² con corrección\n'; }
  };

  // ══════════ 5. Kappa de Cohen ══════════
  TESTS.kappa = {
    tab: 'par', nombre: 'Kappa de Cohen (acuerdo entre evaluadores)', corto: 'Kappa de Cohen', cuando: 'Mide el acuerdo entre dos evaluadores (o dos métodos) que clasifican a los mismos sujetos en las mismas categorías, descontando el acuerdo esperado por azar. Con categorías ordinales puede ponderarse.',
    datos: 'Tabla cuadrada k × k (filas = evaluador 1, columnas = evaluador 2) o dos listas de clasificaciones.',
    supuestos: ['Los mismos sujetos son clasificados por ambos evaluadores, de forma independiente.', 'Las categorías son las mismas y están en el mismo orden para ambos.', 'El kappa depende de la prevalencia de las categorías: interprételo junto con el porcentaje de acuerdo.', 'Con categorías ordinales use kappa ponderado (lineal o cuadrático).'],
    campos: [MODO, TAB('Tabla k × k (filas = evaluador 1, columnas = evaluador 2)', 'Leve Moderado Grave\nLeve 20 5 1\nModerado 4 18 6\nGrave 1 3 12')].concat(CRUDO(['Evaluador 1: una clasificación por sujeto', 'Evaluador 2: mismo orden'])).concat([{ id: 'pesos', label: 'Ponderación', type: 'sel', opts: [['none', 'Sin ponderar (nominal)'], ['linear', 'Lineal (ordinal)'], ['quad', 'Cuadrática (ordinal)']], def: 'none' }]),
    cargar: cargarCruz, archivoTxt: 'Tabla k×k o dos columnas (evaluador 1 y 2)',
    ejemplo: { modo: 'tabla', tabla: 'Leve Moderado Grave\nLeve 20 5 1\nModerado 4 18 6\nGrave 1 3 12', pesos: 'none' },
    leer(v) { const q = leerCruz(v, true); return { T: q.T, nf: q.filas, nc: q.cols, pesos: v.pesos || 'none' }; },
    calc(d) { return C.kappa(d.T, d.pesos); },
    render(d, r, a) {
      const k = r.kappa, niv = k < 0 ? 'peor que el azar' : k <= 0.2 ? 'leve' : k <= 0.4 ? 'aceptable' : k <= 0.6 ? 'moderado' : k <= 0.8 ? 'sustancial' : 'casi perfecto';
      let t = '<strong>κ = ' + fx(k, 3) + '</strong> (IC 95 % [' + fx(r.ic[0], 3) + '; ' + fx(r.ic[1], 3) + ']): acuerdo <strong>' + niv + '</strong> según Landis y Koch. ' + concl(r.pos2, a, 'El acuerdo es mayor que el esperable por azar.', 'No hay evidencia de que el acuerdo supere al azar.') + ' El acuerdo observado es ' + fx(100 * r.po, 1) + ' % frente a ' + fx(100 * r.pe, 1) + ' % esperado por azar.';
      const av = []; if (r.n < 30) av.push('Con n < 30 el intervalo de confianza de kappa es muy amplio.'); if (r.pesos === 'none' && r.k > 2) av.push('Si las categorías son ordinales (leve, moderado, grave), el kappa ponderado penaliza menos los desacuerdos entre categorías vecinas.'); av.push('El kappa es sensible a la prevalencia: dos evaluadores con 90 % de acuerdo pueden tener un kappa bajo si casi todos los sujetos caen en una categoría.');
      return { cards: [{ n: 'κ de Cohen' + (r.pesos === 'none' ? '' : ' (' + (r.pesos === 'linear' ? 'lineal' : 'cuadrático') + ')'), v: fx(k, 3), s: niv, main: 1 }, { n: 'IC 95 %', v: '[' + fx(r.ic[0], 2) + '; ' + fx(r.ic[1], 2) + ']', s: 'error estándar ' + fx(r.se, 3) }, { n: 'Valor p (κ = 0)', v: fpv(r.pos2), s: decision(r.pos2, a) }],
        tabla: tablaObs(d.T, d.nf, d.nc), resumen: [['Sujetos (n)', String(r.n)], ['Categorías', String(r.k)], ['Ponderación', ({ none: 'ninguna', linear: 'lineal', quad: 'cuadrática' })[r.pesos]], ['Acuerdo observado', fx(r.po, 4)], ['Acuerdo esperado por azar', fx(r.pe, 4)], ['κ', fx(k, 4)], ['Error estándar', fx(r.se, 4)], ['IC 95 %', '[' + fx(r.ic[0], 4) + '; ' + fx(r.ic[1], 4) + ']'], ['Z (H₀: κ = 0)', fx(r.z0, 3)], ['Valor p bilateral', fpv(r.pos2)]],
        h0: 'El acuerdo entre los evaluadores no supera al esperado por azar (κ = 0).', h1: 'El acuerdo supera al azar (κ > 0).', interp: t, avisos: av, grafico: { tipo: 'agrup', etiquetas: d.nf, series: d.nc.map((n, j) => ({ n: 'Eval. 2: ' + n, v: d.T.map(f => f[j]) })), yt: 'Sujetos', xt: 'Clasificación del evaluador 1' }, datosTxt: r.n + ' sujetos, ' + r.k + ' categorías (' + d.nf.join(', ') + ')', pDecision: r.pos2 };
    },
    R(d, r) { return RMATT(d.T, d.nf, d.nc) + '\n# install.packages("psych")\nlibrary(psych)\ncohen.kappa(tabla)' + (d.pesos === 'none' ? '' : '   # ver $weighted.kappa (ponderación ' + (d.pesos === 'linear' ? 'lineal' : 'cuadrática') + ': use w = "' + (d.pesos === 'linear' ? 'linear' : 'quadratic') + '")') + '\n'; },
    Py(d, r) { return PMATT(d.T, d.nf, d.nc) + '\nfrom statsmodels.stats.inter_rater import cohens_kappa\n\nres = cohens_kappa(tabla.values' + (d.pesos === 'none' ? '' : ', wt="' + (d.pesos === 'linear' ? 'linear' : 'quadratic') + '"') + ')\nprint(res)   # kappa, error estándar, IC 95 % y pruebas\n'; }
  };

  const TABS = [
    { id: 'frec', nombre: 'Frecuencias y gráficos', tests: ['frecuencias'], desc: 'Resumen de una variable cualitativa: tabla de frecuencias, intervalos de confianza y gráficos.' },
    { id: 'ind', nombre: 'Asociación entre variables', tests: ['chi2ind', 'fisher'], desc: 'Dos variables categóricas en una tabla de contingencia: ¿están asociadas?' },
    { id: 'par', nombre: 'Datos pareados y acuerdo', tests: ['mcnemar', 'kappa'], desc: 'Los mismos sujetos clasificados dos veces: cambio (McNemar) y acuerdo entre evaluadores (kappa).' }];
  const refs = 'Referencias: Agresti, A. (2013). Categorical Data Analysis (3.ª ed.). Wiley; Fleiss, J. L., Levin, B. y Paik, M. C. (2003). Statistical Methods for Rates and Proportions. Wiley; Wilson, E. B. (1927). JASA, 22, 209–212; Cohen, J. (1960). Educational and Psychological Measurement, 20, 37–46; Landis, J. R. y Koch, G. G. (1977). Biometrics, 33, 159–174; McNemar, Q. (1947). Psychometrika, 12, 153–157. Cálculos realizados con Estadilab (estadilab.com).';
  return { TESTS, TABS, fx, fpv, num, rs, decision, concl, NOREJ, refs };
})();
