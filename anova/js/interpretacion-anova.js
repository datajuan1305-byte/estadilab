// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — ANOVA de un factor (avanzado)
//  Reglas locales (sin costo). Mantiene el patrón "payload" listo para IA.
// ═══════════════════════════════════════════════════════════════════════════

function fmtAn(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString().replace('.', ',');
}
function fmtP(p) { if (p === null || p === undefined || isNaN(p)) return 'N/A'; return p < 0.0001 ? '< 0,0001' : p.toFixed(4).replace('.', ','); }

function armarPayloadAnova(parametros, resultados, contexto, pregunta) { return { parametros, resultados, contexto, pregunta }; }

function interpretarEta2(eta2) {
  if (eta2 < 0.01) return 'muy pequeño';
  if (eta2 < 0.06) return 'pequeño';
  if (eta2 < 0.14) return 'mediano';
  return 'grande';
}
const NOMBRE_METODO = { tukey: 'Tukey HSD (Tukey-Kramer)', duncan: 'Duncan', snk: 'Student-Newman-Keuls (SNK)', lsd: 'DMS / LSD de Fisher', bonferroni: 'Bonferroni', scheffe: 'Scheffé' };

/** Decide la ruta de análisis a partir de los supuestos. */
function decidirRuta(sup, A, alpha) {
  const nMin = Math.min(...A.n), nMax = Math.max(...A.n), desbal = nMax / nMin > 1.5;
  const normOk = !sup.sw || sup.sw.constante || sup.sw.p >= alpha;
  const varOk = sup.lev.p >= alpha;
  const indepOk = !sup.dw || (sup.dw.p >= alpha && (!sup.rachas || sup.rachas.p >= alpha));
  const pasos = [];
  let id, titulo, texto, color;
  if (sup.dw && !indepOk) {
    id = 'indep'; color = 'rojo'; titulo = 'Independencia dudosa: revisa el diseño antes de seguir';
    texto = 'Los residuos muestran dependencia según el orden de ejecución (posible deriva, efecto de tiempo o de operario). Ninguna de las pruebas de este módulo corrige eso. Considera aleatorizar el orden, usar bloques (DBCA) o un modelo con la covariable de tiempo.';
    pasos.push('Verifica si el orden de corrida estuvo realmente aleatorizado.', 'Si hay tendencia en el tiempo, repite con aleatorización o incluye bloques.', 'Mientras tanto, interpreta los resultados con cautela.');
  } else if (normOk && varOk) {
    id = 'clasico'; color = 'verde'; titulo = 'Ruta recomendada: ANOVA clásico + ' + (desbal ? 'Tukey-Kramer' : 'Tukey HSD');
    texto = 'Se cumplen normalidad de residuos y homogeneidad de varianzas: el ANOVA clásico es válido y la prueba de Tukey controla el error global al comparar todos los pares.';
    pasos.push('Lee la tabla ANOVA (pestaña Resumen).', 'Si F es significativo, identifica los tratamientos distintos en Comparaciones (letras compactas).', 'Revisa la pestaña Potencia para justificar el número de repeticiones.');
  } else if (normOk && !varOk) {
    id = 'welch'; color = 'ambar'; titulo = 'Ruta recomendada: ANOVA de Welch + Games-Howell';
    texto = 'Las varianzas no son homogéneas pero los residuos son aproximadamente normales. Welch no exige varianzas iguales y Games-Howell compara pares sin asumirlas. ' + (desbal ? 'Con tamaños desiguales esto es especialmente importante.' : '');
    pasos.push('Usa la fila de Welch en lugar del F clásico (pestaña No paramétrico / robusto).', 'Compara pares con Games-Howell.', 'Evalúa transformar la variable (log, raíz) para estabilizar la varianza y repetir.');
  } else if (!normOk && varOk && nMin >= 30) {
    id = 'clasico_robusto'; color = 'ambar'; titulo = 'ANOVA clásico es aceptable (muestras grandes) — contrasta con Kruskal-Wallis';
    texto = 'Los residuos se desvían de la normal, pero con ≥ 30 datos por grupo y varianzas homogéneas el ANOVA es robusto (teorema central del límite). Como verificación, compara con Kruskal-Wallis: si ambos coinciden, la conclusión es sólida.';
    pasos.push('Reporta el ANOVA y confirma con Kruskal-Wallis.', 'Revisa en la gráfica de residuos si hay datos atípicos.');
  } else if (!normOk && varOk) {
    id = 'kw'; color = 'ambar'; titulo = 'Ruta recomendada: Kruskal-Wallis + Dunn (o transformar los datos)';
    texto = 'Los residuos no parecen normales y las muestras son pequeñas: el ANOVA clásico pierde confiabilidad. Kruskal-Wallis compara rangos (no requiere normalidad) y Dunn identifica los pares. Alternativa: transformar la respuesta (log, raíz cuadrada, Box-Cox) y repetir el ANOVA.';
    pasos.push('Consulta la pestaña No paramétrico.', 'Con Dunn (ajuste de Holm) revisa los pares.', 'Si hay valores atípicos, verifica si son errores de medición.');
  } else {
    id = 'kw2'; color = 'rojo'; titulo = 'Ruta recomendada: Kruskal-Wallis + Dunn (se incumplen normalidad y homogeneidad)';
    texto = 'No se cumplen ni la normalidad ni la homogeneidad de varianzas. Lo más seguro es Kruskal-Wallis con comparaciones de Dunn; Kruskal-Wallis asume formas de distribución parecidas, así que sigue revisando las gráficas. También puedes transformar la variable y repetir el ANOVA.';
    pasos.push('Usa Kruskal-Wallis + Dunn (pestaña No paramétrico).', 'Prueba una transformación (log, raíz) y vuelve a evaluar supuestos.', 'Con muy pocos datos, considera aumentar las repeticiones (pestaña Potencia).');
  }
  return { id, color, titulo, texto, pasos, normOk, varOk, indepOk, desbal };
}

function _generarResumenAnova0(payload) {
  const r = payload.resultados, contexto = payload.contexto, A = r.A, alpha = r.alpha, partes = [];
  if (contexto && contexto.trim()) partes.push(`Con base en tu contexto ("${contexto.trim()}"):`);
  const sig = A.p < alpha;
  partes.push(`ANOVA: F(${A.dfB}, ${A.dfW}) = ${fmtAn(A.F, 3)}, p = ${fmtP(A.p)}. ` + (sig ? 'Se rechaza H₀: al menos un tratamiento tiene una media distinta.' : 'No se rechaza H₀: no hay evidencia suficiente de diferencias entre las medias.'));
  partes.push(`Tamaño del efecto: η² = ${fmtAn(A.eta2)} (${interpretarEta2(A.eta2)}); ω² = ${fmtAn(A.omega2)}.`);
  if (sig) {
    const dif = r.comp.pares.filter(c => c.sig);
    partes.push(`${NOMBRE_METODO[r.comp.metodo]}: ` + (dif.length ? `difieren ${dif.map(c => `${r.nombres[c.i]} y ${r.nombres[c.j]}`).join('; ')}.` : 'ningún par resultó significativo individualmente.') + ` Letras: ${r.nombres.map((n, i) => n + '=' + r.comp.letras[i]).join(', ')} (tratamientos con letra compartida no difieren).`);
  }
  const ru = r.ruta;
  partes.push(`Supuestos → ${ru.titulo}.`);
  return partes.join(' ');
}

function _generarRespuestaAnova0(payload) {
  const { pregunta, resultados: r, contexto } = payload; const A = r.A;
  if (!pregunta || !pregunta.trim()) return generarResumenAnova(payload);
  const q = pregunta.toLowerCase(), intro = contexto && contexto.trim() ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/cu[aá]l(es)? (grupo|tratamiento)|qu[eé] (grupos|tratamientos)|d[oó]nde est[aá] la diferencia|diferen.*tratamiento|letras/.test(q)) {
    const dif = r.comp.pares.filter(c => c.sig);
    if (!dif.length) return intro + `Con ${NOMBRE_METODO[r.comp.metodo]} ningún par resultó significativo (α = ${r.alpha}). Todos comparten al menos una letra.`;
    return intro + `Con ${NOMBRE_METODO[r.comp.metodo]}, los pares distintos son: ${dif.map(c => `${r.nombres[c.i]} vs ${r.nombres[c.j]} (diferencia = ${fmtAn(c.diff, 3)}, p = ${fmtP(c.p)})`).join('; ')}. Letras compactas: ${r.nombres.map((n, i) => n + ' = ' + r.comp.letras[i]).join(', ')}. Los tratamientos que comparten letra no se distinguen estadísticamente.`;
  }
  if (/tukey|duncan|snk|newman|lsd|dms|bonferroni|scheff|rangos? m[uú]ltiples|post.?hoc|comparaciones? m[uú]ltiples/.test(q)) {
    return intro + 'Tukey HSD controla el error global (todas las comparaciones a la vez) y es la opción por defecto. Bonferroni y Scheffé son más conservadores. Duncan y SNK usan rangos que dependen de la separación entre medias: Duncan es más potente pero no controla bien el error global; SNK queda en el medio. La DMS/LSD de Fisher solo es defendible si el F es significativo y hay pocos tratamientos (≤ 3). Para decisiones con presupuesto en juego, prefiere Tukey.';
  }
  if (/normalidad|shapiro|normal/.test(q)) {
    const s = r.sup.sw; return intro + (s ? `La prueba de Shapiro-Wilk sobre los residuos da W = ${fmtAn(s.W, 4)} y p = ${fmtP(s.p)}: ${s.p >= r.alpha ? 'no hay evidencia contra la normalidad.' : 'hay evidencia de que los residuos no son normales.'} Mira también el gráfico Q-Q: los puntos deben seguir la línea.` : 'Se necesitan al menos 3 datos para evaluar normalidad.');
  }
  if (/homogene|homoced|varianza|levene|bartlett/.test(q)) {
    return intro + `Levene (Brown-Forsythe) da p = ${fmtP(r.sup.lev.p)} y Bartlett p = ${fmtP(r.sup.bart.p)}. ${r.sup.lev.p >= r.alpha ? 'No hay evidencia de varianzas distintas.' : 'Hay evidencia de varianzas distintas: prefiere Welch + Games-Howell.'} Bartlett es más sensible a la no normalidad; si ambas pruebas discrepan, confía en Levene.`;
  }
  if (/independen|durbin|orden|aleatori/.test(q)) {
    return intro + (r.sup.dw ? `Con el orden de ejecución ingresado, Durbin-Watson = ${fmtAn(r.sup.dw.dw, 3)} (p = ${fmtP(r.sup.dw.p)}) y la prueba de rachas p = ${r.sup.rachas ? fmtP(r.sup.rachas.p) : 'N/A'}. Valores de DW cercanos a 2 indican independencia.` : 'La independencia no se puede probar sin el orden en que se ejecutaron las corridas: ingresa ese orden en "Orden de ejecución (opcional)". Lo más importante es garantizarla con la aleatorización del diseño.');
  }
  if (/kruskal|no param|rangos|continuar|param[eé]trico/.test(q)) {
    return intro + `Ruta sugerida: ${r.ruta.titulo}. ${r.ruta.texto} Kruskal-Wallis: H = ${fmtAn(r.kw.H, 3)}, p = ${fmtP(r.kw.p)}.`;
  }
  if (/potencia|repeticion|replica|tama[nñ]o de muestra|presupuesto|costo|cu[aá]ntas/.test(q)) {
    const p = r.pot; return intro + `Con ${A.k} tratamientos y ${A.n.join('/')} repeticiones, la potencia observada (aproximada) es ${fmtAn(p.obs, 3)}. Para detectar una diferencia mínima Δ con la potencia que fijes, usa la pestaña Potencia: te devuelve repeticiones por tratamiento, total de corridas y el costo. La potencia “observada” a partir de los propios datos no sustituye un cálculo a priori con un Δ de importancia práctica.`;
  }
  if (/eta|omega|tama[nñ]o del efecto|qu[eé] tan importante/.test(q)) {
    return intro + `η² = ${fmtAn(A.eta2)} (${interpretarEta2(A.eta2)}): proporción de la variabilidad total explicada por el tratamiento. ω² = ${fmtAn(A.omega2)} corrige el sesgo de η² en muestras pequeñas. Convenciones: 0,01 pequeño, 0,06 mediano, 0,14 grande.`;
  }
  if (/\bf\b|estad[ií]stico f|c[oó]mo se calcula/.test(q)) {
    return intro + `F = ${fmtAn(A.F, 3)} = CM entre (${fmtAn(A.msb, 3)}) / CM dentro (${fmtAn(A.msw, 3)}). Si las medias son parecidas, F ≈ 1; mientras más separadas respecto al ruido, mayor F.`;
  }
  if (/resumen|interpretar|explica|significa/.test(q)) return generarResumenAnova(payload);
  return intro + 'Puedo responder sobre: cuáles tratamientos difieren, qué prueba de rangos múltiples usar, normalidad, homogeneidad, independencia, si seguir con ANOVA o usar Kruskal-Wallis, potencia y número de repeticiones, y tamaño del efecto.';
}

// Redacción: evita «p = < 0,0001» (debe leerse «p < 0,0001»)
function generarResumenAnova(payload) { return _generarResumenAnova0(payload).replace(/= < /g, '< '); }
function generarRespuestaAnova(payload) { return _generarRespuestaAnova0(payload).replace(/= < /g, '< '); }
