// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Intervalos de Confianza
//  Misma arquitectura de payload que las demás calculadoras.
// ═══════════════════════════════════════════════════════════════════════════

function fmtIC(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadIC(tipoIC, parametros, resultados, contexto, pregunta) {
  return { tipoIC, parametros, resultados, contexto, pregunta };
}

function generarSignificadoIC(payload) {
  const { tipoIC, resultados: r, parametros: p } = payload;
  const confPct = (p.confianza * 100).toFixed(0);

  if (tipoIC === 'tamano_media' || tipoIC === 'tamano_proporcion') {
    return `Con un margen de error de ${fmtIC(p.error)} y ${confPct}% de confianza, necesitas una muestra de al menos ${r.nRedondeado} observaciones (el cálculo exacto da ${fmtIC(r.nExacto,2)}, y siempre se redondea hacia arriba porque una muestra fraccionaria no existe).`;
  }

  if (tipoIC === 'varianza') {
    return `Con ${confPct}% de confianza, la varianza poblacional se encuentra entre ${fmtIC(r.inferior)} y ${fmtIC(r.superior)}. A diferencia de los intervalos para la media, este NO es simétrico alrededor del valor muestral (${fmtIC(r.puntual)}) porque la distribución Chi-cuadrado no es simétrica.`;
  }

  return `Con ${confPct}% de confianza, el valor real del parámetro se encuentra entre ${fmtIC(r.inferior)} y ${fmtIC(r.superior)}. La interpretación correcta es: si repitiéramos este proceso de muestreo muchas veces, el ${confPct}% de los intervalos construidos así contendrían el verdadero valor del parámetro — NO significa que hay ${confPct}% de probabilidad de que el parámetro esté en ESTE intervalo específico (el parámetro es fijo, no aleatorio; lo aleatorio es el intervalo).`;
}

function generarResumenAutomaticoIC(payload) {
  const { contexto } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) {
    partes.push(`Con base en el contexto que describiste ("${contexto.trim()}"):`);
  }
  partes.push(generarSignificadoIC(payload));
  return partes.join(' ');
}

function generarRespuestaIC(payload) {
  const { pregunta, resultados: r, contexto, parametros: p, tipoIC } = payload;

  if (!pregunta || pregunta.trim().length === 0) {
    return generarResumenAutomaticoIC(payload);
  }

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0 ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/qué significa|que significa|interpretar|explica|significado/.test(q)) {
    return intro + generarSignificadoIC(payload);
  }

  if (/ancho|margen|preciso|precisión|amplio|estrecho/.test(q)) {
    if (tipoIC === 'tamano_media' || tipoIC === 'tamano_proporcion') {
      return intro + `El tamaño de muestra necesario depende de tres cosas: qué tan preciso quieres el resultado (margen de error más pequeño exige más muestra), qué tan seguro quieres estar (mayor confianza exige más muestra), y la variabilidad de los datos (más variable exige más muestra). Con los valores que ingresaste, se necesitan ${r.nRedondeado} observaciones.`;
    }
    return intro + `El margen de error de este intervalo es ${fmtIC(r.margen !== undefined ? r.margen : (r.superior - r.inferior) / 2)}. Un intervalo más angosto (más preciso) se logra con una muestra más grande o con menor nivel de confianza — hay un balance: más confianza generalmente implica un intervalo más ancho, no más angosto.`;
  }

  if (/confianza|nivel|porcentaje|95%|99%|90%/.test(q)) {
    const confPct = (p.confianza * 100).toFixed(0);
    return intro + `El nivel de confianza (${confPct}%) NO es la probabilidad de que el parámetro esté en este intervalo específico. Es la proporción de veces que el método usado produciría un intervalo que sí contiene el valor real, si repitieras el muestreo muchas veces bajo las mismas condiciones. Un nivel más alto (ej. 99% en vez de 95%) da un intervalo más ancho, porque exige más "margen de seguridad".`;
  }

  if (/muestra|tama[nñ]o|cu[aá]ntos datos|cu[aá]ntas observaciones/.test(q)) {
    if (tipoIC === 'tamano_media' || tipoIC === 'tamano_proporcion') {
      return intro + `Necesitas al menos ${r.nRedondeado} observaciones para lograr el margen de error y nivel de confianza que especificaste.`;
    }
    return intro + `Si quieres calcular cuántos datos necesitarías para un margen de error específico, usa las calculadoras de "Tamaño de muestra" en el menú lateral (para media o para proporción), en vez de esta que parte de una muestra ya tomada.`;
  }

  if (/sim[eé]tric|asim[eé]tric/.test(q)) {
    if (tipoIC === 'varianza') {
      return intro + 'Este intervalo NO es simétrico alrededor del valor muestral, porque la distribución Chi-cuadrado (que se usa para la varianza) no es simétrica. Los intervalos para la media (Z o t) sí son simétricos porque se basan en distribuciones simétricas.';
    }
    return intro + 'Este intervalo sí es simétrico alrededor del valor puntual muestral, porque se basa en una distribución simétrica (Normal o t-Student).';
  }

  return intro + `Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: qué significa el intervalo de confianza, por qué es más ancho o más angosto, qué representa el nivel de confianza, y cuántos datos necesitarías (tamaño de muestra). Prueba reformulando tu pregunta usando alguna de esas ideas.`;
}
