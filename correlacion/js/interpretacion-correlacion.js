// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Correlación
// ═══════════════════════════════════════════════════════════════════════════

function fmtC(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadCorr(metodo, parametros, resultados, contexto, pregunta) {
  return { metodo, parametros, resultados, contexto, pregunta };
}

function interpretarFuerza(valorAbs) {
  if (valorAbs < 0.1) return 'prácticamente nula';
  if (valorAbs < 0.3) return 'débil';
  if (valorAbs < 0.5) return 'moderada-débil';
  if (valorAbs < 0.7) return 'moderada';
  if (valorAbs < 0.9) return 'fuerte';
  return 'muy fuerte';
}

function generarResumenCorr(payload) {
  const { metodo, resultados: r, contexto, parametros: p } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) partes.push(`Con base en tu contexto ("${contexto.trim()}"):`);

  const valor = metodo === 'kendall' ? r.tau : r.coef;
  const direccion = valor > 0 ? 'positiva' : valor < 0 ? 'negativa' : 'nula';
  const fuerza = interpretarFuerza(Math.abs(valor));
  const nombreCoef = metodo === 'pearson' ? 'r de Pearson' : metodo === 'spearman' ? 'ρ (rho) de Spearman' : 'τ (tau) de Kendall';

  partes.push(`El coeficiente ${nombreCoef} es ${fmtC(valor)}, lo que indica una correlación ${direccion} de fuerza ${fuerza}.`);

  if (metodo === 'pearson') {
    partes.push(`El coeficiente de determinación R² = ${fmtC(r.r2)} significa que el ${fmtC(r.r2*100,1)}% de la variabilidad de una variable se puede explicar por su relación lineal con la otra.`);
  }

  if (r.significancia) {
    partes.push(r.significancia.pValor < 0.05
      ? `Con un valor-p de ${fmtC(r.significancia.pValor)} (menor a 0.05), la correlación es estadísticamente significativa: es poco probable que se deba solo al azar.`
      : `Con un valor-p de ${fmtC(r.significancia.pValor)} (no menor a 0.05), la correlación NO es estadísticamente significativa: no se puede descartar que se deba al azar, especialmente con muestras pequeñas.`);
  }
  return partes.join(' ');
}

function generarRespuestaCorr(payload) {
  const { pregunta, metodo, resultados: r, contexto, parametros: p } = payload;

  if (!pregunta || pregunta.trim().length === 0) return generarResumenCorr(payload);

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0 ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/causal|causa|provoca/.test(q)) {
    return intro + 'Correlación NO implica causalidad. Que dos variables se muevan juntas no significa que una cause a la otra — puede haber una tercera variable causando ambas (variable de confusión), pura coincidencia, o casualidad en el sentido contrario a lo esperado. Para establecer causalidad se necesita diseño experimental (asignación aleatoria), no solo datos observacionales correlacionados.';
  }

  if (/significa(tivo|ncia)|valor-?p|azar/.test(q)) {
    if (r.significancia) return intro + `El valor-p de esta correlación es ${fmtC(r.significancia.pValor)}. ${r.significancia.pValor < 0.05 ? 'Como es menor a 0.05, hay evidencia de que la correlación observada no se debe solo al azar.' : 'Como no es menor a 0.05, no hay evidencia suficiente de que la correlación sea distinta de cero — con esta muestra, podría deberse al azar.'} Ojo: significancia estadística no es lo mismo que importancia práctica — con muestras muy grandes, hasta correlaciones muy débiles pueden salir "significativas".`;
  }

  if (/fuerte|d[eé]bil|fuerza|qu[eé] tan (fuerte|alta)/.test(q)) {
    const valor = metodo === 'kendall' ? r.tau : r.coef;
    return intro + `La correlación tiene una fuerza ${interpretarFuerza(Math.abs(valor))} (valor absoluto ${fmtC(Math.abs(valor))}). Como guía general (no una regla estricta): menor a 0.3 es débil, entre 0.3 y 0.7 es moderada, mayor a 0.7 es fuerte — pero esto depende también del campo de estudio (en ciencias sociales, 0.3 ya puede considerarse relevante; en física, se esperan correlaciones mucho más altas).`;
  }

  if (/pearson.*spearman|spearman.*pearson|cu[aá]l.*usar|diferencia.*(m[eé]todo|coeficiente)/.test(q)) {
    return intro + 'Pearson mide relación LINEAL y requiere datos numéricos continuos (sensible a valores atípicos). Spearman mide relación MONÓTONA (no necesariamente lineal — puede ser curva, siempre que ambas variables aumenten o disminuyan juntas) usando los rangos de los datos, por lo que es más robusto ante atípicos y también sirve con datos ordinales. Kendall también usa rangos, es más robusto todavía con muestras pequeñas o muchos empates, pero es más conservador (valores típicamente más bajos que Spearman para la misma relación).';
  }

  if (/r2|r²|determinaci[oó]n|explica/.test(q)) {
    if (metodo === 'pearson') return intro + `El coeficiente de determinación (R² = ${fmtC(r.r2)}) es el cuadrado de r, y se interpreta como el porcentaje de la variabilidad de una variable que es explicada por su relación lineal con la otra: en este caso, ${fmtC(r.r2*100,1)}%. El resto (${fmtC((1-r.r2)*100,1)}%) se debe a otros factores no capturados por esta relación lineal.`;
    return intro + 'El coeficiente de determinación (R²) solo aplica directamente a Pearson (relación lineal). Para Spearman y Kendall no se interpreta de la misma forma porque no miden relación lineal sino monótona/de rangos.';
  }

  if (/qué significa|que significa|interpretar|explica|resumen/.test(q)) {
    return generarResumenCorr(payload);
  }

  return intro + 'Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: si correlación implica causalidad, qué significa el valor-p, qué tan fuerte es la relación, la diferencia entre Pearson/Spearman/Kendall, y qué es el R².';
}
