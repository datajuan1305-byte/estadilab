/* Código R/Python e informe de estadística descriptiva — Estadilab (usa ../../js/hp-codigo.js) */
const CodigoDescriptiva = (function () {
  const H = HPCodigo, f = (v, d = 4) => H.fmt(v, d), num = H.num;
  const cab = len => ['# ============================================================', '# Estadística descriptiva — código generado por Estadilab', '# https://estadilab.com/descriptiva/   (' + new Date().toISOString().slice(0, 10) + ')', len === 'r' ? '# Pega este código en RStudio (solo usa R base, no necesita paquetes).' : '# Pégalo en Google Colab o Jupyter. Los paquetes que falten se instalan solos.', '# ============================================================'];

  function codigoR(d) {
    return [...cab('r'), '', '# 1. Datos ------------------------------------------------', 'x <- ' + H.rVec(d), 'n <- length(x); xs <- sort(x)', '',
      '# 2. Tendencia central ------------------------------------',
      'promedio <- mean(x); mediana <- median(x)',
      'moda <- { t <- table(x); if (max(t) == 1) "sin moda" else as.numeric(names(t)[t == max(t)]) }',
      'media_geom <- if (all(x > 0)) exp(mean(log(x))) else NA', '',
      '# 3. Robustos (recorte y winsorización del 5 %) ---------------',
      'g <- floor(n * 0.05)',
      'media_recort <- mean(x, trim = 0.05)',
      'xw <- xs; if (g > 0) { xw[1:g] <- xs[g + 1]; xw[(n - g + 1):n] <- xs[n - g] }',
      'media_wins <- mean(xw); sigma_wins <- sd(xw)',
      'dam <- median(abs(x - mediana))',
      'u <- (x - mediana) / (9 * dam); k <- abs(u) < 1',
      'sbi <- sqrt(n * sum((x[k] - mediana)^2 * (1 - u[k]^2)^4)) / abs(sum((1 - u[k]^2) * (1 - 5 * u[k]^2)))', '',
      '# 4. Dispersión -----------------------------------------------',
      'varianza <- var(x); desv <- sd(x); cv <- desv / abs(promedio) * 100; ee <- desv / sqrt(n)',
      'minimo <- min(x); maximo <- max(x); rango <- maximo - minimo', '',
      '# 5. Posición (percentiles tipo 7, el de Excel y R) -----------',
      'q <- quantile(x, c(1/6, 0.25, 0.75, 5/6), type = 7)',
      'riq <- q[3] - q[2]; rango_intersextil <- q[4] - q[1]', '',
      '# 6. Forma (momentos centrales) -------------------------------',
      'm2 <- mean((x - promedio)^2); m3 <- mean((x - promedio)^3); m4 <- mean((x - promedio)^4)',
      'sesgo <- m3 / m2^1.5; curtosis <- m4 / m2^2 - 3',
      'sesgo_est <- sesgo / sqrt(6 / n); curtosis_est <- curtosis / sqrt(24 / n)', '',
      '# 7. Resumen ---------------------------------------------------',
      'resumen <- c(Recuento = n, Promedio = promedio, Mediana = mediana, MediaGeometrica = media_geom,',
      '  MediaRecortada5 = media_recort, MediaWinsorizada5 = media_wins, SigmaWinsorizada5 = sigma_wins, DAM = dam, Sbi = sbi,',
      '  Varianza = varianza, DesvEst = desv, CV_pct = cv, ErrorEst = ee, Minimo = minimo, Maximo = maximo, Rango = rango,',
      '  Q1 = unname(q[2]), Q3 = unname(q[3]), RIQ = unname(riq), Sextil1_6 = unname(q[1]), Sextil5_6 = unname(q[4]),',
      '  RangoIntersextil = unname(rango_intersextil), Sesgo = sesgo, SesgoEst = sesgo_est, Curtosis = curtosis, CurtosisEst = curtosis_est,',
      '  Suma = sum(x), SumaCuadrados = sum(x^2))',
      'print(round(resumen, 4)); cat("Moda:", moda, "\\n")', '',
      '# 8. Valores atípicos (regla 1.5 × RIQ) ------------------------',
      'x[x < q[2] - 1.5 * riq | x > q[3] + 1.5 * riq]', '',
      '# 9. Gráficos ---------------------------------------------------',
      'par(mfrow = c(1, 2)); hist(x, col = "lightblue", main = "Histograma", xlab = "x"); boxplot(x, col = "lightblue", main = "Diagrama de caja"); par(mfrow = c(1, 1))', ''].join('\n');
  }
  function codigoPy(d) {
    return [...cab('py'), 'import importlib.util, subprocess, sys', 'for _mod, _pip in (("scipy", "scipy"), ("matplotlib", "matplotlib")):', '    if importlib.util.find_spec(_mod) is None:', '        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", _pip])', '',
      'import numpy as np', 'import scipy.stats as st', 'import matplotlib.pyplot as plt', '', '# 1. Datos ------------------------------------------------', 'x = np.array(' + H.pyVec(d) + ')', 'n = len(x); xs = np.sort(x)', '',
      '# 2. Tendencia central ------------------------------------',
      'promedio = x.mean(); mediana = np.median(x)',
      'vals, cuentas = np.unique(x, return_counts=True)',
      'moda = "sin moda" if cuentas.max() == 1 else vals[cuentas == cuentas.max()]',
      'media_geom = np.exp(np.log(x).mean()) if (x > 0).all() else None', '',
      '# 3. Robustos (recorte y winsorización del 5 %) ---------------',
      'g = int(np.floor(n * 0.05))',
      'media_recort = xs[g:n - g].mean()',
      'xw = xs.copy()',
      'if g > 0: xw[:g] = xs[g]; xw[n - g:] = xs[n - g - 1]',
      'media_wins = xw.mean(); sigma_wins = xw.std(ddof=1)',
      'dam = np.median(np.abs(x - mediana))',
      'u = (x - mediana) / (9 * dam); k = np.abs(u) < 1',
      'sbi = np.sqrt(n * np.sum((x[k] - mediana) ** 2 * (1 - u[k] ** 2) ** 4)) / abs(np.sum((1 - u[k] ** 2) * (1 - 5 * u[k] ** 2)))', '',
      '# 4. Dispersión -----------------------------------------------',
      'varianza = x.var(ddof=1); desv = x.std(ddof=1); cv = desv / abs(promedio) * 100; ee = desv / np.sqrt(n)',
      'minimo, maximo = x.min(), x.max(); rango = maximo - minimo', '',
      '# 5. Posición (percentiles por interpolación lineal, igual que Excel y R) ---',
      's1, q1, q3, s5 = np.percentile(x, [100 / 6, 25, 75, 500 / 6])',
      'riq = q3 - q1; rango_intersextil = s5 - s1', '',
      '# 6. Forma (momentos centrales) -------------------------------',
      'm2 = np.mean((x - promedio) ** 2); m3 = np.mean((x - promedio) ** 3); m4 = np.mean((x - promedio) ** 4)',
      'sesgo = m3 / m2 ** 1.5; curtosis = m4 / m2 ** 2 - 3',
      'sesgo_est = sesgo / np.sqrt(6 / n); curtosis_est = curtosis / np.sqrt(24 / n)', '',
      '# 7. Resumen ---------------------------------------------------',
      'resumen = {"Recuento": n, "Promedio": promedio, "Mediana": mediana, "MediaGeometrica": media_geom,',
      '  "MediaRecortada5": media_recort, "MediaWinsorizada5": media_wins, "SigmaWinsorizada5": sigma_wins, "DAM": dam, "Sbi": sbi,',
      '  "Varianza": varianza, "DesvEst": desv, "CV_pct": cv, "ErrorEst": ee, "Minimo": minimo, "Maximo": maximo, "Rango": rango,',
      '  "Q1": q1, "Q3": q3, "RIQ": riq, "Sextil1_6": s1, "Sextil5_6": s5, "RangoIntersextil": rango_intersextil,',
      '  "Sesgo": sesgo, "SesgoEst": sesgo_est, "Curtosis": curtosis, "CurtosisEst": curtosis_est, "Suma": x.sum(), "SumaCuadrados": (x ** 2).sum()}',
      'for k_, v_ in resumen.items(): print(f"{k_:20s}", None if v_ is None else round(float(v_), 4))',
      'print("Moda:", moda)', '',
      '# 8. Valores atípicos (regla 1.5 × RIQ) ------------------------',
      'print(x[(x < q1 - 1.5 * riq) | (x > q3 + 1.5 * riq)])', '',
      '# 9. Gráficos ---------------------------------------------------',
      'fig, ax = plt.subplots(1, 2, figsize=(10, 4)); ax[0].hist(x, bins="sturges", color="lightblue", edgecolor="k"); ax[0].set_title("Histograma"); ax[1].boxplot(x); ax[1].set_title("Diagrama de caja"); plt.show()', ''].join('\n');
  }
  function spec(datos, r, ctx, resumen, atip) {
    const n = datos.length, maxV = 120;
    const S = { titulo: 'Informe de estadística descriptiva', subtitulo: 'n = ' + n + ' datos', contexto: (ctx || '').trim(), nombreBase: 'descriptiva' };
    const T = (cab, filas) => ({ tabla: { cab, filas, izq: 1, fmt: 'lr' } });
    const nb = Math.max(5, Math.min(12, Math.round(Math.sqrt(n)))), mn = Math.min(...datos), mx = Math.max(...datos), an = (mx - mn) / nb || 1, bins = Array.from({ length: nb }, (_, i) => ({ a: mn + i * an, c: 0 }));
    datos.forEach(v => { let i = Math.floor((v - mn) / an); if (i >= nb) i = nb - 1; if (i < 0) i = 0; bins[i].c++; });
    let img = null; try { img = H.barrasPNG(bins.map(b => b.a.toFixed(1)), bins.map(b => b.c), null, null, 'Frecuencia'); } catch (e) { }
    const pgf = '\\begin{tikzpicture}\\begin{axis}[ybar interval,width=0.9\\textwidth,height=6.5cm,xlabel={Intervalos},ylabel={Frecuencia},ymin=0,grid=major]\\addplot+[fill=blue!30,draw=blue!60!black] coordinates {' + bins.map(b => '(' + num(b.a, 6) + ',' + b.c + ')').join(' ') + ' (' + num(mx, 6) + ',0)};\\end{axis}\\end{tikzpicture}\\caption{Histograma de frecuencias.}';
    S.secciones = [
      { h: '1. Datos', items: [{ p: n + ' observaciones' + (n > maxV ? ' (se muestran las primeras ' + maxV + ')' : '') + ': ' + datos.slice(0, maxV).join('; ') + '.' }] },
      { h: '2. Medidas de tendencia central', items: [T(['Medida', 'Valor'], [['Recuento', String(r.recuento)], ['Promedio', f(r.promedio)], ['Mediana', f(r.mediana)], ['Moda', r.moda.texto], ['Media geométrica', r.mediaGeometrica === null ? 'No aplica' : f(r.mediaGeometrica)]])] },
      { h: '3. Estadísticos robustos', items: [T(['Medida', 'Valor'], [['Media recortada 5 %', f(r.mediaRecortada5)], ['Media winsorizada 5 %', f(r.mediaWinsorizada5)], ['Sigma winsorizada 5 %', f(r.sigmaWinsorizada5)], ['DAM (desv. absoluta mediana)', f(r.dam)], ['Sbi (biweight midvariance)', f(r.sbi)]])] },
      { h: '4. Dispersión y posición', items: [T(['Medida', 'Valor'], [['Varianza', f(r.varianza)], ['Desviación estándar', f(r.desviacionEstandar)], ['Coeficiente de variación', f(r.coeficienteVariacion, 2) + ' %'], ['Error estándar', f(r.errorEstandar)], ['Mínimo', f(r.minimo)], ['Máximo', f(r.maximo)], ['Rango', f(r.rango)], ['Cuartil inferior (Q1)', f(r.cuartilInferior)], ['Cuartil superior (Q3)', f(r.cuartilSuperior)], ['Rango intercuartílico', f(r.rangoIntercuartilico)], ['Sextil 1/6', f(r.sextil1_6)], ['Sextil 5/6', f(r.sextil5_6)], ['Rango intersextil', f(r.rangoIntersextil)]])] },
      { h: '5. Forma de la distribución', items: [T(['Medida', 'Valor'], [['Sesgo', f(r.sesgo)], ['Sesgo estandarizado', f(r.sesgoEstandarizado)], ['Curtosis (exceso)', f(r.curtosis)], ['Curtosis estandarizada', f(r.curtosisEstandarizada)]]), { nota: 'Valores estandarizados fuera de [−2, 2] sugieren desviación significativa de la normalidad.' }] },
      { h: '6. Histograma', items: [img ? { img, w: 560, h: 324 } : null, { pgf }].filter(Boolean) },
      { h: '7. Conclusión', items: [{ box: resumen }, { p: atip }] }];
    S.pie = 'Referencias: Walpole, R. E. et al. (2012). Probabilidad y estadística para ingeniería y ciencias. Pearson; Hoaglin, Mosteller y Tukey (1983). Understanding Robust and Exploratory Data Analysis. Wiley.';
    S.codigoR = codigoR(datos); S.codigoPy = codigoPy(datos);
    return S;
  }
  function montar(el, datos, r) {
    const payload = armarPayloadDescriptiva(datos, r, '', '');
    HPCodigo.montar(el, function () {
      const c = document.getElementById('contexto'), ctx = c ? c.value : '';
      return spec(datos, r, ctx, generarResumenAutomaticoDescriptiva(armarPayloadDescriptiva(datos, r, ctx, '')), interpretarAtipicosDescriptiva(datos, r));
    });
  }
  return { spec, montar, codigoR, codigoPy };
})();
if (typeof module !== 'undefined') module.exports = CodigoDescriptiva;
