// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE FUNDAMENTOS DE PROBABILIDAD — Estadilab
//  Combinatoria, probabilidad básica, condicional y Teorema de Bayes.
// ═══════════════════════════════════════════════════════════════════════════

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function permutaciones(n, r) {
  if (r > n || r < 0) return NaN;
  let result = 1;
  for (let i = 0; i < r; i++) result *= (n - i);
  return result;
}

function combinaciones(n, r) {
  if (r > n || r < 0) return NaN;
  r = Math.min(r, n - r);
  let result = 1;
  for (let i = 0; i < r; i++) { result *= (n - i); result /= (i + 1); }
  return Math.round(result);
}

function permutacionesConRepeticion(n, r) {
  return Math.pow(n, r);
}

function permutacionesMultinomial(n, grupos) {
  // grupos: arreglo con el tamaño de cada subgrupo de objetos idénticos
  const sumaGrupos = grupos.reduce((a, b) => a + b, 0);
  if (sumaGrupos !== n) return NaN;
  let denom = 1;
  grupos.forEach(g => { denom *= factorial(g); });
  return factorial(n) / denom;
}

// ═══ PROBABILIDAD BÁSICA ═══
function probabilidadBasica({ pa, pb, interseccion, independientes }) {
  const paib = independientes ? pa * pb : interseccion;
  const union = pa + pb - paib;
  const complementoA = 1 - pa;
  const complementoB = 1 - pb;
  const mutuamenteExcluyentes = Math.abs(paib) < 1e-9;
  const sonIndependientes = Math.abs(paib - pa * pb) < 1e-6;
  return { paib, union, complementoA, complementoB, mutuamenteExcluyentes, sonIndependientes };
}

// ═══ PROBABILIDAD CONDICIONAL ═══
function probabilidadCondicional({ paib, pb, pa }) {
  const paDadoB = paib / pb;
  const sonIndependientes = pa !== undefined && !isNaN(pa) ? Math.abs(paDadoB - pa) < 1e-6 : null;
  return { paDadoB, sonIndependientes };
}

// ═══ TEOREMA DE BAYES (generalizado a n hipótesis) ═══
function teoremaBayes({ priors, likelihoods }) {
  const n = priors.length;
  const conjuntas = priors.map((p, i) => p * likelihoods[i]);
  const pE = conjuntas.reduce((a, b) => a + b, 0);
  const posteriores = conjuntas.map(c => pE > 0 ? c / pE : 0);
  const sumaPriors = priors.reduce((a, b) => a + b, 0);
  return { pE, posteriores, conjuntas, sumaPriorsOK: Math.abs(sumaPriors - 1) < 1e-6, sumaPriors };
}
