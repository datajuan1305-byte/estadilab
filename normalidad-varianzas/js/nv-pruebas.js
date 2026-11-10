/* Normalidad y homogeneidad de varianzas — definiciones (usa np-ui.js) — Estadilab */
const NPP = (function () {
  'use strict';
  const V = NVM, M = NPM;
  const fx = (v, d = 3) => (typeof v === 'number' && isFinite(v)) ? v.toFixed(d).replace('.', ',') : (v === Infinity ? '∞' : '—');
  const fpv = p => (p == null || typeof p !== 'number' || isNaN(p)) ? '—' : (p < 0.0001 ? '< 0,0001' : p.toFixed(4).replace('.', ','));
  const num = v => (typeof v === 'number' && isFinite(v)) ? String(+v.toPrecision(12)) : 'NA';
  const rv = a => 'c(' + a.map(num).join(', ') + ')', pv = a => '[' + a.map(num).join(', ') + ']';
  const rs = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const decision = (p, a) => p < a ? 'Se rechaza H₀' : 'No se rechaza H₀';
  const fmtList = (a, max = 60) => a.length > max ? a.slice(0, max).map(num).join(', ') + ', … (' + a.length + ' valores)' : a.map(num).join(', ');
  function tokens(txt) { txt = String(txt || '').trim(); if (!txt) return []; let t = txt.split(/[\s;]+/).filter(Boolean); const cd = (/;|\n/.test(txt)) && t.every(k => /^-?\d+(,\d+)?$/.test(k)) && t.some(k => k.includes(',')); if (cd) return t.map(k => k.replace(',', '.')); return txt.split(/[\s;,]+/).filter(Boolean); }
  function nums(txt, nombre, min) { const t = tokens(txt), out = []; for (const k of t) { const v = Number(k); if (!isFinite(v)) throw new Error('«' + k + '» no es un número válido en ' + nombre + '. Use punto como separador decimal.'); out.push(v); } if (out.length < (min || 1)) throw new Error(nombre + ': se necesitan al menos ' + (min || 1) + ' valores numéricos (hay ' + out.length + ').'); return out; }
  function leerGrupos(arr, min) { const gs = (arr || []).map((g, i) => ({ n: ((g.n || '').trim() || 'Grupo ' + (i + 1)), t: String(g.v || '') })).filter(g => g.t.trim()); if (gs.length < min) throw new Error('Escriba datos en al menos ' + min + ' grupos.'); return { nombres: gs.map(g => g.n), g: gs.map(g => nums(g.t, g.n, 2)) }; }
  const concl = (p, a, si, no) => '<strong>' + decision(p, a) + '</strong> (p ' + (p < 0.0001 ? '< 0,0001' : '= ' + fpv(p)) + (p < a ? ' < ' : ' ≥ ') + fx(a, 2) + '). ' + (p < a ? si : no);
  const NOREJN = ' Con normalidad el «no rechazo» no prueba que los datos sean normales: con n pequeño la prueba tiene poca potencia, y con n grande detecta desviaciones irrelevantes. Combine el valor p con el gráfico Q-Q.';
  const REFS_N = 'Referencias: Shapiro, S. S. y Wilk, M. B. (1965). Biometrika, 52, 591–611; Royston, P. (1995). Remark AS R94. Applied Statistics, 44, 547–551; Stephens, M. A. (1974). EDF statistics for goodness of fit. JASA, 69, 730–737; D\'Agostino, R. B., Belanger, A. y D\'Agostino Jr., R. B. (1990). The American Statistician, 44, 316–321; Jarque, C. M. y Bera, A. K. (1987). International Statistical Review, 55, 163–172; Levene, H. (1960); Brown, M. B. y Forsythe, A. B. (1974). JASA, 69, 364–367; Bartlett, M. S. (1937); Fligner, M. A. y Killeen, T. J. (1976). JASA, 71, 210–213. Cálculos realizados con Estadilab (estadilab.com).';
  const GRUPOS = { id: 'grp', label: 'Grupos', type: 'grupos', min: 2, max: 8, def: [{ n: 'Grupo 1', v: '' }, { n: 'Grupo 2', v: '' }, { n: 'Grupo 3', v: '' }] };
  const datosG = (nm, gs) => nm.map((n, i) => n + ': ' + fmtList(gs[i], 20)).join(' | ');
  const RGRP = (gs, nm) => 'datos <- list(\n' + gs.map((g, i) => '  ' + rs(nm[i]) + ' = ' + rv(g)).join(',\n') + '\n)\nvalor <- unlist(datos)\ngrupo <- factor(rep(names(datos), lengths(datos)), levels = names(datos))\n';
  const PGRP = (gs, nm) => 'import numpy as np\nfrom scipy import stats as st\n\ngrupos = {\n' + gs.map((g, i) => '    ' + JSON.stringify(nm[i]) + ': ' + pv(g)).join(',\n') + '\n}\ng = [np.array(v) for v in grupos.values()]\n';
  const exN = '4.2 5.1 5.8 4.9 6.3 5.5 7.1 5.0 4.4 6.0 5.7 6.8 5.2 4.8 9.5 5.4 5.9 6.1 4.6 5.3';
  const exVar = { grp: [{ n: 'Método A', v: '23 25 21 27 24 26 22 31' }, { n: 'Método B', v: '28 32 29 35 27 33 30 34' }, { n: 'Método C', v: '15 38 52 37 61 39 28 43' }] };
  const exVar2 = { grp: [{ n: 'Método A', v: '23 25 21 27 24 26 22 31' }, { n: 'Método C', v: '15 38 52 37 61 39 28 43' }] };
  const DX = { id: 'x', label: 'Datos (una variable cuantitativa)', type: 'ta', rows: 5, ph: 'Ej: 4.2 5.1 5.8 4.9 6.3 5.5 7.1 5.0', req: true };
  const leerX = (min) => v => ({ x: nums(v.x, 'los datos', min) });
  const secVar = g => ['n', 'Media', 'Mediana', 'Varianza', 'Desv. est.'];

  // gráficos
  const gQQ = x => { const q = V.qq(x); return { tipo: 'qq', pts: q.pts, sl: q.sl, ic: q.ic }; };
  const gHist = x => { const h = V.histo(x); return { tipo: 'hist', cent: h.cent, c: h.c, pdf: h.pdf, w: h.w }; };

  const TESTS = {};
  // ───── plantilla para pruebas de normalidad de una muestra ─────
  function normTest(cfg) {
    return Object.assign({
      tab: 'norm', datos: 'Una variable cuantitativa continua (n ≥ ' + cfg.min + ').',
      supuestos: ['Observaciones independientes.', 'Variable cuantitativa continua; muchos valores repetidos reducen la validez de la prueba.', 'H₀ es que los datos provienen de una distribución normal (con media y varianza desconocidas).', 'Con muestras grandes cualquier desviación mínima resulta «significativa»; con muestras pequeñas casi nada lo es. Revise siempre el gráfico Q-Q.'].concat(cfg.sup || []),
      campos: [DX], ejemplo: { x: exN }, leer: leerX(cfg.min),
      h0: 'La variable proviene de una distribución normal.', h1: 'La variable no proviene de una distribución normal.'
    }, cfg);
  }
  const fin = (d, r, a, p, extra) => {
    const mo = V.momentos(d.x), q = V.qq(d.x); let t = extra.t;
    t += ' Asimetría g₁ = ' + fx(mo.g1, 2) + ' (' + (Math.abs(mo.g1) < 0.5 ? 'aproximadamente simétrica' : mo.g1 > 0 ? 'cola derecha' : 'cola izquierda') + ') y curtosis excesiva = ' + fx(mo.curt, 2) + ' (' + (Math.abs(mo.curt) < 0.5 ? 'similar a la normal' : mo.curt > 0 ? 'colas más pesadas' : 'colas más ligeras') + ').';
    if (p < a && d.x.length >= 30) t += ' Con n = ' + d.x.length + ' el teorema central del límite hace que las pruebas sobre medias (t, ANOVA) sean razonablemente robustas aunque los datos no sean exactamente normales, salvo asimetría fuerte o valores atípicos.';
    return { cards: extra.cards, tabla: null, resumen: extra.resumen.concat([['n', String(d.x.length)], ['Media', fx(mo.media, 4)], ['Desv. estándar', fx(mo.sd, 4)], ['Asimetría g₁', fx(mo.g1, 4)], ['Curtosis excesiva', fx(mo.curt, 4)]]), h0: extra.h0 || 'La variable proviene de una distribución normal.', h1: extra.h1 || 'La variable no proviene de una distribución normal.', interp: t, avisos: extra.avisos || [], grafico: gQQ(d.x), grafico2: gHist(d.x), datosTxt: fmtList(d.x, 40), pDecision: p };
  };
  const Rn = (d, linea) => 'x <- ' + rv(d.x) + '\n\n' + linea + '\n\n# Gráfico Q-Q\nqqnorm(x); qqline(x)\nhist(x, freq = FALSE); curve(dnorm(x, mean(x), sd(x)), add = TRUE)\n';
  const Pn = (d, linea) => 'import numpy as np\nfrom scipy import stats as st\nimport matplotlib.pyplot as plt\n\nx = np.array(' + pv(d.x) + ')\n\n' + linea + '\n\n# Gráfico Q-Q\nst.probplot(x, dist="norm", plot=plt)\nplt.show()\n';

  TESTS.panel = normTest({ nombre: 'Panel de normalidad (todas las pruebas)', corto: 'Panel completo', min: 8, cuando: 'Aplica a la vez Shapiro-Wilk, Anderson-Darling, D\'Agostino-Pearson, Jarque-Bera y Lilliefors a la misma variable y muestra el gráfico Q-Q y el histograma con la curva normal. Es el punto de partida recomendado.',
    calc(d) { const o = { sw: V.shapiroWilk(d.x), ad: V.andersonDarling(d.x), jb: V.jarqueBera(d.x), li: V.lilliefors(d.x) }; try { o.dp = V.dagostino(d.x); } catch (e) { o.dp = null; } return o; },
    render(d, r, a) {
      const fil = [['Shapiro-Wilk', 'W = ' + fx(r.sw.W, 4), fpv(r.sw.p)], ['Anderson-Darling', 'A* = ' + fx(r.ad.As, 4), fpv(r.ad.p)], ['D\'Agostino-Pearson', r.dp ? 'K² = ' + fx(r.dp.K2, 3) : '—', r.dp ? fpv(r.dp.p) : 'n < 8'], ['Jarque-Bera', 'JB = ' + fx(r.jb.JB, 3), fpv(r.jb.p)], ['Lilliefors (K-S)', 'D = ' + fx(r.li.D, 4), fpv(r.li.p)]];
      const ps = [r.sw.p, r.ad.p, r.dp ? r.dp.p : null, r.jb.p, r.li.p].filter(v => v != null), rech = ps.filter(p => p < a).length;
      let t = '<strong>' + rech + ' de ' + ps.length + ' pruebas rechazan la normalidad</strong> a α = ' + fx(a, 2) + '. ' + (rech === 0 ? 'Ninguna encuentra evidencia contra la normalidad.' + NOREJN : rech === ps.length ? 'Todas coinciden: hay evidencia de que la variable no es normal.' : 'Las pruebas no coinciden; esto es habitual porque cada una es sensible a una desviación distinta (colas, asimetría, centro). Decida con el gráfico Q-Q y el tamaño de muestra. La de Shapiro-Wilk es la de mayor potencia en general.');
      const o = fin(d, r, a, r.sw.p, { t, cards: [{ n: 'Shapiro-Wilk (W)', v: fx(r.sw.W, 4), s: 'p = ' + fpv(r.sw.p) + ' · ' + decision(r.sw.p, a), main: 1 }, { n: 'Anderson-Darling (A*)', v: fx(r.ad.As, 3), s: 'p = ' + fpv(r.ad.p) }, { n: 'Pruebas que rechazan', v: rech + ' / ' + ps.length, s: 'α = ' + fx(a, 2) }], resumen: [['Shapiro-Wilk W', fx(r.sw.W, 5)], ['Shapiro-Wilk p', fpv(r.sw.p)], ['Anderson-Darling A²', fx(r.ad.A2, 5)], ['Anderson-Darling A* (ajustado)', fx(r.ad.As, 5)], ['Anderson-Darling p', fpv(r.ad.p)], ['D\'Agostino K²', r.dp ? fx(r.dp.K2, 4) : '—'], ['D\'Agostino p', r.dp ? fpv(r.dp.p) : '—'], ['Jarque-Bera', fx(r.jb.JB, 4)], ['Jarque-Bera p', fpv(r.jb.p)], ['Lilliefors D', fx(r.li.D, 5)], ['Lilliefors p (Monte Carlo)', fpv(r.li.p)]], avisos: d.x.length < 20 ? ['Con n < 20, D\'Agostino-Pearson y Jarque-Bera no son fiables; priorice Shapiro-Wilk.'] : [] });
      o.tabla = { cab: ['Prueba', 'Estadístico', 'Valor p'], filas: fil.map(f => f.concat([])) };
      o.tabla = { cab: ['Prueba', 'Estadístico', 'Valor p'], filas: fil };
      return o;
    },
    R(d) { return Rn(d, 'shapiro.test(x)\n\n# install.packages("nortest")\nnortest::ad.test(x)\nnortest::lillie.test(x)\nnortest::pearson.test(x)   # (opcional) ji-cuadrado de Pearson\n# install.packages("tseries")\ntseries::jarque.bera.test(x)'); },
    Py(d) { return Pn(d, 'print(st.shapiro(x))\nprint(st.normaltest(x))      # D\'Agostino-Pearson (n >= 20)\nprint(st.jarque_bera(x))\n\nfrom statsmodels.stats.diagnostic import normal_ad, lilliefors\nprint("Anderson-Darling (A2, p):", normal_ad(x))\nprint("Lilliefors (D, p):", lilliefors(x, dist="norm"))'); } });
  TESTS.panel.nombre = 'Panel de normalidad (todas las pruebas)';

  TESTS.shapiro = normTest({ nombre: 'Shapiro-Wilk', corto: 'Shapiro-Wilk', min: 3, cuando: 'La prueba de normalidad de mayor potencia para muestras pequeñas y medianas (3 ≤ n ≤ 5000). Compara los datos ordenados con los cuantiles esperados de una normal mediante el estadístico W, que vale 1 si el ajuste es perfecto.',
    calc(d) { return V.shapiroWilk(d.x); },
    render(d, r, a) {
      const t = concl(r.p, a, 'Hay evidencia de que los datos no provienen de una distribución normal.', 'No hay evidencia suficiente contra la normalidad.' + NOREJN) + ' W = ' + fx(r.W, 4) + ' (cuanto más lejos de 1, mayor la desviación).';
      return fin(d, r, a, r.p, { t, cards: [{ n: 'W de Shapiro-Wilk', v: fx(r.W, 4), s: 'n = ' + r.n, main: 1 }, { n: 'Valor p', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Decisión (α = ' + fx(a, 2) + ')', v: r.p < a ? 'No normal' : 'Compatible con normal', s: '' }], resumen: [['W', fx(r.W, 6)], ['Valor p', fpv(r.p)], ['Método', 'Royston (1995), AS R94']], avisos: d.x.length > 2000 ? ['Con n tan grande Shapiro-Wilk rechaza por desviaciones mínimas: apóyese en el Q-Q.'] : [] });
    },
    R(d) { return Rn(d, 'shapiro.test(x)'); }, Py(d) { return Pn(d, 'print(st.shapiro(x))'); } });

  TESTS.ad = normTest({ nombre: 'Anderson-Darling', corto: 'Anderson-Darling', min: 8, cuando: 'Compara la función de distribución empírica con la normal dando más peso a las colas, por lo que detecta mejor desviaciones en los extremos que Kolmogorov-Smirnov. Se usa con media y varianza estimadas (corrección de Stephens).',
    calc(d) { return V.andersonDarling(d.x); },
    render(d, r, a) {
      const t = concl(r.p, a, 'Hay evidencia de que los datos no provienen de una distribución normal (especialmente en las colas).', 'No hay evidencia suficiente contra la normalidad.' + NOREJN) + ' A² = ' + fx(r.A2, 4) + '; A* ajustado por tamaño de muestra = ' + fx(r.As, 4) + '.';
      return fin(d, r, a, r.p, { t, cards: [{ n: 'A* de Anderson-Darling', v: fx(r.As, 4), s: 'A² = ' + fx(r.A2, 4), main: 1 }, { n: 'Valor p', v: fpv(r.p), s: decision(r.p, a) }, { n: 'n', v: String(r.n), s: '' }], resumen: [['A²', fx(r.A2, 6)], ['A* = A²(1 + 0,75/n + 2,25/n²)', fx(r.As, 6)], ['Valor p (Stephens)', fpv(r.p)]] });
    },
    R(d) { return Rn(d, '# install.packages("nortest")\nnortest::ad.test(x)'); }, Py(d) { return Pn(d, 'from statsmodels.stats.diagnostic import normal_ad\nA2, p = normal_ad(x)\nprint("A2 =", A2, " p =", p)\n\n# scipy da valores críticos en lugar de p:\nprint(st.anderson(x, dist="norm"))'); } });

  TESTS.dagostino = normTest({ nombre: 'D\'Agostino-Pearson (K²)', corto: 'D\'Agostino-Pearson', min: 8, cuando: 'Combina la asimetría y la curtosis en un único estadístico K² que sigue aproximadamente una ji-cuadrado con 2 grados de libertad. Indica además si el problema es de asimetría o de colas.',
    sup: ['Se recomienda n ≥ 20; con menos datos la aproximación es poco fiable.'],
    calc(d) { return V.dagostino(d.x); },
    render(d, r, a) {
      const t = concl(r.p, a, 'Hay evidencia de que los datos no provienen de una distribución normal.', 'No hay evidencia suficiente contra la normalidad.' + NOREJN) + ' Componentes: asimetría Z = ' + fx(r.Zs, 3) + ' (p = ' + fpv(r.pS) + ') y curtosis Z = ' + fx(r.Zk, 3) + ' (p = ' + fpv(r.pK) + ').';
      return fin(d, r, a, r.p, { t, cards: [{ n: 'K² de D\'Agostino-Pearson', v: fx(r.K2, 3), s: 'gl = 2', main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Z asimetría / Z curtosis', v: fx(r.Zs, 2) + ' / ' + fx(r.Zk, 2), s: '' }], resumen: [['K²', fx(r.K2, 5)], ['Z de asimetría', fx(r.Zs, 5)], ['p asimetría', fpv(r.pS)], ['Z de curtosis', fx(r.Zk, 5)], ['p curtosis', fpv(r.pK)], ['Valor p', fpv(r.p)]], avisos: d.x.length < 20 ? ['n < 20: el componente de curtosis no es fiable; prefiera Shapiro-Wilk.'] : [] });
    },
    R(d) { return Rn(d, '# install.packages("moments"); install.packages("fBasics")\nfBasics::dagoTest(x)   # K² de D\'Agostino-Pearson\nmoments::agostino.test(x)   # asimetría\nmoments::anscombe.test(x)   # curtosis'); }, Py(d) { return Pn(d, 'print(st.normaltest(x))\nprint(st.skewtest(x)); print(st.kurtosistest(x))'); } });

  TESTS.jb = normTest({ nombre: 'Jarque-Bera', corto: 'Jarque-Bera', min: 8, cuando: 'Contrasta si la asimetría y la curtosis coinciden con las de una normal (0 y 3). Es muy usada en econometría y para residuales de regresión con muestras grandes.',
    sup: ['Su aproximación ji-cuadrado solo es confiable con n grande (más de ~50); con n pequeño tiende a no detectar la no normalidad.'],
    calc(d) { return V.jarqueBera(d.x); },
    render(d, r, a) {
      const t = concl(r.p, a, 'Hay evidencia de que la asimetría o la curtosis se apartan de las de una normal.', 'No hay evidencia suficiente contra la normalidad.' + NOREJN) + ' JB = ' + fx(r.JB, 3) + ' con asimetría ' + fx(r.g1, 3) + ' y curtosis ' + fx(r.curt + 3, 3) + ' (la normal tiene 3).';
      return fin(d, r, a, r.p, { t, cards: [{ n: 'Jarque-Bera', v: fx(r.JB, 3), s: 'gl = 2', main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Asimetría / curtosis', v: fx(r.g1, 2) + ' / ' + fx(r.curt + 3, 2), s: 'normal: 0 / 3' }], resumen: [['JB', fx(r.JB, 5)], ['Valor p', fpv(r.p)]], avisos: d.x.length < 50 ? ['Con n < 50 la aproximación ji-cuadrado del valor p no es fiable: priorice Shapiro-Wilk.'] : [] });
    },
    R(d) { return Rn(d, '# install.packages("tseries")\ntseries::jarque.bera.test(x)'); }, Py(d) { return Pn(d, 'print(st.jarque_bera(x))'); } });

  TESTS.lillie = normTest({ nombre: 'Lilliefors (K-S con parámetros estimados)', corto: 'Lilliefors', min: 4, cuando: 'Versión de Kolmogorov-Smirnov para normalidad cuando la media y la desviación se estiman de la misma muestra. El valor p se obtiene por simulación Monte Carlo, por lo que puede variar levemente entre ejecuciones con otros programas.',
    calc(d) { return V.lilliefors(d.x); },
    render(d, r, a) {
      const t = concl(r.p, a, 'Hay evidencia de que los datos no provienen de una distribución normal.', 'No hay evidencia suficiente contra la normalidad.' + NOREJN) + ' D = ' + fx(r.D, 4) + '.';
      return fin(d, r, a, r.p, { t, cards: [{ n: 'D de Lilliefors', v: fx(r.D, 4), s: 'n = ' + r.n, main: 1 }, { n: 'Valor p (Monte Carlo)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Simulaciones', v: String(r.B), s: 'semilla fija' }], resumen: [['D', fx(r.D, 6)], ['Valor p', fpv(r.p)], ['Simulaciones', String(r.B)]], avisos: ['Es menos potente que Shapiro-Wilk y Anderson-Darling; se incluye por tradición (SPSS la reporta junto a Shapiro-Wilk).'] });
    },
    R(d) { return Rn(d, '# install.packages("nortest")\nnortest::lillie.test(x)'); }, Py(d) { return Pn(d, 'from statsmodels.stats.diagnostic import lilliefors\nprint(lilliefors(x, dist="norm", pvalmethod="table"))   # D, p'); } });

  // ───── Homogeneidad de varianzas ─────
  const tablaVar = (nm, gr) => ({ cab: ['Grupo', 'n', 'Media', 'Mediana', 'Varianza', 'Desv. est.'], filas: nm.map((n, i) => [n, String(gr[i].n), fx(gr[i].media, 3), fx(gr[i].mediana, 3), fx(gr[i].var, 3), fx(gr[i].sd, 3)]) });
  const gSD = (nm, gr) => ({ tipo: 'bar1', etiquetas: nm, a: gr.map(g => +g.sd.toFixed(4)), etiq: 'Desviación estándar', colores: nm.map(() => '#00d4ffcc'), xt: '', yt: 'Desviación estándar' });
  const razon = gr => { const v = gr.map(g => g.var); return Math.max.apply(null, v) / Math.min.apply(null, v); };
  const avRazon = (gr, ns) => { const av = [], rz = razon(gr); if (Math.min.apply(null, ns) < 5) av.push('Algún grupo tiene menos de 5 observaciones: la prueba tiene muy poca potencia.'); const bal = Math.max.apply(null, ns) / Math.min.apply(null, ns) <= 1.5; if (rz > 4 && !bal) av.push('Con tamaños desiguales y razón de varianzas alta, use Welch o Games-Howell en lugar de ANOVA clásico.'); return av; };
  const varTest = cfg => Object.assign({ tab: 'var', datos: 'Una variable cuantitativa medida en k ≥ 2 grupos independientes.', campos: [GRUPOS], ejemplo: exVar, leer(v) { const q = leerGrupos(v.grp, 2); return { g: q.g, nm: q.nombres }; }, h0: 'Todos los grupos tienen la misma varianza (σ₁² = σ₂² = … = σₖ²).', h1: 'Al menos un grupo tiene una varianza distinta.' }, cfg);
  const finV = (d, r, a, p, t, cards, resumen, av) => ({ cards, tabla: tablaVar(d.nm, r.grupos), resumen: [['k grupos', String(r.k)], ['N', String(r.N)]].concat(resumen, [['Razón máx/mín de varianzas', fx(razon(r.grupos), 3)]]), h0: 'Todos los grupos tienen la misma varianza.', h1: 'Al menos un grupo tiene una varianza distinta.', interp: t + ' Razón entre la mayor y la menor varianza = ' + fx(razon(r.grupos), 2) + (razon(r.grupos) < 3 ? ' (heterogeneidad leve; los ANOVA suelen tolerar razones menores de 3–4 con tamaños de grupo similares).' : ' (heterogeneidad notable).') + (p < a ? ' Como se rechaza la homogeneidad, prefiera un ANOVA de Welch o Games-Howell, o el Kruskal-Wallis si además hay no normalidad.' : ' Se puede usar el ANOVA clásico en lo que respecta a las varianzas.'), avisos: av, grafico: gSD(d.nm, r.grupos), grafico2: { tipo: 'tira', g: d.nm.map((n, i) => ({ n, v: d.g[i] })) }, datosTxt: datosG(d.nm, d.g), pDecision: p });
  const SUPV = ['Observaciones independientes dentro y entre grupos.', 'Variable cuantitativa.'];

  TESTS.levene = varTest({ nombre: 'Levene', corto: 'Levene', cuando: 'Contrasta si dos o más grupos tienen la misma varianza (homocedasticidad), supuesto del ANOVA y de la t de Student con varianzas iguales. Aplica un ANOVA a las desviaciones absolutas respecto de la media de cada grupo.',
    supuestos: SUPV.concat(['Es robusta frente a la no normalidad moderada; con distribuciones muy asimétricas prefiera Brown-Forsythe.']),
    calc(d) { return V.levene(d.g, 'mean'); },
    render(d, r, a) { const t = concl(r.p, a, 'Hay evidencia de que al menos un grupo tiene una varianza distinta (se viola la homogeneidad).', 'No hay evidencia suficiente de diferencias entre las varianzas.' + ' Esto no demuestra que sean iguales: con grupos pequeños la prueba tiene poca potencia.'); return finV(d, r, a, r.p, t, [{ n: 'W de Levene', v: fx(r.W, 3), s: 'gl = ' + r.df1 + ', ' + r.df2, main: 1 }, { n: 'Valor p (F)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Razón máx/mín', v: fx(razon(r.grupos), 2), s: 'de varianzas' }], [['W (centro = media)', fx(r.W, 5)], ['gl', r.df1 + ' y ' + r.df2], ['Valor p', fpv(r.p)]], avRazon(r.grupos, r.ns)); },
    R(d) { return RGRP(d.g, d.nm) + '\n# install.packages("car")\ncar::leveneTest(valor ~ grupo, center = mean)\n'; }, Py(d) { return PGRP(d.g, d.nm) + '\nprint(st.levene(*g, center="mean"))\n'; } });

  TESTS.bf = varTest({ nombre: 'Brown-Forsythe', corto: 'Brown-Forsythe', cuando: 'Variante de Levene que usa la mediana en lugar de la media. Es la opción recomendada por defecto: conserva su nivel de error aun con datos asimétricos o con colas pesadas.',
    supuestos: SUPV.concat(['Es la variante de Levene más robusta (es la que usa R en leveneTest y SciPy con center = «median»).']),
    calc(d) { return V.levene(d.g, 'median'); },
    render(d, r, a) { const t = concl(r.p, a, 'Hay evidencia de que al menos un grupo tiene una varianza distinta (se viola la homogeneidad).', 'No hay evidencia suficiente de diferencias entre las varianzas.' + ' Esto no demuestra que sean iguales: con grupos pequeños la prueba tiene poca potencia.'); return finV(d, r, a, r.p, t, [{ n: 'W de Brown-Forsythe', v: fx(r.W, 3), s: 'gl = ' + r.df1 + ', ' + r.df2, main: 1 }, { n: 'Valor p (F)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Razón máx/mín', v: fx(razon(r.grupos), 2), s: 'de varianzas' }], [['W (centro = mediana)', fx(r.W, 5)], ['gl', r.df1 + ' y ' + r.df2], ['Valor p', fpv(r.p)]], avRazon(r.grupos, r.ns)); },
    R(d) { return RGRP(d.g, d.nm) + '\n# install.packages("car")\ncar::leveneTest(valor ~ grupo, center = median)   # Brown-Forsythe\n'; }, Py(d) { return PGRP(d.g, d.nm) + '\nprint(st.levene(*g, center="median"))   # Brown-Forsythe\n'; } });

  TESTS.bartlett = varTest({ nombre: 'Bartlett', corto: 'Bartlett', cuando: 'Compara varianzas de k grupos mediante la razón de verosimilitud. Es la más potente cuando los datos son normales, pero muy sensible a la no normalidad: úsela solo si ya verificó la normalidad en cada grupo.',
    supuestos: SUPV.concat(['Cada grupo debe provenir de una distribución normal; si no, la prueba rechaza con demasiada frecuencia.', 'Con duda sobre la normalidad use Brown-Forsythe o Fligner-Killeen.']),
    calc(d) { return V.bartlett(d.g); },
    render(d, r, a) { const t = concl(r.p, a, 'Hay evidencia de que al menos un grupo tiene una varianza distinta.', 'No hay evidencia suficiente de diferencias entre las varianzas.') + ' Recuerde que Bartlett exige normalidad en cada grupo.'; return finV(d, r, a, r.p, t, [{ n: 'T de Bartlett', v: fx(r.T, 3), s: 'gl = ' + r.df, main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Varianza combinada', v: fx(r.sp, 3), s: '' }], [['T de Bartlett', fx(r.T, 5)], ['gl', String(r.df)], ['Varianza combinada', fx(r.sp, 5)], ['Valor p', fpv(r.p)]], avRazon(r.grupos, r.ns).concat(['Bartlett depende de la normalidad: verifíquela en la pestaña «Normalidad» o «Supuestos».'])); },
    R(d) { return RGRP(d.g, d.nm) + '\nbartlett.test(valor ~ grupo)\n'; }, Py(d) { return PGRP(d.g, d.nm) + '\nprint(st.bartlett(*g))\n'; } });

  TESTS.fligner = varTest({ nombre: 'Fligner-Killeen', corto: 'Fligner-Killeen', cuando: 'Prueba no paramétrica de homogeneidad de varianzas basada en rangos de las desviaciones respecto de la mediana. Es la más robusta frente a la no normalidad y a los valores atípicos.',
    supuestos: SUPV.concat(['No exige normalidad; compara escalas, por lo que se asume que los grupos tienen la misma ubicación (se centra en la mediana de cada grupo).']),
    calc(d) { return V.fligner(d.g); },
    render(d, r, a) { const t = concl(r.p, a, 'Hay evidencia de que al menos un grupo tiene una dispersión distinta.', 'No hay evidencia suficiente de diferencias entre las varianzas.'); return finV(d, r, a, r.p, t, [{ n: 'X² de Fligner-Killeen', v: fx(r.X, 3), s: 'gl = ' + r.df, main: 1 }, { n: 'Valor p (χ²)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'Razón máx/mín', v: fx(razon(r.grupos), 2), s: 'de varianzas' }], [['X²', fx(r.X, 5)], ['gl', String(r.df)], ['Valor p', fpv(r.p)]], avRazon(r.grupos, r.ns)); },
    R(d) { return RGRP(d.g, d.nm) + '\nfligner.test(valor ~ grupo)\n'; }, Py(d) { return PGRP(d.g, d.nm) + '\nprint(st.fligner(*g, center="median"))\n'; } });

  // F de razón de varianzas (2 grupos)
  TESTS.ftest = varTest({ nombre: 'F de razón de varianzas (dos grupos)', corto: 'F (2 grupos)', cuando: 'Compara las varianzas de exactamente dos grupos mediante el cociente F = s₁² / s₂², con intervalo de confianza para la razón. Es el paso previo clásico a la t de Student para muestras independientes.',
    supuestos: SUPV.concat(['Ambos grupos deben provenir de distribuciones normales: la prueba F es muy sensible a la no normalidad (use Brown-Forsythe si dudan).']),
    campos: [Object.assign({}, GRUPOS, { max: 2, def: [{ n: 'Grupo 1', v: '' }, { n: 'Grupo 2', v: '' }] }), { id: 'alt', label: 'Hipótesis alternativa', type: 'sel', opts: [['two-sided', 'Bilateral (σ₁² ≠ σ₂²)'], ['greater', 'Unilateral (σ₁² > σ₂²)'], ['less', 'Unilateral (σ₁² < σ₂²)']], def: 'two-sided' }, { id: 'conf', label: 'Nivel de confianza del IC', type: 'sel', opts: [['0.9', '90 %'], ['0.95', '95 %'], ['0.99', '99 %']], def: '0.95' }],
    ejemplo: Object.assign({}, exVar2, { alt: 'two-sided', conf: '0.95' }),
    leer(v) { const q = leerGrupos(v.grp, 2); if (q.g.length !== 2) throw new Error('Esta prueba compara exactamente dos grupos. Para más grupos use Levene, Brown-Forsythe o Bartlett.'); return { g: q.g, nm: q.nombres, alt: v.alt || 'two-sided', conf: Number(v.conf) || 0.95 }; },
    calc(d) { return V.fTest(d.g[0], d.g[1], d.alt, d.conf); },
    render(d, r, a) {
      const gr = V.resumenGrupos(d.g), altT = { 'two-sided': 'las varianzas son distintas', greater: 'la varianza de ' + d.nm[0] + ' es mayor', less: 'la varianza de ' + d.nm[0] + ' es menor' }[r.alt];
      const t = concl(r.p, a, 'Hay evidencia de que ' + altT + '.', 'No hay evidencia suficiente de que ' + altT + '.') + ' Razón de varianzas s₁²/s₂² = ' + fx(r.F, 3) + ' (IC ' + fx(r.conf * 100, 0) + ' %: [' + fx(r.ic[0], 3) + '; ' + fx(r.ic[1], 3) + ']); si el intervalo contiene el 1, ambas varianzas son compatibles.';
      return { cards: [{ n: 'F = s₁² / s₂²', v: fx(r.F, 3), s: 'gl = ' + r.d1 + ', ' + r.d2, main: 1 }, { n: 'Valor p', v: fpv(r.p), s: decision(r.p, a) }, { n: 'IC ' + fx(r.conf * 100, 0) + ' % de la razón', v: '[' + fx(r.ic[0], 2) + '; ' + fx(r.ic[1], 2) + ']', s: '' }], tabla: tablaVar(d.nm, gr),
        resumen: [['n₁ / n₂', r.n1 + ' / ' + r.n2], ['Varianza 1', fx(r.v1, 5)], ['Varianza 2', fx(r.v2, 5)], ['F', fx(r.F, 5)], ['gl numerador / denominador', r.d1 + ' / ' + r.d2], ['Valor p', fpv(r.p)], ['IC de la razón', '[' + fx(r.ic[0], 4) + '; ' + fx(r.ic[1], 4) + ']']],
        h0: 'σ₁² = σ₂² (la razón de varianzas es 1).', h1: ({ 'two-sided': 'σ₁² ≠ σ₂².', greater: 'σ₁² > σ₂².', less: 'σ₁² < σ₂².' })[r.alt], interp: t, avisos: ['La prueba F es muy sensible a la no normalidad: si no está seguro de la normalidad, use Brown-Forsythe.'], grafico: gSD(d.nm, gr), grafico2: { tipo: 'tira', g: d.nm.map((n, i) => ({ n, v: d.g[i] })) }, datosTxt: datosG(d.nm, d.g), pDecision: r.p };
    },
    R(d) { return RGRP(d.g, d.nm) + '\nvar.test(valor ~ grupo, alternative = "' + ({ 'two-sided': 'two.sided', greater: 'greater', less: 'less' })[d.alt] + '", conf.level = ' + d.conf + ')\n'; },
    Py(d) { return PGRP(d.g, d.nm) + '\nfrom scipy.stats import f\na, b = g\nF = a.var(ddof=1) / b.var(ddof=1); d1, d2 = len(a) - 1, len(b) - 1\np = {"two-sided": 2 * min(f.cdf(F, d1, d2), f.sf(F, d1, d2)), "greater": f.sf(F, d1, d2), "less": f.cdf(F, d1, d2)}["' + d.alt + '"]\nprint("F =", F, " gl =", d1, d2, " p =", p)\nal = 1 - ' + d.conf + '\nprint("IC de la razón:", F / f.ppf(1 - al / 2, d1, d2), F / f.ppf(al / 2, d1, d2))   # IC bilateral\n'; } });

  // ───── Diagnóstico de supuestos del ANOVA ─────
  TESTS.diag = {
    tab: 'sup', nombre: 'Diagnóstico de supuestos del ANOVA', corto: 'Diagnóstico ANOVA', cuando: 'Revisa en un solo paso los dos supuestos de un ANOVA de un factor: normalidad de los residuales (Shapiro-Wilk y Q-Q sobre los residuales y por grupo) y homogeneidad de varianzas (Levene y Brown-Forsythe). Termina con una recomendación sobre la prueba a usar.',
    datos: 'Una variable cuantitativa medida en k ≥ 2 grupos independientes.',
    supuestos: ['Residual = valor − media de su grupo.', 'Los grupos pequeños (n < 8) dan poca potencia a las pruebas de normalidad: mire el gráfico.', 'Las pruebas de supuestos orientan, no sustituyen el criterio: con grupos balanceados el ANOVA es robusto.'],
    campos: [GRUPOS], ejemplo: exVar, leer(v) { const q = leerGrupos(v.grp, 2); q.g.forEach((g, i) => { if (g.length < 3) throw new Error(q.nombres[i] + ': se necesitan al menos 3 observaciones por grupo para este diagnóstico.'); }); return { g: q.g, nm: q.nombres }; },
    calc(d) {
      const res = [].concat.apply([], d.g.map(g => { const m = V.mean(g); return g.map(v => v - m); })), N = res.length;
      let sw = null; try { sw = V.shapiroWilk(res); } catch (e) { }
      const porG = d.g.map(g => { try { const r = V.shapiroWilk(g); return { W: r.W, p: r.p }; } catch (e) { return null; } });
      return { res, sw, porG, lev: V.levene(d.g, 'mean'), bf: V.levene(d.g, 'median'), gr: V.resumenGrupos(d.g), N };
    },
    render(d, r, a) {
      const nOk = r.sw && r.sw.p >= a, vOk = r.bf.p >= a, bal = Math.max.apply(null, r.gr.map(g => g.n)) / Math.min.apply(null, r.gr.map(g => g.n)) <= 1.5;
      let rec;
      if (nOk && vOk) rec = '<strong>Se cumplen ambos supuestos:</strong> el ANOVA clásico de un factor es apropiado.';
      else if (nOk && !vOk) rec = '<strong>Hay normalidad pero no homogeneidad de varianzas:</strong> use el ANOVA de Welch con comparaciones de Games-Howell' + (bal ? ' (con grupos balanceados el ANOVA clásico también tolera una heterogeneidad moderada).' : '.');
      else if (!nOk && vOk) rec = '<strong>Hay homogeneidad pero los residuales no son normales:</strong> si los grupos son grandes (n ≥ 30) el ANOVA es robusto; si no, use Kruskal-Wallis o transforme la variable (logaritmo, raíz cuadrada).';
      else rec = '<strong>No se cumple ninguno de los dos supuestos:</strong> use Kruskal-Wallis (o ANOVA de Welch con remuestreo/bootstrap) o transforme la variable.';
      const o = { cards: [{ n: 'Shapiro-Wilk (residuales)', v: r.sw ? fx(r.sw.W, 4) : '—', s: r.sw ? 'p = ' + fpv(r.sw.p) + ' · ' + (r.sw.p < a ? 'no normal' : 'compatible con normal') : '', main: 1 }, { n: 'Brown-Forsythe', v: fx(r.bf.W, 3), s: 'p = ' + fpv(r.bf.p) + ' · ' + (r.bf.p < a ? 'varianzas distintas' : 'varianzas homogéneas') }, { n: 'Levene (media)', v: fx(r.lev.W, 3), s: 'p = ' + fpv(r.lev.p) }],
        tabla: { cab: ['Grupo', 'n', 'Media', 'Desv. est.', 'Shapiro-Wilk W', 'p'], filas: d.nm.map((n, i) => [n, String(r.gr[i].n), fx(r.gr[i].media, 3), fx(r.gr[i].sd, 3), r.porG[i] ? fx(r.porG[i].W, 4) : '—', r.porG[i] ? fpv(r.porG[i].p) : '—']) },
        resumen: [['N', String(r.N)], ['Shapiro-Wilk de residuales W', r.sw ? fx(r.sw.W, 5) : '—'], ['p', r.sw ? fpv(r.sw.p) : '—'], ['Levene W (media)', fx(r.lev.W, 5)], ['p', fpv(r.lev.p)], ['Brown-Forsythe W (mediana)', fx(r.bf.W, 5)], ['p', fpv(r.bf.p)], ['Razón máx/mín de varianzas', fx(razon(r.gr), 3)]],
        sinHip: true, interp: rec + ' (α = ' + fx(a, 2) + '; razón de varianzas ' + fx(razon(r.gr), 2) + ').', avisos: r.gr.some(g => g.n < 8) ? ['Algún grupo tiene menos de 8 observaciones: las pruebas de normalidad por grupo tienen poca potencia.'] : [], grafico: gQQ(r.res), grafico2: gHist(r.res), datosTxt: datosG(d.nm, d.g), pDecision: null };
      return o;
    },
    R(d) { return RGRP(d.g, d.nm) + '\nmod <- aov(valor ~ grupo)\nshapiro.test(residuals(mod))\nqqnorm(residuals(mod)); qqline(residuals(mod))\n# install.packages("car")\ncar::leveneTest(valor ~ grupo, center = mean)\ncar::leveneTest(valor ~ grupo, center = median)   # Brown-Forsythe\n\n# Si no se cumplen los supuestos:\noneway.test(valor ~ grupo, var.equal = FALSE)   # ANOVA de Welch\nkruskal.test(valor ~ grupo)\n'; },
    Py(d) { return PGRP(d.g, d.nm) + '\nres = np.concatenate([v - v.mean() for v in g])\nprint("Shapiro (residuales):", st.shapiro(res))\nprint("Levene (media):", st.levene(*g, center="mean"))\nprint("Brown-Forsythe:", st.levene(*g, center="median"))\n\n# Si no se cumplen: Welch (pip install pingouin) o Kruskal-Wallis\nprint(st.kruskal(*g))\n'; }
  };

  const TABS = [
    { id: 'norm', nombre: 'Normalidad', corto: 'Normalidad', tests: ['panel', 'shapiro', 'ad', 'dagostino', 'jb', 'lillie'], desc: '¿Siguen los datos una distribución normal? Pruebas formales y gráfico Q-Q.' },
    { id: 'var', nombre: 'Varianzas', corto: 'Varianzas', tests: ['levene', 'bf', 'bartlett', 'fligner', 'ftest'], desc: '¿Tienen los grupos la misma varianza (homocedasticidad)?' },
    { id: 'sup', nombre: 'Supuestos del ANOVA', corto: 'Supuestos ANOVA', tests: ['diag'], desc: 'Normalidad de residuales y homogeneidad de varianzas en un solo diagnóstico, con recomendación.' }];
  return { TESTS, TABS, fx, fpv, num, rs, decision, concl, NOREJ: NOREJN, refs: REFS_N };
})();
