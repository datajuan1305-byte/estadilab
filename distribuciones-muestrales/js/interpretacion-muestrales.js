// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Distribuciones Muestrales
// ═══════════════════════════════════════════════════════════════════════════

function fmtM(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadMuestral(tipo, parametros, resultados, contexto, pregunta) {
  return { tipo, parametros, resultados, contexto, pregunta };
}

function generarResumenMuestral(payload) {
  const { tipo, resultados: r, parametros: p, contexto } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) partes.push(`Con base en tu contexto ("${contexto.trim()}"):`);

  if (tipo === 'media') {
    partes.push(`El error estándar de la media es ${fmtM(r.ee)} — mucho menor que la desviación estándar de un dato individual, porque promediar varios datos reduce la variabilidad.`);
    if (r.prob !== undefined) partes.push(`La probabilidad calculada es ${fmtM(r.prob,4)} (${fmtM(r.prob*100,2)}%).`);
  } else if (tipo === 'proporcion') {
    partes.push(`El error estándar de la proporción muestral es ${fmtM(r.ee)}.`);
    partes.push(r.condicionValida
      ? `La condición para usar la aproximación normal se cumple (n·p̂ = ${fmtM(r.np,1)} ≥ 5 y n·(1-p̂) = ${fmtM(r.nq,1)} ≥ 5), así que los cálculos de probabilidad son confiables.`
      : `⚠️ La condición para usar la aproximación normal NO se cumple del todo (n·p̂ = ${fmtM(r.np,1)}, n·(1-p̂) = ${fmtM(r.nq,1)}, ambos deberían ser ≥ 5) — con esta muestra tan pequeña o proporción tan extrema, la aproximación normal puede no ser precisa.`);
    if (r.prob !== undefined) partes.push(`La probabilidad calculada es ${fmtM(r.prob,4)} (${fmtM(r.prob*100,2)}%).`);
  } else if (tipo === 'simulador') {
    partes.push(`Simulaste ${p.numSimulaciones} muestras de tamaño n=${p.n} de una población "${p.nombrePoblacion}". Aunque la población original no es normal, la distribución de las medias muestrales se parece cada vez más a una campana de Gauss a medida que n crece — esa es la esencia del Teorema del Límite Central.`);
  }
  return partes.join(' ');
}

function generarRespuestaMuestral(payload) {
  const { pregunta, tipo, resultados: r, contexto, parametros: p } = payload;

  if (!pregunta || pregunta.trim().length === 0) return generarResumenMuestral(payload);

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0 ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/error est[aá]ndar|ee\b|desviaci[oó]n.*media/.test(q)) {
    if (tipo === 'media') return intro + `El error estándar de la media (${fmtM(r.ee)}) mide cuánto varían, de muestra en muestra, los promedios calculados con n=${p.n} datos. Es igual a σ/√n: crece la precisión (EE más pequeño) mientras más grande sea la muestra, pero no de forma lineal — para reducir el error estándar a la mitad, necesitas CUADRUPLICAR el tamaño de muestra, no solo duplicarlo.`;
    return intro + `El error estándar (${fmtM(r.ee)}) mide la variabilidad esperada del estadístico muestral (media o proporción) de muestra en muestra. Es distinto de la desviación estándar de los datos individuales: el error estándar siempre es menor, porque promediar reduce la variabilidad.`;
  }

  if (/tama[nñ]o.*muestra|n m[aá]s grande|aumentar n/.test(q)) {
    return intro + 'A medida que el tamaño de muestra (n) aumenta: (1) el error estándar disminuye (las medias muestrales varían menos entre sí), y (2) por el Teorema del Límite Central, la distribución de las medias muestrales se parece cada vez más a una normal, sin importar la forma de la población original. Con n≥30 generalmente la aproximación normal ya es razonable, incluso si la población es sesgada.';
  }

  if (/tlc|l[ií]mite central|por qu[eé].*normal|se vuelve normal/.test(q)) {
    return intro + 'El Teorema del Límite Central dice que, sin importar la forma de la distribución de la población (uniforme, sesgada, bimodal, lo que sea), la distribución de las medias de muestras suficientemente grandes se aproxima a una distribución normal. Esto es lo que hace posible usar la distribución Z o t para hacer inferencia sobre la media, incluso cuando no sabemos (o no es verdad) que los datos individuales siguen una normal.';
  }

  if (/condici[oó]n|v[aá]lido|aproximaci[oó]n normal|np|nq/.test(q)) {
    if (tipo === 'proporcion') return intro + `Para que la aproximación normal de la proporción muestral sea confiable, se exige n·p̂ ≥ 5 y n·(1-p̂) ≥ 5. En tu caso: n·p̂ = ${fmtM(r.np,2)}, n·(1-p̂) = ${fmtM(r.nq,2)} — ${r.condicionValida ? 'ambas se cumplen, así que la aproximación es razonable.' : 'al menos una no se cumple, así que la aproximación normal puede no ser precisa; con proporciones muy cercanas a 0 o 1, o muestras pequeñas, esto es común.'}`;
    return intro + 'Para la media, la aproximación normal es razonable si la población original ya es normal (cualquier n sirve), o si n es razonablemente grande (n≥30 es una regla práctica común) gracias al Teorema del Límite Central.';
  }

  if (/qué significa|que significa|interpretar|explica|resumen/.test(q)) {
    return generarResumenMuestral(payload);
  }

  return intro + 'Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: qué es el error estándar, qué pasa cuando el tamaño de muestra aumenta, por qué funciona el Teorema del Límite Central, y cuándo es válida la aproximación normal.';
}
