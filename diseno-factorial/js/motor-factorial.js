// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE DISEÑO FACTORIAL 2ᵏ — Estadilab
//  Calcula efectos principales, interacciones, sumas de cuadrados y tabla
//  ANOVA completa para un diseño factorial 2ᵏ con réplicas.
// ═══════════════════════════════════════════════════════════════════════════

const MF = {
  logGamma: function(z) {
    if (z <= 0) return NaN;
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
                -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let x = z, y = z, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) { y += 1; ser += c[j] / y; }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  },
  betacf: function(x, a, b) {
    const MAXIT = 200, EPS = 3e-9, FPMIN = 1e-30;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  },
  betaInc: function(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(MF.logGamma(a + b) - MF.logGamma(a) - MF.logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * MF.betacf(x, a, b) / a;
    return 1 - bt * MF.betacf(1 - x, b, a) / b;
  },
  fCDF: function(f, d1, d2) {
    if (f <= 0) return 0;
    const x = (d1 * f) / (d1 * f + d2);
    return MF.betaInc(x, d1 / 2, d2 / 2);
  }
};

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Genera el diseño estándar 2^k: para cada corrida, el signo (-1/+1) de
 * cada factor, y la notación estándar de tratamiento (ej. "(1)", "a", "ab").
 */
function generarDiseno(k) {
  const numCorridas = Math.pow(2, k);
  const corridas = [];
  for (let i = 0; i < numCorridas; i++) {
    const signos = [];
    for (let f = 0; f < k; f++) {
      const bit = (i >> f) & 1;
      signos.push(bit === 0 ? -1 : 1);
    }
    let etiqueta = '';
    for (let f = 0; f < k; f++) if (signos[f] === 1) etiqueta += LETRAS[f].toLowerCase();
    if (etiqueta === '') etiqueta = '(1)';
    corridas.push({ signos, etiqueta });
  }
  return corridas;
}

/** Genera todos los subconjuntos no vacíos de {0,...,k-1}, ordenados por tamaño (efectos principales primero). */
function generarSubconjuntos(k) {
  const subconjuntos = [];
  for (let mask = 1; mask < Math.pow(2, k); mask++) {
    const indices = [];
    for (let f = 0; f < k; f++) if ((mask >> f) & 1) indices.push(f);
    subconjuntos.push(indices);
  }
  subconjuntos.sort((a, b) => a.length - b.length);
  return subconjuntos;
}

function nombreEfecto(indices) {
  return indices.map(i => LETRAS[i]).join('');
}

/**
 * Calcula el análisis completo de un diseño factorial 2^k con réplicas.
 * @param {number} k - número de factores
 * @param {number[][]} datosPorCorrida - arreglo de arreglos; cada uno tiene
 *        las r réplicas de la respuesta para esa corrida (mismo orden que generarDiseno(k))
 */
function analizarFactorial(k, datosPorCorrida) {
  const corridas = generarDiseno(k);
  const numCorridas = corridas.length;
  const r = datosPorCorrida[0].length;
  const N = numCorridas * r;

  const totalesCorrida = datosPorCorrida.map(reps => reps.reduce((a, b) => a + b, 0));
  const mediasCorrida = totalesCorrida.map(t => t / r);
  const granTotal = totalesCorrida.reduce((a, b) => a + b, 0);
  const granMedia = granTotal / N;

  const subconjuntos = generarSubconjuntos(k);
  const efectos = subconjuntos.map(indices => {
    let contraste = 0;
    for (let i = 0; i < numCorridas; i++) {
      const signoEfecto = indices.reduce((prod, f) => prod * corridas[i].signos[f], 1);
      contraste += signoEfecto * totalesCorrida[i];
    }
    const efecto = contraste / (r * Math.pow(2, k - 1));
    const ss = (contraste * contraste) / (r * Math.pow(2, k));
    return { nombre: nombreEfecto(indices), indices, contraste, efecto, ss };
  });

  // Error puro (a partir de la variabilidad dentro de las réplicas de cada corrida)
  let sse = 0;
  datosPorCorrida.forEach((reps, i) => {
    reps.forEach(y => { sse += (y - mediasCorrida[i]) ** 2; });
  });
  const dfE = numCorridas * (r - 1);

  let sst = 0;
  datosPorCorrida.forEach(reps => { reps.forEach(y => { sst += (y - granMedia) ** 2; }); });

  const mse = dfE > 0 ? sse / dfE : NaN;

  efectos.forEach(e => {
    e.ms = e.ss; // 1 grado de libertad por efecto
    e.f = dfE > 0 ? e.ms / mse : NaN;
    e.p = dfE > 0 ? 1 - MF.fCDF(e.f, 1, dfE) : NaN;
    e.significativo = dfE > 0 ? e.p < 0.05 : null;
  });

  const ssModelo = efectos.reduce((acc, e) => acc + e.ss, 0);
  const r2 = ssModelo / sst;

  return {
    k, r, numCorridas, N, corridas, totalesCorrida, mediasCorrida, granMedia,
    efectos, sse, dfE, mse, sst, dfT: N - 1, r2
  };
}

function parsearReplicas(texto) {
  const partes = texto.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
  const numeros = partes.map(Number);
  if (numeros.some(isNaN) || numeros.length === 0) return null;
  return numeros;
}
