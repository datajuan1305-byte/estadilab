/* Código R/Python e informe de pruebas de hipótesis — Estadilab (usa ../../js/hp-codigo.js) */
const CodigoPruebas = (function () {
  const H = HPCodigo, f = (v, d = 4) => H.fmt(v, d), num = v => H.num(v, 12);
  const NOMCOLA = { bilateral: 'bilateral (H₁: ≠)', derecha: 'unilateral derecha (H₁: >)', izquierda: 'unilateral izquierda (H₁: <)' };
  const cab = len => ['# ============================================================', '# Prueba de hipótesis — código generado por Estadilab', '# https://estadilab.com/pruebas-hipotesis/   (' + new Date().toISOString().slice(0, 10) + ')', len === 'r' ? '# Pega este código en RStudio (solo usa R base).' : '# Pégalo en Google Colab o Jupyter. Los paquetes que falten se instalan solos.', '# ============================================================'];
  const PIE_PY = ['import importlib.util, subprocess, sys', 'for _mod, _pip in (("scipy", "scipy"),):', '    if importlib.util.find_spec(_mod) is None:', '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", _pip])', 'import numpy as np', 'import scipy.stats as st', ''];

  // Líneas que calculan p-valor, valor crítico y decisión. dist: 'z' | 't' | 'chi'
  function decision(len, dist, cola) {
    const r = len === 'r', L = [];
    const cdf = x => r ? (dist === 'z' ? `pnorm(${x})` : dist === 't' ? `pt(${x}, df)` : `pchisq(${x}, df)`) : (dist === 'z' ? `st.norm.cdf(${x})` : dist === 't' ? `st.t.cdf(${x}, df)` : `st.chi2.cdf(${x}, df)`);
    const q = x => r ? (dist === 'z' ? `qnorm(${x})` : dist === 't' ? `qt(${x}, df)` : `qchisq(${x}, df)`) : (dist === 'z' ? `st.norm.ppf(${x})` : dist === 't' ? `st.t.ppf(${x}, df)` : `st.chi2.ppf(${x}, df)`);
    const as = r ? ' <- ' : ' = ', ab = r ? 'abs' : 'abs', ora = r ? '|' : ' or ', and = r ? '&' : ' and ';
    const sim = dist !== 'chi';
    if (cola === 'bilateral') {
      if (sim) L.push('p_valor' + as + '2 * (1 - ' + cdf('abs(est)') + ')', 'vc' + as + q('1 - alpha / 2') + '          # valores críticos: ±vc', 'rechaza' + as + 'abs(est) > vc');
      else L.push('p_valor' + as + '2 * min(' + cdf('est') + ', 1 - ' + cdf('est') + ')', 'vc_inf' + as + q('alpha / 2') + '; vc_sup' + as + q('1 - alpha / 2'), 'rechaza' + as + '(est < vc_inf)' + (r ? ' | ' : ' or ') + '(est > vc_sup)');
    } else if (cola === 'derecha') L.push('p_valor' + as + '1 - ' + cdf('est'), 'vc' + as + q('1 - alpha'), 'rechaza' + as + 'est > vc');
    else L.push('p_valor' + as + cdf('est'), 'vc' + as + q('alpha'), 'rechaza' + as + 'est < vc');
    return L;
  }
  function salida(len) { return len === 'r' ? ['cat("Estadístico:", est, " p-valor:", p_valor, " | Se rechaza H0:", rechaza, "\\n")'] : ['print("Estadístico =", est, "| p-valor =", p_valor, "| Se rechaza H0:", bool(rechaza))']; }

  function cuerpo(len, t, p) {
    const r = len === 'r', as = r ? ' <- ' : ' = ', sq = x => r ? `sqrt(${x})` : `np.sqrt(${x})`, pw = (a, b) => r ? `${a}^${b}` : `${a} ** ${b}`;
    const L = [];
    L.push('alpha' + as + num(p.alpha) + (t === 't_pareada' || true ? '' : ''), '');
    if (t === 'z_media') { L.push('n' + as + p.n + '; xbar' + as + num(p.xbarra) + '; sigma' + as + num(p.sigma) + '; mu0' + as + num(p.mu0), '', '# Estadístico y decisión', 'est' + as + '(xbar - mu0) / (sigma / ' + sq('n') + ')', ...decision(len, 'z', p.cola)); }
    else if (t === 't_media') { L.push('n' + as + p.n + '; xbar' + as + num(p.xbarra) + '; s' + as + num(p.s) + '; mu0' + as + num(p.mu0), '', '# Estadístico y decisión', 'df' + as + 'n - 1', 'est' + as + '(xbar - mu0) / (s / ' + sq('n') + ')', ...decision(len, 't', p.cola), '# Con los datos crudos: ' + (r ? 't.test(datos, mu = mu0, alternative = "' + alt(p.cola) + '")' : 'st.ttest_1samp(datos, mu0, alternative="' + alt(p.cola) + '")')); }
    else if (t === 't_dos_muestras') {
      L.push('n1' + as + p.n1 + '; xbar1' + as + num(p.xbarra1) + '; s1' + as + num(p.s1), 'n2' + as + p.n2 + '; xbar2' + as + num(p.xbarra2) + '; s2' + as + num(p.s2), '', '# Estadístico y decisión (' + (p.varianzasIguales ? 'varianzas iguales, combinada' : 'Welch, varianzas distintas') + ')');
      if (p.varianzasIguales) L.push('sp2' + as + '((n1 - 1) * ' + pw('s1', 2) + ' + (n2 - 1) * ' + pw('s2', 2) + ') / (n1 + n2 - 2)', 'df' + as + 'n1 + n2 - 2', 'est' + as + '(xbar1 - xbar2) / ' + sq('sp2 * (1 / n1 + 1 / n2)'));
      else L.push('v1' + as + pw('s1', 2) + ' / n1; v2' + as + pw('s2', 2) + ' / n2', 'df' + as + pw('(v1 + v2)', 2) + ' / (' + pw('v1', 2) + ' / (n1 - 1) + ' + pw('v2', 2) + ' / (n2 - 1))', 'est' + as + '(xbar1 - xbar2) / ' + sq('v1 + v2'));
      L.push(...decision(len, 't', p.cola), '# Con los datos crudos: ' + (r ? 't.test(g1, g2, var.equal = ' + (p.varianzasIguales ? 'TRUE' : 'FALSE') + ', alternative = "' + alt(p.cola) + '")' : 'st.ttest_ind(g1, g2, equal_var=' + (p.varianzasIguales ? 'True' : 'False') + ', alternative="' + alt(p.cola) + '")'));
    }
    else if (t === 't_pareada') {
      L.push((r ? 'd <- ' + H.rVec(p.diferencias) : 'd = np.array(' + H.pyVec(p.diferencias) + ')') + '      # diferencias (muestra 2 − muestra 1)', 'mu0' + as + num(p.mu0), '', '# Estadístico y decisión', r ? 'n <- length(d); dbar <- mean(d); sd_d <- sd(d)' : 'n = len(d); dbar = d.mean(); sd_d = d.std(ddof=1)', 'df' + as + 'n - 1', 'est' + as + '(dbar - mu0) / (sd_d / ' + sq('n') + ')', ...decision(len, 't', p.cola), '# Equivalente: ' + (r ? 't.test(d, mu = mu0, alternative = "' + alt(p.cola) + '")' : 'st.ttest_1samp(d, mu0, alternative="' + alt(p.cola) + '")'));
    }
    else if (t === 'z_proporcion') { L.push('x' + as + p.x + '; n' + as + p.n + '; p0' + as + num(p.p0), '', '# Estadístico y decisión', 'phat' + as + 'x / n', 'est' + as + '(phat - p0) / ' + sq('p0 * (1 - p0) / n'), ...decision(len, 'z', p.cola), '# Equivalente: ' + (r ? 'prop.test(x, n, p = p0, correct = FALSE)   # chi² = z²' : 'st.binomtest(x, n, p0)   # prueba exacta')); }
    else if (t === 'z_dos_proporciones') { L.push('x1' + as + p.x1 + '; n1' + as + p.n1 + '; x2' + as + p.x2 + '; n2' + as + p.n2, '', '# Estadístico y decisión (proporción combinada)', 'p1' + as + 'x1 / n1; p2' + as + 'x2 / n2; ppool' + as + '(x1 + x2) / (n1 + n2)', 'est' + as + '(p1 - p2) / ' + sq('ppool * (1 - ppool) * (1 / n1 + 1 / n2)'), ...decision(len, 'z', p.cola), '# Equivalente: ' + (r ? 'prop.test(c(x1, x2), c(n1, n2), correct = FALSE)   # chi² = z²' : 'statsmodels.stats.proportion.proportions_ztest([x1, x2], [n1, n2])')); }
    else { L.push('n' + as + p.n + '; s2' + as + num(p.s2) + '; sigma0_2' + as + num(p.sigma0_2), '', '# Estadístico y decisión', 'df' + as + 'n - 1', 'est' + as + 'df * s2 / sigma0_2', ...decision(len, 'chi', p.cola)); }
    L.push(...salida(len));
    return L;
  }
  const alt = c => c === 'bilateral' ? 'two.sided' : c === 'derecha' ? 'greater' : 'less';
  function altPy(code) { return code; }
  function codigoR(t, p) { return [...cab('r'), '', ...cuerpo('r', t, p)].join('\n') + '\n'; }
  function codigoPy(t, p) {
    const c = cuerpo('py', t, p).join('\n').replace(/alternative="two\.sided"/g, 'alternative="two-sided"');
    return [...cab('py'), ...PIE_PY, c].join('\n') + '\n';
  }
  const TEX = {
    z_media: 'Z=\\frac{\\bar x-\\mu_0}{\\sigma/\\sqrt n}', t_media: 't=\\frac{\\bar x-\\mu_0}{s/\\sqrt n},\\quad gl=n-1',
    t_dos_muestras: 't=\\frac{\\bar x_1-\\bar x_2}{\\sqrt{s_p^2(1/n_1+1/n_2)}}\\ \\text{(combinada)},\\qquad t=\\frac{\\bar x_1-\\bar x_2}{\\sqrt{s_1^2/n_1+s_2^2/n_2}}\\ \\text{(Welch)}',
    t_pareada: 't=\\frac{\\bar d-\\mu_0}{s_d/\\sqrt n},\\quad gl=n-1', z_proporcion: 'Z=\\frac{\\hat p-p_0}{\\sqrt{p_0(1-p_0)/n}}',
    z_dos_proporciones: 'Z=\\frac{\\hat p_1-\\hat p_2}{\\sqrt{\\hat p(1-\\hat p)(1/n_1+1/n_2)}}', chi2_varianza: '\\chi^2=\\frac{(n-1)s^2}{\\sigma_0^2},\\quad gl=n-1'
  };
  function spec(t, cfg, p, r, ctx, concl) {
    const S = { titulo: 'Informe de prueba de hipótesis', subtitulo: cfg.nombre + ' · α = ' + p.alpha + ' · ' + NOMCOLA[p.cola], contexto: (ctx || '').trim(), nombreBase: 'prueba_' + t };
    const hip = cfg.hipotesis.replace('≠/&gt;/&lt;', p.cola === 'bilateral' ? '≠' : p.cola === 'derecha' ? '>' : '<').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
    const dato = t === 't_pareada' ? [['n (pares)', String(p.diferencias.length)], ['d̄ (media de diferencias)', f(r.dbarra)], ['s_d', f(r.sd)], ['μ₀', String(p.mu0)]] : cfg.campos.map(c => [c.label, String(p[c.id])]).concat(t === 't_dos_muestras' ? [['Varianzas', p.varianzasIguales ? 'iguales (combinada)' : 'distintas (Welch)']] : []);
    dato.push(['Nivel de significancia α', String(p.alpha)], ['Tipo de prueba', NOMCOLA[p.cola]]);
    const res = [['Estadístico ' + r.nombreEstadistico, f(r.estadistico)]].concat(r.df ? [['Grados de libertad', f(r.df, 2)]] : []).concat([['Valor-p', f(r.pValor, 6)], ['Valor(es) crítico(s)', String(r.valorCritico).replace('±', '±')], ['Decisión', r.rechazaH0 ? 'Se rechaza H₀' : 'No se rechaza H₀']]);
    S.secciones = [
      { h: '1. Hipótesis y estadístico', items: [{ p: hip }, { formula: { html: H.h(cfg.nombre), tex: TEX[t], txt: cfg.nombre } }] },
      { h: '2. Datos de entrada', items: [{ tabla: { cab: ['Dato', 'Valor'], filas: dato, izq: 1, fmt: 'lr' } }] },
      { h: '3. Resultados', items: [{ tabla: { cab: ['Medida', 'Valor'], filas: res, izq: 1, fmt: 'lr' } }, { box: (r.rechazaH0 ? 'Decisión: se rechaza H₀.' : 'Decisión: no se rechaza H₀.') + ' (p = ' + f(r.pValor, 6) + (r.rechazaH0 ? ' < ' : ' ≥ ') + 'α = ' + p.alpha + ')' }] },
      { h: '4. Interpretación', items: [{ box: String(concl).replace(/<[^>]+>/g, '') }, { nota: 'No rechazar H₀ no demuestra que sea cierta: solo indica que los datos no aportan evidencia suficiente en su contra. Revisa los supuestos del método (normalidad, independencia, tamaño de muestra).' }] }];
    S.pie = 'Referencias: Montgomery, D. C. y Runger, G. C. (2018). Applied Statistics and Probability for Engineers. Wiley; Walpole et al. (2012). Probabilidad y estadística para ingeniería y ciencias. Pearson.';
    S.codigoR = codigoR(t, p); S.codigoPy = codigoPy(t, p);
    return S;
  }
  function montar(el, t, cfg, p, r) {
    HPCodigo.montar(el, function () {
      const c = document.getElementById('contexto'), ctx = c ? c.value : '';
      return spec(t, cfg, p, r, ctx, generarConclusionFormal(armarPayloadPrueba(t, p, r, ctx, '')));
    });
  }
  return { spec, montar, codigoR, codigoPy };
})();
if (typeof module !== 'undefined') module.exports = CodigoPruebas;
