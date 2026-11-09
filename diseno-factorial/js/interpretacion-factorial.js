// ═══════════════════════════════════════════════════════════════════════════
//  MÓDULO DE INTERPRETACIÓN — Diseño Factorial 2ᵏ
// ═══════════════════════════════════════════════════════════════════════════

function fmtF(v, dec = 4) {
  if (v === null || v === undefined) return 'N/A';
  if (typeof v === 'string') return v;
  if (isNaN(v) || !isFinite(v)) return '∞';
  return parseFloat(v.toFixed(dec)).toString();
}

function armarPayloadFactorial(parametros, resultados, contexto, pregunta) {
  return { parametros, resultados, contexto, pregunta };
}

function generarResumenFactorial(payload) {
  const { resultados: r, contexto } = payload;
  const partes = [];
  if (contexto && contexto.trim().length > 0) partes.push(`Con base en tu contexto ("${contexto.trim()}"):`);

  const sig = r.efectos.filter(e => e.significativo);
  const principales = sig.filter(e => e.indices.length === 1);
  const interacciones = sig.filter(e => e.indices.length > 1);

  partes.push(`El modelo explica el ${fmtF(r.r2*100,1)}% de la variabilidad total (R²=${fmtF(r.r2)}).`);

  if (principales.length > 0) {
    partes.push(`Los efectos principales significativos son: ${principales.map(e => `${e.nombre} (efecto=${fmtF(e.efecto,2)})`).join(', ')}.`);
  } else {
    partes.push('Ningún efecto principal resultó significativo.');
  }

  if (interacciones.length > 0) {
    partes.push(`También hay interacciones significativas: ${interacciones.map(e => e.nombre).join(', ')} — esto es importante: cuando una interacción es significativa, el efecto de un factor DEPENDE del nivel del otro, así que no se pueden interpretar los efectos principales de forma aislada sin mirar la interacción.`);
  } else {
    partes.push('No hay interacciones significativas entre los factores — cada factor puede interpretarse de forma independiente.');
  }

  const noSig = r.efectos.filter(e => !e.significativo);
  if (noSig.length > 0 && r.dfE > 0) {
    partes.push(`Los efectos sin significancia (${noSig.map(e => e.nombre).join(', ')}) podrían considerarse para simplificar el modelo, agrupándolos como error si el diseño lo permite.`);
  }
  return partes.join(' ');
}

function generarRespuestaFactorial(payload) {
  const { pregunta, resultados: r, contexto } = payload;

  if (!pregunta || pregunta.trim().length === 0) return generarResumenFactorial(payload);

  const q = pregunta.toLowerCase();
  const intro = contexto && contexto.trim().length > 0 ? `Tomando en cuenta tu contexto ("${contexto.trim()}"): ` : '';

  if (/interacci[oó]n/.test(q)) {
    const inter = r.efectos.filter(e => e.indices.length > 1);
    const sig = inter.filter(e => e.significativo);
    if (sig.length === 0) return intro + 'Ninguna interacción resultó significativa — puedes interpretar cada factor de forma independiente, sin preocuparte de que su efecto cambie según el nivel de los demás factores.';
    return intro + `Las interacciones significativas son: ${sig.map(e => e.nombre).join(', ')}. Una interacción significativa significa que el efecto de un factor cambia según el nivel del otro — por ejemplo, si AB es significativa, el efecto de A es distinto cuando B está en su nivel bajo que cuando está en su nivel alto. Cuando hay interacciones importantes, hay que ser cuidadoso al interpretar los efectos principales por separado.`;
  }

  if (/efecto principal|factor m[aá]s importante|cu[aá]l factor/.test(q)) {
    const principales = r.efectos.filter(e => e.indices.length === 1).sort((a,b) => Math.abs(b.efecto) - Math.abs(a.efecto));
    return intro + `Ordenados por magnitud del efecto: ${principales.map(e => `${e.nombre} (efecto=${fmtF(e.efecto,2)}, ${e.significativo ? 'significativo' : 'no significativo'})`).join('; ')}. El factor con mayor efecto absoluto es el que más impacto tiene sobre la respuesta.`;
  }

  if (/significa(tivo)?|c[oó]mo s[eé] si|valor-?p/.test(q)) {
    return intro + 'Cada efecto (principal o interacción) tiene su propia prueba F individual, comparando su cuadrado medio contra el cuadrado medio del error puro (calculado a partir de la variación entre réplicas de una misma corrida). Un efecto es significativo si su valor-p es menor a 0.05.';
  }

  if (/r[eé]plica|error puro|por qu[eé] necesito repetir/.test(q)) {
    return intro + `Las réplicas (repetir cada corrida ${r.r} veces en este caso) son las que permiten calcular el "error puro": la variabilidad natural que existe aunque no cambies nada. Sin réplicas, no habría forma de distinguir si una diferencia se debe a un efecto real o solo a ruido aleatorio — el diseño no tendría grados de libertad para el error.`;
  }

  if (/qu[eé] significa|interpretar|explica|resumen/.test(q)) {
    return generarResumenFactorial(payload);
  }

  return intro + 'Todavía no tengo una regla programada para responder exactamente esa pregunta. Por ahora puedo ayudarte con: qué significan las interacciones, cuál es el factor más importante, cómo se determina la significancia, y por qué se necesitan réplicas.';
}
