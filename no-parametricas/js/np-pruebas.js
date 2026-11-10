/* Definición de las pruebas (campos, lectura de datos, cálculo, interpretación y código R/Python) — Estadilab */
const NPP = (function () {
  'use strict';
  const M = NPM;
  const fx = (v, d = 3) => (typeof v === 'number' && isFinite(v)) ? v.toFixed(d).replace('.', ',') : '—';
  const fpv = p => (p == null || typeof p !== 'number' || isNaN(p)) ? '—' : (p < 0.0001 ? '< 0,0001' : p.toFixed(4).replace('.', ','));
  const num = v => (typeof v === 'number' && isFinite(v)) ? String(+v.toPrecision(12)) : 'NA';
  const rv = a => 'c(' + a.map(num).join(', ') + ')', pv = a => '[' + a.map(num).join(', ') + ']';
  const rs = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

  // ───────── lectura de datos ─────────
  function tokens(txt) {
    txt = String(txt || '').trim(); if (!txt) return [];
    let t = txt.split(/[\s;]+/).filter(Boolean);
    const comaDec = (/;|\n/.test(txt)) && t.every(k => /^-?\d+(,\d+)?$/.test(k)) && t.some(k => k.includes(','));
    if (comaDec) return t.map(k => k.replace(',', '.'));
    return txt.split(/[\s;,]+/).filter(Boolean);
  }
  function nums(txt, nombre, min) {
    const t = tokens(txt), out = [];
    for (const k of t) { const v = Number(k); if (!isFinite(v)) throw new Error('«' + k + '» no es un número válido en ' + nombre + '. Use punto como separador decimal.'); out.push(v); }
    if (out.length < (min || 1)) throw new Error(nombre + ': se necesitan al menos ' + (min || 1) + ' valores numéricos (hay ' + out.length + ').');
    return out;
  }
  const fmtList = (a, max = 60) => a.length > max ? a.slice(0, max).map(num).join(', ') + ', … (' + a.length + ' valores)' : a.map(num).join(', ');
  const decision = (p, a) => p < a ? 'Se rechaza H₀' : 'No se rechaza H₀';
  const concl = (p, a, si, no) => '<strong>' + decision(p, a) + '</strong> (p ' + (p < 0.0001 ? '< 0,0001' : '= ' + fpv(p)) + (p < a ? ' < ' : ' ≥ ') + fx(a, 2) + '). ' + (p < a ? si : no);
  const NOREJ = ' Esto no demuestra que H₀ sea cierta: solo indica que los datos no aportan evidencia suficiente en su contra (con muestras pequeñas la prueba tiene poca potencia).';
  const magn = (v, c) => { v = Math.abs(v); return v < c[0] ? 'muy pequeño' : v < c[1] ? 'pequeño' : v < c[2] ? 'mediano' : 'grande'; };

  const ALT = [['two-sided', 'Bilateral (≠)'], ['greater', 'Unilateral (>)'], ['less', 'Unilateral (<)']];
  const GRP = [{ id: 'gA', label: 'Grupo A', type: 'ta', ph: 'Ej: 12, 15, 11, 18, 20, 14, 16', req: true }, { id: 'gB', label: 'Grupo B', type: 'ta', ph: 'Ej: 22, 25, 19, 28, 24, 21, 30', req: true }];
  const nombreGrupos = v => [(v.nA || 'Grupo A').trim() || 'Grupo A', (v.nB || 'Grupo B').trim() || 'Grupo B'];
  const GRPN = [{ id: 'nA', label: 'Nombre del grupo A', type: 'txt', def: 'Grupo A' }, { id: 'nB', label: 'Nombre del grupo B', type: 'txt', def: 'Grupo B' }];

  const TESTS = {};

  // ══════════ 1.1 Ji-cuadrado de bondad de ajuste ══════════
  TESTS.chi2 = {
    tab: 'una', nombre: 'Ji-cuadrado de bondad de ajuste', corto: 'χ² bondad de ajuste', cuando: 'Compara las frecuencias observadas de una variable categórica con las que se esperarían bajo una distribución teórica (por ejemplo, proporciones iguales).',
    datos: 'Categorías nominales u ordinales, con conteos. No requiere normalidad.',
    supuestos: ['Observaciones independientes y cada una en una sola categoría.', 'Frecuencias esperadas ≥ 5 en al menos el 80 % de las categorías y ninguna menor que 1.', 'Los datos son conteos, no porcentajes.'],
    campos: [
      { id: 'modo', label: 'Formato de los datos', type: 'sel', opts: [['frec', 'Frecuencias por categoría'], ['crudo', 'Datos sin resumir (una etiqueta por observación)']], def: 'frec' },
      { id: 'obs', label: 'Datos', type: 'ta', ph: 'Frecuencias: 18 25 16 22 28 11\nTambién con etiquetas: Rojo:18 Azul:25 Verde:16', req: true },
      { id: 'esp', label: 'Esperadas (opcional)', type: 'ta', ph: 'Vacío = categorías con igual probabilidad. Escriba proporciones (0.5 0.3 0.2) o frecuencias esperadas.', rows: 2 },
      { id: 'ddof', label: 'Parámetros estimados de los datos', type: 'num', def: 0, min: 0, hint: 'Se resta de los grados de libertad (0 si la distribución esperada está fijada de antemano).' }],
    ejemplo: { modo: 'frec', obs: 'Cara1:18 Cara2:25 Cara3:16 Cara4:22 Cara5:28 Cara6:11', esp: '', ddof: 0 },
    leer(v) {
      let etiq = [], obs = [];
      if (v.modo === 'crudo') { const t = String(v.obs).split(/[\n;,]+/).map(s => s.trim()).filter(Boolean); if (t.length < 5) throw new Error('Escriba las observaciones separadas por comas, punto y coma o saltos de línea.'); const m = new Map(); t.forEach(k => m.set(k, (m.get(k) || 0) + 1)); m.forEach((c, k) => { etiq.push(k); obs.push(c); }); }
      else { const t = tokens(v.obs); if (t.length < 2) throw new Error('Escriba al menos 2 frecuencias.'); t.forEach((k, i) => { const mm = k.match(/^(.*?):(-?[\d.]+)$/); if (mm) { etiq.push(mm[1] || ('Cat. ' + (i + 1))); obs.push(Number(mm[2])); } else { const n = Number(k); if (!isFinite(n)) throw new Error('«' + k + '» no es una frecuencia válida.'); etiq.push('Cat. ' + (i + 1)); obs.push(n); } }); }
      if (obs.some(o => o !== Math.floor(o))) throw new Error('Las frecuencias observadas deben ser números enteros (conteos).');
      const esp = tokens(v.esp).length ? nums(v.esp, 'las esperadas') : null;
      return { etiq, obs, esp, ddof: Math.max(0, Math.round(Number(v.ddof) || 0)) };
    },
    calc(d) { return M.chi2gof(d.obs, d.esp, d.ddof); },
    render(d, r, a) {
      const nom = d.etiq, filas = nom.map((e, i) => [e, String(r.obs[i]), fx(r.expected[i], 2), fx(r.resid[i], 2), fx(r.stdResid[i], 2)]);
      const grandes = nom.filter((e, i) => Math.abs(r.stdResid[i]) > 1.96);
      let t = concl(r.p, a, 'Las frecuencias observadas difieren significativamente de las esperadas bajo la distribución planteada.', 'Los datos son compatibles con la distribución planteada.' + NOREJ);
      t += ' Tamaño del efecto: w de Cohen = ' + fx(r.w, 3) + ' (' + magn(r.w, [0.1, 0.3, 0.5]) + ').';
      if (r.p < a && grandes.length) t += ' Categorías que más se apartan de lo esperado (|residuo estandarizado| > 1,96): ' + grandes.join(', ') + '.';
      const avisos = []; if (r.pctMenos5 > 0.2 || r.minE < 1) avisos.push('El ' + Math.round(r.pctMenos5 * 100) + ' % de las categorías tiene frecuencia esperada menor que 5 (mínima ' + fx(r.minE, 2) + '). La aproximación χ² puede no ser fiable: agrupe categorías o use simulación (R: chisq.test(..., simulate.p.value = TRUE)).');
      return { cards: [{ n: 'χ²', v: fx(r.stat, 3), s: 'gl = ' + r.df, main: 1 }, { n: 'Valor p', v: fpv(r.p), s: decision(r.p, a) }, { n: 'w de Cohen', v: fx(r.w, 3), s: magn(r.w, [0.1, 0.3, 0.5]) }],
        tabla: { cab: ['Categoría', 'Observada', 'Esperada', 'Residuo', 'Res. estand.'], filas }, resumen: [['n', String(r.n)], ['Categorías', String(r.k)], ['χ²', fx(r.stat, 4)], ['gl', String(r.df)], ['Valor p', fpv(r.p)], ['w de Cohen', fx(r.w, 4)]],
        h0: 'Las frecuencias de la población siguen la distribución esperada.', h1: 'Al menos una categoría se aparta de lo esperado.', interp: t, avisos, grafico: { tipo: 'barras', etiquetas: nom, a: r.obs, b: r.expected.map(e => +e.toFixed(3)), la: 'Observada', lb: 'Esperada' }, datosTxt: nom.map((e, i) => e + ': ' + r.obs[i]).join(' · ') };
    },
    R(d, r) { const p = d.esp ? '\np_esp <- ' + rv(d.esp) + '\nchisq.test(x = obs, p = p_esp / sum(p_esp))' : '\nchisq.test(x = obs)   # igual probabilidad para todas las categorías'; return 'obs <- ' + rv(d.obs) + p + (d.ddof ? '\n# Con ' + d.ddof + ' parámetro(s) estimado(s): gl = k - 1 - ' + d.ddof + '\nest <- chisq.test(obs, p = ' + (d.esp ? 'p_esp / sum(p_esp)' : 'rep(1/length(obs), length(obs))') + ')$statistic\npchisq(est, df = length(obs) - 1 - ' + d.ddof + ', lower.tail = FALSE)' : '') + '\n\n# Residuos estandarizados\nchisq.test(obs' + (d.esp ? ', p = p_esp / sum(p_esp)' : '') + ')$stdres\n'; },
    Py(d, r) { return 'import numpy as np\nfrom scipy import stats as st\n\nobs = np.array(' + pv(d.obs) + ')\n' + (d.esp ? 'esp = np.array(' + pv(d.esp) + ')\nesp = esp / esp.sum() * obs.sum()\n' : 'esp = np.full(len(obs), obs.sum() / len(obs))   # igual probabilidad\n') + 'res = st.chisquare(f_obs=obs, f_exp=esp, ddof=' + d.ddof + ')\nprint(res)\n\n# Residuos de Pearson y w de Cohen\nprint((obs - esp) / np.sqrt(esp))\nprint("w =", np.sqrt(res.statistic / obs.sum()))\n'; }
  };

  // ══════════ 1.2 Binomial ══════════
  TESTS.binomial = {
    tab: 'una', nombre: 'Prueba binomial', corto: 'Binomial', cuando: 'Contrasta si la proporción de «éxitos» de una variable dicotómica es igual a un valor hipotético p₀ (prueba exacta, válida con muestras pequeñas).',
    datos: 'Variable dicotómica (sí/no, 0/1) o un conteo de éxitos sobre n ensayos.',
    supuestos: ['Cada observación tiene solo dos resultados posibles.', 'Observaciones independientes con la misma probabilidad de éxito.', 'Es una prueba exacta: no exige tamaño de muestra mínimo.'],
    campos: [
      { id: 'modo', label: 'Formato de los datos', type: 'sel', opts: [['conteo', 'Éxitos y tamaño de muestra'], ['bin', 'Datos 0/1 (1 = éxito)'], ['corte', 'Datos numéricos con punto de corte']], def: 'conteo' },
      { id: 'x', label: 'Número de éxitos', type: 'num', def: '', min: 0, show: v => v.modo === 'conteo' },
      { id: 'n', label: 'Tamaño de muestra (n)', type: 'num', def: '', min: 1, show: v => v.modo === 'conteo' },
      { id: 'datos', label: 'Datos', type: 'ta', ph: 'Ej: 1 0 1 1 0 1 1 1 0 1', show: v => v.modo !== 'conteo' },
      { id: 'corte', label: 'Punto de corte (éxito = valor > corte)', type: 'num', def: '', show: v => v.modo === 'corte' },
      { id: 'p0', label: 'Proporción hipotética p₀', type: 'num', def: 0.5, step: 'any' },
      { id: 'alt', label: 'Hipótesis alternativa', type: 'sel', opts: ALT, def: 'two-sided' }],
    ejemplo: { modo: 'conteo', x: 15, n: 20, p0: 0.5, alt: 'two-sided' },
    leer(v) {
      let x, n;
      if (v.modo === 'conteo') { x = Number(v.x); n = Number(v.n); if (v.x === '' || v.n === '' || !isFinite(x) || !isFinite(n)) throw new Error('Escriba el número de éxitos y el tamaño de muestra.'); }
      else { const t = nums(v.datos, 'los datos', 2); if (v.modo === 'corte') { const c = Number(v.corte); if (v.corte === '' || !isFinite(c)) throw new Error('Escriba el punto de corte.'); x = t.filter(k => k > c).length; } else { if (t.some(k => k !== 0 && k !== 1)) throw new Error('En el formato 0/1 todos los valores deben ser 0 o 1.'); x = t.filter(k => k === 1).length; } n = t.length; }
      const p0 = Number(v.p0); return { x, n, p0, alt: v.alt || 'two-sided' };
    },
    calc(d) { return M.binomTest(d.x, d.n, d.p0, d.alt); },
    render(d, r, a) {
      const altT = { 'two-sided': 'la proporción poblacional es distinta de ' + fx(r.p0, 3), greater: 'la proporción poblacional es mayor que ' + fx(r.p0, 3), less: 'la proporción poblacional es menor que ' + fx(r.p0, 3) }[r.alt];
      let t = concl(r.p, a, 'Hay evidencia de que ' + altT + '.', 'No hay evidencia suficiente de que ' + altT + '.' + NOREJ);
      t += ' La proporción muestral es ' + fx(r.phat, 4) + ' (' + r.x + ' de ' + r.n + ') y su intervalo de confianza exacto de Clopper-Pearson al 95 % es [' + fx(r.ic[0], 4) + '; ' + fx(r.ic[1], 4) + '].';
      const avisos = []; if (r.exactoAprox === 'aprox') avisos.push('Con n tan grande se usó la aproximación normal para el valor p bilateral.');
      const kmin = Math.max(0, Math.floor(r.n * r.p0 - 4 * Math.sqrt(r.n * r.p0 * (1 - r.p0)) - 2)), kmax = Math.min(r.n, Math.ceil(r.n * r.p0 + 4 * Math.sqrt(r.n * r.p0 * (1 - r.p0)) + 2));
      const ks = [], pm = []; for (let k = kmin; k <= kmax; k++) { ks.push(String(k)); pm.push(+M.binomPmf(k, r.n, r.p0).toFixed(6)); }
      return { cards: [{ n: 'Proporción muestral', v: fx(r.phat, 4), s: r.x + ' éxitos de ' + r.n, main: 1 }, { n: 'Valor p (exacto)', v: fpv(r.p), s: decision(r.p, a) }, { n: 'IC 95 % (Clopper-Pearson)', v: '[' + fx(r.ic[0], 3) + '; ' + fx(r.ic[1], 3) + ']', s: 'p₀ ' + (r.p0 >= r.ic[0] && r.p0 <= r.ic[1] ? 'dentro' : 'fuera') + ' del intervalo' }],
        tabla: null, resumen: [['Éxitos', String(r.x)], ['n', String(r.n)], ['p̂', fx(r.phat, 4)], ['p₀', fx(r.p0, 4)], ['Alternativa', ({ 'two-sided': 'p ≠ p₀', greater: 'p > p₀', less: 'p < p₀' })[r.alt]], ['Valor p exacto', fpv(r.p)], ['IC 95 %', '[' + fx(r.ic[0], 4) + '; ' + fx(r.ic[1], 4) + ']']],
        h0: 'La proporción poblacional de éxitos es p₀ = ' + fx(r.p0, 3) + '.', h1: ({ 'two-sided': 'p ≠ p₀', greater: 'p > p₀', less: 'p < p₀' })[r.alt] + '.', interp: t, avisos, grafico: { tipo: 'binom', etiquetas: ks, a: pm, obs: r.x, kmin }, datosTxt: r.x + ' éxitos de ' + r.n };
    },
    R(d) { return '# Prueba binomial exacta\nbinom.test(x = ' + d.x + ', n = ' + d.n + ', p = ' + num(d.p0) + ', alternative = "' + d.alt + '", conf.level = 0.95)\n'; },
    Py(d) { return 'from scipy.stats import binomtest\n\nres = binomtest(k=' + d.x + ', n=' + d.n + ', p=' + num(d.p0) + ', alternative="' + d.alt + '")\nprint("valor p:", res.pvalue)\nprint("IC 95 % (Clopper-Pearson):", res.proportion_ci(confidence_level=0.95, method="exact"))\n'; }
  };

  // ══════════ 1.3 Rachas ══════════
  TESTS.rachas = {
    tab: 'una', nombre: 'Prueba de rachas (aleatoriedad)', corto: 'Rachas', cuando: 'Comprueba si una secuencia de valores, en el orden en que se obtuvieron, es aleatoria o presenta tendencia, ciclos o agrupamientos.',
    datos: 'Valores numéricos en orden de observación (la prueba los dicotomiza respecto a un punto de corte).',
    supuestos: ['El orden de los datos es el orden real de obtención.', 'Se dicotomiza con un punto de corte; los valores iguales al corte se asignan al grupo «≥ corte».', 'Con n₁ o n₂ menores que 10–20 conviene el valor p exacto.'],
    campos: [
      { id: 'datos', label: 'Secuencia de datos (en orden)', type: 'ta', ph: 'Ej: 12 15 11 18 20 17 14 22 25 19 23 28', req: true },
      { id: 'corte', label: 'Punto de corte', type: 'sel', opts: [['median', 'Mediana'], ['mean', 'Media'], ['mode', 'Moda'], ['custom', 'Otro valor…']], def: 'median' },
      { id: 'cv', label: 'Valor del punto de corte', type: 'num', def: '', step: 'any', show: v => v.corte === 'custom' }],
    ejemplo: { datos: '12 15 11 18 20 17 14 22 25 19 23 28 26 30 27 33 29 35 31 38', corte: 'median' },
    leer(v) { return { x: nums(v.datos, 'la secuencia', 5), corte: v.corte, cv: v.cv === '' ? NaN : Number(v.cv) }; },
    calc(d) { return M.runsOne(d.x, d.corte, d.cv); },
    render(d, r, a) {
      const p = r.pExacto; let t = concl(p, a, r.R < r.mu ? 'Hay menos rachas de las esperadas por azar: la secuencia presenta agrupamientos o tendencia.' : 'Hay más rachas de las esperadas por azar: la secuencia alterna con demasiada frecuencia (oscilación).', 'No hay evidencia de que la secuencia se aparte de la aleatoriedad.' + NOREJ);
      t += ' Se observaron R = ' + r.R + ' rachas (esperadas: ' + fx(r.mu, 2) + ').';
      const avisos = []; if (Math.min(r.n1, r.n2) < 10) avisos.push('Un grupo tiene menos de 10 observaciones (n₁ = ' + r.n1 + ', n₂ = ' + r.n2 + '): use el valor p exacto, la aproximación normal es poco fiable.');
      return { cards: [{ n: 'Rachas (R)', v: String(r.R), s: 'esperadas ' + fx(r.mu, 2), main: 1 }, { n: 'Valor p exacto', v: fpv(r.pExacto), s: decision(r.pExacto, a) }, { n: 'Valor p asintótico', v: fpv(r.pAsin), s: 'Z = ' + fx(r.z, 3) }],
        tabla: null, resumen: [['n', String(r.n)], ['Punto de corte', fx(r.cut, 4)], ['n₁ (≥ corte)', String(r.n1)], ['n₂ (< corte)', String(r.n2)], ['Rachas observadas', String(r.R)], ['Rachas esperadas', fx(r.mu, 3)], ['Z', fx(r.z, 4)], ['p asintótico', fpv(r.pAsin)], ['p asintótico (corr. continuidad)', fpv(r.pAsinC)], ['p exacto', fpv(r.pExacto)]],
        h0: 'La secuencia es aleatoria.', h1: 'La secuencia no es aleatoria.', interp: t, avisos, grafico: { tipo: 'secuencia', ind: r.ind, x: d.x, cut: r.cut, ea: '≥ corte', eb: '< corte' }, datosTxt: fmtList(d.x) };
    },
    R(d, r) { return 'x <- ' + rv(d.x) + '\ncorte <- ' + num(r.cut) + '   # ' + ({ median: 'mediana', mean: 'media', mode: 'moda', custom: 'valor elegido' })[d.corte] + '\nind <- factor(x >= corte)       # ≥ corte vs < corte\n\n# install.packages("tseries")\nlibrary(tseries)\nruns.test(ind)                  # Z asintótico, bilateral\n\n# Valor p exacto (distribución de rachas)\nn1 <- sum(x >= corte); n2 <- sum(x < corte); R <- 1 + sum(diff(as.integer(x >= corte)) != 0)\ndrachas <- function(r, n1, n2) {\n  tot <- choose(n1 + n2, n1)\n  if (r %% 2 == 0) { k <- r / 2; 2 * choose(n1 - 1, k - 1) * choose(n2 - 1, k - 1) / tot }\n  else { k <- (r - 1) / 2; (choose(n1 - 1, k) * choose(n2 - 1, k - 1) + choose(n1 - 1, k - 1) * choose(n2 - 1, k)) / tot }\n}\nf <- sapply(2:(n1 + n2), drachas, n1 = n1, n2 = n2)\nmin(1, 2 * min(sum(f[1:(R - 1)]), sum(f[(R - 1):length(f)])))\n'; },
    Py(d, r) { return 'import numpy as np\nfrom statsmodels.sandbox.stats.runs import runstest_1samp\n\nx = np.array(' + pv(d.x) + ')\ncorte = ' + num(r.cut) + '   # ' + ({ median: 'mediana', mean: 'media', mode: 'moda', custom: 'valor elegido' })[d.corte] + '\nz, p = runstest_1samp(x, cutoff=corte, correction=False)   # Z asintótico, bilateral\nprint("Z =", z, " p =", p)\n\n# Valor p exacto\nfrom math import comb\nind = (x >= corte).astype(int); n1, n2 = ind.sum(), (1 - ind).sum()\nR = 1 + int((np.diff(ind) != 0).sum())\ndef pmf(r):\n    tot = comb(n1 + n2, n1)\n    if r % 2 == 0:\n        k = r // 2; return 2 * comb(n1 - 1, k - 1) * comb(n2 - 1, k - 1) / tot\n    k = (r - 1) // 2; return (comb(n1 - 1, k) * comb(n2 - 1, k - 1) + comb(n1 - 1, k - 1) * comb(n2 - 1, k)) / tot\nf = [pmf(r) for r in range(2, n1 + n2 + 1)]\nprint("p exacto =", min(1, 2 * min(sum(f[:R - 1]), sum(f[R - 2:]))))\n'; }
  };

  // ══════════ 1.4 Kolmogorov-Smirnov (una muestra) ══════════
  TESTS.ks1 = {
    tab: 'una', nombre: 'Kolmogorov-Smirnov (una muestra)', corto: 'K-S una muestra', cuando: 'Contrasta si una variable continua sigue una distribución teórica (normal, uniforme o exponencial) comparando la función de distribución empírica con la teórica.',
    datos: 'Variable cuantitativa continua.',
    supuestos: ['Datos continuos e independientes.', 'La distribución teórica debe estar especificada de antemano.', 'Si sus parámetros se estiman con la misma muestra, el valor p de K-S es demasiado conservador: use la corrección de Lilliefors.'],
    campos: [
      { id: 'datos', label: 'Datos', type: 'ta', ph: 'Ej: 4.2 5.1 5.8 4.9 6.3 5.5 7.1 5.0', req: true },
      { id: 'dist', label: 'Distribución teórica', type: 'sel', opts: [['norm', 'Normal'], ['unif', 'Uniforme'], ['exp', 'Exponencial']], def: 'norm' },
      { id: 'mu', label: 'Media μ (vacío = estimar)', type: 'num', def: '', step: 'any', show: v => v.dist === 'norm' },
      { id: 'sd', label: 'Desv. estándar σ (vacío = estimar)', type: 'num', def: '', step: 'any', show: v => v.dist === 'norm' },
      { id: 'a', label: 'Mínimo a (vacío = mínimo de los datos)', type: 'num', def: '', step: 'any', show: v => v.dist === 'unif' },
      { id: 'b', label: 'Máximo b (vacío = máximo de los datos)', type: 'num', def: '', step: 'any', show: v => v.dist === 'unif' },
      { id: 'media', label: 'Media (vacío = estimar)', type: 'num', def: '', step: 'any', show: v => v.dist === 'exp' },
      { id: 'alt', label: 'Hipótesis alternativa', type: 'sel', opts: [['two-sided', 'Bilateral'], ['greater', 'Unilateral: F empírica > teórica'], ['less', 'Unilateral: F empírica < teórica']], def: 'two-sided' }],
    ejemplo: { datos: '4.2 5.1 5.8 4.9 6.3 5.5 7.1 5.0 4.4 6.0 5.7 6.8 5.2 4.8 9.5 5.4 5.9 6.1 4.6 5.3', dist: 'norm', mu: '', sd: '', alt: 'two-sided' },
    leer(v) { const o = x => (x === '' || x == null) ? NaN : Number(x); return { x: nums(v.datos, 'los datos', 3), dist: v.dist, par: { mu: o(v.mu), sd: o(v.sd), a: o(v.a), b: o(v.b), media: o(v.media) }, alt: v.alt }; },
    calc(d) { return M.ks1(d.x, d.dist, d.par, d.alt, true); },
    render(d, r, a) {
      const nm = { norm: 'normal', unif: 'uniforme', exp: 'exponencial' }[r.dist], pr = r.dist === 'norm' ? 'μ = ' + fx(r.par.mu, 4) + ', σ = ' + fx(r.par.sd, 4) : r.dist === 'unif' ? 'a = ' + fx(r.par.a, 4) + ', b = ' + fx(r.par.b, 4) : 'media = ' + fx(r.par.media, 4);
      const pFin = (r.lillie ? r.lillie.p : r.p);
      let t = r.estimados && r.lillie
        ? concl(pFin, a, 'Los datos no siguen una distribución ' + nm + ' (prueba de Lilliefors, que corrige por haber estimado los parámetros).', 'Los datos son compatibles con una distribución ' + nm + '.' + NOREJ) + ' El valor p de K-S sin corregir (' + fpv(r.p) + ') sería demasiado alto porque los parámetros salieron de la misma muestra; por eso la decisión se basa en Lilliefors.'
        : concl(r.p, a, 'Los datos no siguen la distribución ' + nm + ' especificada (' + pr + ').', 'Los datos son compatibles con la distribución ' + nm + ' especificada (' + pr + ').' + NOREJ);
      t += ' Estadístico D = ' + fx(r.Dusado, 4) + '.';
      const avisos = []; if (r.estimados && !r.lillie) avisos.push('Los parámetros se estimaron de la muestra: el valor p de K-S es conservador. La corrección de Lilliefors solo está disponible para el contraste bilateral con la normal o la exponencial.');
      const cards = [{ n: 'D de Kolmogorov-Smirnov', v: fx(r.Dusado, 4), s: 'n = ' + r.n, main: 1 }, { n: r.estimados && r.lillie ? 'Valor p (Lilliefors)' : 'Valor p (' + r.metodo + ')', v: fpv(pFin), s: decision(pFin, a) }];
      if (r.estimados && r.lillie) cards.push({ n: 'Valor p K-S sin corregir', v: fpv(r.p), s: 'conservador' }); else cards.push({ n: 'D⁺ / D⁻', v: fx(r.Dmas, 3) + ' / ' + fx(r.Dmenos, 3), s: 'máx. diferencias' });
      const filasR = [['n', String(r.n)], ['Distribución', nm + ' (' + pr + ')'], ['Parámetros', r.estimados ? 'estimados de la muestra' : 'especificados'], ['D', fx(r.D, 5)], ['D⁺', fx(r.Dmas, 5)], ['D⁻', fx(r.Dmenos, 5)], ['p (K-S ' + r.metodo + ')', fpv(r.p)]]; if (r.lillie) filasR.push(['p (Lilliefors, Monte Carlo ' + r.lillie.B + ' sim.)', fpv(r.lillie.p)]);
      return { cards, tabla: null, resumen: filasR, h0: 'Los datos provienen de una distribución ' + nm + (r.estimados ? '' : ' (' + pr + ')') + '.', h1: 'Los datos no provienen de esa distribución.', interp: t, avisos, grafico: { tipo: 'ecdf1', x: Array.from(d.x).sort((p, q) => p - q), dist: r.dist, par: r.par }, datosTxt: fmtList(d.x), pDecision: pFin };
    },
    R(d, r) { const nm = { norm: 'pnorm', unif: 'punif', exp: 'pexp' }[r.dist]; const args = r.dist === 'norm' ? ', mean = ' + num(r.par.mu) + ', sd = ' + num(r.par.sd) : r.dist === 'unif' ? ', min = ' + num(r.par.a) + ', max = ' + num(r.par.b) : ', rate = ' + num(1 / r.par.media); return 'x <- ' + rv(d.x) + '\nks.test(x, "' + nm + '"' + args + ', alternative = "' + ({ 'two-sided': 'two.sided', greater: 'greater', less: 'less' })[d.alt] + '", exact = TRUE)\n' + (r.estimados && r.dist === 'norm' ? '\n# Parámetros estimados de la muestra → corrección de Lilliefors\n# install.packages("nortest")\nnortest::lillie.test(x)\n' : ''); },
    Py(d, r) { const f = r.dist === 'norm' ? 'st.norm(loc=' + num(r.par.mu) + ', scale=' + num(r.par.sd) + ')' : r.dist === 'unif' ? 'st.uniform(loc=' + num(r.par.a) + ', scale=' + num(r.par.b - r.par.a) + ')' : 'st.expon(scale=' + num(r.par.media) + ')'; return 'import numpy as np\nfrom scipy import stats as st\n\nx = np.array(' + pv(d.x) + ')\nres = st.kstest(x, ' + f + '.cdf, alternative="' + ({ 'two-sided': 'two-sided', greater: 'greater', less: 'less' })[d.alt] + '", method="exact")\nprint(res)\n' + (r.estimados && (r.dist === 'norm' || r.dist === 'exp') ? '\n# Parámetros estimados de la muestra → corrección de Lilliefors\nfrom statsmodels.stats.diagnostic import lilliefors\nprint(lilliefors(x, dist="' + (r.dist === 'norm' ? 'norm' : 'exp') + '"))\n' : ''); }
  };

  // ══════════ 2.1 Mann-Whitney ══════════
  TESTS.mw = {
    tab: 'dos', nombre: 'U de Mann-Whitney', corto: 'Mann-Whitney U', cuando: 'Compara dos grupos independientes cuando la variable es ordinal o cuantitativa sin normalidad. Alternativa a la t de Student para muestras independientes.',
    datos: 'Variable ordinal o cuantitativa medida en dos grupos independientes.',
    supuestos: ['Observaciones independientes dentro y entre grupos.', 'Variable al menos ordinal.', 'Para interpretar el resultado como diferencia de medianas, las dos distribuciones deben tener forma similar; si no, indica que un grupo tiende a dar valores mayores (P(X > Y) ≠ 0,5).'],
    campos: [].concat(GRP, GRPN, [{ id: 'alt', label: 'Hipótesis alternativa', type: 'sel', opts: [['two-sided', 'Bilateral (A ≠ B)'], ['greater', 'Unilateral (A > B)'], ['less', 'Unilateral (A < B)']], def: 'two-sided' }]),
    ejemplo: { gA: '12 15 11 18 20 14 16 13 19 17', gB: '15.5 25 29 14.5 24 21 30 19.5 26 27 31', nA: 'Tratamiento A', nB: 'Tratamiento B', alt: 'two-sided' },
    leer(v) { const [na, nb] = nombreGrupos(v); return { x: nums(v.gA, na, 2), y: nums(v.gB, nb, 2), na, nb, alt: v.alt }; },
    calc(d) { return M.mannWhitney(d.x, d.y, d.alt); },
    render(d, r, a) {
      const p = r.pExacto != null ? r.pExacto : r.pAsin, metodo = r.pExacto != null ? 'exacto' : 'asintótico (con corrección por continuidad y por empates)';
      const mayor = r.U1 > r.U2 ? d.na : d.nb, ef = Math.abs(r.rangoBiserial);
      const altT = { 'two-sided': 'las distribuciones de ' + d.na + ' y ' + d.nb + ' difieren', greater: d.na + ' tiende a dar valores mayores que ' + d.nb, less: d.na + ' tiende a dar valores menores que ' + d.nb }[r.alt];
      let t = concl(p, a, 'Hay evidencia de que ' + altT + (r.alt === 'two-sided' ? '; los valores de ' + mayor + ' tienden a ser mayores.' : '.'), 'No hay evidencia suficiente de que ' + altT + '.' + NOREJ);
      t += ' Tamaño del efecto: correlación biserial de rangos r = ' + fx(r.rangoBiserial, 3) + ' (' + magn(ef, [0.1, 0.3, 0.5]) + '); probabilidad de superioridad P(' + d.na + ' > ' + d.nb + ') = ' + fx(r.cles, 3) + '. Estimador de Hodges-Lehmann de la diferencia de posición (' + d.na + ' − ' + d.nb + ') = ' + fx(r.hl, 3) + '.';
      const avisos = []; if (r.hayEmpates) avisos.push('Hay valores empatados: se usó la aproximación normal con corrección por empates (no hay valor p exacto).'); if (r.pExacto == null && !r.hayEmpates) avisos.push('Los grupos son grandes: se usó la aproximación normal.');
      return { cards: [{ n: 'U (' + d.na + ')', v: fx(r.U1, 1), s: 'U₂ = ' + fx(r.U2, 1), main: 1 }, { n: 'Valor p (' + (r.pExacto != null ? 'exacto' : 'asintótico') + ')', v: fpv(p), s: decision(p, a) }, { n: 'r biserial de rangos', v: fx(r.rangoBiserial, 3), s: magn(ef, [0.1, 0.3, 0.5]) }],
        tabla: { cab: ['Grupo', 'n', 'Mediana', 'Rango medio', 'Suma de rangos'], filas: [[d.na, String(r.n1), fx(r.medX, 3), fx(r.mediaRangoX, 2), fx(r.R1, 1)], [d.nb, String(r.n2), fx(r.medY, 3), fx(r.mediaRangoY, 2), fx(r.R2, 1)]] },
        resumen: [['n₁ / n₂', r.n1 + ' / ' + r.n2], ['U₁ (' + d.na + ')', fx(r.U1, 2)], ['U₂ (' + d.nb + ')', fx(r.U2, 2)], ['Z', fx(r.z, 4)], ['Z (con corr. continuidad)', fx(r.zc, 4)], ['p asintótico', fpv(r.pAsin)], ['p exacto', r.pExacto != null ? fpv(r.pExacto) : 'no disponible (empates o n grande)'], ['r biserial de rangos', fx(r.rangoBiserial, 4)], ['P(A > B)', fx(r.cles, 4)], ['Hodges-Lehmann (A − B)', fx(r.hl, 4)], ['Alternativa', r.alt]],
        h0: 'Las distribuciones de los dos grupos son iguales (P(A > B) = 0,5).', h1: ({ 'two-sided': 'Las distribuciones difieren.', greater: 'A tiende a dar valores mayores que B.', less: 'A tiende a dar valores menores que B.' })[r.alt], interp: t, avisos, grafico: { tipo: 'tira', g: [{ n: d.na, v: d.x }, { n: d.nb, v: d.y }] }, datosTxt: d.na + ': ' + fmtList(d.x, 30) + ' | ' + d.nb + ': ' + fmtList(d.y, 30), pDecision: p };
    },
    R(d) { return 'a <- ' + rv(d.x) + '\nb <- ' + rv(d.y) + '\n\nwilcox.test(a, b, alternative = "' + ({ 'two-sided': 'two.sided', greater: 'greater', less: 'less' })[d.alt] + '", exact = ' + (new Set(d.x.concat(d.y)).size === d.x.length + d.y.length ? 'TRUE' : 'FALSE') + ', correct = TRUE, conf.int = TRUE)\n# W en R = U de la primera muestra; la estimación es de Hodges-Lehmann\n\n# Tamaño del efecto: r biserial de rangos\nU <- unname(wilcox.test(a, b)$statistic)\n2 * U / (length(a) * length(b)) - 1\n'; },
    Py(d) { const exact = new Set(d.x.concat(d.y)).size === d.x.length + d.y.length; return 'import numpy as np\nfrom scipy import stats as st\n\na = np.array(' + pv(d.x) + ')\nb = np.array(' + pv(d.y) + ')\n\nres = st.mannwhitneyu(a, b, alternative="' + d.alt + '", method="' + (exact ? 'exact' : 'asymptotic') + '"' + (exact ? '' : ', use_continuity=True') + ')\nprint(res)   # U es el de la primera muestra\n\n# Tamaño del efecto: r biserial de rangos\nprint("r =", 2 * res.statistic / (len(a) * len(b)) - 1)\n# Estimador de Hodges-Lehmann\nprint("HL =", np.median(np.subtract.outer(a, b)))\n'; }
  };

  // ══════════ 2.2 Moses ══════════
  TESTS.moses = {
    tab: 'dos', nombre: 'Reacciones extremas de Moses', corto: 'Moses', cuando: 'Contrasta si un tratamiento produce reacciones extremas (en cualquier dirección) en el grupo experimental respecto al grupo de control; es una prueba de dispersión.',
    datos: 'Variable al menos ordinal en un grupo de control y un grupo experimental.',
    supuestos: ['Muestras independientes; variable al menos ordinal.', 'Se espera que el tratamiento empuje a algunos sujetos a un extremo y a otros al opuesto.', 'Con empates entre grupos el valor p es aproximado (conservador).'],
    campos: [].concat(GRP, GRPN, [{ id: 'ctrl', label: 'Grupo de control', type: 'sel', opts: [['A', 'El grupo A es el control'], ['B', 'El grupo B es el control']], def: 'A' }, { id: 'h', label: 'Observaciones a recortar por extremo (vacío = 5 %, mín. 1)', type: 'num', def: '', min: 0, step: 1 }]),
    ejemplo: { gA: '52 55 53 50 54 56 51 53 55 54 52 53', gB: '45 62 49 58 66 41 53 60', nA: 'Control', nB: 'Experimental', ctrl: 'A', h: '' },
    leer(v) { const [na, nb] = nombreGrupos(v); const x = nums(v.gA, na, 2), y = nums(v.gB, nb, 2); const cA = v.ctrl !== 'B'; return { c: cA ? x : y, e: cA ? y : x, nc: cA ? na : nb, ne: cA ? nb : na, h: v.h === '' ? null : Number(v.h) }; },
    calc(d) { return M.moses(d.c, d.e, d.h); },
    render(d, r, a) {
      let t = concl(r.pH, a, 'La amplitud del grupo de control (' + d.nc + ') es menor de lo esperado por azar: el grupo experimental (' + d.ne + ') presenta valores más extremos, es decir, mayor dispersión.', 'No hay evidencia de que ' + d.ne + ' tenga reacciones más extremas que ' + d.nc + '.' + NOREJ);
      t += ' Amplitud (recortando ' + r.h + ' por extremo) = ' + r.spanH + ' sobre N = ' + r.N + ' rangos; sin recortar = ' + r.span0 + ' (p = ' + fpv(r.p0) + ').';
      const avisos = []; if (r.hayEmpates) avisos.push('Hay empates: las amplitudes se calcularon con rangos medios redondeados hacia arriba, por lo que el valor p es aproximado (conservador).'); avisos.push('La prueba de Moses es unilateral por construcción: solo detecta que el grupo experimental es más disperso que el de control.');
      const all = d.c.concat(d.e);
      return { cards: [{ n: 'Amplitud recortada', v: String(r.spanH), s: 'h = ' + r.h + ' · N = ' + r.N, main: 1 }, { n: 'Valor p (unilateral, exacto)', v: fpv(r.pH), s: decision(r.pH, a) }, { n: 'Amplitud sin recortar', v: String(r.span0), s: 'p = ' + fpv(r.p0) }],
        tabla: null, resumen: [['Control', d.nc + ' (n = ' + r.nc + ')'], ['Experimental', d.ne + ' (n = ' + r.ne + ')'], ['Observaciones recortadas por extremo (h)', String(r.h)], ['Amplitud observada (sin recortar)', String(r.span0)], ['Valor p unilateral (sin recortar)', fpv(r.p0)], ['Amplitud recortada', String(r.spanH)], ['Valor p unilateral (recortada)', fpv(r.pH)]],
        h0: 'El grupo experimental y el de control tienen la misma dispersión (sin reacciones extremas).', h1: 'El grupo experimental presenta valores más extremos (mayor dispersión).', interp: t, avisos, grafico: { tipo: 'tira', g: [{ n: d.nc + ' (control)', v: d.c }, { n: d.ne + ' (exp.)', v: d.e }] }, datosTxt: d.nc + ': ' + fmtList(d.c, 30) + ' | ' + d.ne + ': ' + fmtList(d.e, 30), pDecision: r.pH };
    },
    R(d, r) { return '# Prueba de Moses de reacciones extremas (exacta, sin empates)\nmoses <- function(control, exper, h = max(1, floor(0.05 * length(control)))) {\n  nc <- length(control); ne <- length(exper); N <- nc + ne\n  rk <- rank(c(control, exper)); rc <- sort(rk[1:nc])\n  s <- ceiling(rc[nc - h] - rc[h + 1] + 1)     # amplitud recortada\n  m <- nc - 2 * h\n  tot <- 0\n  for (ss in max(m, 1):s) for (a in (h + 1):(N - h - ss + 1)) {\n    b <- a + ss - 1\n    if (b > N - h) next\n    c1 <- if (m == 1) as.numeric(ss == 1) else choose(ss - 2, m - 2)\n    tot <- tot + c1 * choose(a - 1, h) * choose(N - b, h)\n  }\n  list(amplitud = s, p_unilateral = tot / choose(N, nc))\n}\ncontrol <- ' + rv(d.c) + '\nexper <- ' + rv(d.e) + '\nmoses(control, exper, h = ' + r.h + ')\n'; },
    Py(d, r) { return 'import numpy as np\nfrom math import comb, ceil\nfrom scipy.stats import rankdata\n\ndef moses(control, exper, h=None):\n    nc, ne = len(control), len(exper); N = nc + ne\n    h = max(1, int(0.05 * nc)) if h is None else h\n    rk = rankdata(np.concatenate([control, exper])); rc = np.sort(rk[:nc])\n    s = ceil(rc[nc - 1 - h] - rc[h] + 1 - 1e-9)      # amplitud recortada\n    m = nc - 2 * h; tot = 0\n    for ss in range(max(m, 1), s + 1):\n        for a in range(h + 1, N - h - ss + 2):\n            b = a + ss - 1\n            if b > N - h: continue\n            c1 = (1 if ss == 1 else 0) if m == 1 else comb(ss - 2, m - 2)\n            tot += c1 * comb(a - 1, h) * comb(N - b, h)\n    return s, tot / comb(N, nc)\n\ncontrol = np.array(' + pv(d.c) + ')\nexper = np.array(' + pv(d.e) + ')\nprint(moses(control, exper, h=' + r.h + '))   # (amplitud recortada, p unilateral)\n'; }
  };

  // ══════════ 2.3 Kolmogorov-Smirnov (dos muestras) ══════════
  TESTS.ks2 = {
    tab: 'dos', nombre: 'Kolmogorov-Smirnov (dos muestras)', corto: 'K-S dos muestras', cuando: 'Contrasta si dos muestras independientes provienen de la misma distribución; detecta diferencias de posición, dispersión o forma.',
    datos: 'Variable al menos ordinal medida en dos grupos independientes.',
    supuestos: ['Muestras independientes.', 'Variable continua: con muchos empates la prueba es conservadora.', 'Es menos potente que Mann-Whitney para detectar solo un desplazamiento de posición.'],
    campos: [].concat(GRP, GRPN),
    ejemplo: { gA: '2.1 3.4 2.8 3.9 3.1 2.5 3.6 2.9 3.3 3.0', gB: '1.2 4.8 2.2 5.1 0.9 4.4 3.0 5.6 1.8 4.9 0.6', nA: 'Grupo A', nB: 'Grupo B' },
    leer(v) { const [na, nb] = nombreGrupos(v); return { x: nums(v.gA, na, 2), y: nums(v.gB, nb, 2), na, nb }; },
    calc(d) { return M.ks2(d.x, d.y); },
    render(d, r, a) {
      const p = r.pExacto != null ? r.pExacto : r.pAsin;
      let t = concl(p, a, 'Las distribuciones de ' + d.na + ' y ' + d.nb + ' son distintas (en posición, dispersión o forma).', 'No hay evidencia de que las distribuciones de ' + d.na + ' y ' + d.nb + ' sean distintas.' + NOREJ) + ' La mayor distancia entre las dos funciones de distribución empíricas es D = ' + fx(r.D, 4) + '.';
      const avisos = []; if (r.hayEmpates) avisos.push('Hay valores empatados: el valor p exacto es conservador.'); if (r.pExacto == null) avisos.push('Muestras muy grandes: se usó el valor p asintótico.');
      return { cards: [{ n: 'D de Kolmogorov-Smirnov', v: fx(r.D, 4), s: 'D⁺ = ' + fx(r.Dmas, 3) + ' · D⁻ = ' + fx(r.Dmenos, 3), main: 1 }, { n: 'Valor p (' + (r.pExacto != null ? 'exacto' : 'asintótico') + ')', v: fpv(p), s: decision(p, a) }, { n: 'Tamaños', v: r.n + ' / ' + r.m, s: d.na + ' / ' + d.nb }],
        tabla: null, resumen: [['n₁ / n₂', r.n + ' / ' + r.m], ['D', fx(r.D, 5)], ['D⁺ (A sobre B)', fx(r.Dmas, 5)], ['D⁻ (B sobre A)', fx(r.Dmenos, 5)], ['p exacto', r.pExacto != null ? fpv(r.pExacto) : 'no disponible'], ['p asintótico', fpv(r.pAsin)]],
        h0: 'Las dos muestras provienen de la misma distribución.', h1: 'Las distribuciones son distintas.', interp: t, avisos, grafico: { tipo: 'ecdf2', a: Array.from(d.x).sort((p, q) => p - q), b: Array.from(d.y).sort((p, q) => p - q), na: d.na, nb: d.nb }, datosTxt: d.na + ': ' + fmtList(d.x, 30) + ' | ' + d.nb + ': ' + fmtList(d.y, 30), pDecision: p };
    },
    R(d) { return 'a <- ' + rv(d.x) + '\nb <- ' + rv(d.y) + '\nks.test(a, b, exact = TRUE)   # exacto, también con empates (R ≥ 4.2)\n'; },
    Py(d) { return 'import numpy as np\nfrom scipy import stats as st\n\na = np.array(' + pv(d.x) + ')\nb = np.array(' + pv(d.y) + ')\nprint(st.ks_2samp(a, b, method="exact"))   # con empates SciPy es algo conservador; R los trata de forma exacta\n'; }
  };

  // ══════════ 2.4 Wald-Wolfowitz ══════════
  TESTS.ww = {
    tab: 'dos', nombre: 'Rachas de Wald-Wolfowitz', corto: 'Wald-Wolfowitz', cuando: 'Contrasta si dos muestras independientes provienen de la misma distribución, contando las rachas de cada grupo al ordenar juntos todos los valores.',
    datos: 'Variable al menos ordinal en dos grupos independientes.',
    supuestos: ['Muestras independientes; variable continua (o con pocos empates).', 'La prueba es unilateral: pocas rachas indican que los grupos difieren.', 'Detecta cualquier tipo de diferencia, pero con poca potencia frente a alternativas específicas.'],
    campos: [].concat(GRP, GRPN),
    ejemplo: { gA: '12 15 11 18 20 14 16 13 19 17', gB: '22 25 19 28 24 21 30 23 26 27', nA: 'Grupo A', nB: 'Grupo B' },
    leer(v) { const [na, nb] = nombreGrupos(v); return { x: nums(v.gA, na, 2), y: nums(v.gB, nb, 2), na, nb }; },
    calc(d) { return M.waldWolfowitz2(d.x, d.y); },
    render(d, r, a) {
      const w = r.max, p = w.pExacto, pe = r.min.pExacto; let t;
      if (!r.hayEmpates) { t = concl(p, a, 'Hay muy pocas rachas para ser azar: las dos muestras provienen de distribuciones distintas.', 'El número de rachas es compatible con que ambas muestras provengan de la misma distribución.' + NOREJ) + ' Se observaron R = ' + w.R + ' rachas (esperadas: ' + fx(r.mu, 2) + ').'; }
      else { t = 'Hay empates entre grupos, así que el número de rachas no es único: va de ' + r.min.R + ' (mínimo posible) a ' + r.max.R + ' (máximo posible). Valor p exacto unilateral: ' + fpv(pe) + ' (mínimo) y ' + fpv(p) + ' (máximo). ' + (p < a ? '<strong>Se rechaza H₀</strong> con cualquier ordenamiento de los empates.' : (pe < a ? 'La decisión depende de cómo se ordenen los empates; no es concluyente.' : '<strong>No se rechaza H₀</strong> con ningún ordenamiento de los empates.' + NOREJ)); }
      const avisos = []; if (r.hayEmpates) avisos.push('SPSS informa también el mínimo y el máximo de rachas posibles cuando hay empates; aquí se hace igual.'); avisos.push('Prueba unilateral por construcción: se rechaza H₀ cuando hay pocas rachas.');
      const seq = (function () { const v = d.x.concat(d.y), l = d.x.map(() => 0).concat(d.y.map(() => 1)), idx = v.map((_, i) => i).sort((p, q) => v[p] - v[q] || l[p] - l[q]); return idx.map(i => l[i]); })();
      return { cards: [{ n: 'Rachas (R)', v: r.hayEmpates ? r.min.R + '–' + r.max.R : String(w.R), s: 'esperadas ' + fx(r.mu, 2), main: 1 }, { n: 'Valor p exacto (1 cola)', v: r.hayEmpates ? fpv(pe) + ' – ' + fpv(p) : fpv(p), s: r.hayEmpates ? 'mín. – máx. rachas' : decision(p, a) }, { n: 'Z (asintótico)', v: r.hayEmpates ? fx(r.min.z, 2) + ' / ' + fx(r.max.z, 2) : fx(w.z, 3), s: 'p = ' + (r.hayEmpates ? fpv(r.min.pAsin) + ' / ' + fpv(r.max.pAsin) : fpv(w.pAsin)) }],
        tabla: null, resumen: [['n₁ / n₂', r.n1 + ' / ' + r.n2], ['Rachas esperadas', fx(r.mu, 3)], ['Rachas (mín. posible)', String(r.min.R)], ['p exacto (mín.)', fpv(pe)], ['Z (mín.)', fx(r.min.z, 4)], ['Rachas (máx. posible)', String(r.max.R)], ['p exacto (máx.)', fpv(p)], ['Z (máx.)', fx(w.z, 4)]],
        h0: 'Las dos muestras provienen de la misma distribución.', h1: 'Las distribuciones difieren (pocas rachas).', interp: t, avisos, grafico: { tipo: 'secuencia', ind: seq, ea: d.nb, eb: d.na, soloIndices: true }, datosTxt: d.na + ': ' + fmtList(d.x, 30) + ' | ' + d.nb + ': ' + fmtList(d.y, 30), pDecision: r.hayEmpates ? p : p };
    },
    R(d) { return '# Rachas de Wald-Wolfowitz (dos muestras); valor p exacto unilateral\na <- ' + rv(d.x) + '\nb <- ' + rv(d.y) + '\nww <- function(a, b) {\n  v <- c(a, b); g <- c(rep(0, length(a)), rep(1, length(b)))\n  g <- g[order(v, g)]                         # empates: ordenamiento arbitrario\n  R <- 1 + sum(diff(g) != 0); n1 <- length(a); n2 <- length(b)\n  d <- function(r) { tot <- choose(n1 + n2, n1)\n    if (r %% 2 == 0) { k <- r / 2; 2 * choose(n1 - 1, k - 1) * choose(n2 - 1, k - 1) / tot }\n    else { k <- (r - 1) / 2; (choose(n1 - 1, k) * choose(n2 - 1, k - 1) + choose(n1 - 1, k - 1) * choose(n2 - 1, k)) / tot } }\n  mu <- 2 * n1 * n2 / (n1 + n2) + 1; s2 <- (mu - 1) * (mu - 2) / (n1 + n2 - 1)\n  list(R = R, p_exacto = sum(sapply(2:R, d)), Z = (R - mu + 0.5) / sqrt(s2))\n}\nww(a, b)\n'; },
    Py(d) { return 'import numpy as np\nfrom math import comb, sqrt\nfrom scipy.stats import norm\n\ndef ww(a, b):\n    v = np.concatenate([a, b]); g = np.concatenate([np.zeros(len(a)), np.ones(len(b))])\n    g = g[np.lexsort((g, v))]                   # empates: ordenamiento arbitrario\n    R = 1 + int((np.diff(g) != 0).sum()); n1, n2 = len(a), len(b)\n    def pmf(r):\n        tot = comb(n1 + n2, n1)\n        if r % 2 == 0:\n            k = r // 2; return 2 * comb(n1 - 1, k - 1) * comb(n2 - 1, k - 1) / tot\n        k = (r - 1) // 2; return (comb(n1 - 1, k) * comb(n2 - 1, k - 1) + comb(n1 - 1, k - 1) * comb(n2 - 1, k)) / tot\n    mu = 2 * n1 * n2 / (n1 + n2) + 1; var = (mu - 1) * (mu - 2) / (n1 + n2 - 1)\n    return R, sum(pmf(r) for r in range(2, R + 1)), (R - mu + 0.5) / sqrt(var)\n\na = np.array(' + pv(d.x) + ')\nb = np.array(' + pv(d.y) + ')\nprint(ww(a, b))   # (rachas, p exacto unilateral, Z)\n'; }
  };

  const TABS = [
    { id: 'una', nombre: 'Una muestra', corto: '1 muestra', tests: ['chi2', 'binomial', 'rachas', 'ks1'], desc: 'Contrastan una muestra frente a una distribución o patrón de referencia.' },
    { id: 'dos', nombre: 'Dos independientes', corto: '2 independientes', tests: ['mw', 'moses', 'ks2', 'ww'], desc: 'Comparan dos grupos formados por sujetos distintos.' },
    { id: 'rel2', nombre: 'Dos relacionadas', corto: '2 relacionadas', tests: [], pronto: true, desc: 'Wilcoxon y signos para datos pareados (antes y después).' },
    { id: 'kind', nombre: 'Varias independientes', corto: 'k independientes', tests: [], pronto: true, desc: 'Kruskal-Wallis, mediana y Jonckheere-Terpstra.' },
    { id: 'krel', nombre: 'Varias relacionadas', corto: 'k relacionadas', tests: [], pronto: true, desc: 'Friedman, W de Kendall y Q de Cochran.' }];
  return { TESTS, TABS, fx, fpv, num, rv, pv, tokens, nums, fmtList, decision, concl, NOREJ, magn, rs, ALT, GRP, GRPN, nombreGrupos };
})();
if (typeof module !== 'undefined') module.exports = NPP;
