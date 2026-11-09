// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Estadilab
//  Hoy: lógica local basada en reglas (sin costo, sin API).
//  Mañana: se reemplaza el CUERPO de generarRespuesta() por una llamada
//  fetch() a un backend con IA. La firma de la función y el objeto
//  payload NO cambian — así ninguna otra parte de la app se toca.
//
//  Depende de: motor-calculo.js (usa DISTRIBUTIONS para el nombre legible)
// ═══════════════════════════════════════════════════════════════════════════

function fmtNum(v, dec = 4) {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

/**
 * Arma el payload combinado que hoy usan las reglas y mañana usará la IA.
 * @param {string} distribucion   - id de la distribución (ej: 'normal')
 * @param {object} parametros     - parámetros ingresados por el usuario
 * @param {object} resultados     - objeto stats devuelto por CALC[dist].stats()
 * @param {string} contexto       - texto libre describiendo el proceso/negocio
 * @param {string} pregunta       - pregunta libre del usuario
 */
function armarPayload(distribucion, parametros, resultados, contexto, pregunta) {
  return { distribucion, parametros, resultados, contexto, pregunta };
}

/**
 * Genera un resumen automático (sin que el usuario pregunte nada),
 * para mostrar apenas se calcula la distribución.
 */
function generarResumenAutomatico(payload) {
  const { distribucion, resultados, contexto } = payload;
  const d = DISTRIBUTIONS[distribucion];
  const nombre = d ? d.name : distribucion;
  const partes = [];

  if (contexto && contexto.trim().length > 0) {
    partes.push(`Con base en el contexto que describiste ("${contexto.trim()}"), estos son los resultados para una distribución ${nombre}:`);
  } else {
    partes.push(`Resultados para la distribución ${nombre}:`);
  }

  if (typeof resultados.E === 'number') {
    partes.push(`El valor esperado (media) es ${fmtNum(resultados.E)}. En promedio, esto es lo que se espera observar a largo plazo si el proceso se repite muchas veces.`);
  }

  if (typeof resultados.SD === 'number') {
    partes.push(`La desviación estándar es ${fmtNum(resultados.SD)}, lo que indica ${interpretarDispersion(resultados)}.`);
  }

  if (typeof resultados.Asim === 'number' && resultados.Asim !== 0) {
    partes.push(interpretarAsimetria(resultados.Asim));
  }

  return partes.join(' ');
}

function interpretarDispersion(resultados) {
  if (typeof resultados.E !== 'number' || typeof resultados.SD !== 'number' || resultados.E === 0) {
    return 'la variabilidad de los datos alrededor de la media';
  }
  const cv = Math.abs(resultados.SD / resultados.E);
  if (cv < 0.15) return 'una dispersión baja: los valores tienden a estar cerca de la media';
  if (cv < 0.35) return 'una dispersión moderada alrededor de la media';
  return 'una dispersión alta: los valores pueden alejarse considerablemente de la media';
}

function interpretarAsimetria(asim) {
  if (asim === '∞' || isNaN(asim)) return '';
  if (Math.abs(asim) < 0.15) return 'La distribución es prácticamente simétrica.';
  if (asim > 0) return `La asimetría es positiva (${fmtNum(asim)}), es decir, la cola derecha es más larga: hay más probabilidad de valores altos alejados de la media que de valores bajos igual de alejados.`;
  return `La asimetría es negativa (${fmtNum(asim)}), es decir, la cola izquierda es más larga: hay más probabilidad de valores bajos alejados de la media que de valores altos igual de alejados.`;
}

/**
 * Detecta el tipo de pregunta por palabras clave y arma una respuesta.
 * Esta es la función que en fase 2 se reemplaza por una llamada a IA.
 */
function generarRespuesta(payload) {
  const { pregunta, resultados, contexto, distribucion } = payload;
  const d = DISTRIBUTIONS[distribucion];
  const nombre = d ? d.name : distribucion;

  if (!pregunta || pregunta.trim().length === 0) {
    return generarResumenAutomatico(payload);
  }

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0
    ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): `
    : '';

  // Patrón: dispersión / variabilidad
  if (/dispers|varia|volátil|consisten/.test(q)) {
    return intro + `La desviación estándar de esta ${nombre} es ${fmtNum(resultados.SD)} y la varianza es ${fmtNum(resultados.Var)}. Esto refleja ${interpretarDispersion(resultados)}. Recuerda que la varianza está en unidades al cuadrado, por eso para interpretar en las unidades originales de tu dato se usa la desviación estándar.`;
  }

  // Patrón: forma / simetría / normalidad
  if (/simétric|simetr|normal|forma|sesg/.test(q)) {
    const texto = typeof resultados.Asim === 'number' ? interpretarAsimetria(resultados.Asim) : 'Esta distribución no tiene un coeficiente de asimetría estándar definido.';
    return intro + texto;
  }

  // Patrón: valores atípicos / outliers
  if (/atípic|outlier|extremo|raro/.test(q)) {
    if (typeof resultados.E === 'number' && typeof resultados.SD === 'number') {
      const limInf = fmtNum(resultados.E - 2 * resultados.SD);
      const limSup = fmtNum(resultados.E + 2 * resultados.SD);
      return intro + `Como regla práctica (no una prueba formal), los valores fuera del rango [${limInf}, ${limSup}] — es decir, a más de 2 desviaciones estándar de la media — se consideran poco usuales para esta distribución. Para un análisis riguroso de valores atípicos en datos reales, lo correcto es usar el rango intercuartílico (IQR) sobre tu muestra específica.`;
    }
    return intro + 'Para identificar valores atípicos necesito la media y la desviación estándar, que no están disponibles para esta distribución en particular.';
  }

  // Patrón: media / promedio / valor esperado
  if (/media|promedio|esperad|centro/.test(q)) {
    return intro + `El valor esperado (media teórica) de esta ${nombre} es ${fmtNum(resultados.E)}. Es el valor alrededor del cual se concentran los datos si el proceso se repitiera muchas veces bajo las mismas condiciones.`;
  }

  // Patrón: qué significa en general / interpretar resultado
  if (/qué significa|que significa|interpretar|explica|análisis/.test(q)) {
    return generarResumenAutomatico(payload);
  }

  // Sin coincidencia: respuesta honesta sobre la limitación actual
  return intro + `Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: dispersión/variabilidad, forma de la distribución (simetría), valores atípicos, y el significado de la media. Prueba reformulando tu pregunta usando alguna de esas ideas.`;
}
