/* Código R/Python e informe de la regresión lineal — Estadilab
   Usa el módulo compartido ../../js/hp-codigo.js (HPCodigo). */
const CodigoRegresion = (function () {
  const H = HPCodigo, f = H.fmt, p = H.fp, num = H.num;

  function cabecera(len) {
    return ['# ============================================================',
      '# Regresión lineal — código generado por Estadilab',
      '# https://estadilab.com/regresion/   (' + new Date().toISOString().slice(0, 10) + ')',
      len === 'r' ? '# Pega este código en RStudio. Los paquetes que falten se instalan solos.' : '# Pégalo en Google Colab o Jupyter. Los paquetes que falten se instalan solos.',
      '# ============================================================'];
  }

  function codigoR(tipo, d, r) {
    const k = tipo === 'simple' ? 1 : d.X.length, L = cabecera('r');
    L.push('', 'for (p in c("lmtest"' + (k > 1 ? ', "car"' : '') + '))',
      '  if (!requireNamespace(p, quietly = TRUE)) install.packages(p, repos = "https://cloud.r-project.org")',
      'library(lmtest)' + (k > 1 ? '; library(car)' : ''), '', '# 1. Datos ------------------------------------------------');
    if (tipo === 'simple') {
      L.push('datos <- data.frame(', '  x = ' + H.rVec(d.x) + ',', '  y = ' + H.rVec(d.y), ')');
    } else {
      L.push('datos <- data.frame(', ...d.X.map((c, j) => '  X' + (j + 1) + ' = ' + H.rVec(c) + ','), '  y = ' + H.rVec(d.y), ')');
    }
    const fo = tipo === 'simple' ? 'y ~ x' : 'y ~ ' + d.X.map((_, j) => 'X' + (j + 1)).join(' + ');
    L.push('', '# 2. Modelo ------------------------------------------------',
      'modelo <- lm(' + fo + ', data = datos)',
      'summary(modelo)          # coeficientes, R², R² ajustado, prueba F',
      'anova(modelo)            # tabla ANOVA',
      'confint(modelo)          # IC del 95 % de los coeficientes', '',
      '# 3. Supuestos -----------------------------------------------',
      'shapiro.test(residuals(modelo))   # normalidad de residuos',
      'bptest(modelo)                    # homocedasticidad (Breusch-Pagan)',
      'dwtest(modelo)                    # independencia (Durbin-Watson)');
    if (k > 1) L.push('vif(modelo)                       # multicolinealidad (VIF > 10 es problema)');
    L.push('', '# 4. Predicción -------------------------------------------');
    if (tipo === 'simple') L.push('predict(modelo, newdata = data.frame(x = ' + num(d.x[0]) + '), interval = "prediction")');
    else L.push('predict(modelo, newdata = data.frame(' + d.X.map((c, j) => 'X' + (j + 1) + ' = ' + num(c[0])).join(', ') + '), interval = "prediction")');
    L.push('', '# 5. Gráficos ---------------------------------------------------');
    if (tipo === 'simple') L.push('plot(datos$x, datos$y, pch = 16, col = "steelblue", xlab = "X", ylab = "Y")', 'abline(modelo, col = "red", lwd = 2)');
    L.push('par(mfrow = c(2, 2)); plot(modelo); par(mfrow = c(1, 1))   # diagnóstico de residuos');
    return L.join('\n') + '\n';
  }

  function codigoPy(tipo, d, r) {
    const k = tipo === 'simple' ? 1 : d.X.length, L = cabecera('py');
    L.push('import importlib.util, subprocess, sys',
      'for _mod, _pip in (("statsmodels", "statsmodels"), ("scipy", "scipy"), ("matplotlib", "matplotlib")):',
      '    if importlib.util.find_spec(_mod) is None:',
      '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", _pip])', '',
      'import numpy as np, pandas as pd',
      'import scipy.stats as st',
      'import statsmodels.api as sm',
      'import statsmodels.formula.api as smf',
      'from statsmodels.stats.diagnostic import het_breuschpagan',
      'from statsmodels.stats.stattools import durbin_watson',
      'from statsmodels.stats.outliers_influence import variance_inflation_factor',
      'import matplotlib.pyplot as plt', '', '# 1. Datos ------------------------------------------------');
    if (tipo === 'simple') L.push('df = pd.DataFrame({', '    "x": ' + H.pyVec(d.x) + ',', '    "y": ' + H.pyVec(d.y), '})');
    else L.push('df = pd.DataFrame({', ...d.X.map((c, j) => '    "X' + (j + 1) + '": ' + H.pyVec(c) + ','), '    "y": ' + H.pyVec(d.y), '})');
    const fo = tipo === 'simple' ? 'y ~ x' : 'y ~ ' + d.X.map((_, j) => 'X' + (j + 1)).join(' + ');
    L.push('', '# 2. Modelo ------------------------------------------------',
      'modelo = smf.ols("' + fo + '", data=df).fit()',
      'print(modelo.summary())                    # coeficientes, R², R² ajustado, F, IC 95 %',
      'print(sm.stats.anova_lm(modelo, typ=1))    # tabla ANOVA (secuencial)', '',
      '# 3. Supuestos -----------------------------------------------',
      'res = modelo.resid',
      'print("Shapiro-Wilk (normalidad):", st.shapiro(res))',
      'lm_stat, lm_p, f_stat, f_p = het_breuschpagan(res, modelo.model.exog)',
      'print("Breusch-Pagan (homocedasticidad): p =", lm_p)',
      'print("Durbin-Watson (independencia):", durbin_watson(res))');
    if (k > 1) L.push('exog = modelo.model.exog', 'for j, nombre in enumerate(modelo.model.exog_names):', '    if nombre != "Intercept":', '        print("VIF", nombre, "=", variance_inflation_factor(exog, j))   # > 10 es problema');
    L.push('', '# 4. Predicción -------------------------------------------');
    if (tipo === 'simple') L.push('nuevo = pd.DataFrame({"x": [' + num(d.x[0]) + ']})');
    else L.push('nuevo = pd.DataFrame({' + d.X.map((c, j) => '"X' + (j + 1) + '": [' + num(c[0]) + ']').join(', ') + '})');
    L.push('print(modelo.get_prediction(nuevo).summary_frame(alpha=0.05))   # incluye IC y intervalo de predicción', '', '# 5. Gráficos ---------------------------------------------------');
    if (tipo === 'simple') L.push('plt.scatter(df["x"], df["y"], color="steelblue")', 'xs = np.linspace(df["x"].min(), df["x"].max(), 100)', 'plt.plot(xs, modelo.params["Intercept"] + modelo.params["x"] * xs, color="red")', 'plt.xlabel("X"); plt.ylabel("Y"); plt.show()');
    L.push('plt.scatter(modelo.fittedvalues, res, color="steelblue"); plt.axhline(0, color="gray")', 'plt.xlabel("Valores ajustados"); plt.ylabel("Residuos"); plt.show()');
    return L.join('\n') + '\n';
  }

  function spec(tipo, d, r, ctx, resumen) {
    const k = tipo === 'simple' ? 1 : d.X.length, n = d.y.length, an = r.anova;
    const sub = (x, y) => `<i>${x}</i><sub>${y}</sub>`;
    const S = { titulo: tipo === 'simple' ? 'Informe de regresión lineal simple' : 'Informe de regresión lineal múltiple', subtitulo: 'n = ' + n + ' observaciones', contexto: (ctx || '').trim(), nombreBase: tipo === 'simple' ? 'regresion_simple' : 'regresion_multiple' };
    S.secciones = [];
    const fTex = tipo === 'simple' ? 'y_i=\\beta_0+\\beta_1 x_i+\\varepsilon_i,\\quad \\varepsilon_i\\sim N(0,\\sigma^2)' : 'y_i=\\beta_0+\\beta_1 x_{i1}+\\cdots+\\beta_{' + k + '}x_{i' + k + '}+\\varepsilon_i,\\quad \\varepsilon_i\\sim N(0,\\sigma^2)';
    S.secciones.push({ h: '1. Modelo e hipótesis', items: [
      { formula: { html: tipo === 'simple' ? 'y<sub>i</sub> = β<sub>0</sub> + β<sub>1</sub>x<sub>i</sub> + ε<sub>i</sub>,  ε<sub>i</sub> ~ N(0, σ²)' : 'y<sub>i</sub> = β<sub>0</sub> + β<sub>1</sub>x<sub>i1</sub> + … + β<sub>' + k + '</sub>x<sub>i' + k + '</sub> + ε<sub>i</sub>,  ε<sub>i</sub> ~ N(0, σ²)', tex: fTex, parts: tipo === 'simple' ? ['y', ['i'], ' = β', ['0'], ' + β', ['1'], 'x', ['i'], ' + ε', ['i'], ',   ε', ['i'], ' ~ N(0, σ²)'] : ['y', ['i'], ' = β', ['0'], ' + β', ['1'], 'x', ['i1'], ' + … + β', ['' + k], 'x', ['i' + k], ' + ε', ['i'], ',   ε', ['i'], ' ~ N(0, σ²)'] } },
      { p: tipo === 'simple' ? 'Prueba global: H₀: β₁ = 0 (no hay relación lineal) frente a H₁: β₁ ≠ 0. Mínimos cuadrados: b₁ = Sxy / Sxx; b₀ = ȳ − b₁·x̄.' : 'Prueba global: H₀: β₁ = … = β' + 'k = 0 frente a H₁: al menos un β distinto de cero. Estimación por mínimos cuadrados: b = (XᵀX)⁻¹Xᵀy. Cada coeficiente se prueba con una t de Student (H₀: βⱼ = 0, controlando por las demás variables).' },
      { formula: { html: 'R² = SC<sub>reg</sub> / SC<sub>total</sub>' + (tipo === 'multiple' ? ' &nbsp;&nbsp; R²<sub>aj</sub> = 1 − (1 − R²)(n − 1)/(n − k − 1)' : '') + ' &nbsp;&nbsp; F = CM<sub>reg</sub> / CM<sub>error</sub>', tex: 'R^2=\\frac{SC_{\\text{reg}}}{SC_{\\text{total}}}' + (tipo === 'multiple' ? ',\\quad R^2_{aj}=1-(1-R^2)\\frac{n-1}{n-k-1}' : '') + ',\\quad F=\\frac{CM_{\\text{reg}}}{CM_{\\text{error}}}', parts: ['R² = SC', ['reg'], ' / SC', ['total'], tipo === 'multiple' ? '     R²' : '', tipo === 'multiple' ? ['aj'] : '', tipo === 'multiple' ? ' = 1 − (1 − R²)(n − 1)/(n − k − 1)' : '', '     F = CM', ['reg'], ' / CM', ['error']].filter(x => x !== '') } }
    ] });
    const maxFilas = 40, filas = [];
    for (let i = 0; i < Math.min(n, maxFilas); i++) filas.push([String(i + 1), ...(tipo === 'simple' ? [num(d.x[i])] : d.X.map(c => num(c[i]))), num(d.y[i])]);
    S.secciones.push({ h: '2. Datos', items: [{ tabla: { cab: ['#', ...(tipo === 'simple' ? ['X'] : d.X.map((_, j) => 'X' + (j + 1))), 'Y'], filas, izq: 1 } }].concat(n > maxFilas ? [{ nota: 'Se muestran las primeras ' + maxFilas + ' de ' + n + ' observaciones.' }] : []) });
    const items = [
      { box: 'Ecuación ajustada: ' + generarEcuacion(tipo, r) },
      { tabla: { cab: ['Fuente', 'SC', 'gl', 'CM', '$F$', '$p$'], filas: [['Regresión', f(an.ssr), an.dfR, f(an.msr), f(an.f), p(an.pF)], ['Residual', f(an.sse), an.dfE, f(an.mse), '', ''], ['Total', f(an.sst), an.dfR + an.dfE, '', '', '']] } },
      { p: 'R² = ' + f(r.r2, 4) + (tipo === 'multiple' ? '; R² ajustado = ' + f(r.r2Ajustado, 4) : '; r = ' + f(r.r, 4)) + '; error estándar de la estimación = ' + f(r.se, 4) + '.' }
    ];
    const coefs = tipo === 'simple' ? [['b₀ (intercepto)', r.b0, r.seB0, r.tB0, r.pB0], ['b₁ (pendiente)', r.b1, r.seB1, r.tB1, r.pB1]] : r.coeficientes.map(c => [c.nombre, c.valor, c.se, c.t, c.p]);
    items.push({ tabla: { cab: ['Coeficiente', 'Valor', 'Error est.', '$t$', '$p$'], filas: coefs.map(c => [c[0], f(c[1], 4), f(c[2], 4), f(c[3]), p(c[4])]) } });
    S.secciones.push({ h: '3. Resultados', items });
    if (tipo === 'simple') {
      const x0 = Math.min(...d.x), x1 = Math.max(...d.x), rec = [[x0, r.predict(x0)], [x1, r.predict(x1)]];
      let img = null; try { img = H.dispersionPNG(d.x, d.y, rec); } catch (e) { }
      const pts = d.x.map((v, i) => '(' + num(v) + ',' + num(d.y[i]) + ')').join(' ');
      const pgf = '\\begin{tikzpicture}\\begin{axis}[width=0.9\\textwidth,height=7cm,xlabel={$X$},ylabel={$Y$},grid=major]\\addplot[only marks,mark=*,blue!70!black] coordinates {' + pts + '};\\addplot[red,thick] coordinates {(' + num(x0) + ',' + num(rec[0][1]) + ') (' + num(x1) + ',' + num(rec[1][1]) + ')};\\end{axis}\\end{tikzpicture}\\caption{Diagrama de dispersi\\\'on y recta ajustada.}';
      S.secciones.push({ h: '4. Gráfico', items: [img ? { img, w: 560, h: 324 } : { p: '' }, { pgf }].filter(i => i.img || i.pgf) });
    }
    S.secciones.push({ h: (tipo === 'simple' ? '5' : '4') + '. Conclusión', items: [{ box: resumen }, { nota: 'Antes de confiar en el modelo, verifica los supuestos (linealidad, normalidad y varianza constante de residuos, independencia' + (tipo === 'multiple' ? ', ausencia de multicolinealidad' : '') + '); el código incluido las evalúa.' }] });
    S.pie = 'Referencias: Montgomery, D. C., Peck, E. A. y Vining, G. G. (2021). Introduction to Linear Regression Analysis. Wiley; Kutner et al. (2005). Applied Linear Statistical Models. McGraw-Hill.';
    S.codigoR = codigoR(tipo, d, r); S.codigoPy = codigoPy(tipo, d, r);
    return S;
  }

  function montar(el, tipo, datos, r) {
    const resumen = generarResumenReg(armarPayloadReg(tipo, {}, r, '', ''));
    HPCodigo.montar(el, function () { const c = document.getElementById('contexto'); return spec(tipo, datos, r, c ? c.value : '', resumen); });
  }
  return { spec, montar, codigoR, codigoPy };
})();
if (typeof module !== 'undefined') module.exports = CodigoRegresion;
