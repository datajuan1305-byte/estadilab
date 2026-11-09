/* Código R/Python e informe del diseño factorial 2^k — Estadilab (usa ../../js/hp-codigo.js) */
const CodigoFactorial = (function () {
  const H = HPCodigo, f = (v, d = 4) => H.fmt(v, d), num = v => H.num(v, 12);
  const cab = len => ['# ============================================================', '# Diseño factorial 2^k — código generado por Estadilab', '# https://estadilab.com/diseno-factorial/   (' + new Date().toISOString().slice(0, 10) + ')', len === 'r' ? '# Pega este código en RStudio (solo usa R base).' : '# Pégalo en Google Colab o Jupyter. Los paquetes que falten se instalan solos.', '# ============================================================'];
  const LET = ['A', 'B', 'C', 'D', 'E'];
  function columnas(r0) {
    // r0: resultado de analizarFactorial → vectores de signos (cada corrida repetida r veces) y respuesta en el mismo orden
    const cols = LET.slice(0, r0.k).map((_, j) => []), y = [];
    r0.corridas.forEach((c, i) => { for (let m = 0; m < r0.r; m++) { c.signos.forEach((s, j) => cols[j].push(s)); } });
    return cols;
  }
  function datosY(datos) { const y = []; datos.forEach(reps => reps.forEach(v => y.push(v))); return y; }
  function formula(k) { return LET.slice(0, k).join('*'); }
  function codigoR(r0, datos) {
    const cols = columnas(r0), k = r0.k;
    return [...cab('r'), '', '# 1. Datos (niveles codificados −1 / +1; réplicas en filas consecutivas) ---',
      'datos <- data.frame(', ...cols.map((c, j) => '  ' + LET[j] + ' = ' + H.rVec(c) + ','), '  y = ' + H.rVec(datosY(datos)), ')', '',
      '# 2. Modelo con todos los efectos e interacciones --------------',
      'modelo <- lm(y ~ ' + formula(k) + ', data = datos)      # A*B*C = efectos principales + interacciones',
      'anova(modelo)                                       # SC, F y p de cada efecto',
      'efectos <- 2 * coef(modelo)[-1]                     # efecto estimado = 2 × coeficiente (niveles ±1)',
      'print(round(efectos, 4))',
      'summary(modelo)$r.squared                           # R²', '',
      '# 3. Gráficos de efectos --------------------------------------',
      'barplot(sort(abs(efectos), decreasing = TRUE), las = 2, col = "steelblue", main = "Pareto de efectos")',
      'qqnorm(efectos, main = "Gráfico normal de efectos"); qqline(efectos)',
      '# Gráfico de interacción (ejemplo con A y B): interaction.plot(datos$A, datos$B, datos$y)', ''].join('\n');
  }
  function codigoPy(r0, datos) {
    const cols = columnas(r0), k = r0.k;
    return [...cab('py'), 'import importlib.util, subprocess, sys', 'for _mod, _pip in (("statsmodels", "statsmodels"), ("matplotlib", "matplotlib")):', '    if importlib.util.find_spec(_mod) is None:', '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", _pip])', '',
      'import numpy as np, pandas as pd', 'import statsmodels.api as sm', 'import statsmodels.formula.api as smf', 'import scipy.stats as st', 'import matplotlib.pyplot as plt', '',
      '# 1. Datos (niveles codificados −1 / +1; réplicas en filas consecutivas) ---',
      'df = pd.DataFrame({', ...cols.map((c, j) => '    "' + LET[j] + '": ' + H.pyVec(c) + ','), '    "y": ' + H.pyVec(datosY(datos)), '})', '',
      '# 2. Modelo con todos los efectos e interacciones --------------',
      'modelo = smf.ols("y ~ ' + formula(k) + '", data=df).fit()   # A*B*C = efectos principales + interacciones',
      'print(sm.stats.anova_lm(modelo, typ=1))                  # SC, F y p de cada efecto',
      'efectos = 2 * modelo.params.drop("Intercept")           # efecto estimado = 2 × coeficiente (niveles ±1)',
      'print(efectos.round(4))',
      'print("R2 =", round(modelo.rsquared, 4))', '',
      '# 3. Gráficos de efectos --------------------------------------',
      'fig, ax = plt.subplots(1, 2, figsize=(11, 4))',
      'ef_ord = efectos.abs().sort_values(ascending=False); ax[0].bar(ef_ord.index, ef_ord.values, color="steelblue"); ax[0].set_title("Pareto de efectos")',
      'st.probplot(efectos.values, plot=ax[1]); ax[1].set_title("Gráfico normal de efectos"); plt.show()', ''].join('\n');
  }
  function spec(r, datos, ctx, resumen) {
    const k = r.k, S = { titulo: 'Informe de diseño factorial 2^' + k, subtitulo: k + ' factores · ' + r.r + ' réplicas · N = ' + r.N + ' observaciones', contexto: (ctx || '').trim(), nombreBase: 'factorial_2k' + k };
    const ord = [...r.efectos].sort((a, b) => Math.abs(b.efecto) - Math.abs(a.efecto));
    let img = null; try { img = H.barrasPNG(ord.map(e => e.nombre), ord.map(e => e.efecto), null, ord.map(e => e.significativo ? '*' : ''), 'Efecto estimado'); } catch (e) { }
    const pgf = '\\begin{tikzpicture}\\begin{axis}[ybar,width=0.9\\textwidth,height=7cm,ymajorgrids,ylabel={Efecto estimado},symbolic x coords={' + ord.map(e => e.nombre).join(',') + '},xtick=data,enlarge x limits=0.1]\\addplot+[fill=blue!30,draw=blue!60!black] coordinates {' + ord.map(e => '(' + e.nombre + ',' + num(e.efecto) + ')').join(' ') + '};\\end{axis}\\end{tikzpicture}\\caption{Efectos estimados ordenados por magnitud.}';
    const filasDatos = r.corridas.map((c, i) => [c.etiqueta, ...c.signos.map(s => s === 1 ? '+' : '−'), r.mediasCorrida[i].toFixed(4), datos[i].map(num).join('; ')]);
    S.secciones = [
      { h: '1. Modelo', items: [{ formula: { html: 'y = β<sub>0</sub> + Σβ<sub>i</sub>x<sub>i</sub> + Σβ<sub>ij</sub>x<sub>i</sub>x<sub>j</sub> + … + ε,   efecto = contraste / (r·2<sup>k−1</sup>),   SC = contraste² / (r·2<sup>k</sup>)', tex: '\\text{Efecto}=\\frac{\\text{contraste}}{r\\,2^{k-1}},\\qquad SC=\\frac{(\\text{contraste})^2}{r\\,2^{k}},\\qquad F=\\frac{SC}{CM_{\\text{error}}}', parts: ['Efecto = contraste / (r·2', ['k−1'], '),   SC = contraste² / (r·2', ['k'], '),   F = SC / CM', ['error']] } }, { p: 'Cada efecto tiene 1 grado de libertad. El error se estima con la variabilidad entre réplicas dentro de cada corrida (gl error = ' + r.dfE + '). H₀ de cada efecto: el efecto es cero.' }] },
      { h: '2. Datos por corrida', items: [{ tabla: { cab: ['Corrida', ...LET.slice(0, k), 'Media', 'Réplicas'], filas: filasDatos, izq: 1, fmt: 'l' + 'c'.repeat(k) + 'rl' } }] },
      { h: '3. Efectos y tabla ANOVA', items: [{ tabla: { cab: ['Efecto', 'Estimado', 'SC', '$F$', '$p$', 'Conclusión'], filas: r.efectos.map(e => [e.nombre, f(e.efecto), f(e.ss), f(e.f, 3), f(e.p), e.significativo ? 'Significativo' : 'No significativo']).concat([['Error', '', f(r.sse), '', '', 'gl = ' + r.dfE], ['Total', '', f(r.sst), '', '', 'gl = ' + r.dfT]]), izq: 1, fmt: 'lrrrrl' } }, { p: 'R² = ' + f(r.r2, 4) + '; CM error = ' + f(r.mse, 4) + ' con ' + r.dfE + ' grados de libertad.' }] },
      { h: '4. Gráfico de efectos', items: [img ? { img, w: 560, h: 324 } : null, { pgf }, { nota: 'Un asterisco indica efecto significativo (p < 0,05).' }].filter(Boolean) },
      { h: '5. Conclusión', items: [{ box: resumen }, { nota: 'Si una interacción es significativa, interpreta los factores involucrados en conjunto y no por separado.' }] }];
    S.pie = 'Referencias: Montgomery, D. C. (2017). Design and Analysis of Experiments. Wiley; Box, G. E. P., Hunter, J. S. y Hunter, W. G. (2005). Statistics for Experimenters. Wiley.';
    S.codigoR = codigoR(r, datos); S.codigoPy = codigoPy(r, datos);
    return S;
  }
  function montar(el, datos, r) {
    HPCodigo.montar(el, function () { const c = document.getElementById('contexto'), ctx = c ? c.value : ''; return spec(r, datos, ctx, generarResumenFactorial(armarPayloadFactorial({}, r, ctx, ''))); });
  }
  return { spec, montar, codigoR, codigoPy };
})();
if (typeof module !== 'undefined') module.exports = CodigoFactorial;
