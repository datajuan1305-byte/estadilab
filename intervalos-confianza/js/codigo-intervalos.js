/* Código R/Python e informe de intervalos de confianza — Estadilab (usa ../../js/hp-codigo.js) */
const CodigoIntervalos = (function () {
  const H = HPCodigo, f = (v, d = 4) => H.fmt(v, d), num = v => H.num(v, 12);
  const cab = len => ['# ============================================================', '# Intervalos de confianza — código generado por Estadilab', '# https://estadilab.com/intervalos-confianza/   (' + new Date().toISOString().slice(0, 10) + ')', len === 'r' ? '# Pega este código en RStudio (solo usa R base).' : '# Pégalo en Google Colab o Jupyter. Los paquetes que falten se instalan solos.', '# ============================================================'];
  const PIE_PY = ['import importlib.util, subprocess, sys', 'for _mod, _pip in (("scipy", "scipy"),):', '    if importlib.util.find_spec(_mod) is None:', '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", _pip])', 'import numpy as np', 'import scipy.stats as st', ''];
  const TEX = {
    media_z: 'IC=\\bar x\\pm z_{1-\\alpha/2}\\,\\frac{\\sigma}{\\sqrt n}',
    media_t: 'IC=\\bar x\\pm t_{1-\\alpha/2,\\,n-1}\\,\\frac{s}{\\sqrt n}',
    proporcion: 'IC=\\hat p\\pm z_{1-\\alpha/2}\\sqrt{\\frac{\\hat p(1-\\hat p)}{n}},\\qquad \\hat p=\\frac{x}{n}',
    varianza: 'IC=\\left[\\frac{(n-1)s^2}{\\chi^2_{1-\\alpha/2,\\,n-1}},\\ \\frac{(n-1)s^2}{\\chi^2_{\\alpha/2,\\,n-1}}\\right]',
    tamano_media: 'n=\\left\\lceil\\left(\\frac{z_{1-\\alpha/2}\\,\\sigma}{E}\\right)^2\\right\\rceil',
    tamano_proporcion: 'n=\\left\\lceil\\frac{z_{1-\\alpha/2}^2\\,p(1-p)}{E^2}\\right\\rceil'
  };
  function codigoR(t, p) {
    const L = [...cab('r'), '', '# 1. Datos de entrada ---------------------------------------'];
    const c = p.confianza; L.push('conf <- ' + num(c) + '; alpha <- 1 - conf');
    if (t === 'media_z') L.push('n <- ' + p.n + '; xbar <- ' + num(p.xbarra) + '; sigma <- ' + num(p.sigma), '', '# 2. Intervalo -------------------------------------------------', 'z <- qnorm(1 - alpha / 2); margen <- z * sigma / sqrt(n)', 'c(inferior = xbar - margen, superior = xbar + margen, z = z, margen = margen)');
    else if (t === 'media_t') L.push('n <- ' + p.n + '; xbar <- ' + num(p.xbarra) + '; s <- ' + num(p.s), '', '# 2. Intervalo -------------------------------------------------', 'tcrit <- qt(1 - alpha / 2, df = n - 1); margen <- tcrit * s / sqrt(n)', 'c(inferior = xbar - margen, superior = xbar + margen, t = tcrit, margen = margen)', '# Con los datos crudos: t.test(datos, conf.level = conf)$conf.int');
    else if (t === 'proporcion') L.push('x <- ' + p.x + '; n <- ' + p.n, '', '# 2. Intervalo (Wald, aproximación normal) ----------------------', 'phat <- x / n; z <- qnorm(1 - alpha / 2); margen <- z * sqrt(phat * (1 - phat) / n)', 'c(phat = phat, inferior = max(0, phat - margen), superior = min(1, phat + margen))', '# Alternativas más precisas con pocos datos o p extremo:', 'prop.test(x, n, conf.level = conf, correct = FALSE)$conf.int   # Wilson', 'binom.test(x, n, conf.level = conf)$conf.int                  # Clopper-Pearson (exacto)');
    else if (t === 'varianza') L.push('n <- ' + p.n + '; s2 <- ' + num(p.s2), '', '# 2. Intervalo -------------------------------------------------', 'gl <- n - 1', 'inferior <- gl * s2 / qchisq(1 - alpha / 2, gl); superior <- gl * s2 / qchisq(alpha / 2, gl)', 'c(inferior = inferior, superior = superior)', 'sqrt(c(inferior, superior))   # IC para la desviación estándar');
    else if (t === 'tamano_media') L.push('sigma <- ' + num(p.sigma) + '; E <- ' + num(p.error), '', '# 2. Tamaño de muestra ---------------------------------------', 'z <- qnorm(1 - alpha / 2); n_exacto <- (z * sigma / E)^2', 'c(n_exacto = n_exacto, n = ceiling(n_exacto))');
    else L.push('p <- ' + num(p.pEstimado) + '; E <- ' + num(p.error), '', '# 2. Tamaño de muestra ---------------------------------------', 'z <- qnorm(1 - alpha / 2); n_exacto <- z^2 * p * (1 - p) / E^2', 'c(n_exacto = n_exacto, n = ceiling(n_exacto))');
    return L.join('\n') + '\n';
  }
  function codigoPy(t, p) {
    const L = [...cab('py'), ...PIE_PY, '# 1. Datos de entrada ---------------------------------------', 'conf = ' + num(p.confianza) + '; alpha = 1 - conf'];
    if (t === 'media_z') L.push('n = ' + p.n + '; xbar = ' + num(p.xbarra) + '; sigma = ' + num(p.sigma), '', '# 2. Intervalo -------------------------------------------------', 'z = st.norm.ppf(1 - alpha / 2); margen = z * sigma / np.sqrt(n)', 'print("IC:", xbar - margen, xbar + margen, "| z =", z, "| margen =", margen)');
    else if (t === 'media_t') L.push('n = ' + p.n + '; xbar = ' + num(p.xbarra) + '; s = ' + num(p.s), '', '# 2. Intervalo -------------------------------------------------', 'tcrit = st.t.ppf(1 - alpha / 2, df=n - 1); margen = tcrit * s / np.sqrt(n)', 'print("IC:", xbar - margen, xbar + margen, "| t =", tcrit, "| margen =", margen)', '# Con los datos crudos: st.t.interval(conf, len(datos) - 1, loc=np.mean(datos), scale=st.sem(datos))');
    else if (t === 'proporcion') L.push('x = ' + p.x + '; n = ' + p.n, '', '# 2. Intervalo (Wald, aproximación normal) ----------------------', 'phat = x / n; z = st.norm.ppf(1 - alpha / 2); margen = z * np.sqrt(phat * (1 - phat) / n)', 'print("phat =", phat, "| IC:", max(0, phat - margen), min(1, phat + margen))', '# Alternativas más precisas con pocos datos o p extremo:', 'print(st.binomtest(x, n).proportion_ci(confidence_level=conf, method="wilson"))', 'print(st.binomtest(x, n).proportion_ci(confidence_level=conf, method="exact"))   # Clopper-Pearson');
    else if (t === 'varianza') L.push('n = ' + p.n + '; s2 = ' + num(p.s2), '', '# 2. Intervalo -------------------------------------------------', 'gl = n - 1', 'inferior = gl * s2 / st.chi2.ppf(1 - alpha / 2, gl); superior = gl * s2 / st.chi2.ppf(alpha / 2, gl)', 'print("IC varianza:", inferior, superior)', 'print("IC desviación estándar:", np.sqrt(inferior), np.sqrt(superior))');
    else if (t === 'tamano_media') L.push('sigma = ' + num(p.sigma) + '; E = ' + num(p.error), '', '# 2. Tamaño de muestra ---------------------------------------', 'z = st.norm.ppf(1 - alpha / 2); n_exacto = (z * sigma / E) ** 2', 'print("n exacto =", n_exacto, "| n =", int(np.ceil(n_exacto)))');
    else L.push('p = ' + num(p.pEstimado) + '; E = ' + num(p.error), '', '# 2. Tamaño de muestra ---------------------------------------', 'z = st.norm.ppf(1 - alpha / 2); n_exacto = z ** 2 * p * (1 - p) / E ** 2', 'print("n exacto =", n_exacto, "| n =", int(np.ceil(n_exacto)))');
    return L.join('\n') + '\n';
  }
  function spec(t, cfg, p, r, ctx, concl) {
    const tam = t === 'tamano_media' || t === 'tamano_proporcion', pct = Math.round(p.confianza * 100);
    const S = { titulo: tam ? 'Informe de tamaño de muestra' : 'Informe de intervalo de confianza', subtitulo: cfg.nombre + ' · confianza ' + pct + ' %', contexto: (ctx || '').trim(), nombreBase: 'intervalo_' + t };
    const dato = cfg.campos.map(c => [c.label, String(p[c.id])]).concat([['Nivel de confianza', pct + ' %']]);
    const dec = t === 'proporcion' ? 4 : 3;
    const res = tam ? [['Valor crítico Z', f(r.valorCritico)], ['n exacto', f(r.nExacto, 3)], ['n requerido (redondeado hacia arriba)', String(r.nRedondeado)]] :
      [['Estimación puntual', f(r.puntual, dec)]].concat(r.df ? [['Grados de libertad', String(r.df)]] : []).concat(t === 'varianza' ? [['χ² inferior', f(r.chiInf)], ['χ² superior', f(r.chiSup)]] : [['Valor crítico (' + r.nombreCritico + ')', f(r.valorCritico)], ['Margen de error', f(r.margen, dec)]]).concat([['Límite inferior', f(r.inferior, dec)], ['Límite superior', f(r.superior, dec)]]);
    S.secciones = [
      { h: '1. Método', items: [{ formula: { html: h2(cfg.formula), tex: TEX[t], txt: cfg.formula } }, { p: tam ? 'Se calcula el tamaño de muestra mínimo para lograr el margen de error E con el nivel de confianza indicado.' : 'Intervalo de confianza bilateral. Con confianza 1 − α, el procedimiento captura el verdadero parámetro en el 100(1 − α) % de las muestras repetidas.' }] },
      { h: '2. Datos de entrada', items: [{ tabla: { cab: ['Parámetro', 'Valor'], filas: dato, izq: 1, fmt: 'lr' } }] },
      { h: '3. Resultados', items: [{ tabla: { cab: ['Medida', 'Valor'], filas: res, izq: 1, fmt: 'lr' } }] },
      { h: '4. Interpretación', items: [{ box: String(concl).replace(/<[^>]+>/g, '') }, { nota: t === 'proporcion' ? 'El intervalo de Wald es aproximado: con n pequeño o p cercano a 0 o 1 conviene el de Wilson o el exacto (incluidos en el código).' : (t === 'media_t' || t === 'varianza' ? 'Supone que los datos provienen de una población aproximadamente normal.' : 'Resultado orientativo.') }] }];
    S.pie = 'Referencias: Montgomery, D. C. y Runger, G. C. (2018). Applied Statistics and Probability for Engineers. Wiley; Walpole et al. (2012). Probabilidad y estadística para ingeniería y ciencias. Pearson.';
    S.codigoR = codigoR(t, p); S.codigoPy = codigoPy(t, p);
    return S;
  }
  const h2 = s => HPCodigo.h(s);
  function montar(el, t, cfg, p, r) {
    HPCodigo.montar(el, function () {
      const c = document.getElementById('contexto'), ctx = c ? c.value : '';
      return spec(t, cfg, p, r, ctx, generarSignificadoIC(armarPayloadIC(t, p, r, ctx, '')));
    });
  }
  return { spec, montar, codigoR, codigoPy };
})();
if (typeof module !== 'undefined') module.exports = CodigoIntervalos;
