// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE CORRELACIÓN — Estadilab
//  Pearson, Spearman (por rangos) y Kendall tau-b, con prueba de
//  significancia. Autónomo (subconjunto matemático propio).
// ═══════════════════════════════════════════════════════════════════════════

const MC = {
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
  beta: function(a, b) { return Math.exp(MC.logGamma(a) + MC.logGamma(b) - MC.logGamma(a + b)); },
  betaInc: function(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const n = 1000;
    const h = x / n;
    let s = 0;
    for (let i = 0; i <= n; i++) {
      const t = i * h;
      const w = (i === 0 || i === n) ? 1 : (i % 2 === 0 ? 2 : 4);
      if (t > 0 && t < 1) s += w * Math.pow(t, a - 1) * Math.pow(1 - t, b - 1);
    }
    return (h / 3) * s / MC.beta(a, b);
  },
  tCDF: function(t, nu) {
    const x = nu / (nu + t * t);
    const p = 0.5 * MC.betaInc(x, nu / 2, 0.5);
    return t >= 0 ? 1 - p : p;
  },
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
};

function parsearParejas(textoX, textoY) {
  const limpiar = t => t.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => s.length > 0).map(Number);
  const x = limpiar(textoX);
  const y = limpiar(textoY);
  if (x.some(isNaN) || y.some(isNaN)) return null;
  if (x.length !== y.length) return null;
  if (x.length < 3) return null;
  return { x, y };
}

// ═══ PEARSON ═══
function correlacionPearson(x, y) {
  const n = x.length;
  const xbar = x.reduce((a, b) => a + b, 0) / n;
  const ybar = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - xbar) * (y[i] - ybar);
    sxx += (x[i] - xbar) ** 2;
    syy += (y[i] - ybar) ** 2;
  }
  const r = sxy / Math.sqrt(sxx * syy);
  return r;
}

// ═══ RANGOS (con empates promediados) ═══
function calcularRangos(valores) {
  const n = valores.length;
  const indices = valores.map((v, i) => i).sort((a, b) => valores[a] - valores[b]);
  const rangos = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && valores[indices[j + 1]] === valores[indices[i]]) j++;
    const rangoPromedio = (i + j) / 2 + 1; // rangos 1-indexados
    for (let k = i; k <= j; k++) rangos[indices[k]] = rangoPromedio;
    i = j + 1;
  }
  return rangos;
}

// ═══ SPEARMAN (Pearson sobre los rangos — maneja empates correctamente) ═══
function correlacionSpearman(x, y) {
  const rx = calcularRangos(x);
  const ry = calcularRangos(y);
  return correlacionPearson(rx, ry);
}

// ═══ KENDALL TAU-B ═══
function correlacionKendall(x, y) {
  const n = x.length;
  let nc = 0, nd = 0;
  const tiesX = new Map(), tiesY = new Map();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = x[i] - x[j];
      const dy = y[i] - y[j];
      const prod = dx * dy;
      if (prod > 0) nc++;
      else if (prod < 0) nd++;
    }
  }
  // tamaños de los grupos empatados en x y en y (corrección tau-b y varianza con empates)
  function gruposEmpatados(valores) {
    const conteos = new Map();
    valores.forEach(v => conteos.set(v, (conteos.get(v) || 0) + 1));
    return Array.from(conteos.values()).filter(t => t > 1);
  }
  const gx = gruposEmpatados(x), gy = gruposEmpatados(y);
  const n1 = gx.reduce((a, t) => a + t * (t - 1) / 2, 0);
  const n2 = gy.reduce((a, t) => a + t * (t - 1) / 2, 0);
  const n0 = n * (n - 1) / 2;

  const denom = Math.sqrt((n0 - n1) * (n0 - n2));
  const tau = denom > 0 ? (nc - nd) / denom : NaN;
  return { tau, nc, nd, n0, n1, n2, gx, gy };
}

// ═══ PRUEBAS DE SIGNIFICANCIA ═══
function pruebaSignificanciaR(r, n) {
  // t = r * sqrt((n-2)/(1-r^2)), df = n-2  — válida para Pearson y (aprox.) Spearman
  const df = n - 2;
  if (df <= 0 || Math.abs(r) >= 1) return { t: r >= 1 ? Infinity : -Infinity, df, pValor: r === 0 ? 1 : 0 };
  const t = r * Math.sqrt(df / (1 - r * r));
  const pValor = 2 * (1 - MC.tCDF(Math.abs(t), df));
  return { t, df, pValor: Math.max(0, Math.min(1, pValor)) };
}

function pruebaSignificanciaKendall(tau, n, det) {
  // Aproximación normal asintótica. Con empates (det.gx, det.gy) usa la varianza corregida de S = nc − nd,
  // la misma que emplean cor.test de R y scipy.stats.kendalltau (method = "asymptotic").
  let z;
  if (det && det.gx && Number.isFinite(det.nc)) {
    const S = det.nc - det.nd, s1 = (g, f) => g.reduce((a, t) => a + f(t), 0);
    const v0 = n * (n - 1) * (2 * n + 5);
    const vt = s1(det.gx, t => t * (t - 1) * (2 * t + 5)), vu = s1(det.gy, t => t * (t - 1) * (2 * t + 5));
    const v1 = s1(det.gx, t => t * (t - 1)) * s1(det.gy, t => t * (t - 1));
    const v2 = s1(det.gx, t => t * (t - 1) * (t - 2)) * s1(det.gy, t => t * (t - 1) * (t - 2));
    const varS = (v0 - vt - vu) / 18 + v1 / (2 * n * (n - 1)) + (n > 2 ? v2 / (9 * n * (n - 1) * (n - 2)) : 0);
    z = S / Math.sqrt(varS);
  } else {
    z = (3 * tau * Math.sqrt(n * (n - 1))) / Math.sqrt(2 * (2 * n + 5));
  }
  const pValor = 2 * (1 - MC.normCDF(Math.abs(z)));
  return { z, pValor: Math.max(0, Math.min(1, pValor)) };
}

function coeficienteDeterminacion(r) { return r * r; }
