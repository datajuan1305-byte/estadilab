// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Regresión Lineal
// ═══════════════════════════════════════════════════════════════════════════

function fmtR(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadReg(tipo, parametros, resultados, contexto, pregunta) {
  return { tipo, parametros, resultados, contexto, pregunta };
}

function generarEcuacion(tipo, r) {
  if (tipo === 'simple') {
    const signo = r.b1 >= 0 ? '+' : '−';
    return `ŷ = ${fmtR(r.b0,3)} ${signo} ${fmtR(Math.abs(r.b1),3)}·x`;
  }
  let partes = [fmtR(r.coeficientes[0].valor,3)];
  for (let i = 1; i < r.coeficientes.length; i++) {
    const c = r.coeficientes[i];
    const signo = c.valor >= 0 ? '+' : '−';
    partes.push(`${signo} ${fmtR(Math.abs(c.valor),3)}·X${i}`);
  }
  return `ŷ = ${partes.join(' ')}`;
}

function generarResumenReg(payload) {
  const { tipo, resultados: r, contexto } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) partes.push(`Con base en tu contexto ("${contexto.trim()}"):`);

  partes.push(`La ecuación ajustada es ${generarEcuacion(tipo, r)}.`);

  const r2 = tipo === 'simple' ? r.r2 : r.r2;
  partes.push(`El modelo explica el ${fmtR(r2*100,1)}% de la variabilidad de Y (R²=${fmtR(r2)}).`);

  if (r.anova.pF < 0.05) {
    partes.push(`La prueba F global (p=${fmtR(r.anova.pF)}) indica que el modelo, en su conjunto, es estadísticamente significativo.`);
  } else {
    partes.push(`La prueba F global (p=${fmtR(r.anova.pF)}) NO es significativa — el modelo, en su conjunto, no explica la variabilidad de Y mejor de lo que lo haría el azar.`);
  }

  if (tipo === 'multiple') {
    const noSignificativos = r.coeficientes.slice(1).filter(c => c.p >= 0.05);
    if (noSignificativos.length > 0) {
      partes.push(`Sin embargo, ${noSignificativos.map(c => c.nombre).join(', ')} no ${noSignificativos.length === 1 ? 'es' : 'son'} individualmente significativo(s) (p≥0.05) — podrías considerar quitarla(s) del modelo.`);
    }
  }
  return partes.join(' ');
}

function generarRespuestaReg(payload) {
  const { pregunta, tipo, resultados: r, contexto } = payload;

  if (!pregunta || pregunta.trim().length === 0) return generarResumenReg(payload);

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0 ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/r2|r²|determinaci[oó]n|qu[eé] tan bien|ajusta/.test(q)) {
    const r2 = r.r2;
    return intro + `El R² = ${fmtR(r2)} significa que el ${fmtR(r2*100,1)}% de la variabilidad de Y es explicada por el modelo. El ${fmtR((1-r2)*100,1)}% restante se debe a otros factores no incluidos, o a variabilidad aleatoria. ${tipo === 'multiple' ? `El R² ajustado (${fmtR(r.r2Ajustado)}) penaliza por el número de predictores usados — es más justo para comparar modelos con distinta cantidad de variables.` : ''}`;
  }

  if (/significativ|valor-?p.*(global|modelo|f)|prueba f/.test(q)) {
    return intro + `La prueba F evalúa si el modelo COMPLETO es útil (H₀: todos los coeficientes de pendiente son cero). Con F=${fmtR(r.anova.f,2)} y p=${fmtR(r.anova.pF)}, el modelo ${r.anova.pF < 0.05 ? 'SÍ es estadísticamente significativo en su conjunto' : 'NO es estadísticamente significativo en su conjunto'}.`;
  }

  if (/coeficiente|pendiente|significativ.*(individual|variable)|cada variable/.test(q)) {
    if (tipo === 'simple') return intro + `La pendiente (b1=${fmtR(r.b1)}) tiene t=${fmtR(r.tB1,3)} y p=${fmtR(r.pB1)}. ${r.pB1 < 0.05 ? 'Es significativamente distinta de cero: sí hay una relación lineal real entre X e Y.' : 'No es significativamente distinta de cero: no hay evidencia suficiente de relación lineal.'}`;
    const detalle = r.coeficientes.slice(1).map(c => `${c.nombre} (p=${fmtR(c.p)}, ${c.p < 0.05 ? 'significativo' : 'no significativo'})`).join('; ');
    return intro + `Cada coeficiente tiene su propia prueba t (H₀: ese coeficiente es cero, controlando por las demás variables): ${detalle}.`;
  }

  if (/predicci[oó]n|predecir|estimar.*valor|proyectar/.test(q)) {
    return intro + `Puedes usar la ecuación ${generarEcuacion(tipo, r)} para predecir Y dado un valor nuevo de X. Ten cuidado con la "extrapolación": el modelo es confiable dentro del rango de datos que usaste para ajustarlo — predecir muy por fuera de ese rango es arriesgado, porque no hay evidencia de que la relación lineal se mantenga ahí.`;
  }

  if (/multicolinealidad|correlacionad.*(predictor|variable)/.test(q)) {
    return intro + 'La multicolinealidad ocurre cuando dos o más variables predictoras están muy correlacionadas entre sí. Esto no afecta la capacidad predictiva global del modelo (R²), pero sí puede hacer que los coeficientes individuales sean inestables o difíciles de interpretar por separado, y aumenta sus errores estándar (menos significancia individual aunque el modelo global sí sea bueno).';
  }

  if (/supuesto|linealidad|residuo|homoced/.test(q)) {
    return intro + 'La regresión lineal asume: (1) relación lineal entre X e Y, (2) los residuos (errores) tienen varianza constante (homocedasticidad), (3) los residuos son independientes entre sí, y (4) los residuos se distribuyen aproximadamente normal. Esta calculadora no verifica esos supuestos automáticamente — en un análisis riguroso, deberías graficar los residuos contra los valores predichos para revisarlos visualmente.';
  }

  if (/qué significa|que significa|interpretar|explica|resumen/.test(q)) {
    return generarResumenReg(payload);
  }

  return intro + 'Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: qué significa el R², si el modelo es significativo, si cada coeficiente es significativo, cómo hacer predicciones, y qué es la multicolinealidad.';
}
