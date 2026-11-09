// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Fundamentos de Probabilidad
// ═══════════════════════════════════════════════════════════════════════════

function fmtP(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadProb(tipo, parametros, resultados, contexto, pregunta) {
  return { tipo, parametros, resultados, contexto, pregunta };
}

function generarResumenProb(payload) {
  const { tipo, resultados: r, contexto } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) partes.push(`Con base en tu contexto ("${contexto.trim()}"):`);

  if (tipo === 'combinatoria') {
    partes.push(`El resultado es ${fmtP(r.valor, 0)}.`);
  } else if (tipo === 'basica') {
    partes.push(`P(A ∪ B) = ${fmtP(r.union)}. Los eventos ${r.mutuamenteExcluyentes ? 'SON mutuamente excluyentes (no pueden ocurrir juntos)' : 'NO son mutuamente excluyentes'}, y ${r.sonIndependientes ? 'SÍ son independientes' : 'NO son independientes'} entre sí.`);
  } else if (tipo === 'condicional') {
    partes.push(`P(A|B) = ${fmtP(r.paDadoB)}. Esto es la probabilidad de que ocurra A, sabiendo que B ya ocurrió — es decir, B se convierte en tu nuevo "universo" de referencia.`);
    if (r.sonIndependientes !== null) {
      partes.push(r.sonIndependientes ? 'Como P(A|B) es igual a P(A), saber que ocurrió B no cambió la probabilidad de A: son independientes.' : 'Como P(A|B) es distinto de P(A), saber que ocurrió B sí cambia la probabilidad de A: no son independientes.');
    }
  } else if (tipo === 'bayes') {
    const idx = r.posteriores.indexOf(Math.max(...r.posteriores));
    partes.push(`Después de observar la evidencia, la hipótesis más probable es H${idx+1}, con una probabilidad posterior de ${fmtP(r.posteriores[idx]*100,2)}%. Antes de la evidencia (probabilidad previa/prior), la hipótesis más probable no necesariamente era la misma — el teorema de Bayes actualiza tus creencias iniciales usando la evidencia observada.`);
  }
  return partes.join(' ');
}

function generarRespuestaProb(payload) {
  const { pregunta, tipo, resultados: r, contexto, parametros: p } = payload;

  if (!pregunta || pregunta.trim().length === 0) return generarResumenProb(payload);

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0 ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/permutaci[oó]n.*combinaci[oó]n|diferencia entre/.test(q)) {
    return intro + 'La diferencia clave es el ORDEN: en una permutación, el orden importa (AB es distinto de BA); en una combinación, no importa (AB y BA cuentan como lo mismo). Por eso las permutaciones siempre dan un número mayor o igual que las combinaciones para los mismos n y r — hay menos formas de agrupar sin importar el orden que de ordenar.';
  }

  if (/independi/.test(q)) {
    if (tipo === 'basica') return intro + `Dos eventos son independientes si P(A∩B) = P(A)×P(B). En tu caso, ${r.sonIndependientes ? 'SÍ se cumple esa igualdad: son independientes.' : 'NO se cumple esa igualdad: no son independientes.'} Ojo: independencia y mutuamente excluyentes son conceptos distintos — de hecho, si dos eventos son mutuamente excluyentes (no pueden ocurrir juntos) y ambos tienen probabilidad mayor que 0, automáticamente NO son independientes.`;
    if (tipo === 'condicional') return intro + `${r.sonIndependientes ? 'Sí son independientes' : 'No son independientes'}, porque P(A|B) ${r.sonIndependientes ? 'es igual a' : 'es distinto de'} P(A).`;
    return intro + 'Dos eventos son independientes si conocer que uno ocurrió no cambia la probabilidad del otro: P(A|B) = P(A).';
  }

  if (/excluyente|mutuamente/.test(q)) {
    if (tipo === 'basica') return intro + `${r.mutuamenteExcluyentes ? 'SÍ son mutuamente excluyentes' : 'NO son mutuamente excluyentes'} (P(A∩B) = ${fmtP(r.paib)}). Dos eventos mutuamente excluyentes no pueden ocurrir al mismo tiempo — por ejemplo, al lanzar un dado, "sacar par" y "sacar impar" son mutuamente excluyentes.`;
    return intro + 'Dos eventos son mutuamente excluyentes si no pueden ocurrir al mismo tiempo, es decir, P(A∩B) = 0.';
  }

  if (/prior|previa|posterior|actualiz/.test(q)) {
    return intro + 'La probabilidad "prior" (previa) es lo que creías ANTES de ver la evidencia. La probabilidad "posterior" es lo que crees DESPUÉS de incorporar la evidencia, usando el Teorema de Bayes. Es literalmente un proceso de "actualizar tus creencias" con datos nuevos — mientras más fuerte (más informativa) sea la evidencia, más puede cambiar la conclusión respecto a lo que creías inicialmente.';
  }

  if (/bayes|falso positivo|falso negativo/.test(q)) {
    return intro + 'El Teorema de Bayes es contraintuitivo cuando el evento de interés es raro (prior bajo): incluso con una prueba muy precisa, si la condición es poco común, la mayoría de los resultados positivos pueden ser falsos positivos. Por eso P(A|B) casi nunca es igual a P(B|A) — son cosas distintas que la gente suele confundir.';
  }

  if (/qué significa|que significa|interpretar|explica|resumen/.test(q)) {
    return generarResumenProb(payload);
  }

  return intro + 'Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: diferencia entre permutación y combinación, qué es independencia, qué es mutuamente excluyente, y qué significan prior/posterior en el Teorema de Bayes.';
}
