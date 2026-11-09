/* Generador de código R y Python para el ANOVA de un factor — Estadilab
   Recibe el objeto de resultados R de la calculadora y devuelve código listo para ejecutar,
   con los datos del usuario incrustados. */
const CodigoANOVA = (function () {
  const num = v => { const s = String(v); return s; };
  const rStr = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const pyStr = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const NOMBRE = { tukey: 'Tukey HSD (Tukey-Kramer si los n son desiguales)', duncan: 'Duncan', snk: 'Student-Newman-Keuls (SNK)', lsd: 'DMS / LSD de Fisher', bonferroni: 'Bonferroni', scheffe: 'Scheffé' };

  function fecha() { const d = new Date(); return d.toISOString().slice(0, 10); }

  // ───────────────────────── R ─────────────────────────
  function codigoR(R, op) {
    op = Object.assign({ supuestos: true, alternativas: true, potencia: true, grafico: true }, op || {});
    const k = R.nombres.length, ns = R.grupos.map(g => g.length), metodo = R.comp.metodo, alpha = R.alpha, A = R.A;
    const L = [];
    L.push('# ============================================================');
    L.push('# ANOVA de un factor — código generado por Estadilab');
    L.push('# https://estadilab.com/anova/   (' + fecha() + ')');
    L.push('# Pega este código en RStudio o en https://webr.r-wasm.org/latest/');
    L.push('# ============================================================');
    L.push('');
    L.push('# Paquetes: los que falten se instalan solos (la primera vez puede tardar unos minutos)');
    const pk = ['car', 'agricolae'];
    if (op.alternativas) pk.push('rstatix', 'FSA');
    L.push('for (p in c(' + pk.map(function (x) { return '"' + x + '"'; }).join(', ') + '))');
    L.push('  if (!requireNamespace(p, quietly = TRUE)) install.packages(p, repos = "https://cloud.r-project.org")');
    L.push('library(car); library(agricolae)' + (op.alternativas ? '; library(rstatix); library(FSA)' : ''));
    L.push('');
    L.push('# 1. Datos ------------------------------------------------');
    L.push('trat <- c(' + R.nombres.map(rStr).join(', ') + ')');
    L.push('datos <- data.frame(');
    L.push('  tratamiento = factor(rep(trat, times = c(' + ns.join(', ') + ')), levels = trat),');
    L.push('  y = c(');
    R.grupos.forEach((g, i) => L.push('    ' + g.map(num).join(', ') + (i < k - 1 ? ',' : '') + '   # ' + R.nombres[i]));
    L.push('  )');
    L.push(')');
    L.push('alpha <- ' + alpha);
    L.push('');
    L.push('# 2. Estadística descriptiva ---------------------------------');
    L.push('aggregate(y ~ tratamiento, data = datos, FUN = function(x) c(n = length(x), media = mean(x), sd = sd(x)))');
    L.push('');
    L.push('# 3. ANOVA de un factor ------------------------------------');
    L.push('modelo <- aov(y ~ tratamiento, data = datos)');
    L.push('summary(modelo)');
    L.push('ss <- summary(modelo)[[1]][["Sum Sq"]]; gl <- summary(modelo)[[1]][["Df"]]');
    L.push('eta2   <- ss[1] / sum(ss)                                   # eta cuadrado');
    L.push('omega2 <- (ss[1] - gl[1] * ss[2] / gl[2]) / (sum(ss) + ss[2] / gl[2])   # omega cuadrado');
    L.push('c(eta2 = eta2, omega2 = omega2)');
    if (op.supuestos) {
      L.push('');
      L.push('# 4. Supuestos --------------------------------------------');
      L.push('shapiro.test(residuals(modelo))                                    # normalidad de residuos');
      L.push('leveneTest(y ~ tratamiento, data = datos, center = median)         # Levene (Brown-Forsythe)');
      L.push('leveneTest(y ~ tratamiento, data = datos, center = mean)           # Levene con la media');
      L.push('bartlett.test(y ~ tratamiento, data = datos)                       # Bartlett');
      L.push('par(mfrow = c(1, 2)); plot(modelo, which = 1:2); par(mfrow = c(1, 1))   # residuos vs ajustados y Q-Q');
    }
    L.push('');
    L.push('# 5. Comparaciones múltiples: ' + NOMBRE[metodo] + ' -------------');
    const m5 = {
      tukey: ['TukeyHSD(modelo, "tratamiento", conf.level = 1 - alpha)', 'HSD.test(modelo, "tratamiento", alpha = alpha, group = TRUE)   # letras de grupos homogéneos'],
      duncan: ['duncan.test(modelo, "tratamiento", alpha = alpha, group = TRUE)'],
      snk: ['SNK.test(modelo, "tratamiento", alpha = alpha, group = TRUE)'],
      lsd: ['LSD.test(modelo, "tratamiento", alpha = alpha, p.adj = "none", group = TRUE)'],
      bonferroni: ['pairwise.t.test(datos$y, datos$tratamiento, p.adjust.method = "bonferroni")', 'LSD.test(modelo, "tratamiento", alpha = alpha, p.adj = "bonferroni", group = TRUE)   # letras'],
      scheffe: ['scheffe.test(modelo, "tratamiento", alpha = alpha, group = TRUE)']
    }[metodo];
    m5.forEach(l => L.push(l));
    if (op.alternativas) {
      L.push('');
      L.push('# 6. Alternativas si fallan los supuestos --------------------');
      L.push('oneway.test(y ~ tratamiento, data = datos, var.equal = FALSE)     # ANOVA de Welch');
      L.push('games_howell_test(datos, y ~ tratamiento)                         # comparaciones Games-Howell');
      L.push('kruskal.test(y ~ tratamiento, data = datos)                        # Kruskal-Wallis');
      L.push('dunnTest(y ~ tratamiento, data = datos, method = "holm")           # comparaciones de Dunn (Holm)');
    }
    if (op.potencia) {
      const c = (typeof cfgPot !== 'undefined' && cfgPot) ? cfgPot : { k: k, sigma: A.sp, delta: Math.max(...A.medias) - Math.min(...A.medias), pot: 0.8 };
      L.push('');
      L.push('# 7. Potencia ------------------------------------------------');
      L.push('# Potencia observada (a posteriori) con los datos actuales:');
      L.push('F_c <- qf(1 - alpha, ' + A.dfB + ', ' + A.dfW + ')');
      L.push('pf(F_c, ' + A.dfB + ', ' + A.dfW + ', ncp = ss[1] / (ss[2] / gl[2]), lower.tail = FALSE)');
      L.push('# Repeticiones por tratamiento para detectar una diferencia Δ entre las dos medias extremas');
      L.push('# (el resto al centro) con desviación del error σ y potencia deseada:');
      L.push('k <- ' + c.k + '; sigma <- ' + num(+(+c.sigma).toPrecision(6)) + '; delta <- ' + num(+(+c.delta).toPrecision(6)) + '; potencia <- ' + (c.pot || 0.8));
      L.push('tryCatch(');
      L.push('  power.anova.test(groups = k, between.var = delta^2 / (2 * (k - 1)), within.var = sigma^2,');
      L.push('                   sig.level = alpha, power = potencia),        # n = repeticiones por tratamiento');
      L.push('  error = function(e) message("Con ese efecto bastan menos de 2 repeticiones por tratamiento."))');
    }
    if (op.grafico) {
      L.push('');
      L.push('# 8. Gráfico ---------------------------------------------------');
      L.push('boxplot(y ~ tratamiento, data = datos, col = "lightblue", ylab = "Respuesta", xlab = "Tratamiento")');
      L.push('stripchart(y ~ tratamiento, data = datos, vertical = TRUE, method = "jitter", pch = 16, add = TRUE)');
    }
    return L.join('\n') + '\n';
  }

  // ───────────────────────── Python ─────────────────────────
  function codigoPython(R, op) {
    op = Object.assign({ supuestos: true, alternativas: true, potencia: true, grafico: true }, op || {});
    const k = R.nombres.length, metodo = R.comp.metodo, alpha = R.alpha, A = R.A;
    const L = [];
    L.push('# ============================================================');
    L.push('# ANOVA de un factor — código generado por Estadilab');
    L.push('# https://estadilab.com/anova/   (' + fecha() + ')');
    L.push('# Pégalo en Google Colab o Jupyter. Los paquetes que falten se instalan solos.');
    L.push('# ============================================================');
    L.push('import importlib.util, subprocess, sys');
    L.push('for _mod, _pip in (("statsmodels", "statsmodels"), ("scikit_posthocs", "scikit-posthocs"), ("pingouin", "pingouin")):');
    L.push('    if importlib.util.find_spec(_mod) is None:');
    L.push('        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", _pip])');
    L.push('');
    L.push('import numpy as np, pandas as pd');
    L.push('import scipy.stats as st');
    L.push('import statsmodels.api as sm');
    L.push('from statsmodels.formula.api import ols');
    L.push('from statsmodels.stats.multicomp import pairwise_tukeyhsd');
    L.push('import scikit_posthocs as sp');
    L.push('import pingouin as pg');
    L.push('');
    L.push('# 1. Datos ------------------------------------------------');
    L.push('grupos = {');
    R.nombres.forEach((n, i) => L.push('    ' + pyStr(n) + ': [' + R.grupos[i].map(num).join(', ') + '],'));
    L.push('}');
    L.push('df = pd.DataFrame([(t, v) for t, vs in grupos.items() for v in vs], columns=["tratamiento", "y"])');
    L.push('df["tratamiento"] = pd.Categorical(df["tratamiento"], categories=list(grupos), ordered=True)');
    L.push('alpha = ' + alpha);
    L.push('datos = [np.array(v, dtype=float) for v in grupos.values()]');
    L.push('');
    L.push('# 2. Estadística descriptiva ---------------------------------');
    L.push('print(df.groupby("tratamiento", observed=True)["y"].agg(["count", "mean", "std"]))');
    L.push('');
    L.push('# 3. ANOVA de un factor ------------------------------------');
    L.push('modelo = ols("y ~ C(tratamiento)", data=df).fit()');
    L.push('tabla = sm.stats.anova_lm(modelo, typ=1)');
    L.push('print(tabla)');
    L.push('ssb, ssw = tabla["sum_sq"].iloc[0], tabla["sum_sq"].iloc[1]');
    L.push('dfb, dfw = tabla["df"].iloc[0], tabla["df"].iloc[1]');
    L.push('msw = ssw / dfw');
    L.push('eta2 = ssb / (ssb + ssw)');
    L.push('omega2 = (ssb - dfb * msw) / (ssb + ssw + msw)');
    L.push('print(f"eta2 = {eta2:.4f}   omega2 = {omega2:.4f}")');
    if (op.supuestos) {
      L.push('');
      L.push('# 4. Supuestos --------------------------------------------');
      L.push('print("Shapiro-Wilk (residuos):", st.shapiro(modelo.resid))');
      L.push('print("Levene (mediana):", st.levene(*datos, center="median"))');
      L.push('print("Levene (media):", st.levene(*datos, center="mean"))');
      L.push('print("Bartlett:", st.bartlett(*datos))');
    }
    L.push('');
    L.push('# 5. Comparaciones múltiples: ' + NOMBRE[metodo] + ' -------------');
    if (metodo === 'tukey') {
      L.push('tukey = pairwise_tukeyhsd(df["y"], df["tratamiento"].astype(str), alpha=alpha)   # Tukey-Kramer si los n son desiguales');
      L.push('print(tukey.summary())');
    } else if (metodo === 'duncan' || metodo === 'snk') {
      L.push(RANGOS_PY.replace(/__M__/g, pyStr(metodo)));
      L.push('print(rangos_multiples(df, "tratamiento", "y", msw, dfw, alpha, ' + pyStr(metodo) + '))');
    } else if (metodo === 'lsd') {
      L.push('# DMS / LSD de Fisher: pruebas t con el error combinado del ANOVA, sin ajuste');
      L.push(PARES_T_PY);
      L.push('print(pares_t(grupos, msw, dfw, ajuste="none"))');
    } else if (metodo === 'bonferroni') {
      L.push(PARES_T_PY);
      L.push('print(pares_t(grupos, msw, dfw, ajuste="bonferroni"))');
    } else if (metodo === 'scheffe') {
      L.push('print(sp.posthoc_scheffe(df, val_col="y", group_col="tratamiento"))   # matriz de valores p');
    }
    if (op.alternativas) {
      L.push('');
      L.push('# 6. Alternativas si fallan los supuestos --------------------');
      L.push('print(pg.welch_anova(data=df, dv="y", between="tratamiento"))          # ANOVA de Welch');
      L.push('print(pg.pairwise_gameshowell(data=df, dv="y", between="tratamiento")) # Games-Howell');
      L.push('print("Kruskal-Wallis:", st.kruskal(*datos))');
      L.push('print(sp.posthoc_dunn(df, val_col="y", group_col="tratamiento", p_adjust="holm"))   # Dunn con Holm');
    }
    if (op.potencia) {
      const c = (typeof cfgPot !== 'undefined' && cfgPot) ? cfgPot : { k: k, sigma: A.sp, delta: Math.max(...A.medias) - Math.min(...A.medias), pot: 0.8 };
      L.push('');
      L.push('# 7. Potencia ------------------------------------------------');
      L.push('# Potencia observada (a posteriori): λ = SC entre / CM error');
      L.push('fcrit = st.f.ppf(1 - alpha, dfb, dfw)');
      L.push('print("Potencia observada:", st.ncf.sf(fcrit, dfb, dfw, ssb / msw))');
      L.push('# Repeticiones por tratamiento para detectar Δ entre las dos medias extremas (el resto al centro)');
      L.push('k = ' + c.k + '; sigma = ' + num(+(+c.sigma).toPrecision(6)) + '; delta = ' + num(+(+c.delta).toPrecision(6)) + '; potencia = ' + (c.pot || 0.8));
      L.push('f = delta / (sigma * np.sqrt(2 * k))                    # tamaño de efecto de Cohen');
      L.push('def potencia_n(n):                                      # potencia con n repeticiones por tratamiento');
      L.push('    N, d1 = k * n, k - 1; d2 = N - k');
      L.push('    return st.ncf.sf(st.f.ppf(1 - alpha, d1, d2), d1, d2, N * f ** 2)');
      L.push('n_req = next(n for n in range(2, 5001) if potencia_n(n) >= potencia)');
      L.push('print("Repeticiones por tratamiento:", n_req, "  potencia alcanzada:", round(potencia_n(n_req), 4))');
    }
    if (op.grafico) {
      L.push('');
      L.push('# 8. Gráfico ---------------------------------------------------');
      L.push('import matplotlib.pyplot as plt');
      L.push('ax = df.boxplot(column="y", by="tratamiento", grid=False)');
      L.push('plt.suptitle(""); plt.title(""); plt.ylabel("Respuesta"); plt.xlabel("Tratamiento"); plt.show()');
    }
    return L.join('\n') + '\n';
  }

  const PARES_T_PY = [
    'def pares_t(grupos, msw, dfw, ajuste="none"):',
    '    """Comparaciones por pares con el CM del error del ANOVA (LSD) y ajuste opcional de Bonferroni."""',
    '    nombres = list(grupos); m = len(nombres); filas = []',
    '    for i in range(m):',
    '        for j in range(i + 1, m):',
    '            a, b = np.array(grupos[nombres[i]], float), np.array(grupos[nombres[j]], float)',
    '            dif = a.mean() - b.mean(); se = np.sqrt(msw * (1 / len(a) + 1 / len(b)))',
    '            p = 2 * st.t.sf(abs(dif / se), dfw)',
    '            if ajuste == "bonferroni": p = min(1.0, p * m * (m - 1) / 2)',
    '            filas.append((f"{nombres[i]} - {nombres[j]}", dif, se, p, p < alpha))',
    '    return pd.DataFrame(filas, columns=["par", "diferencia", "EE", "p", "significativo"])'
  ].join('\n');

  const RANGOS_PY = [
    'def rangos_multiples(df, g, y, msw, dfw, alpha, metodo=__M__):',
    '    """Duncan o SNK con el CM del error del ANOVA. Aplica la regla de no significancia dentro de un subconjunto homogéneo."""',
    '    r = df.groupby(g, observed=True)[y].agg(["mean", "count"]).sort_values("mean", ascending=False)',
    '    nom, med, n = list(r.index.astype(str)), r["mean"].to_numpy(), r["count"].to_numpy(); k = len(nom)',
    '    ns = np.zeros((k, k), bool)                     # True = no significativo',
    '    for span in range(k, 1, -1):                    # de los rangos más amplios a los más estrechos',
    '        for i in range(0, k - span + 1):',
    '            j = i + span - 1',
    '            if any(ns[a, b] for a in range(0, i + 1) for b in range(j, k) if (a, b) != (i, j)):',
    '                ns[i, j] = True; continue            # contenido en un rango no significativo',
    '            a_p = alpha if metodo == "snk" else 1 - (1 - alpha) ** (span - 1)',
    '            q = st.studentized_range.ppf(1 - a_p, span, dfw)',
    '            crit = q * np.sqrt(msw / 2 * (1 / n[i] + 1 / n[j]))',
    '            ns[i, j] = (med[i] - med[j]) <= crit',
    '    filas = [(f"{nom[i]} - {nom[j]}", med[i] - med[j], j - i + 1, "no" if ns[i, j] else "sí") for i in range(k) for j in range(i + 1, k)]',
    '    return pd.DataFrame(filas, columns=["par", "diferencia", "pasos", "significativo"])'
  ].join('\n');

  return { codigoR, codigoPython, NOMBRE };
})();
if (typeof module !== 'undefined') module.exports = CodigoANOVA;
