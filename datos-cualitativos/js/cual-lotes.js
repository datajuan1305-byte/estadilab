/* Pruebas por lotes sobre «Mis datos»: independencia (tablas cruzadas) y bondad de ajuste — Estadilab */
(function () {
  'use strict';
  const P = NPP, T0 = P.TESTS, C = CUM, M = NPM, fx = P.fx, fpv = P.fpv, rs = P.rs, num = P.num;
  const AVISO = 'Análisis exploratorio: al contrastar varias pruebas a la vez crece la probabilidad de falsos positivos. Se informa el valor p ajustado por Holm; use ese valor, y el tamaño del efecto, para decidir.';
  const pc = x => fx(x, 1);
  function ordenar(cats) { return cats.slice().sort((a, b) => { const na = Number(a), nb = Number(b); return (isFinite(na) && isFinite(nb)) ? na - nb : String(a).localeCompare(String(b), 'es'); }); }
  function cruzar(a, b) {
    const m = HPDatos.matriz([a, b], { completas: true }), x = m.cols[0], y = m.cols[1];
    const fc = ordenar(Array.from(new Set(x))), cc = ordenar(Array.from(new Set(y)));
    if (fc.length > 30 || cc.length > 30) throw new Error('«' + (fc.length > 30 ? a : b) + '» tiene demasiadas categorías (más de 30). Elija otra variable o reduzca categorías.');
    const T = fc.map(() => cc.map(() => 0)); x.forEach((u, i) => T[fc.indexOf(u)][cc.indexOf(y[i])]++);
    return { T, filas: fc, cols: cc, n: m.n, omitidas: (HPDatos.valores(a).length - m.n) };
  }
  const tablaObs = (T, nf, nc, pct) => {
    const rt = T.map(f => f.reduce((s, v) => s + v, 0)), ct = nc.map((_, j) => T.reduce((s, f) => s + f[j], 0)), n = rt.reduce((s, v) => s + v, 0);
    if (!pct) return { cab: [''].concat(nc, ['Total']), filas: T.map((f, i) => [nf[i]].concat(f.map(String), [String(rt[i])])).concat([['Total'].concat(ct.map(String), [String(n)])]) };
    if (pct === 'fila') return { cab: [''].concat(nc, ['Total']), filas: T.map((f, i) => [nf[i]].concat(f.map(v => pc(100 * v / rt[i]) + ' %'), ['100 %'])) };
    return { cab: [''].concat(nc), filas: T.map((f, i) => [nf[i]].concat(f.map((v, j) => pc(100 * v / ct[j]) + ' %'))).concat([['Total'].concat(nc.map(() => '100 %'))]) };
  };
  const nombresVars = d => d.cols.join('", "');

  // ───────── demo ─────────
  function demo() {
    let s = 20261113; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pick = (o, p) => { let u = rnd(), a = 0; for (let i = 0; i < o.length; i++) { a += p[i]; if (u < a) return o[i]; } return o[o.length - 1]; };
    const filas = [['Sexo', 'Jornada', 'Aprobó', 'Satisfacción', 'Medio de transporte', 'Edad', 'Nota']];
    for (let i = 0; i < 150; i++) {
      const sexo = pick(['Femenino', 'Masculino'], [0.52, 0.48]), jor = pick(['Diurna', 'Nocturna', 'Virtual'], [0.45, 0.30, 0.25]);
      const pa = jor === 'Diurna' ? 0.78 : jor === 'Nocturna' ? 0.6 : 0.5, ap = rnd() < pa ? 'Sí' : 'No';
      const sat = pick(['Baja', 'Media', 'Alta'], ap === 'Sí' ? [0.15, 0.4, 0.45] : [0.4, 0.4, 0.2]);
      const tr = pick(['Bus', 'Moto', 'Carro', 'A pie'], [0.4, 0.25, 0.15, 0.2]);
      filas.push([sexo, jor, ap, sat, tr, 18 + Math.round(rnd() * 14), +(2 + rnd() * 3 + (ap === 'Sí' ? 0.6 : 0)).toFixed(1)]);
    }
    return filas;
  }
  const demoOk = c => c.nombre === 'Jornada' || c.nombre === 'Aprobó';

  // ───────── 1. Independencia por lotes ─────────
  T0.chi2lote = {
    tab: 'ind', nombre: 'Independencia por lotes (varias variables)', corto: 'Independencia por lotes',
    cuando: 'Cruza varias variables categóricas de «Mis datos» y contrasta la independencia (ji-cuadrado) en cada par, con tablas cruzadas completas (frecuencias, porcentajes, esperadas y residuos), V de Cramér y valores p ajustados por Holm.',
    datos: 'De 2 a 10 variables categóricas de «Mis datos». Las variables numéricas con códigos (1, 2, 3…) deben marcarse como categóricas en «Variables y etiquetas».',
    supuestos: ['Observaciones independientes; cada sujeto aparece una vez en cada tabla.', 'Frecuencias esperadas ≥ 5 en al menos el 80 % de las celdas; en 2 × 2 con esperadas pequeñas se informa también la prueba exacta de Fisher y se usa esa.', 'Cada par usa solo las filas con dato en ambas variables.', 'Con muchos pares el análisis es exploratorio: use el p ajustado por Holm.'],
    campos: [{ id: 'cols', label: 'Variables categóricas a cruzar', type: 'vars', tipo: 'cat', min: 2, max: 10, maxDist: 30 },
      { id: 'ref', label: 'Variable de referencia (opcional)', type: 'varsel', tipo: 'cat', maxDist: 30, vacio: '— todos los pares entre las variables —', hint: 'Si elige una, se cruza con cada una de las demás variables marcadas (por ejemplo «Sexo» contra todas).' }],
    demo, demoOk, ejemplo: { cols: ['Sexo', 'Jornada', 'Aprobó', 'Satisfacción'], ref: '' },
    leer(v) {
      const cols = (v.cols || []).slice(); if (!HPDatos.hayDatos()) throw new Error('Primero cargue sus datos en «Mis datos».');
      if (cols.length < 2) throw new Error('Marque al menos 2 variables categóricas.');
      const ref = v.ref && cols.includes(v.ref) ? v.ref : '', pares = [];
      if (ref) cols.forEach(c => { if (c !== ref) pares.push([ref, c]); }); else for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) pares.push([cols[i], cols[j]]);
      return { cols, ref, pares };
    },
    calc(d) {
      const res = d.pares.map(([a, b]) => {
        const q = cruzar(a, b); let r; try { r = C.chi2ind(q.T, false); } catch (e) { return { a, b, q, error: e.message }; }
        const dosPorDos = r.r === 2 && r.c === 2, usaF = dosPorDos && r.minE < 5, fis = usaF ? C.fisher2x2(q.T, 'two-sided') : null;
        return { a, b, q, r, usaF, fis, p0: usaF ? fis.p : r.p };
      });
      const ok = res.filter(x => !x.error), adj = HPDatos.holm(ok.map(x => x.p0)); ok.forEach((x, i) => { x.padj = adj[i]; });
      return { res };
    },
    render(d, rr, a) {
      const res = rr.res, ok = res.filter(x => !x.error), sig = ok.filter(x => x.padj < a), ord = ok.slice().sort((x, y) => x.p0 - y.p0);
      const tabla = { cab: ['Par de variables', 'n', 'Tabla', 'χ²', 'gl', 'p', 'p Holm', 'V Cramér', 'Esperadas < 5', 'Decisión'], filas: res.map(x => x.error ? [x.a + ' × ' + x.b, '—', '—', '—', '—', '—', '—', '—', '—', x.error] : [x.a + ' × ' + x.b, String(x.q.n), x.r.r + '×' + x.r.c, fx(x.r.chi, 3), String(x.r.df), (x.usaF ? 'Fisher ' : '') + fpv(x.p0), fpv(x.padj), fx(x.r.V, 3), Math.round(100 * x.r.pctMenos5) + ' %', x.padj < a ? 'Asociadas' : 'Sin evidencia']) };
      const items = ord.map(x => {
        const nf = x.q.filas, nc = x.q.cols, bl = [{ titulo: 'Frecuencias observadas', ...tablaObs(x.q.T, nf, nc) }, { titulo: '% por fila', ...tablaObs(x.q.T, nf, nc, 'fila') }, { titulo: '% por columna', ...tablaObs(x.q.T, nf, nc, 'col') },
          { titulo: 'Frecuencias esperadas', cab: [''].concat(nc), filas: x.r.E.map((f, i) => [nf[i]].concat(f.map(v => fx(v, 2)))) }, { titulo: 'Residuos estandarizados ajustados (|z| > 1,96 = celda atípica)', cab: [''].concat(nc), filas: x.r.resA.map((f, i) => [nf[i]].concat(f.map(v => fx(v, 2)))) }];
        if (x.fis) bl.push({ titulo: 'Prueba exacta de Fisher (2 × 2 con esperadas < 5)', cab: ['Medida', 'Valor'], filas: [['p (bilateral)', fpv(x.fis.p)], ['Odds ratio (MLE condicional)', fx(x.fis.orMLE, 3)], ['IC 95 % del OR', '[' + fx(x.fis.orIC[0], 3) + '; ' + fx(x.fis.orIC[1], 3) + ']']] });
        return { nombre: x.a + ' × ' + x.b + '  (p Holm ' + fpv(x.padj) + ')', bloques: bl };
      });
      const av = [AVISO]; const bajas = ok.filter(x => x.r.pctMenos5 > 0.2 && !x.usaF); if (bajas.length) av.push('En ' + bajas.length + ' par(es) más del 20 % de las celdas tiene frecuencia esperada < 5 (' + bajas.slice(0, 4).map(x => x.a + ' × ' + x.b).join('; ') + (bajas.length > 4 ? '…' : '') + '): la aproximación χ² no es fiable; agrupe categorías o use Fisher-Freeman-Halton.');
      const om = res.filter(x => x.q && x.q.omitidas > 0).length; if (om) av.push('Algunos pares omitieron filas con datos vacíos en alguna de las dos variables (el n de cada par se muestra en la tabla).');
      let t = 'Se contrastaron <strong>' + ok.length + '</strong> pares. ' + (sig.length ? 'Con el p ajustado por Holm, <strong>' + sig.length + '</strong> par(es) muestran asociación a α = ' + fx(a, 2) + ': ' + sig.sort((x, y) => x.padj - y.padj).slice(0, 6).map(x => x.a + ' × ' + x.b + ' (V = ' + fx(x.r.V, 2) + ', p Holm ' + fpv(x.padj) + ')').join('; ') + (sig.length > 6 ? '…' : '') + '.' : 'Ningún par muestra evidencia de asociación tras el ajuste de Holm.') + ' Consulte la tabla cruzada de cada par en «Detalle».';
      const gr = { tipo: 'bar1', etiquetas: ord.map(x => x.a + ' × ' + x.b), a: ord.map(x => +x.r.V.toFixed(3)), colores: ord.map(x => x.padj < a ? '#00d4ffcc' : '#6b7c9c88'), xt: '', yt: 'V de Cramér', etiq: 'V de Cramér', ymax: 1 };
      return { cards: [{ n: 'Pares contrastados', v: String(ok.length), s: d.ref ? 'referencia: ' + d.ref : 'todos los pares', main: 1 }, { n: 'Asociados (Holm)', v: String(sig.length), s: 'α = ' + fx(a, 2) }, { n: 'Mayor V de Cramér', v: ord.length ? fx(Math.max.apply(null, ord.map(x => x.r.V)), 3) : '—', s: ord.length ? ord.slice().sort((x, y) => y.r.V - x.r.V)[0].a + ' × ' + ord.slice().sort((x, y) => y.r.V - x.r.V)[0].b : '' }],
        tabla, detalle: { titulo: 'Ver tabla cruzada completa del par (ordenados por significancia)', items, def: 0 },
        resumen: [['Pares', String(res.length)], ['Variables', d.cols.join(', ')], ['Corrección por comparaciones múltiples', 'Holm']], h0: 'En cada par, las dos variables son independientes.', h1: 'En cada par, las variables están asociadas.', interp: t, avisos: av, grafico: gr,
        datosTxt: 'Variables: ' + d.cols.join(', ') + ' (' + res.length + ' pares) · archivo ' + (HPDatos.ds() ? HPDatos.ds().archivo : ''), pDecision: null };
    },
    R(d) {
      const vs = d.cols.map(rs).join(', ');
      return '# Los datos están en el data.frame «datos» (por ejemplo: datos <- readxl::read_excel("archivo.xlsx"))\nvars <- c(' + vs + ')\n' + (d.ref ? 'pares <- lapply(setdiff(vars, ' + rs(d.ref) + '), function(v) c(' + rs(d.ref) + ', v))\n' : 'pares <- combn(vars, 2, simplify = FALSE)\n') +
        'res <- do.call(rbind, lapply(pares, function(p) {\n  tab <- table(datos[[p[1]]], datos[[p[2]]])\n  ct <- suppressWarnings(chisq.test(tab, correct = FALSE))\n  v <- sqrt(unname(ct$statistic) / (sum(tab) * (min(dim(tab)) - 1)))\n  pexacta <- if (all(dim(tab) == 2) && min(ct$expected) < 5) fisher.test(tab)$p.value else ct$p.value\n  data.frame(x = p[1], y = p[2], n = sum(tab), chi2 = unname(ct$statistic), gl = unname(ct$parameter), p = pexacta, V = v, esp_menor5 = mean(ct$expected < 5))\n}))\nres$p_holm <- p.adjust(res$p, method = "holm")\nprint(res, digits = 4)\n\n# Tabla cruzada completa de un par:\ntab <- table(datos[[pares[[1]][1]]], datos[[pares[[1]][2]]])\naddmargins(tab); round(100 * prop.table(tab, 1), 1); chisq.test(tab)$expected; chisq.test(tab)$stdres\n';
    },
    Py(d) {
      const vs = JSON.stringify(d.cols);
      return 'import itertools\nimport numpy as np\nimport pandas as pd\nfrom scipy import stats as st\nfrom statsmodels.stats.multitest import multipletests\n\n# datos = pd.read_excel("archivo.xlsx")\nvars = ' + vs + '\n' + (d.ref ? 'pares = [(' + JSON.stringify(d.ref) + ', v) for v in vars if v != ' + JSON.stringify(d.ref) + ']\n' : 'pares = list(itertools.combinations(vars, 2))\n') +
        'filas = []\nfor a, b in pares:\n    tab = pd.crosstab(datos[a], datos[b])\n    chi2, p, gl, esp = st.chi2_contingency(tab, correction=False)\n    if tab.shape == (2, 2) and esp.min() < 5:\n        p = st.fisher_exact(tab.values)[1]\n    v = st.contingency.association(tab.values, method="cramer", correction=False)\n    filas.append((a, b, tab.values.sum(), chi2, gl, p, v, (esp < 5).mean()))\nres = pd.DataFrame(filas, columns=["x", "y", "n", "chi2", "gl", "p", "V", "esp_menor5"])\nres["p_holm"] = multipletests(res["p"], method="holm")[1]\nprint(res.round(4))\n\n# Tabla cruzada completa del primer par\na, b = pares[0]\ntab = pd.crosstab(datos[a], datos[b], margins=True)\nprint(tab); print(pd.crosstab(datos[a], datos[b], normalize="index").round(3))\n';
    }
  };

  // ───────── 2. Bondad de ajuste por lotes ─────────
  T0.chi2gof = {
    tab: 'frec', nombre: 'Bondad de ajuste por lotes (ji-cuadrado)', corto: 'Bondad de ajuste por lotes',
    cuando: 'Contrasta, para cada variable categórica elegida de «Mis datos», si sus categorías siguen una distribución esperada: iguales (uniforme) o con las proporciones que usted indique. Muestra frecuencias observadas, esperadas y residuos, con p ajustado por Holm.',
    datos: 'De 1 a 10 variables categóricas de «Mis datos» y, opcionalmente, las proporciones esperadas por categoría.',
    supuestos: ['Observaciones independientes; categorías excluyentes y exhaustivas.', 'Frecuencias esperadas ≥ 5 en al menos el 80 % de las categorías.', 'Las proporciones esperadas se fijan antes de ver los datos (no se estiman de la misma muestra).', 'Con varias variables el análisis es exploratorio: use el p ajustado por Holm.'],
    campos: [{ id: 'cols', label: 'Variables categóricas', type: 'vars', tipo: 'cat', min: 1, max: 10, maxDist: 30 },
      { id: 'esp', label: 'Distribución esperada', type: 'sel', opts: [['igual', 'Categorías igualmente probables'], ['custom', 'Proporciones que yo indico']], def: 'igual' },
      { id: 'props', label: 'Proporciones esperadas (una por línea: Categoría proporción o %)', type: 'ta', rows: 4, ph: 'Femenino 0.5\nMasculino 0.5', show: v => v.esp === 'custom', hint: 'Use los nombres exactos de las categorías (con las etiquetas de «Mis datos»). Valen proporciones (0,5) o porcentajes (50); deben sumar 1 o 100. Se aplican a todas las variables marcadas, por lo que en modo personalizado conviene elegir variables con las mismas categorías.' }],
    demo, demoOk, ejemplo: { cols: ['Sexo', 'Jornada'], esp: 'igual', props: '' },
    leer(v) {
      if (!HPDatos.hayDatos()) throw new Error('Primero cargue sus datos en «Mis datos».'); const cols = (v.cols || []).slice(); if (!cols.length) throw new Error('Marque al menos una variable categórica.');
      let props = null;
      if (v.esp === 'custom') {
        props = {}; let sum = 0; String(v.props || '').split(/\n+/).map(l => l.trim()).filter(Boolean).forEach(l => { const m = l.match(/^(.*?)[\s:=]+(-?\d+(?:[.,]\d+)?)\s*%?$/); if (!m) throw new Error('No se entiende «' + l + '». Use «Categoría 0.5».'); props[m[1].trim()] = Number(m[2].replace(',', '.')); sum += props[m[1].trim()]; });
        if (Object.keys(props).length < 2) throw new Error('Escriba la proporción esperada de al menos 2 categorías.');
        const tot = sum > 1.5 ? 100 : 1; if (Math.abs(sum - tot) > 1e-6 * tot && Math.abs(sum - tot) > 0.01) throw new Error('Las proporciones suman ' + +sum.toFixed(4) + ' y deben sumar ' + tot + '.');
        Object.keys(props).forEach(k => { props[k] /= sum; });
      }
      return { cols, props };
    },
    calc(d) {
      const res = d.cols.map(nm => {
        const x = HPDatos.valores(nm).filter(u => u != null), cnt = new Map(); x.forEach(u => cnt.set(u, (cnt.get(u) || 0) + 1));
        let cats = ordenar(Array.from(cnt.keys())), e;
        if (d.props) {
          const faltan = Object.keys(d.props).filter(k => !cnt.has(k)), sobran = cats.filter(k => !(k in d.props));
          if (sobran.length) throw new Error('«' + nm + '» tiene categorías sin proporción esperada: ' + sobran.slice(0, 5).join(', ') + '. Escríbalas en las proporciones.');
          faltan.forEach(k => cnt.set(k, 0)); cats = Object.keys(d.props); e = cats.map(k => d.props[k] * x.length);
        } else e = cats.map(() => x.length / cats.length);
        const f = cats.map(k => cnt.get(k) || 0); if (cats.length < 2) throw new Error('«' + nm + '» tiene una sola categoría; no se puede contrastar.');
        let chi = 0; f.forEach((o, i) => { chi += (o - e[i]) ** 2 / e[i]; }); const df = cats.length - 1, p = M.chi2Sf(chi, df), n = x.length;
        const res = f.map((o, i) => (o - e[i]) / Math.sqrt(e[i] * (1 - e[i] / n))), menos5 = e.filter(v => v < 5).length;
        return { nm, cats, f, e, chi, df, p, n, res, menos5, pctMenos5: menos5 / cats.length, minE: Math.min.apply(null, e), w: Math.sqrt(chi / n) };
      });
      const adj = HPDatos.holm(res.map(x => x.p)); res.forEach((x, i) => { x.padj = adj[i]; }); return { res };
    },
    render(d, rr, a) {
      const res = rr.res, sig = res.filter(x => x.padj < a);
      const tabla = { cab: ['Variable', 'n', 'Categorías', 'χ²', 'gl', 'p', 'p Holm', 'w de Cohen', 'Esperadas < 5', 'Decisión'], filas: res.map(x => [x.nm, String(x.n), String(x.cats.length), fx(x.chi, 3), String(x.df), fpv(x.p), fpv(x.padj), fx(x.w, 3), Math.round(100 * x.pctMenos5) + ' %', x.padj < a ? 'No se ajusta' : 'Compatible']) };
      const items = res.slice().sort((x, y) => x.p - y.p).map(x => ({ nombre: x.nm + '  (p Holm ' + fpv(x.padj) + ')', bloques: [{ titulo: 'Observado vs esperado', cab: ['Categoría', 'Observada', '% obs.', 'Esperada', '% esp.', 'Residuo estandarizado'], filas: x.cats.map((k, i) => [k, String(x.f[i]), pc(100 * x.f[i] / x.n) + ' %', fx(x.e[i], 2), pc(100 * x.e[i] / x.n) + ' %', fx(x.res[i], 2)]) }] }));
      const av = [AVISO].slice(res.length > 1 ? 0 : 1); const bajas = res.filter(x => x.pctMenos5 > 0.2); if (bajas.length) av.push('En ' + bajas.map(x => x.nm).join(', ') + ' más del 20 % de las categorías tiene frecuencia esperada < 5: la aproximación χ² no es fiable; agrupe categorías.');
      const t = 'Se contrastó la distribución esperada (' + (d.props ? 'proporciones indicadas' : 'categorías igualmente probables') + ') en ' + res.length + ' variable(s). ' + (sig.length ? 'Con el p ajustado por Holm, <strong>' + sig.map(x => x.nm).join(', ') + '</strong> no se ajusta(n) a la distribución esperada a α = ' + fx(a, 2) + '. Revise los residuos (|z| > 1,96) para ver qué categorías se alejan.' : 'Ninguna variable se aleja de la distribución esperada tras el ajuste de Holm. Esto no demuestra que se cumpla exactamente: solo indica que no hay evidencia suficiente en contra.');
      return { cards: [{ n: 'Variables', v: String(res.length), s: d.props ? 'proporciones indicadas' : 'distribución uniforme', main: 1 }, { n: 'No se ajustan (Holm)', v: String(sig.length), s: 'α = ' + fx(a, 2) }, { n: 'Menor p ajustado', v: fpv(Math.min.apply(null, res.map(x => x.padj))), s: res.slice().sort((x, y) => x.padj - y.padj)[0].nm }],
        tabla, detalle: { titulo: 'Ver observado vs esperado de la variable', items, def: 0 }, resumen: [['Variables', d.cols.join(', ')], ['Distribución esperada', d.props ? 'proporciones indicadas' : 'uniforme'], ['Corrección', 'Holm']], h0: 'La variable sigue la distribución esperada.', h1: 'La variable no sigue la distribución esperada.', interp: t, avisos: av,
        grafico: { tipo: 'bar1', etiquetas: res.map(x => x.nm), a: res.map(x => +x.w.toFixed(3)), colores: res.map(x => x.padj < a ? '#00d4ffcc' : '#6b7c9c88'), xt: '', yt: 'w de Cohen (tamaño del efecto)', etiq: 'w de Cohen' }, datosTxt: 'Variables: ' + d.cols.join(', '), pDecision: null };
    },
    R(d) {
      const vs = d.cols.map(rs).join(', '), pr = d.props ? Object.keys(d.props) : null;
      return '# Datos en el data.frame «datos»\nvars <- c(' + vs + ')\n' + (pr ? 'p_esp <- c(' + pr.map(k => rs(k) + ' = ' + num(d.props[k])).join(', ') + ')\n' : '') + 'res <- do.call(rbind, lapply(vars, function(v) {\n  tab <- table(datos[[v]])\n' + (pr ? '  tab <- tab[names(p_esp)]; tab[is.na(tab)] <- 0\n  ct <- suppressWarnings(chisq.test(tab, p = p_esp))\n' : '  ct <- suppressWarnings(chisq.test(tab))\n') + '  data.frame(variable = v, n = sum(tab), chi2 = unname(ct$statistic), gl = unname(ct$parameter), p = ct$p.value, w = sqrt(unname(ct$statistic) / sum(tab)))\n}))\nres$p_holm <- p.adjust(res$p, method = "holm")\nprint(res, digits = 4)\n';
    },
    Py(d) {
      const vs = JSON.stringify(d.cols), pr = d.props ? Object.keys(d.props) : null;
      return 'import numpy as np\nimport pandas as pd\nfrom scipy import stats as st\nfrom statsmodels.stats.multitest import multipletests\n\n# datos = pd.read_excel("archivo.xlsx")\nvars = ' + vs + '\n' + (pr ? 'p_esp = {' + pr.map(k => JSON.stringify(k) + ': ' + num(d.props[k])).join(', ') + '}\n' : '') + 'filas = []\nfor v in vars:\n' + (pr ? '    obs = datos[v].value_counts().reindex(list(p_esp), fill_value=0)\n    esp = np.array(list(p_esp.values())) * obs.sum()\n' : '    obs = datos[v].value_counts()\n    esp = np.full(len(obs), obs.sum() / len(obs))\n') + '    chi2, p = st.chisquare(obs, esp)\n    filas.append((v, obs.sum(), chi2, len(obs) - 1, p, np.sqrt(chi2 / obs.sum())))\nres = pd.DataFrame(filas, columns=["variable", "n", "chi2", "gl", "p", "w"])\nres["p_holm"] = multipletests(res["p"], method="holm")[1]\nprint(res.round(4))\n';
    }
  };

  P.TABS.find(t => t.id === 'ind').tests.unshift('chi2lote'); P.TABS.find(t => t.id === 'frec').tests.push('chi2gof');
})();
