// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE DISEÑO FACTORIAL 2ᵏ — Estadilab
//  Calcula efectos principales, interacciones, sumas de cuadrados y tabla
//  ANOVA para un diseño factorial 2ᵏ con cualquier número de réplicas (r ≥ 1),
//  datos balanceados o no (SC tipo III) y diseños sin réplica (método de Lenth).
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
  },
  tCDF: function(t, d) {
    const x = d / (d + t * t), p = 0.5 * MF.betaInc(x, d / 2, 0.5);
    return t > 0 ? 1 - p : p;
  },
  tQuant: function(p, d) {            // cuantil de la t de Student (bisección)
    let lo = 0, hi = 1e4;
    if (p < 0.5) return -MF.tQuant(1 - p, d);
    for (let it = 0; it < 200; it++) { const m = (lo + hi) / 2; if (MF.tCDF(m, d) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  },
  qnorm: function(p) {                // Acklam, error relativo < 1.2e-9
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    let q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
};

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const K_MAX = 6;

/**
 * Genera el diseño estándar 2^k: para cada corrida, el signo (-1/+1) de
 * cada factor, y la notación estándar de tratamiento (ej. "(1)", "a", "ab").
 */
function generarDiseno(k) {
  const numCorridas = Math.pow(2, k);
  const corridas = [];
  for (let i = 0; i < numCorridas; i++) {
    const signos = [];
    for (let f = 0; f < k; f++) signos.push(((i >> f) & 1) === 0 ? -1 : 1);
    let etiqueta = '';
    for (let f = 0; f < k; f++) if (signos[f] === 1) etiqueta += LETRAS[f].toLowerCase();
    if (etiqueta === '') etiqueta = '(1)';
    corridas.push({ signos, etiqueta });
  }
  return corridas;
}

/** Todos los subconjuntos no vacíos de {0,...,k-1}, ordenados por tamaño (efectos principales primero). */
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

function nombreEfecto(indices) { return indices.map(i => LETRAS[i]).join(''); }

function invertirMatriz(M) {
  const n = M.length, A = M.map((f, i) => [...f, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let i = 0; i < n; i++) if (i !== c) { const f = A[i][c]; if (f) for (let j = 0; j < 2 * n; j++) A[i][j] -= f * A[c][j]; }
  }
  return A.map(f => f.slice(n));
}

function mediana(v) { const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

/**
 * Análisis de un diseño factorial 2^k con r ≥ 1 observaciones por corrida.
 *  · Balanceado (mismo n en todas las corridas): contrastes clásicos.
 *  · No balanceado: mínimos cuadrados con codificación ±1 y SC tipo III.
 *  · Sin réplicas (gl de error = 0): significancia por el método de Lenth (PSE, ME, SME).
 * @param {number} k
 * @param {number[][]} datosPorCorrida  observaciones de cada corrida, en el orden de generarDiseno(k)
 */
function analizarFactorial(k, datosPorCorrida) {
  const corridas = generarDiseno(k);
  const numCorridas = corridas.length;
  const n = datosPorCorrida.map(a => a.length);
  const nMin = Math.min(...n), nMax = Math.max(...n);
  const balanceado = nMin === nMax;
  const r = nMax;
  const N = n.reduce((a, b) => a + b, 0);

  const totalesCorrida = datosPorCorrida.map(reps => reps.reduce((a, b) => a + b, 0));
  const mediasCorrida = totalesCorrida.map((t, i) => t / n[i]);
  const granMedia = totalesCorrida.reduce((a, b) => a + b, 0) / N;

  const subconjuntos = generarSubconjuntos(k);
  const signoDe = (i, indices) => indices.reduce((prod, f) => prod * corridas[i].signos[f], 1);

  let sse = 0;
  datosPorCorrida.forEach((reps, i) => reps.forEach(y => { sse += (y - mediasCorrida[i]) ** 2; }));
  let sst = 0;
  datosPorCorrida.forEach(reps => reps.forEach(y => { sst += (y - granMedia) ** 2; }));
  const dfE = N - numCorridas;
  const mse = dfE > 0 ? sse / dfE : NaN;

  let efectos;
  if (balanceado) {
    efectos = subconjuntos.map(indices => {
      let contraste = 0;
      for (let i = 0; i < numCorridas; i++) contraste += signoDe(i, indices) * totalesCorrida[i];
      return { nombre: nombreEfecto(indices), indices, contraste, efecto: contraste / (r * Math.pow(2, k - 1)), ss: (contraste * contraste) / (r * Math.pow(2, k)) };
    });
  } else {
    // Modelo saturado en las medias de celda: β = H·ȳ / 2^k; SC tipo III = β² / [(X'WX)^-1]_jj
    const cols = [[]].concat(subconjuntos.map(s => s));
    const X = corridas.map((_, i) => cols.map(ind => signoDe(i, ind)));
    const M = cols.map((_, a) => cols.map((_, b) => X.reduce((acc, fila, i) => acc + n[i] * fila[a] * fila[b], 0)));
    const Minv = invertirMatriz(M);
    efectos = subconjuntos.map((indices, j) => {
      const beta = X.reduce((acc, fila, i) => acc + fila[j + 1] * mediasCorrida[i], 0) / numCorridas;
      return { nombre: nombreEfecto(indices), indices, contraste: NaN, efecto: 2 * beta, ss: beta * beta / Minv[j + 1][j + 1] };
    });
  }

  let metodo = 'anova', lenth = null;
  efectos.forEach(e => { e.ms = e.ss; });
  if (dfE > 0) {
    efectos.forEach(e => {
      e.f = e.ms / mse;
      e.p = 1 - MF.fCDF(e.f, 1, dfE);
      e.significativo = e.p < 0.05;
    });
  } else {
    // Sin réplicas: método de Lenth (1989)
    metodo = 'lenth';
    const abs = efectos.map(e => Math.abs(e.efecto)), m = abs.length;
    const s0 = 1.5 * mediana(abs);
    const pse = 1.5 * mediana(abs.filter(a => a < 2.5 * s0));
    const d = m / 3;
    const me = MF.tQuant(0.975, d) * pse;
    const sme = MF.tQuant((1 + Math.pow(0.95, 1 / m)) / 2, d) * pse;
    lenth = { pse, s0, df: d, me, sme, m };
    efectos.forEach(e => {
      e.f = NaN; e.t = pse > 0 ? e.efecto / pse : NaN;
      e.p = pse > 0 ? 2 * (1 - MF.tCDF(Math.abs(e.t), d)) : NaN;
      e.significativo = Math.abs(e.efecto) > me;
      e.simultaneo = Math.abs(e.efecto) > sme;
    });
  }

  const r2 = sst > 0 ? (sst - sse) / sst : NaN;

  // Gráfico normal (Daniel): efectos ordenados vs cuantiles normales
  const orden = efectos.map((e, i) => i).sort((a, b) => efectos[a].efecto - efectos[b].efecto);
  const m = efectos.length;
  const normal = orden.map((idx, j) => ({ nombre: efectos[idx].nombre, efecto: efectos[idx].efecto, z: MF.qnorm((j + 0.5) / m), significativo: efectos[idx].significativo }));

  return {
    k, r, n, nMin, nMax, balanceado, numCorridas, N, corridas, totalesCorrida, mediasCorrida, granMedia,
    efectos, sse, dfE, mse, sst, dfT: N - 1, r2, metodo, lenth, normal
  };
}

/** Texto corto: "2 réplicas" o "entre 1 y 5 réplicas (desbalanceado)". */
function textoReplicas(r) {
  return r.balanceado ? (r.r === 1 ? 'sin réplicas (1 observación por corrida)' : r.r + ' réplicas por corrida') : 'entre ' + r.nMin + ' y ' + r.nMax + ' observaciones por corrida (diseño desbalanceado)';
}

function parsearReplicas(texto) {
  const partes = texto.split(/[,;\s]+/).map(s => s.trim()).filter(s => s.length > 0);
  const numeros = partes.map(Number);
  if (numeros.some(isNaN) || numeros.length === 0) return null;
  return numeros;
}
if (typeof module !== 'undefined') module.exports = { MF, generarDiseno, generarSubconjuntos, analizarFactorial, parsearReplicas, textoReplicas };
