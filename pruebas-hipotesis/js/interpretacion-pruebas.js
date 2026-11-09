// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Pruebas de Hipótesis
//  Misma arquitectura de payload que las otras calculadoras: hoy reglas
//  locales, mañana se reemplaza el cuerpo por una llamada a IA.
// ═══════════════════════════════════════════════════════════════════════════

function fmtH(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadPrueba(tipoPrueba, parametros, resultados, contexto, pregunta) {
  return { tipoPrueba, parametros, resultados, contexto, pregunta };
}

function generarConclusionFormal(payload) {
  const { resultados: r, parametros: p } = payload;
  const alpha = p.alpha;
  if (r.rechazaH0) {
    return `Como el valor-p (${fmtH(r.pValor)}) es menor que α = ${alpha}, se rechaza H₀. Hay evidencia estadística suficiente, al nivel de significancia del ${(alpha*100).toFixed(0)}%, para aceptar la hipótesis alternativa.`;
  }
  return `Como el valor-p (${fmtH(r.pValor)}) NO es menor que α = ${alpha}, no se rechaza H₀. No hay evidencia estadística suficiente, al nivel de significancia del ${(alpha*100).toFixed(0)}%, para rechazar la hipótesis nula.`;
}

function generarResumenAutomaticoPrueba(payload) {
  const { resultados: r, contexto, tipoPrueba } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) {
    partes.push(`Con base en el contexto que describiste ("${contexto.trim()}"):`);
  }
  partes.push(`El estadístico de prueba ${r.nombreEstadistico} = ${fmtH(r.estadistico)}${r.df ? ` (con ${fmtH(r.df,2)} grados de libertad)` : ''}, con un valor crítico de ${r.valorCritico}.`);
  partes.push(generarConclusionFormal(payload));
  return partes.join(' ');
}

function generarRespuestaPrueba(payload) {
  const { pregunta, resultados: r, contexto, parametros: p } = payload;

  if (!pregunta || pregunta.trim().length === 0) {
    return generarResumenAutomaticoPrueba(payload);
  }

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0 ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/valor-?p|valor p|p-valor|pvalor/.test(q)) {
    return intro + `El valor-p es ${fmtH(r.pValor)}. Representa la probabilidad de obtener un estadístico tan extremo (o más) que el observado, si H₀ fuera verdadera. Cuanto más pequeño el valor-p, más evidencia hay en contra de H₀. Se compara contra α = ${p.alpha}: ${r.pValor < p.alpha ? 'como es menor, se rechaza H₀' : 'como no es menor, no se rechaza H₀'}.`;
  }

  if (/rechaz|conclu|decisi[oó]n|significa/.test(q)) {
    return intro + generarConclusionFormal(payload);
  }

  if (/error tipo ?i\b|falso positivo/.test(q)) {
    return intro + `El error Tipo I es rechazar H₀ cuando en realidad es verdadera (un "falso positivo"). Su probabilidad máxima permitida es α = ${p.alpha} — ese es justamente el nivel de significancia que elegiste. Si repitieras este estudio muchas veces y H₀ fuera cierta, esperarías rechazarla incorrectamente en el ${(p.alpha*100).toFixed(0)}% de las veces.`;
  }

  if (/error tipo ?ii\b|falso negativo|potencia/.test(q)) {
    return intro + `El error Tipo II es no rechazar H₀ cuando en realidad es falsa (un "falso negativo"). A diferencia de α, esta probabilidad (llamada β) no se fija de antemano — depende del tamaño de muestra, la variabilidad de los datos, y qué tan grande es la diferencia real que existe. La potencia de la prueba es 1-β: la capacidad de detectar un efecto real cuando de verdad existe. Con muestras pequeñas, el error Tipo II tiende a ser más alto (menor potencia).`;
  }

  if (/nivel de significancia|alpha|α/.test(q)) {
    return intro + `El nivel de significancia (α = ${p.alpha}) es el umbral de riesgo que aceptas de rechazar H₀ por error cuando en realidad es verdadera. Es una decisión que se toma ANTES de ver los datos, no después. Valores comunes son 0.05 (5%) y 0.01 (1%); un α más pequeño exige más evidencia para rechazar H₀, reduciendo falsos positivos pero aumentando el riesgo de no detectar un efecto real que sí existe.`;
  }

  if (/cola|bilateral|unilateral|direcci[oó]n/.test(q)) {
    const colaTexto = p.cola === 'bilateral' ? 'bilateral (dos colas)' : p.cola === 'derecha' ? 'unilateral derecha' : 'unilateral izquierda';
    return intro + `Elegiste una prueba ${colaTexto}. Esto depende de cómo está planteada tu hipótesis alternativa: bilateral se usa cuando solo te interesa si hay diferencia (en cualquier dirección); unilateral derecha cuando esperas que el valor sea MAYOR que el de referencia; unilateral izquierda cuando esperas que sea MENOR. Elegir la cola incorrecta después de ver los datos es una mala práctica estadística — la dirección debe decidirse antes de calcular, según la pregunta de investigación.`;
  }

  if (/qué significa|que significa|interpretar|explica|resumen|análisis/.test(q)) {
    return generarResumenAutomaticoPrueba(payload);
  }

  return intro + `Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: qué significa el valor-p, cómo se llega a la decisión de rechazar o no H₀, qué son los errores Tipo I y Tipo II, qué es el nivel de significancia, y por qué se elige una prueba bilateral o unilateral. Prueba reformulando tu pregunta usando alguna de esas ideas.`;
}
