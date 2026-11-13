/* Normalidad y varianzas por lotes sobre «Mis datos» — Estadilab */
(function () {
  'use strict';
  const P = NPP, T0 = P.TESTS, V = NVM, fx = P.fx, fpv = P.fpv, rs = P.rs;
  const AVISO = 'Análisis exploratorio: al contrastar varias variables a la vez crece la probabilidad de falsos positivos. Se informa el valor p ajustado por Holm.';
  const ordenar = c => c.slice().sort((a, b) => { const na = Number(a), nb = Number(b); return (isFinite(na) && isFinite(nb)) ? na - nb : String(a).localeCompare(String(b), 'es'); });
  function demo() {
    let s = 20261114; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const z = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const f = [['Grupo', 'Altura (cm)', 'Peso (kg)', 'Tiempo de reacción (ms)', 'Ingreso (miles)']];
    for (let i = 0; i < 120; i++) { const g = ['A', 'B', 'C'][i % 3]; f.push([g, +(165 + 8 * z()).toFixed(1), +(68 + 10 * z() + (g === 'C' ? 4 : 0)).toFixed(1), +(300 + Math.exp(3.2 + 0.5 * z())).toFixed(0), +(Math.exp(2.4 + 0.7 * z())).toFixed(1)]); }
    return f;
  }
  const demoOk = c => c.nombre === 'Altura (cm)';
  const camposBase = (gTxt) => [{ id: 'cols', label: 'Variables numéricas', type: 'vars', tipo: 'num', min: 1, max: 10 }, { id: 'grp', label: gTxt, type: 'varsel', tipo: 'cat', maxDist: 12, vacio: '— no dividir —' }];
  function series(d) {
    const out = [], gv = d.grp ? HPDatos.valores(d.grp) : null;
    d.cols.forEach(nm => {
      const v = HPDatos.valores(nm);
      if (!d.grp) out.push({ nm, g: '', x: v.filter(u => u != null) });
      else { const ord = ordenar(Array.from(new Set(gv.filter(u => u != null)))); ord.forEach(g => out.push({ nm, g, x: v.filter((u, i) => u != null && gv[i] === g) })); }
    });
    return out;
  }
  const lab = s => s.nm + (s.g !== '' ? ' · ' + s.g : '');

  T0.normlote = {
    tab: 'norm', nombre: 'Normalidad por lotes (varias variables)', corto: 'Normalidad por lotes',
    cuando: 'Aplica Shapiro-Wilk, Anderson-Darling y las medidas de forma (asimetría y curtosis) a cada variable numérica elegida de «Mis datos», opcionalmente separada por grupos. Informa el valor p ajustado por Holm.',
    datos: 'De 1 a 10 variables numéricas de «Mis datos» (cada serie necesita al menos 3 datos).',
    supuestos: ['Observaciones independientes; variable cuantitativa continua.', 'H₀: la variable proviene de una distribución normal.', 'Con n grande cualquier desviación mínima resulta significativa; con n pequeña la prueba tiene poca potencia. Complemente con el gráfico Q-Q del panel individual.', 'Con varias series el análisis es exploratorio: use el p ajustado por Holm.'],
    campos: camposBase('Probar por separado en cada grupo de (opcional)'), demo, demoOk, ejemplo: { cols: ['Altura (cm)', 'Peso (kg)', 'Tiempo de reacción (ms)', 'Ingreso (miles)'], grp: '' },
    leer(v) { if (!HPDatos.hayDatos()) throw new Error('Primero cargue sus datos en «Mis datos».'); if (!(v.cols || []).length) throw new Error('Marque al menos una variable numérica.'); return { cols: v.cols.slice(), grp: v.grp && !v.cols.includes(v.grp) ? v.grp : '' }; },
    calc(d) {
      const ss = series(d), res = ss.map(s => { if (s.x.length < 3) return { s, error: 'n < 3' }; const sw = V.shapiroWilk(s.x), mo = V.momentos(s.x); let ad = null; try { ad = V.andersonDarling(s.x); } catch (e) { } return { s, sw, ad, mo }; });
      const ok = res.filter(x => !x.error), adj = HPDatos.holm(ok.map(x => x.sw.p)); ok.forEach((x, i) => { x.padj = adj[i]; }); return { res };
    },
    render(d, rr, a) {
      const res = rr.res, ok = res.filter(x => !x.error), no = ok.filter(x => x.padj < a);
      const tabla = { cab: ['Variable' + (d.grp ? ' · grupo' : ''), 'n', 'Shapiro W', 'p', 'p Holm', 'Anderson-Darling p', 'Asimetría g₁', 'Curtosis exc.', 'Decisión'], filas: res.map(x => x.error ? [lab(x.s), String(x.s.x.length), '—', '—', '—', '—', '—', '—', 'n insuficiente'] : [lab(x.s), String(x.s.x.length), fx(x.sw.W, 4), fpv(x.sw.p), fpv(x.padj), x.ad ? fpv(x.ad.p) : '—', fx(x.mo.g1, 2), fx(x.mo.curt, 2), x.padj < a ? 'No normal' : 'Compatible con normal']) };
      const av = [AVISO]; const peq = ok.filter(x => x.s.x.length < 20).length, gra = ok.filter(x => x.s.x.length > 200).length; if (peq) av.push(peq + ' serie(s) tienen n < 20: la prueba tiene poca potencia.'); if (gra) av.push(gra + ' serie(s) tienen n > 200: pequeñas desviaciones pueden resultar significativas; apóyese en el gráfico Q-Q.');
      const t = 'Se evaluaron <strong>' + ok.length + '</strong> serie(s) con Shapiro-Wilk. ' + (no.length ? 'Con el p ajustado por Holm se rechaza la normalidad en: <strong>' + no.map(lab).join('; ') + '</strong>. ' + 'Para esas variables considere transformaciones o pruebas no paramétricas.' : 'No se rechaza la normalidad en ninguna serie tras el ajuste de Holm. Esto no demuestra normalidad: solo indica que no hay evidencia suficiente en contra.');
      return { cards: [{ n: 'Series evaluadas', v: String(ok.length), s: d.grp ? 'por grupo de ' + d.grp : 'una por variable', main: 1 }, { n: 'No normales (Holm)', v: String(no.length), s: 'α = ' + fx(a, 2) }, { n: 'Menor W', v: ok.length ? fx(Math.min.apply(null, ok.map(x => x.sw.W)), 4) : '—', s: ok.length ? lab(ok.slice().sort((x, y) => x.sw.W - y.sw.W)[0].s) : '' }], tabla,
        resumen: [['Series', String(res.length)], ['Prueba principal', 'Shapiro-Wilk'], ['Corrección', 'Holm']], h0: 'Cada serie proviene de una distribución normal.', h1: 'Al menos una serie no proviene de una distribución normal.', interp: t, avisos: av,
        grafico: { tipo: 'bar1', etiquetas: ok.map(x => lab(x.s)), a: ok.map(x => +x.sw.W.toFixed(4)), colores: ok.map(x => x.padj < a ? '#ff6b6bcc' : '#00d4ffcc'), xt: '', yt: 'W de Shapiro-Wilk (1 = normal perfecta)', etiq: 'W', ymax: 1 }, datosTxt: 'Variables: ' + d.cols.join(', ') + (d.grp ? ' · por ' + d.grp : ''), pDecision: null };
    },
    R(d) { const vs = d.cols.map(rs).join(', '); return '# Datos en el data.frame «datos»\nvars <- c(' + vs + ')\n' + (d.grp ? 'grupos <- split(datos, datos[[' + rs(d.grp) + ']])\nres <- do.call(rbind, lapply(names(grupos), function(g) do.call(rbind, lapply(vars, function(v) {\n  x <- na.omit(grupos[[g]][[v]]); t <- shapiro.test(x)\n  data.frame(variable = v, grupo = g, n = length(x), W = unname(t$statistic), p = t$p.value)\n}))))\n' : 'res <- do.call(rbind, lapply(vars, function(v) {\n  x <- na.omit(datos[[v]]); t <- shapiro.test(x)\n  data.frame(variable = v, n = length(x), W = unname(t$statistic), p = t$p.value)\n}))\n') + 'res$p_holm <- p.adjust(res$p, method = "holm")\nprint(res, digits = 4)\n\n# Gráficos Q-Q\npar(mfrow = c(2, 2)); for (v in vars) { qqnorm(datos[[v]], main = v); qqline(datos[[v]]) }\n'; },
    Py(d) { const vs = JSON.stringify(d.cols); return 'import pandas as pd\nfrom scipy import stats as st\nfrom statsmodels.stats.multitest import multipletests\n\n# datos = pd.read_excel("archivo.xlsx")\nvars = ' + vs + '\nfilas = []\n' + (d.grp ? 'for g, sub in datos.groupby(' + JSON.stringify(d.grp) + '):\n    for v in vars:\n        x = sub[v].dropna(); W, p = st.shapiro(x)\n        filas.append((v, g, len(x), W, p))\nres = pd.DataFrame(filas, columns=["variable", "grupo", "n", "W", "p"])\n' : 'for v in vars:\n    x = datos[v].dropna(); W, p = st.shapiro(x)\n    filas.append((v, len(x), W, p))\nres = pd.DataFrame(filas, columns=["variable", "n", "W", "p"])\n') + 'res["p_holm"] = multipletests(res["p"], method="holm")[1]\nprint(res.round(4))\n'; }
  };

  T0.levenelote = {
    tab: 'var', nombre: 'Homogeneidad de varianzas por lotes (Brown-Forsythe)', corto: 'Varianzas por lotes',
    cuando: 'Para cada variable numérica elegida de «Mis datos», contrasta si las varianzas son iguales entre los grupos de una variable categórica (Brown-Forsythe, la variante de Levene con la mediana). Informa p ajustado por Holm.',
    datos: 'De 1 a 10 variables numéricas y una variable categórica que define los grupos (2 a 12 grupos).',
    supuestos: ['Observaciones independientes dentro y entre grupos.', 'Brown-Forsythe es robusta frente a datos asimétricos o con colas pesadas.', 'Cada grupo debe tener al menos 2 datos.', 'Con varias variables el análisis es exploratorio: use el p ajustado por Holm.'],
    campos: [{ id: 'cols', label: 'Variables numéricas', type: 'vars', tipo: 'num', min: 1, max: 10 }, { id: 'grp', label: 'Grupos definidos por', type: 'varsel', tipo: 'cat', maxDist: 12, vacio: '— elegir variable de grupos —' }],
    demo, demoOk, ejemplo: { cols: ['Altura (cm)', 'Peso (kg)', 'Tiempo de reacción (ms)', 'Ingreso (miles)'], grp: 'Grupo' },
    leer(v) { if (!HPDatos.hayDatos()) throw new Error('Primero cargue sus datos en «Mis datos».'); if (!(v.cols || []).length) throw new Error('Marque al menos una variable numérica.'); if (!v.grp) throw new Error('Elija la variable que define los grupos.'); return { cols: v.cols.slice(), grp: v.grp }; },
    calc(d) {
      const gv = HPDatos.valores(d.grp), res = d.cols.map(nm => {
        const v = HPDatos.valores(nm), gr = {}; v.forEach((u, i) => { if (u != null && gv[i] != null) (gr[gv[i]] = gr[gv[i]] || []).push(u); });
        const ord = ordenar(Object.keys(gr)).filter(k => gr[k].length >= 2), g = ord.map(k => gr[k]); if (g.length < 2) return { nm, error: 'menos de 2 grupos con ≥ 2 datos' };
        return { nm, ord, g, bf: V.levene(g, 'median'), lv: V.levene(g, 'mean') };
      });
      const ok = res.filter(x => !x.error), adj = HPDatos.holm(ok.map(x => x.bf.p)); ok.forEach((x, i) => { x.padj = adj[i]; }); return { res };
    },
    render(d, rr, a) {
      const res = rr.res, ok = res.filter(x => !x.error), no = ok.filter(x => x.padj < a);
      const tabla = { cab: ['Variable', 'Grupos', 'n', 'BF (F)', 'gl', 'p', 'p Holm', 'Levene p (media)', 'Decisión'], filas: res.map(x => x.error ? [x.nm, '—', '—', '—', '—', '—', '—', '—', x.error] : [x.nm, String(x.ord.length), String(x.bf.N), fx(x.bf.W, 3), x.bf.df1 + '; ' + x.bf.df2, fpv(x.bf.p), fpv(x.padj), fpv(x.lv.p), x.padj < a ? 'Varianzas distintas' : 'Sin evidencia de diferencia']) };
      const det = ok.map(x => ({ nombre: x.nm, bloques: [{ titulo: 'Desviación estándar por grupo', cab: ['Grupo', 'n', 'Media', 'Desv. est.'], filas: x.ord.map((k, i) => { return [k, String(x.g[i].length), fx(V.mean(x.g[i]), 3), fx(Math.sqrt(V.vari(x.g[i])), 3)]; }) }] }));
      const t = 'Se contrastó la homogeneidad de varianzas de <strong>' + ok.length + '</strong> variable(s) entre los grupos de «' + d.grp + '». ' + (no.length ? 'Con el p ajustado por Holm, hay evidencia de varianzas distintas en: <strong>' + no.map(x => x.nm).join(', ') + '</strong>. Para comparar medias en esas variables prefiera Welch (o Welch-ANOVA) en lugar de t/ANOVA clásicos.' : 'No hay evidencia de varianzas distintas en ninguna variable tras el ajuste de Holm. Esto no demuestra que sean iguales.');
      return { cards: [{ n: 'Variables', v: String(ok.length), s: 'grupos: ' + d.grp, main: 1 }, { n: 'Varianzas distintas (Holm)', v: String(no.length), s: 'α = ' + fx(a, 2) }, { n: 'Menor p ajustado', v: ok.length ? fpv(Math.min.apply(null, ok.map(x => x.padj))) : '—', s: ok.length ? ok.slice().sort((x, y) => x.padj - y.padj)[0].nm : '' }], tabla, detalle: { titulo: 'Ver las desviaciones estándar por grupo de la variable', items: det, def: 0 },
        resumen: [['Variables', d.cols.join(', ')], ['Grupos por', d.grp], ['Prueba', 'Brown-Forsythe (centro: mediana)'], ['Corrección', 'Holm']], h0: 'Las varianzas son iguales en todos los grupos.', h1: 'Al menos un grupo tiene una varianza distinta.', interp: t, avisos: [AVISO],
        grafico: { tipo: 'bar1', etiquetas: ok.map(x => x.nm), a: ok.map(x => +(-Math.log10(Math.max(x.padj, 1e-12))).toFixed(3)), colores: ok.map(x => x.padj < a ? '#ff6b6bcc' : '#00d4ffcc'), xt: '', yt: '−log10(p Holm)  (> 1,3 ≈ p < 0,05)', etiq: '−log10 p' }, datosTxt: 'Variables: ' + d.cols.join(', ') + ' · grupos por ' + d.grp, pDecision: null };
    },
    R(d) { const vs = d.cols.map(rs).join(', '); return '# install.packages("car")   # Datos en el data.frame «datos»\nvars <- c(' + vs + ')\ndatos[[' + rs(d.grp) + ']] <- factor(datos[[' + rs(d.grp) + ']])\nres <- do.call(rbind, lapply(vars, function(v) {\n  t <- car::leveneTest(datos[[v]] ~ datos[[' + rs(d.grp) + ']], center = median)   # Brown-Forsythe\n  data.frame(variable = v, F = t$`F value`[1], gl1 = t$Df[1], gl2 = t$Df[2], p = t$`Pr(>F)`[1])\n}))\nres$p_holm <- p.adjust(res$p, method = "holm")\nprint(res, digits = 4)\n'; },
    Py(d) { const vs = JSON.stringify(d.cols); return 'import pandas as pd\nfrom scipy import stats as st\nfrom statsmodels.stats.multitest import multipletests\n\n# datos = pd.read_excel("archivo.xlsx")\nvars = ' + vs + '\nfilas = []\nfor v in vars:\n    g = [s[v].dropna().values for _, s in datos.groupby(' + JSON.stringify(d.grp) + ')]\n    W, p = st.levene(*g, center="median")   # Brown-Forsythe\n    filas.append((v, W, p))\nres = pd.DataFrame(filas, columns=["variable", "F", "p"])\nres["p_holm"] = multipletests(res["p"], method="holm")[1]\nprint(res.round(4))\n'; }
  };
  P.TABS.find(t => t.id === 'norm').tests.unshift('normlote'); P.TABS.find(t => t.id === 'var').tests.push('levenelote');
})();
