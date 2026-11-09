// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE DISTRIBUCIONES MUESTRALES — Estadilab
//  Distribución muestral de la media y de la proporción, más un simulador
//  Monte Carlo del Teorema del Límite Central.
// ═══════════════════════════════════════════════════════════════════════════

const MM = {
  normCDF: function(x) {
    // Cola superior Q(|x|) con precisión ~1e-15 (serie de erf para |x|<3, fracción continua en la cola)
    const ax = Math.abs(x); let Q;
    if (ax < 3) {
      const z = ax / Math.SQRT2; let term = z, sum = z;
      for (let n = 1; n < 300; n++) { term *= 2 * z * z / (2 * n + 1); sum += term; if (term < 1e-17 * sum) break; }
      Q = 0.5 - 0.5 * (2 / Math.sqrt(Math.PI)) * Math.exp(-z * z) * sum;
    } else {
      let fc = ax; for (let k = 80; k >= 1; k--) fc = ax + k / fc;
      Q = Math.exp(-ax * ax / 2) / Math.sqrt(2 * Math.PI) / fc;
    }
    return x >= 0 ? 1 - Q : Q;
  },
  normPDF: function(x) { return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); }
};

// ═══ DISTRIBUCIÓN MUESTRAL DE LA MEDIA ═══
function distribucionMuestralMedia({ mu, sigma, n }) {
  const ee = sigma / Math.sqrt(n);
  return { mu, ee, n };
}

function probMuestralMedia({ mu, ee, tipoConsulta, a, b }) {
  const zA = a !== undefined ? (a - mu) / ee : undefined;
  const zB = b !== undefined ? (b - mu) / ee : undefined;
  let prob;
  if (tipoConsulta === 'leq') prob = MM.normCDF(zA);
  else if (tipoConsulta === 'geq') prob = 1 - MM.normCDF(zA);
  else if (tipoConsulta === 'entre') prob = MM.normCDF(zB) - MM.normCDF(zA);
  return { prob: Math.max(0, Math.min(1, prob)), zA, zB };
}

// ═══ DISTRIBUCIÓN MUESTRAL DE LA PROPORCIÓN ═══
function distribucionMuestralProporcion({ p, n }) {
  const ee = Math.sqrt((p * (1 - p)) / n);
  const condicionValida = (n * p >= 5) && (n * (1 - p) >= 5);
  return { p, ee, n, condicionValida, np: n * p, nq: n * (1 - p) };
}

function probMuestralProporcion({ p, ee, tipoConsulta, a, b }) {
  return probMuestralMedia({ mu: p, ee, tipoConsulta, a, b });
}

// ═══ SIMULADOR MONTE CARLO DEL TEOREMA DEL LÍMITE CENTRAL ═══
const POBLACIONES = {
  uniforme: {
    nombre: 'Uniforme (0 a 10)',
    mu: 5,
    sigma: Math.sqrt(100 / 12),
    muestrear: () => Math.random() * 10
  },
  exponencial: {
    nombre: 'Exponencial (λ = 1) — muy sesgada',
    mu: 1,
    sigma: 1,
    muestrear: () => -Math.log(1 - Math.random())
  },
  bimodal: {
    nombre: 'Bimodal (dos picos separados)',
    mu: 0,
    sigma: Math.sqrt(10),
    muestrear: () => {
      // 50% N(-3,1), 50% N(3,1) vía Box-Muller
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.random() < 0.5 ? -3 + z : 3 + z;
    }
  }
};

function simularMediasMuestrales(tipoPoblacion, n, numSimulaciones = 2000) {
  const pob = POBLACIONES[tipoPoblacion];
  const medias = new Array(numSimulaciones);
  for (let s = 0; s < numSimulaciones; s++) {
    let suma = 0;
    for (let i = 0; i < n; i++) suma += pob.muestrear();
    medias[s] = suma / n;
  }
  return medias;
}

function generarMuestraPoblacion(tipoPoblacion, tamano = 2000) {
  const pob = POBLACIONES[tipoPoblacion];
  const valores = new Array(tamano);
  for (let i = 0; i < tamano; i++) valores[i] = pob.muestrear();
  return valores;
}
