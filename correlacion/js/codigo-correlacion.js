/* Código R/Python e informe de correlación — Estadilab (usa ../../js/hp-codigo.js) */
const CodigoCorrelacion = (function () {
  const H = HPCodigo, f = H.fmt, p = H.fp, num = H.num;
  const cab = len => ['# ============================================================', '# Correlación — código generado por Estadilab', '# https://estadilab.com/correlacion/   (' + new Date().toISOString().slice(0, 10) + ')', len === 'r' ? '# Pega este código en RStudio.' : '# Pégalo en Google Colab o Jupyter. Los paquetes que falten se instalan solos.', '# ============================================================'];

  function codigoR(x, y) {
    return [...cab('r'), '', '# 1. Datos ------------------------------------------------', 'datos <- data.frame(', '  x = ' + H.rVec(x) + ',', '  y = ' + H.rVec(y), ')', '',
      '# 2. Correlaciones ----------------------------------------', 
      'cor.test(datos$x, datos$y, method = "pearson")                    # r, IC 95 %, prueba t',
      'cor.test(datos$x, datos$y, method = "spearman", exact = FALSE)    # rho (rangos)',
      'cor.test(datos$x, datos$y, method = "kendall",  exact = FALSE)    # tau-b (aprox. normal)',
      'cor(datos$x, datos$y)^2                                           # R² (determinación)', '',
      '# 3. Supuestos de Pearson -------------------------------------',
      'shapiro.test(datos$x); shapiro.test(datos$y)                      # normalidad de cada variable', '',
      '# 4. Gráfico ---------------------------------------------------',
      'plot(datos$x, datos$y, pch = 16, col = "steelblue", xlab = "X", ylab = "Y")', 'abline(lm(y ~ x, data = datos), col = "red", lwd = 2)', ''].join('\n');
  }
  function codigoPy(x, y) {
    return [...cab('py'), 'import importlib.util, subprocess, sys', 'for _mod, _pip in (("scipy", "scipy"), ("matplotlib", "matplotlib")):', '    if importlib.util.find_spec(_mod) is None:', '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", _pip])', '',
      'import numpy as np', 'import scipy.stats as st', 'import matplotlib.pyplot as plt', '', '# 1. Datos ------------------------------------------------', 'x = np.array(' + H.pyVec(x) + ')', 'y = np.array(' + H.pyVec(y) + ')', '',
      '# 2. Correlaciones ----------------------------------------',
      'r, p_r = st.pearsonr(x, y)',
      'print("Pearson : r = %.4f  p = %.4f  R2 = %.4f" % (r, p_r, r ** 2))',
      'ci = st.pearsonr(x, y).confidence_interval(0.95)',
      'print("IC 95 %% de r: [%.4f, %.4f]" % (ci.low, ci.high))',
      'rho, p_s = st.spearmanr(x, y)',
      'print("Spearman: rho = %.4f  p = %.4f" % (rho, p_s))',
      'tau, p_k = st.kendalltau(x, y, variant="b", method="asymptotic")',
      'print("Kendall : tau = %.4f  p = %.4f" % (tau, p_k))', '',
      '# 3. Supuestos de Pearson -------------------------------------',
      'print("Shapiro X:", st.shapiro(x)); print("Shapiro Y:", st.shapiro(y))', '',
      '# 4. Gráfico ---------------------------------------------------',
      'b1, b0 = np.polyfit(x, y, 1)', 'plt.scatter(x, y, color="steelblue")', 'xs = np.linspace(x.min(), x.max(), 100)', 'plt.plot(xs, b0 + b1 * xs, color="red")', 'plt.xlabel("X"); plt.ylabel("Y"); plt.show()', ''].join('\n');
  }
  function spec(x, y, r, ctx, resumen) {
    const n = x.length, maxF = 40, filas = [];
    for (let i = 0; i < Math.min(n, maxF); i++) filas.push([String(i + 1), num(x[i]), num(y[i])]);
    const S = { titulo: 'Informe de análisis de correlación', subtitulo: 'n = ' + n + ' pares', contexto: (ctx || '').trim(), nombreBase: 'correlacion' };
    const fu = v => { v = Math.abs(v); return v < 0.1 ? 'muy débil' : v < 0.3 ? 'débil' : v < 0.5 ? 'moderada' : v < 0.7 ? 'fuerte' : 'muy fuerte'; };
    const b1 = (function () { const mx = x.reduce((a, c) => a + c, 0) / n, my = y.reduce((a, c) => a + c, 0) / n; let sxy = 0, sxx = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; }); const b = sxy / sxx; return [my - b * mx, b]; })();
    const x0 = Math.min(...x), x1 = Math.max(...x); let img = null; try { img = H.dispersionPNG(x, y, [[x0, b1[0] + b1[1] * x0], [x1, b1[0] + b1[1] * x1]]); } catch (e) { }
    const pts = x.map((v, i) => '(' + num(v) + ',' + num(y[i]) + ')').join(' ');
    const pgf = '\\begin{tikzpicture}\\begin{axis}[width=0.9\\textwidth,height=7cm,xlabel={$X$},ylabel={$Y$},grid=major]\\addplot[only marks,mark=*,blue!70!black] coordinates {' + pts + '};\\addplot[red,thick] coordinates {(' + num(x0) + ',' + num(b1[0] + b1[1] * x0) + ') (' + num(x1) + ',' + num(b1[0] + b1[1] * x1) + ')};\\end{axis}\\end{tikzpicture}\\caption{Diagrama de dispersi\\\'on con recta de m\\\'inimos cuadrados.}';
    S.secciones = [
      { h: '1. Coeficientes de correlación', items: [
        { formula: { html: 'r = Σ(x<sub>i</sub> − x̄)(y<sub>i</sub> − ȳ) / √[Σ(x<sub>i</sub> − x̄)² · Σ(y<sub>i</sub> − ȳ)²]', tex: 'r=\\frac{\\sum (x_i-\\bar x)(y_i-\\bar y)}{\\sqrt{\\sum (x_i-\\bar x)^2\\,\\sum (y_i-\\bar y)^2}},\\qquad t=\\frac{r\\sqrt{n-2}}{\\sqrt{1-r^2}}', parts: ['r = Σ(x', ['i'], ' − x̄)(y', ['i'], ' − ȳ) / √[Σ(x', ['i'], ' − x̄)² · Σ(y', ['i'], ' − ȳ)²]'] } },
        { p: 'Pearson mide la relación lineal; Spearman (ρ) es Pearson aplicado a los rangos y detecta relaciones monótonas; Kendall (τ-b) se basa en pares concordantes y discordantes y corrige empates. H₀: no hay asociación (coeficiente = 0).' }] },
      { h: '2. Datos', items: [{ tabla: { cab: ['#', 'X', 'Y'], filas, izq: 1 } }].concat(n > maxF ? [{ nota: 'Se muestran las primeras ' + maxF + ' de ' + n + ' observaciones.' }] : []) },
      { h: '3. Resultados', items: [
        { tabla: { cab: ['Coeficiente', 'Valor', '$p$', 'Fuerza'], filas: [['Pearson (r)', f(r.pearson.coef, 4), p(r.pearson.significancia.pValor), fu(r.pearson.coef)], ['Spearman (ρ)', f(r.spearman.coef, 4), p(r.spearman.significancia.pValor), fu(r.spearman.coef)], ['Kendall (τ-b)', f(r.kendall.tau, 4), p(r.kendall.significancia.pValor), fu(r.kendall.tau)]], izq: 1, fmt: 'lrrl' } },
        { p: 'Coeficiente de determinación (Pearson): R² = ' + f(r.pearson.r2, 4) + '. Ecuación de la recta de mínimos cuadrados: ŷ = ' + f(b1[0], 4) + (b1[1] >= 0 ? ' + ' : ' − ') + f(Math.abs(b1[1]), 4) + '·x.' }] },
      { h: '4. Gráfico', items: [img ? { img, w: 560, h: 324 } : null, { pgf }].filter(Boolean) },
      { h: '5. Conclusión', items: [{ box: resumen }, { nota: 'Correlación no implica causalidad. Revisa el diagrama de dispersión: valores atípicos o relaciones curvas pueden distorsionar r.' }] }];
    S.pie = 'Referencias: Montgomery, D. C. y Runger, G. C. (2018). Applied Statistics and Probability for Engineers. Wiley; Kendall, M. G. (1938). A new measure of rank correlation. Biometrika.';
    S.codigoR = codigoR(x, y); S.codigoPy = codigoPy(x, y);
    return S;
  }
  function montar(el, x, y, r) {
    const resumen = generarResumenCorr(armarPayloadCorr('pearson', {}, r.pearson, '', ''));
    HPCodigo.montar(el, function () { const c = document.getElementById('contexto'); return spec(x, y, r, c ? c.value : '', resumen); });
  }
  return { spec, montar, codigoR, codigoPy };
})();
if (typeof module !== 'undefined') module.exports = CodigoCorrelacion;
