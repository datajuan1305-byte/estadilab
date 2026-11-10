/* Pestañas 3, 4 y 5: muestras relacionadas y varias muestras — Estadilab */
(function (P) {
  'use strict';
  const M = NPM, T = P.TESTS, fx = P.fx, fpv = P.fpv, num = P.num, rv = P.rv, pv = P.pv, nums = P.nums, fmtList = P.fmtList, decision = P.decision, concl = P.concl, NOREJ = P.NOREJ, magn = P.magn;
  const ADJ = { id: 'adj', label: 'Ajuste de valores p en comparaciones múltiples', type: 'sel', opts: [['holm', 'Holm (recomendado)'], ['bonferroni', 'Bonferroni'], ['none', 'Sin ajuste']], def: 'holm' };
  const ADJN = { holm: 'Holm', bonferroni: 'Bonferroni', none: 'sin ajuste' };
  const PYADJ = { holm: 'holm', bonferroni: 'bonferroni', none: 'None' };
  const fmtP = p => fpv(p);

  // ───────── lectura ─────────
  function leerGrupos(arr, min) {
    const gs = (arr || []).map((g, i) => ({ n: ((g.n || '').trim() || 'Grupo ' + (i + 1)), t: String(g.v || '') })).filter(g => g.t.trim());
    if (gs.length < min) throw new Error('Escriba datos en al menos ' + min + ' grupos.');
    return { nombres: gs.map(g => g.n), g: gs.map(g => nums(g.t, g.n, 2)) };
  }
  function leerMatriz(txt, bin, kmin) {
    const lineas = String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean); if (lineas.length < 2) throw new Error('Escriba una fila por sujeto (mínimo 2 filas).');
    let nombres = null; const primera = lineas[0].split(/[\s;,\t]+/).filter(Boolean);
    if (primera.some(t => !isFinite(Number(t)))) { nombres = primera; lineas.shift(); }
    const m = lineas.map((l, i) => l.split(/[\s;,\t]+/).filter(Boolean).map(t => { const v = Number(t); if (!isFinite(v)) throw new Error('«' + t + '» no es un número válido (fila ' + (i + 1) + ').'); return v; }));
    const k = m[0].length; if (k < (kmin || 3)) throw new Error('Se necesitan al menos ' + (kmin || 3) + ' columnas (condiciones). Separe los valores con espacios, comas o tabulaciones.');
    m.forEach((r, i) => { if (r.length !== k) throw new Error('La fila ' + (i + 1) + ' tiene ' + r.length + ' valores y se esperaban ' + k + '.'); });
    if (nombres && nombres.length !== k) nombres = null;
    return { m, nombres: nombres || Array.from({ length: k }, (_, j) => 'Cond. ' + (j + 1)) };
  }
  const RGRP = (gs, nm) => 'datos <- list(\n' + gs.map((g, i) => '  ' + P.rs(nm[i]) + ' = ' + rv(g)).join(',\n') + '\n)\nvalor <- unlist(datos)\ngrupo <- factor(rep(names(datos), lengths(datos)), levels = names(datos))\n';
  const PGRP = (gs, nm) => 'import numpy as np\nfrom scipy import stats as st\n\ngrupos = {\n' + gs.map((g, i) => '    ' + JSON.stringify(nm[i]) + ': ' + pv(g)).join(',\n') + '\n}\ng = [np.array(v) for v in grupos.values()]\n';
  const RMAT = (m, nm) => 'm <- matrix(c(' + [].concat.apply([], m.map(r => r)).map(num).join(', ') + '),\n            nrow = ' + m.length + ', byrow = TRUE,\n            dimnames = list(NULL, c(' + nm.map(P.rs).join(', ') + ')))\n';
  const PMAT = (m, nm) => 'import numpy as np\nfrom scipy import stats as st\n\nnombres = ' + JSON.stringify(nm) + '\nm = np.array([\n' + m.map(r => '    ' + pv(r)).join(',\n') + '\n])\n';
  const filasPares = (pares, nm, ca) => pares.map(q => [nm[q.i] + ' vs ' + nm[q.j], q.dif != null ? fx(q.dif, 2) : (q.z != null ? '' : ''), q.z != null ? fx(q.z, 3) : (q.t != null ? fx(q.t, 3) : (q.b != null ? q.b + ' / ' + q.c : '')), fmtP(q.p), fmtP(q.padj)]);

  // ══════════ 3.1 Wilcoxon ══════════
  const PAR = [{ id: 'gA', label: 'Condición 1 (p. ej., antes)', type: 'ta', ph: 'Ej: 72 80 65 90 85 78', req: true }, { id: 'gB', label: 'Condición 2 (p. ej., después; mismo orden)', type: 'ta', ph: 'Ej: 67 77 66 81 78 76' }, { id: 'ref', label: '…o, para UNA muestra: mediana de referencia (deje vacía la condición 2)', type: 'num', def: '', step: 'any' }];
  const PARN = [{ id: 'nA', label: 'Nombre de la condición 1', type: 'txt', def: 'Antes' }, { id: 'nB', label: 'Nombre de la condición 2', type: 'txt', def: 'Después' }];
  const ALTP = [['two-sided', 'Bilateral (1 ≠ 2)'], ['greater', 'Unilateral (1 > 2)'], ['less', 'Unilateral (1 < 2)']];
  const leerPar = v => { let na = (v.nA || 'Condición 1').trim() || 'Condición 1', nb = (v.nB || 'Condición 2').trim() || 'Condición 2'; const x = nums(v.gA, na, 2); let y; if (!String(v.gB || '').trim() && v.ref !== '' && v.ref != null && isFinite(Number(v.ref))) { y = x.map(() => Number(v.ref)); nb = 'Valor de referencia (' + Number(v.ref) + ')'; } else y = nums(v.gB, nb, 2); if (x.length !== y.length) throw new Error('Los datos son pareados: ambas condiciones deben tener la misma cantidad de valores (' + x.length + ' ≠ ' + y.length + ').'); return { x, y, na, nb, alt: v.alt }; };
  const exEjPar = { gA: '72 80 65 90 85 78 70 88 76 82', gB: '67 77 66 81 78 76 62 76 72 76', nA: 'Antes', nB: 'Después', alt: 'two-sided' };

  T.wilcoxon = {
    tab: 'rel2', nombre: 'Rangos con signo de Wilcoxon', corto: 'Wilcoxon', cuando: 'Compara dos mediciones de los mismos sujetos (antes y después, o dos condiciones) cuando las diferencias no son normales; también sirve para una sola muestra frente a una mediana de referencia. Alternativa a la t de Student pareada.',
    datos: 'Dos mediciones cuantitativas u ordinales por sujeto (datos pareados).',
    supuestos: ['Los pares son independientes entre sí.', 'La variable es al menos de nivel ordinal y las diferencias pueden ordenarse por magnitud.', 'La distribución de las diferencias es aproximadamente simétrica (si no, use la prueba de los signos).', 'Los pares con diferencia cero se descartan.'],
    campos: [].concat(PAR, PARN, [{ id: 'alt', label: 'Hipótesis alternativa', type: 'sel', opts: ALTP, def: 'two-sided' }]), ejemplo: exEjPar, leer: leerPar, calc(d) { return M.wilcoxon(d.x, d.y, d.alt); },
    render(d, r, a) {
      const p = r.pExacto != null ? r.pExacto : r.pAsin, ef = Math.abs(r.rb), mayor = r.Wp > r.Wm ? d.na : d.nb;
      const altT = { 'two-sided': 'las dos condiciones difieren', greater: d.na + ' tiende a ser mayor que ' + d.nb, less: d.na + ' tiende a ser menor que ' + d.nb }[r.alt];
      let t = concl(p, a, 'Hay evidencia de que ' + altT + (r.alt === 'two-sided' ? '; los valores de ' + mayor + ' tienden a ser mayores.' : '.'), 'No hay evidencia suficiente de que ' + altT + '.' + NOREJ);
      t += ' Tamaño del efecto: correlación biserial de rangos pareada r = ' + fx(r.rb, 3) + ' (' + magn(ef, [0.1, 0.3, 0.5]) + '). Estimador de Hodges-Lehmann de la diferencia (' + d.na + ' − ' + d.nb + ') = ' + fx(r.hl, 3) + '.';
      const av = []; if (r.ceros) av.push(r.ceros + ' par(es) con diferencia cero se descartaron (n efectivo = ' + r.n + ').'); if (r.pExacto == null) av.push(r.hayEmpates ? 'Hay diferencias empatadas en valor absoluto: se usó la aproximación normal con corrección por empates y por continuidad.' : 'n > 50: se usó la aproximación normal con corrección por continuidad.');
      return { cards: [{ n: 'W⁺ (suma de rangos positivos)', v: fx(r.Wp, 1), s: 'W⁻ = ' + fx(r.Wm, 1), main: 1 }, { n: 'Valor p (' + (r.pExacto != null ? 'exacto' : 'asintótico') + ')', v: fpv(p), s: decision(p, a) }, { n: 'r biserial de rangos', v: fx(r.rb, 3), s: magn(ef, [0.1, 0.3, 0.5]) }],
        tabla: null, resumen: [['Pares', String(r.nPares)], ['Pares con diferencia ≠ 0 (n efectivo)', String(r.n)], ['Diferencias positivas / negativas', r.pos + ' / ' + r.neg], ['W⁺', fx(r.Wp, 2)], ['W⁻', fx(r.Wm, 2)], ['Z (con corr. continuidad)', fx(r.zc, 4)], ['p asintótico', fpv(r.pAsin)], ['p exacto', r.pExacto != null ? fpv(r.pExacto) : 'no disponible (empates o n > 50)'], ['r biserial de rangos', fx(r.rb, 4)], ['Hodges-Lehmann', fx(r.hl, 4)], ['Mediana de las diferencias', fx(r.medDif, 4)]],
        h0: 'La mediana de las diferencias (' + d.na + ' − ' + d.nb + ') es cero.', h1: ({ 'two-sided': 'La mediana de las diferencias es distinta de cero.', greater: 'La mediana de las diferencias es mayor que cero.', less: 'La mediana de las diferencias es menor que cero.' })[r.alt], interp: t, avisos: av,
        grafico: { tipo: 'bar1', etiquetas: r.diffs.map((_, i) => String(i + 1)), a: r.diffs.map(v => +v.toFixed(4)), etiq: 'Diferencia (' + d.na + ' − ' + d.nb + ')', colores: r.diffs.map(v => v > 0 ? '#00d4ffcc' : v < 0 ? '#ffd700cc' : '#6b7c9c'), xt: 'Sujeto (par)', yt: 'Diferencia' }, datosTxt: d.na + ': ' + fmtList(d.x, 30) + ' | ' + d.nb + ': ' + fmtList(d.y, 30), pDecision: p };
    },
    R(d) { const ex = new Set(d.x.map((v, i) => Math.abs(v - d.y[i]))).size === d.x.length && d.x.every((v, i) => v !== d.y[i]); return 'a <- ' + rv(d.x) + '   # ' + d.na + '\nb <- ' + rv(d.y) + '   # ' + d.nb + '\n\nwilcox.test(a, b, paired = TRUE, alternative = "' + ({ 'two-sided': 'two.sided', greater: 'greater', less: 'less' })[d.alt] + '", exact = ' + (ex ? 'TRUE' : 'FALSE') + ', correct = TRUE, conf.int = TRUE)\n\n# Tamaño del efecto: r biserial de rangos pareada\ndif <- a - b; dif <- dif[dif != 0]\nrk <- rank(abs(dif)); (sum(rk[dif > 0]) - sum(rk[dif < 0])) / sum(rk)\n'; },
    Py(d) { const ex = d.x.every((v, i) => v !== d.y[i]) && new Set(d.x.map((v, i) => Math.abs(v - d.y[i]))).size === d.x.length && d.x.length <= 50; return 'import numpy as np\nfrom scipy import stats as st\n\na = np.array(' + pv(d.x) + ')   # ' + d.na + '\nb = np.array(' + pv(d.y) + ')   # ' + d.nb + '\n\nres = st.wilcoxon(a, b, alternative="' + d.alt + '", method="' + (ex ? 'exact' : 'approx') + '"' + (ex ? '' : ', correction=True') + ', zero_method="wilcox")\nprint(res)\n\n# r biserial de rangos y Hodges-Lehmann\ndif = a - b; dif = dif[dif != 0]; rk = st.rankdata(abs(dif))\nprint("r =", (rk[dif > 0].sum() - rk[dif < 0].sum()) / rk.sum())\nw = [(dif[i] + dif[j]) / 2 for i in range(len(dif)) for j in range(i, len(dif))]\nprint("HL =", np.median(w))\n'; }
  };

  // ══════════ 3.2 Signos ══════════
  T.signos = {
    tab: 'rel2', nombre: 'Prueba de los signos', corto: 'Signos', cuando: 'Compara dos mediciones pareadas usando solo el signo de la diferencia (aumentó o disminuyó). Es la prueba más sencilla y la menos exigente.',
    datos: 'Dos mediciones por sujeto, aunque solo sea posible decir cuál es mayor (ordinal).',
    supuestos: ['Los pares son independientes.', 'No exige simetría ni magnitud de las diferencias: solo su signo.', 'Los pares empatados (diferencia cero) se descartan.', 'Es menos potente que Wilcoxon cuando se pueden ordenar las diferencias por tamaño.'],
    campos: [].concat(PAR, PARN, [{ id: 'alt', label: 'Hipótesis alternativa', type: 'sel', opts: ALTP, def: 'two-sided' }]), ejemplo: exEjPar, leer: leerPar, calc(d) { return M.signTest(d.x, d.y, d.alt); },
    render(d, r, a) {
      const altT = { 'two-sided': 'las dos condiciones difieren', greater: d.na + ' tiende a ser mayor que ' + d.nb, less: d.na + ' tiende a ser menor que ' + d.nb }[r.alt];
      let t = concl(r.p, a, 'Hay evidencia de que ' + altT + '.', 'No hay evidencia suficiente de que ' + altT + '.' + NOREJ) + ' En ' + r.pos + ' de ' + r.nEf + ' pares con diferencia (' + fx(r.phat * 100, 1) + ' %) la condición ' + d.na + ' fue mayor; IC 95 % exacto de esa proporción [' + fx(r.ic[0], 3) + '; ' + fx(r.ic[1], 3) + '].';
      const av = []; if (r.emp) av.push(r.emp + ' par(es) empatado(s) se descartaron (n efectivo = ' + r.nEf + ').');
      return { cards: [{ n: 'Signos + / −', v: r.pos + ' / ' + r.neg, s: r.emp + ' empates', main: 1 }, { n: 'Valor p (binomial exacto)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Proporción de signos +', v: fx(r.phat, 3), s: 'IC [' + fx(r.ic[0], 2) + '; ' + fx(r.ic[1], 2) + ']' }],
        tabla: null, resumen: [['Pares', String(r.n)], ['Diferencias positivas', String(r.pos)], ['Diferencias negativas', String(r.neg)], ['Empates (descartados)', String(r.emp)], ['n efectivo', String(r.nEf)], ['Proporción de signos +', fx(r.phat, 4)], ['Valor p exacto', fpv(r.p)], ['Mediana de las diferencias', fx(r.medDif, 4)]],
        h0: 'Las diferencias positivas y negativas son igual de probables (mediana de las diferencias = 0).', h1: ({ 'two-sided': 'Una dirección es más probable que la otra.', greater: 'Las diferencias positivas son más probables.', less: 'Las diferencias negativas son más probables.' })[r.alt], interp: t, avisos: av,
        grafico: { tipo: 'bar1', etiquetas: ['Positivas', 'Negativas', 'Empates'], a: [r.pos, r.neg, r.emp], etiq: 'Número de pares', colores: ['#00d4ffcc', '#ffd700cc', '#6b7c9c'], xt: 'Signo de la diferencia', yt: 'Pares' }, datosTxt: d.na + ': ' + fmtList(d.x, 30) + ' | ' + d.nb + ': ' + fmtList(d.y, 30), pDecision: r.p };
    },
    R(d, r) { return 'a <- ' + rv(d.x) + '\nb <- ' + rv(d.y) + '\ndif <- a - b\nbinom.test(sum(dif > 0), sum(dif != 0), p = 0.5, alternative = "' + ({ 'two-sided': 'two.sided', greater: 'greater', less: 'less' })[d.alt] + '")\n'; },
    Py(d) { return 'import numpy as np\nfrom scipy.stats import binomtest\n\na = np.array(' + pv(d.x) + ')\nb = np.array(' + pv(d.y) + ')\ndif = a - b\nres = binomtest(int((dif > 0).sum()), int((dif != 0).sum()), 0.5, alternative="' + d.alt + '")\nprint(res.pvalue, res.proportion_ci(method="exact"))\n'; }
  };

  // ══════════ 4. Varias independientes ══════════
  const GRUPOS = { id: 'grp', label: 'Grupos', type: 'grupos', min: 3, max: 8, def: [{ n: 'Grupo 1', v: '' }, { n: 'Grupo 2', v: '' }, { n: 'Grupo 3', v: '' }] };
  const exKW = { grp: [{ n: 'A', v: '23 25 21 27 24 26 22 31' }, { n: 'B', v: '28 32 29 35 27.5 33 30 34' }, { n: 'C', v: '26.5 38 42 37 41 39 36 43' }], adj: 'holm' };
  const tiraG = (nm, gs) => ({ tipo: 'tira', g: gs.map((v, i) => ({ n: nm[i], v })) });
  const datosG = (nm, gs) => nm.map((n, i) => n + ': ' + fmtList(gs[i], 20)).join(' | ');

  T.kruskal = {
    tab: 'kind', nombre: 'H de Kruskal-Wallis', corto: 'Kruskal-Wallis', cuando: 'Compara tres o más grupos independientes con una variable ordinal o cuantitativa sin normalidad. Alternativa no paramétrica al ANOVA de un factor.',
    datos: 'Una variable ordinal o cuantitativa medida en k ≥ 3 grupos independientes.',
    supuestos: ['Observaciones independientes dentro y entre grupos.', 'Variable al menos ordinal.', 'Para interpretar como diferencia de medianas, las distribuciones deben tener forma parecida.', 'La aproximación χ² es adecuada con al menos 5 observaciones por grupo.'],
    campos: [GRUPOS, ADJ], ejemplo: exKW, leer(v) { const q = leerGrupos(v.grp, 3); return { g: q.g, nm: q.nombres, adj: v.adj || 'holm' }; }, calc(d) { return M.kruskal(d.g, d.adj); },
    render(d, r, a) {
      const sig = r.pares.filter(q => q.padj < a).map(q => d.nm[q.i] + ' vs ' + d.nm[q.j]); const ef = r.eps2;
      let t = concl(r.p, a, 'Al menos un grupo tiende a dar valores distintos de los demás.', 'No hay evidencia suficiente de diferencias entre los grupos.' + NOREJ) + ' Tamaño del efecto: ε² = ' + fx(r.eps2, 3) + ' (' + magn(ef, [0.01, 0.08, 0.26]) + ').';
      if (r.p < a) t += sig.length ? ' Comparaciones de Dunn con ajuste de ' + ADJN[r.adj] + ' significativas: ' + sig.join('; ') + '.' : ' Ninguna comparación por pares de Dunn resultó significativa tras el ajuste de ' + ADJN[r.adj] + '.';
      const av = []; if (r.minN < 5) av.push('Algún grupo tiene menos de 5 observaciones: la aproximación χ² del valor p puede ser poco fiable.'); if (r.p >= a) av.push('Como la prueba global no fue significativa, las comparaciones por pares son solo exploratorias.');
      return { cards: [{ n: 'H de Kruskal-Wallis', v: fx(r.H, 3), s: 'gl = ' + r.df + ' · N = ' + r.N, main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'ε² (tamaño del efecto)', v: fx(r.eps2, 3), s: magn(ef, [0.01, 0.08, 0.26]) }],
        tabla: { cab: ['Grupo', 'n', 'Mediana', 'Rango medio'], filas: d.nm.map((n, i) => [n, String(r.ns[i]), fx(r.medianas[i], 3), fx(r.medias[i], 2)]) },
        tabla2: { titulo: 'Comparaciones por pares de Dunn (ajuste ' + ADJN[r.adj] + ')', cab: ['Comparación', 'Dif. rangos medios', 'z', 'p', 'p ajustado'], filas: r.pares.map(q => [d.nm[q.i] + ' vs ' + d.nm[q.j], fx(r.medias[q.i] - r.medias[q.j], 2), fx(q.z, 3), fmtP(q.p), fmtP(q.padj)]) },
        resumen: [['k grupos', String(r.k)], ['N', String(r.N)], ['H (corregido por empates)', fx(r.H, 4)], ['gl', String(r.df)], ['Valor p', fpv(r.p)], ['ε²', fx(r.eps2, 4)], ['η² (H)', fx(r.eta2, 4)]],
        h0: 'Los k grupos provienen de la misma distribución (mismo rango medio).', h1: 'Al menos un grupo difiere de los demás.', interp: t, avisos: av, grafico: tiraG(d.nm, d.g), datosTxt: datosG(d.nm, d.g), pDecision: r.p };
    },
    R(d) { return RGRP(d.g, d.nm) + '\nkruskal.test(valor ~ grupo)\n\n# Comparaciones por pares de Dunn\n# install.packages("dunn.test")\ndunn.test::dunn.test(valor, grupo, method = "' + d.adj + '", altp = TRUE)\n\n# Tamaño del efecto: epsilon cuadrado\nH <- unname(kruskal.test(valor ~ grupo)$statistic); H / (length(valor) - 1)\n'; },
    Py(d) { return PGRP(d.g, d.nm) + '\nprint(st.kruskal(*g))\n\n# Comparaciones por pares de Dunn  (pip install scikit-posthocs)\nimport scikit_posthocs as sp\nprint(sp.posthoc_dunn(g, p_adjust="' + PYADJ[d.adj] + '"))\n'; }
  };

  T.mediana = {
    tab: 'kind', nombre: 'Prueba de la mediana', corto: 'Mediana', cuando: 'Contrasta si k grupos independientes tienen la misma mediana, contando cuántos valores de cada grupo quedan por encima o por debajo de la mediana global.',
    datos: 'Variable ordinal o cuantitativa en k ≥ 2 grupos independientes.',
    supuestos: ['Observaciones independientes.', 'Se clasifica cada valor como «mayor que la mediana global» o «menor o igual».', 'Frecuencias esperadas ≥ 5 en la mayoría de las celdas para que la aproximación χ² sea válida.', 'Es menos potente que Kruskal-Wallis porque descarta información de magnitud.'],
    campos: [{ id: 'grp', label: 'Grupos', type: 'grupos', min: 2, max: 8, def: GRUPOS.def }], ejemplo: { grp: exKW.grp }, leer(v) { const q = leerGrupos(v.grp, 2); return { g: q.g, nm: q.nombres }; }, calc(d) { return M.medianTest(d.g); },
    render(d, r, a) {
      let t = concl(r.p, a, 'Las medianas de los grupos no son todas iguales: la proporción de valores sobre la mediana global difiere entre grupos.', 'No hay evidencia suficiente de que las medianas difieran.' + NOREJ) + ' Mediana global = ' + fx(r.M, 3) + '.';
      const av = []; if (r.pctMenos5 > 0.2 || r.minE < 1) av.push('Más del 20 % de las celdas tiene frecuencia esperada menor que 5: el valor p χ² es poco fiable; considere Kruskal-Wallis.');
      return { cards: [{ n: 'χ² de la mediana', v: fx(r.chi, 3), s: 'gl = ' + r.df, main: 1 }, { n: 'Valor p', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Mediana global', v: fx(r.M, 3), s: 'N = ' + r.N }],
        tabla: { cab: ['Grupo', 'n', '> mediana', '≤ mediana', '% > mediana'], filas: d.nm.map((n, i) => [n, String(r.ns[i]), String(r.arriba[i]), String(r.abajo[i]), fx(100 * r.arriba[i] / r.ns[i], 1)]) },
        resumen: [['k grupos', String(r.k)], ['N', String(r.N)], ['Mediana global', fx(r.M, 4)], ['χ²', fx(r.chi, 4)], ['gl', String(r.df)], ['Valor p', fpv(r.p)], ['V de Cramér', fx(r.V, 4)], ['Esperada mínima', fx(r.minE, 2)]],
        h0: 'Los k grupos tienen la misma mediana.', h1: 'Al menos un grupo tiene una mediana distinta.', interp: t, avisos: av, grafico: tiraG(d.nm, d.g), datosTxt: datosG(d.nm, d.g), pDecision: r.p };
    },
    R(d) { return RGRP(d.g, d.nm) + '\nm <- median(valor)\ntabla <- table(grupo, valor > m)\ntabla\nchisq.test(tabla, correct = FALSE)   # prueba de la mediana (Mood)\n'; },
    Py(d) { return PGRP(d.g, d.nm) + '\nstat, p, mediana, tabla = st.median_test(*g, correction=False, ties="below")   # "below": ≤ mediana vs > mediana\nprint(stat, p, mediana)\nprint(tabla)\n'; }
  };

  T.jt = {
    tab: 'kind', nombre: 'Jonckheere-Terpstra (tendencia ordenada)', corto: 'Jonckheere-Terpstra', cuando: 'Contrasta si existe una tendencia ordenada entre k grupos que tienen un orden natural (dosis crecientes, niveles de exposición, etapas). Es más potente que Kruskal-Wallis cuando se espera esa tendencia.',
    datos: 'Variable ordinal o cuantitativa en k ≥ 3 grupos ordenados.',
    supuestos: ['Observaciones independientes.', 'Los grupos deben escribirse en el orden esperado de la tendencia (de menor a mayor).', 'La hipótesis de tendencia se plantea antes de ver los datos.', 'Con empates o muestras grandes se usa la aproximación normal con corrección por empates.'],
    campos: [Object.assign({}, GRUPOS, { label: 'Grupos (en orden creciente)' }), { id: 'alt', label: 'Hipótesis alternativa', type: 'sel', opts: [['greater', 'Tendencia creciente (↑)'], ['less', 'Tendencia decreciente (↓)'], ['two-sided', 'Tendencia en cualquier sentido']], def: 'greater' }],
    ejemplo: { grp: [{ n: 'Dosis 1', v: '12 15 11 14 13' }, { n: 'Dosis 2', v: '16 14.5 18 17 15.5' }, { n: 'Dosis 3', v: '19 21 18.5 22 20' }, { n: 'Dosis 4', v: '24 23 26 25 22.5' }], alt: 'greater' },
    leer(v) { const q = leerGrupos(v.grp, 3); return { g: q.g, nm: q.nombres, alt: v.alt || 'greater' }; }, calc(d) { return M.jonckheere(d.g, d.alt); },
    render(d, r, a) {
      const p = r.pExacto != null ? r.pExacto : r.pAsin, sentido = r.J > r.mu ? 'creciente' : 'decreciente';
      const altT = { greater: 'existe una tendencia creciente a lo largo de los grupos', less: 'existe una tendencia decreciente a lo largo de los grupos', 'two-sided': 'existe una tendencia ' + sentido + ' a lo largo de los grupos' }[r.alt];
      let t = concl(p, a, 'Hay evidencia de que ' + altT + '.', 'No hay evidencia suficiente de que ' + altT.replace('existe', 'exista') + '.' + NOREJ) + ' J = ' + fx(r.J, 1) + ' frente a ' + fx(r.mu, 1) + ' esperado bajo H₀ (Z = ' + fx(r.z, 3) + ').';
      const av = []; if (r.pExacto == null) av.push(r.hayEmpates ? 'Hay empates: se usó la aproximación normal con corrección por empates.' : 'N > 60: se usó la aproximación normal.'); av.push('El resultado depende del orden en que escribió los grupos: deben ir en el orden de la tendencia esperada.');
      return { cards: [{ n: 'Estadístico J', v: fx(r.J, 1), s: 'esperado ' + fx(r.mu, 1), main: 1 }, { n: 'Valor p (' + (r.pExacto != null ? 'exacto' : 'asintótico') + ')', v: fpv(p), s: decision(p, a) }, { n: 'Z', v: fx(r.z, 3), s: 'σ = ' + fx(r.sd, 2) }],
        tabla: { cab: ['Grupo (en orden)', 'n', 'Mediana'], filas: d.nm.map((n, i) => [n, String(r.ns[i]), fx(r.medianas[i], 3)]) },
        resumen: [['k grupos', String(r.k)], ['N', String(r.N)], ['J', fx(r.J, 3)], ['Media de J bajo H₀', fx(r.mu, 3)], ['Desv. estándar de J', fx(r.sd, 4)], ['Z', fx(r.z, 4)], ['p asintótico', fpv(r.pAsin)], ['p exacto', r.pExacto != null ? fpv(r.pExacto) : 'no disponible (empates o N > 60)'], ['Alternativa', ({ greater: 'creciente', less: 'decreciente', 'two-sided': 'bilateral' })[r.alt]]],
        h0: 'Los k grupos provienen de la misma distribución (sin tendencia).', h1: ({ greater: 'Los valores aumentan con el orden de los grupos.', less: 'Los valores disminuyen con el orden de los grupos.', 'two-sided': 'Existe una tendencia ordenada (en cualquier sentido).' })[r.alt], interp: t, avisos: av, grafico: tiraG(d.nm, d.g), datosTxt: datosG(d.nm, d.g), pDecision: p };
    },
    R(d) { return RGRP(d.g, d.nm) + '\n# install.packages("clinfun")\nlibrary(clinfun)\njonckheere.test(valor, as.numeric(grupo), alternative = "' + ({ 'two-sided': 'two.sided', greater: 'increasing', less: 'decreasing' })[d.alt] + '")\n'; },
    Py(d) { return PGRP(d.g, d.nm) + '\nfrom scipy.stats import norm\n\ndef jonckheere(g, alt="' + d.alt + '"):\n    n = np.array([len(x) for x in g]); N = n.sum(); J = 0.0\n    for i in range(len(g)):\n        for j in range(i + 1, len(g)):\n            for a in g[i]:\n                J += np.sum(a < g[j]) + 0.5 * np.sum(a == g[j])\n    mu = (N**2 - (n**2).sum()) / 4\n    t = np.unique(np.concatenate(g), return_counts=True)[1]\n    f1 = lambda m: m * (m - 1) * (2 * m + 5); f2 = lambda m: m * (m - 1) * (m - 2); f3 = lambda m: m * (m - 1)\n    var = (N*(N-1)*(2*N+5) - f1(n).sum() - f1(t).sum()) / 72 + f2(n).sum() * f2(t).sum() / (36*N*(N-1)*(N-2)) + f3(n).sum() * f3(t).sum() / (8*N*(N-1))\n    z = (J - mu) / np.sqrt(var)\n    p = norm.sf(z) if alt == "greater" else norm.cdf(z) if alt == "less" else min(1, 2 * norm.sf(abs(z)))\n    return J, z, p      # p asintótico (con corrección por empates)\n\nprint(jonckheere(g))\n'; }
  };

  // ══════════ 5. Varias relacionadas ══════════
  const MATF = (ph, label) => ({ id: 'mat', label: label || 'Datos (una fila por sujeto, una columna por condición)', type: 'ta', rows: 7, ph, req: true });
  const exFr = 'Basal Mes1 Mes2 Mes3\n8.2 7.5 6.9 6.1\n9.1 8.4 7.7 6.8\n7.8 7.9 6.5 6.0\n8.8 8.0 7.2 6.4\n9.5 8.9 8.1 7.0\n7.4 7.1 6.6 5.8\n8.6 8.1 7.3 6.7\n9.0 8.2 7.6 6.2\n8.1 7.7 7.0 6.5\n8.9 8.3 7.5 6.3';
  const phM = 'Opcional: primera fila con nombres.\nBasal Mes1 Mes2 Mes3\n8.2 7.5 6.9 6.1\n9.1 8.4 7.7 6.8';
  const barrasRango = (nm, vals, et) => ({ tipo: 'bar1', etiquetas: nm, a: vals.map(v => +v.toFixed(4)), etiq: et, colores: nm.map((_, i) => ['#00d4ffcc', '#7b61ffcc', '#00ff9dcc', '#ffd700cc', '#ff6b6bcc', '#b4a5ffcc', '#ffa94dcc', '#6b7c9ccc'][i % 8]), xt: 'Condición', yt: et });
  const FRTH = 'Cada fila es un sujeto (bloque) y cada columna una condición medida en ese mismo sujeto.';

  T.friedman = {
    tab: 'krel', nombre: 'Prueba de Friedman', corto: 'Friedman', cuando: 'Compara tres o más condiciones medidas en los mismos sujetos (medidas repetidas) cuando no hay normalidad. Alternativa no paramétrica al ANOVA de medidas repetidas.',
    datos: FRTH, supuestos: ['Los sujetos (bloques) son independientes entre sí.', 'Variable al menos ordinal, ordenable dentro de cada sujeto.', 'La aproximación χ² es adecuada con n ≥ 10 sujetos y k ≥ 4 condiciones (o n ≥ 15 con k = 3).', 'Los sujetos con datos faltantes deben eliminarse completos.'],
    campos: [MATF(phM), ADJ], ejemplo: { mat: exFr, adj: 'holm' }, leer(v) { const q = leerMatriz(v.mat, false, 3); return { m: q.m, nm: q.nombres, adj: v.adj || 'holm' }; }, calc(d) { return M.friedman(d.m, d.adj); },
    render(d, r, a) {
      const sig = r.pares.filter(q => q.padj < a).map(q => d.nm[q.i] + ' vs ' + d.nm[q.j]), ef = r.W;
      let t = concl(r.p, a, 'Al menos una condición tiende a dar valores distintos de las demás dentro de los mismos sujetos.', 'No hay evidencia suficiente de diferencias entre las condiciones.' + NOREJ) + ' Tamaño del efecto: W de Kendall = ' + fx(r.W, 3) + ' (' + magn(ef, [0.1, 0.3, 0.5]) + ').';
      if (r.p < a) t += sig.length ? ' Comparaciones de Conover con ajuste de ' + ADJN[r.adj] + ' significativas: ' + sig.join('; ') + '.' : ' Ninguna comparación por pares de Conover resultó significativa tras el ajuste de ' + ADJN[r.adj] + '.';
      const av = []; if (r.n < 10 || (r.k === 3 && r.n < 15)) av.push('Con pocos sujetos la aproximación χ² es poco precisa; interprete con cautela o use valores exactos (R: coin::friedman_test con distribución exacta).'); if (r.p >= a) av.push('Como la prueba global no fue significativa, las comparaciones por pares son solo exploratorias.');
      return { cards: [{ n: 'χ² de Friedman', v: fx(r.chi, 3), s: 'gl = ' + r.df + ' · n = ' + r.n, main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'W de Kendall', v: fx(r.W, 3), s: magn(ef, [0.1, 0.3, 0.5]) }],
        tabla: { cab: ['Condición', 'Rango medio', 'Suma de rangos'], filas: d.nm.map((n, i) => [n, fx(r.mediasRango[i], 3), fx(r.Rj[i], 1)]) },
        tabla2: { titulo: 'Comparaciones por pares de Conover (ajuste ' + ADJN[r.adj] + ')', cab: ['Comparación', 'Dif. rangos medios', 't', 'p', 'p ajustado'], filas: r.pares.map(q => [d.nm[q.i] + ' vs ' + d.nm[q.j], fx(q.dif, 3), fx(q.t, 3), fmtP(q.p), fmtP(q.padj)]) },
        resumen: [['Sujetos (n)', String(r.n)], ['Condiciones (k)', String(r.k)], ['χ² (corregido por empates)', fx(r.chi, 4)], ['gl', String(r.df)], ['Valor p', fpv(r.p)], ['W de Kendall', fx(r.W, 4)]],
        h0: 'Las k condiciones tienen la misma distribución (mismo rango medio).', h1: 'Al menos una condición difiere de las demás.', interp: t, avisos: av, grafico: barrasRango(d.nm, r.mediasRango, 'Rango medio'), datosTxt: d.m.length + ' sujetos × ' + d.nm.length + ' condiciones (' + d.nm.join(', ') + ')', pDecision: r.p };
    },
    R(d) { return RMAT(d.m, d.nm) + '\nfriedman.test(m)\n\n# Comparaciones por pares de Conover\n# install.packages("PMCMRplus")\nPMCMRplus::frdAllPairsConoverTest(m, p.adjust.method = "' + d.adj + '")\n\n# W de Kendall = chi2 / (n (k - 1))\nunname(friedman.test(m)$statistic) / (nrow(m) * (ncol(m) - 1))\n'; },
    Py(d) { return PMAT(d.m, d.nm) + '\nres = st.friedmanchisquare(*m.T)\nprint(res)\nprint("W de Kendall =", res.statistic / (m.shape[0] * (m.shape[1] - 1)))\n\n# Comparaciones por pares de Conover  (pip install scikit-posthocs)\nimport scikit_posthocs as sp\nprint(sp.posthoc_conover_friedman(m, p_adjust="' + PYADJ[d.adj] + '"))\n'; }
  };

  T.kendallw = {
    tab: 'krel', nombre: 'W de concordancia de Kendall', corto: 'W de Kendall', cuando: 'Mide el grado de acuerdo entre varios jueces o evaluadores que ordenan o puntúan los mismos objetos (W = 0: ningún acuerdo; W = 1: acuerdo total).',
    datos: 'Cada fila es un juez (o sujeto) y cada columna un objeto evaluado, con puntuaciones u órdenes.',
    supuestos: ['Los jueces evalúan de forma independiente.', 'Todos los jueces puntúan los mismos objetos.', 'Las puntuaciones se convierten en rangos dentro de cada juez; se corrige por empates.', 'La prueba de significancia usa la aproximación χ² (n(k − 1)W).'],
    campos: [MATF('Opcional: primera fila con los nombres de los objetos.\nObj1 Obj2 Obj3 Obj4 Obj5\n4 2 5 1 3\n5 3 4 1 2', 'Datos (una fila por juez, una columna por objeto)')],
    ejemplo: { mat: 'A B C D E\n4 2 5 1 3\n5 3 4 1 2\n4 3 5 2 1\n5 2 4 1 3\n3 2 5 1 4\n5 3 4 2 1\n4 1 5 2 3\n5 2 3 1 4' }, leer(v) { const q = leerMatriz(v.mat, false, 3); return { m: q.m, nm: q.nombres }; }, calc(d) { return M.kendallW(d.m); },
    render(d, r, a) {
      const mag = r.W < 0.1 ? 'muy débil' : r.W < 0.3 ? 'débil' : r.W < 0.5 ? 'moderada' : r.W < 0.7 ? 'fuerte' : 'muy fuerte';
      let t = concl(r.p, a, 'Existe un grado de acuerdo entre los jueces mayor que el esperable por azar.', 'No hay evidencia de acuerdo entre los jueces distinto del azar.' + NOREJ) + ' W = ' + fx(r.W, 3) + ' (concordancia ' + mag + '); la correlación media entre pares de jueces (Spearman) es ρ = ' + fx(r.rProm, 3) + '.';
      const av = []; if (r.n < 7) av.push('Con pocos jueces la aproximación χ² es poco precisa: use tablas exactas de W si n ≤ 7.'); av.push('Si los jueces ordenaron los objetos al revés (escala invertida), el acuerdo se subestima: use la misma dirección de escala para todos.');
      return { cards: [{ n: 'W de Kendall', v: fx(r.W, 3), s: 'concordancia ' + mag, main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'χ² · gl', v: fx(r.chi, 2) + ' · ' + r.df, s: 'n = ' + r.n + ' jueces, k = ' + r.k }],
        tabla: { cab: ['Objeto', 'Rango medio', 'Suma de rangos'], filas: d.nm.map((n, i) => [n, fx(r.mediasRango[i], 3), fx(r.Rj[i], 1)]) },
        resumen: [['Jueces (n)', String(r.n)], ['Objetos (k)', String(r.k)], ['W de Kendall', fx(r.W, 4)], ['χ² = n(k − 1)W', fx(r.chi, 4)], ['gl', String(r.df)], ['Valor p', fpv(r.p)], ['ρ medio entre jueces', fx(r.rProm, 4)]],
        h0: 'No hay acuerdo entre los jueces (W = 0).', h1: 'Los jueces concuerdan más allá del azar (W > 0).', interp: t, avisos: av, grafico: barrasRango(d.nm, r.mediasRango, 'Rango medio'), datosTxt: r.n + ' jueces × ' + r.k + ' objetos (' + d.nm.join(', ') + ')', pDecision: r.p };
    },
    R(d) { return RMAT(d.m, d.nm) + '\n# install.packages("DescTools")\nDescTools::KendallW(t(m), correct = TRUE, test = TRUE)   # filas de t(m) = objetos, columnas = jueces\n\n# Equivalente con Friedman: W = chi2 / (n (k - 1))\nunname(friedman.test(m)$statistic) / (nrow(m) * (ncol(m) - 1))\n'; },
    Py(d) { return PMAT(d.m, d.nm) + '\nn, k = m.shape\nres = st.friedmanchisquare(*m.T)\nW = res.statistic / (n * (k - 1))      # con corrección por empates\nprint("W =", W, " chi2 =", res.statistic, " p =", res.pvalue)\nprint("rho medio =", (n * W - 1) / (n - 1))\n'; }
  };

  T.cochran = {
    tab: 'krel', nombre: 'Q de Cochran', corto: 'Q de Cochran', cuando: 'Compara tres o más condiciones medidas en los mismos sujetos cuando la respuesta es dicotómica (éxito/fracaso, sí/no, 1/0). Es el equivalente de McNemar para k ≥ 3.',
    datos: 'Cada fila es un sujeto y cada columna una condición, con valores 0 o 1.',
    supuestos: ['Respuesta dicotómica (0/1) en todas las condiciones.', 'Sujetos independientes entre sí.', 'Solo aportan información los sujetos que no responden igual en todas las condiciones.', 'La aproximación χ² requiere al menos 4 sujetos con respuestas distintas y n·k ≥ 24.'],
    campos: [MATF('Opcional: primera fila con nombres.\nPrueba1 Prueba2 Prueba3\n1 0 0\n1 1 0\n1 1 1', 'Datos 0/1 (una fila por sujeto, una columna por condición)'), ADJ],
    ejemplo: { mat: 'Método1 Método2 Método3\n0 1 1\n0 0 1\n1 1 1\n0 1 1\n0 0 0\n1 1 1\n0 1 0\n0 0 1\n1 1 1\n0 1 1\n0 0 1\n1 0 1\n0 1 1\n0 0 1\n1 1 1\n0 1 0', adj: 'holm' }, leer(v) { const q = leerMatriz(v.mat, true, 3); return { m: q.m, nm: q.nombres, adj: v.adj || 'holm' }; }, calc(d) { return M.cochranQ(d.m, d.adj); },
    render(d, r, a) {
      const sig = r.pares.filter(q => q.padj < a).map(q => d.nm[q.i] + ' vs ' + d.nm[q.j]);
      let t = concl(r.p, a, 'La proporción de éxitos no es igual en todas las condiciones.', 'No hay evidencia suficiente de que la proporción de éxitos difiera entre condiciones.' + NOREJ);
      if (r.p < a) t += sig.length ? ' Comparaciones por pares (McNemar exacto, ajuste de ' + ADJN[r.adj] + ') significativas: ' + sig.join('; ') + '.' : ' Ninguna comparación por pares resultó significativa tras el ajuste de ' + ADJN[r.adj] + '.';
      const av = []; if (r.menosFilas < 4 || r.n * r.k < 24) av.push('Pocos sujetos con respuestas distintas (' + r.menosFilas + ' de ' + r.n + ') o n·k < 24: la aproximación χ² puede ser poco fiable.');
      return { cards: [{ n: 'Q de Cochran', v: fx(r.Q, 3), s: 'gl = ' + r.df + ' · n = ' + r.n, main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Sujetos informativos', v: String(r.menosFilas), s: 'de ' + r.n }],
        tabla: { cab: ['Condición', 'Éxitos', 'Proporción'], filas: d.nm.map((n, i) => [n, String(r.exitos[i]), fx(r.props[i], 3)]) },
        tabla2: { titulo: 'Comparaciones por pares: McNemar exacto (ajuste ' + ADJN[r.adj] + ')', cab: ['Comparación', 'Discordantes (+−/−+)', '', 'p', 'p ajustado'], filas: r.pares.map(q => [d.nm[q.i] + ' vs ' + d.nm[q.j], q.b + ' / ' + q.c, '', fmtP(q.p), fmtP(q.padj)]) },
        resumen: [['Sujetos (n)', String(r.n)], ['Condiciones (k)', String(r.k)], ['Sujetos con respuestas distintas', String(r.menosFilas)], ['Q', fx(r.Q, 4)], ['gl', String(r.df)], ['Valor p', fpv(r.p)]],
        h0: 'La proporción de éxitos es la misma en las k condiciones.', h1: 'La proporción de éxitos difiere en al menos una condición.', interp: t, avisos: av, grafico: { tipo: 'bar1', etiquetas: d.nm, a: r.props.map(v => +v.toFixed(4)), etiq: 'Proporción de éxitos', colores: d.nm.map((_, i) => ['#00d4ffcc', '#7b61ffcc', '#00ff9dcc', '#ffd700cc', '#ff6b6bcc', '#b4a5ffcc', '#ffa94dcc', '#6b7c9ccc'][i % 8]), xt: 'Condición', yt: 'Proporción de éxitos', ymax: 1 }, datosTxt: r.n + ' sujetos × ' + r.k + ' condiciones (' + d.nm.join(', ') + ')', pDecision: r.p };
    },
    R(d) { return RMAT(d.m, d.nm) + '\n# install.packages("DescTools")\nDescTools::CochranQTest(m)\n\n# Comparaciones por pares: McNemar exacto con ajuste\npares <- combn(ncol(m), 2)\np <- apply(pares, 2, function(ij) { b <- sum(m[, ij[1]] == 1 & m[, ij[2]] == 0); c <- sum(m[, ij[1]] == 0 & m[, ij[2]] == 1); if (b + c == 0) 1 else binom.test(b, b + c, 0.5)$p.value })\ndata.frame(par = apply(pares, 2, function(ij) paste(colnames(m)[ij], collapse = " vs ")), p = p, p_ajustado = p.adjust(p, "' + d.adj + '"))\n'; },
    Py(d) { return PMAT(d.m, d.nm) + '\nfrom itertools import combinations\nfrom scipy.stats import binomtest\nfrom statsmodels.stats.contingency_tables import cochrans_q\nfrom statsmodels.stats.multitest import multipletests\n\nq = cochrans_q(m, return_object=True)\nprint(q)\n\n# Comparaciones por pares: McNemar exacto con ajuste\npares, p = [], []\nfor i, j in combinations(range(m.shape[1]), 2):\n    b = int(((m[:, i] == 1) & (m[:, j] == 0)).sum()); c = int(((m[:, i] == 0) & (m[:, j] == 1)).sum())\n    pares.append(nombres[i] + " vs " + nombres[j]); p.append(1.0 if b + c == 0 else binomtest(b, b + c, 0.5).pvalue)\nfor n_, p0, p1 in zip(pares, p, multipletests(p, method="' + (d.adj === 'none' ? 'holm' : d.adj === 'bonferroni' ? 'bonferroni' : 'holm') + '")[1]):\n    print(n_, round(p0, 4), round(p1, 4))\n'; }
  };

  // Registrar las pestañas
  const set = (id, tests) => { const t = P.TABS.find(x => x.id === id); t.tests = tests; delete t.pronto; };
  set('rel2', ['wilcoxon', 'signos']); set('kind', ['kruskal', 'mediana', 'jt']); set('krel', ['friedman', 'kendallw', 'cochran']);
  const fix = (id, desc) => { P.TABS.find(x => x.id === id).desc = desc; };
  fix('rel2', 'Comparan dos mediciones de los mismos sujetos (antes y después, o dos condiciones).'); fix('kind', 'Comparan tres o más grupos formados por sujetos distintos.'); fix('krel', 'Comparan tres o más condiciones medidas en los mismos sujetos, o miden la concordancia entre jueces.');
})(NPP);
