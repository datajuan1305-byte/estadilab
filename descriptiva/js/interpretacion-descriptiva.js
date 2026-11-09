// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Estadística Descriptiva
//  Misma arquitectura de payload que interpretacion.js (distribuciones):
//  hoy reglas locales, mañana se reemplaza el cuerpo por una llamada a IA.
// ═══════════════════════════════════════════════════════════════════════════

function fmtD(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadDescriptiva(datos, resultados, contexto, pregunta) {
  return { datos, resultados, contexto, pregunta };
}

function interpretarDispersionDescriptiva(r) {
  if (!isFinite(r.coeficienteVariacion)) return 'la variabilidad de los datos respecto al promedio';
  const cv = Math.abs(r.coeficienteVariacion);
  if (cv < 15) return `una dispersión baja (CV = ${fmtD(cv,2)}%): los datos son bastante homogéneos`;
  if (cv < 35) return `una dispersión moderada (CV = ${fmtD(cv,2)}%)`;
  return `una dispersión alta (CV = ${fmtD(cv,2)}%): los datos son bastante heterogéneos`;
}

function interpretarFormaDescriptiva(r) {
  const partes = [];
  if (Math.abs(r.sesgoEstandarizado) <= 2) {
    partes.push('El sesgo estandarizado está dentro de ±2, lo que es compatible con una distribución simétrica (no hay evidencia fuerte de asimetría).');
  } else if (r.sesgo > 0) {
    partes.push(`El sesgo estandarizado (${fmtD(r.sesgoEstandarizado,2)}) está fuera de ±2, indicando asimetría positiva: hay valores altos alejados de la media que la "jalan" hacia la derecha (cola derecha más larga).`);
  } else {
    partes.push(`El sesgo estandarizado (${fmtD(r.sesgoEstandarizado,2)}) está fuera de ±2, indicando asimetría negativa: hay valores bajos alejados de la media que la "jalan" hacia la izquierda (cola izquierda más larga).`);
  }
  if (Math.abs(r.curtosisEstandarizada) <= 2) {
    partes.push('La curtosis estandarizada también está dentro de ±2, compatible con un apuntamiento similar al de una distribución normal.');
  } else if (r.curtosis > 0) {
    partes.push(`La curtosis estandarizada (${fmtD(r.curtosisEstandarizada,2)}) sugiere una distribución más apuntada y con colas más pesadas que la normal (leptocúrtica).`);
  } else {
    partes.push(`La curtosis estandarizada (${fmtD(r.curtosisEstandarizada,2)}) sugiere una distribución más plana que la normal (platicúrtica).`);
  }
  return partes.join(' ');
}

function interpretarAtipicosDescriptiva(datos, r) {
  const limInf = r.cuartilInferior - 1.5 * r.rangoIntercuartilico;
  const limSup = r.cuartilSuperior + 1.5 * r.rangoIntercuartilico;
  const atipicos = datos.filter(x => x < limInf || x > limSup);
  if (atipicos.length === 0) {
    return `Usando la regla del rango intercuartílico (valores fuera de [${fmtD(limInf,2)}, ${fmtD(limSup,2)}], es decir a más de 1.5×RIQ de los cuartiles), no se detectan valores atípicos en tus datos.`;
  }
  return `Usando la regla del rango intercuartílico (valores fuera de [${fmtD(limInf,2)}, ${fmtD(limSup,2)}]), se detectan ${atipicos.length} valor(es) atípico(s): ${atipicos.join(', ')}. Esto también explica por qué el promedio (${fmtD(r.promedio,2)}) puede diferir de la mediana (${fmtD(r.mediana,2)}) o de la media recortada (${fmtD(r.mediaRecortada5,2)}), que son menos sensibles a estos valores extremos.`;
}

function generarResumenAutomaticoDescriptiva(payload) {
  const { resultados: r, contexto, datos } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) {
    partes.push(`Con base en el contexto que describiste ("${contexto.trim()}"), estos son los resultados de tu muestra de ${r.recuento} datos:`);
  } else {
    partes.push(`Resultados de tu muestra de ${r.recuento} datos:`);
  }
  partes.push(`El promedio es ${fmtD(r.promedio,2)} y la mediana es ${fmtD(r.mediana,2)}.`);
  if (Math.abs(r.promedio - r.mediana) > 0.05 * Math.abs(r.promedio || 1)) {
    partes.push('Como estos dos valores difieren de forma notoria, es señal de que la distribución de tus datos probablemente no es simétrica, o hay valores atípicos influyendo en el promedio.');
  } else {
    partes.push('Como estos dos valores están cerca, es una señal (no una prueba) de que los datos podrían estar distribuidos de forma razonablemente simétrica.');
  }
  partes.push(`Presentan ${interpretarDispersionDescriptiva(r)}.`);
  return partes.join(' ');
}

function generarRespuestaDescriptiva(payload) {
  const { pregunta, resultados: r, contexto, datos } = payload;

  if (!pregunta || pregunta.trim().length === 0) {
    return generarResumenAutomaticoDescriptiva(payload);
  }

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0
    ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): `
    : '';

  if (/dispers|varia|homogén|heterogén|consisten/.test(q)) {
    return intro + `La desviación estándar es ${fmtD(r.desviacionEstandar,3)} y el coeficiente de variación es ${fmtD(r.coeficienteVariacion,2)}%. Esto refleja ${interpretarDispersionDescriptiva(r)}. El coeficiente de variación es útil porque no depende de la unidad de medida, así que permite comparar la dispersión entre variables distintas.`;
  }

  if (/simétric|simetr|sesg|forma|normal|curtosis|apuntad/.test(q)) {
    return intro + interpretarFormaDescriptiva(r);
  }

  if (/atípic|outlier|extremo|raro/.test(q)) {
    return intro + interpretarAtipicosDescriptiva(datos, r);
  }

  if (/media|promedio|central|mediana|moda/.test(q)) {
    return intro + `El promedio es ${fmtD(r.promedio,3)}, la mediana es ${fmtD(r.mediana,3)}, y la moda es ${r.moda.texto}. Si promedio y mediana son parecidos, los datos tienden a ser simétricos; si difieren bastante, suele haber asimetría o valores atípicos jalando el promedio. Para datos con valores extremos, la mediana o la media recortada al 5% (${fmtD(r.mediaRecortada5,3)}) suelen representar mejor el "centro típico" que el promedio simple.`;
  }

  if (/robust|recortad|winsoriz|confiable/.test(q)) {
    return intro + `La media recortada al 5% es ${fmtD(r.mediaRecortada5,3)} y la media winsorizada al 5% es ${fmtD(r.mediaWinsorizada5,3)}, comparadas con el promedio simple de ${fmtD(r.promedio,3)}. Estas versiones "recortan" o "suavizan" el efecto de los valores más extremos del 5% superior e inferior de tus datos. Si son muy parecidas al promedio simple, tus datos no tienen valores extremos influyentes; si difieren bastante, sí los hay. Nota: con muestras pequeñas (menos de 20 datos aproximadamente), el recorte del 5% puede no eliminar ningún dato, por lo que estos valores pueden coincidir exactamente con el promedio.`;
  }

  if (/qué significa|que significa|interpretar|explica|análisis|resumen/.test(q)) {
    return generarResumenAutomaticoDescriptiva(payload);
  }

  return intro + `Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: dispersión/variabilidad, forma de la distribución (simetría, curtosis), valores atípicos, medidas de tendencia central, y estadísticos robustos (recortada/winsorizada). Prueba reformulando tu pregunta usando alguna de esas ideas.`;
}
