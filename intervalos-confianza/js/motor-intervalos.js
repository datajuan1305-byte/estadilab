// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE INTERVALOS DE CONFIANZA — Estadilab
//  Autónomo (subconjunto matemático propio, igual que motor-pruebas.js,
//  para no acoplar carpetas entre calculadoras).
// ═══════════════════════════════════════════════════════════════════════════

const MI = {
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
  beta: function(a, b) { return Math.exp(MI.logGamma(a) + MI.logGamma(b) - MI.logGamma(a + b)); },
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
  gammaInc: function(a, x) {
    if (x < 0) return 0;
    if (x === 0) return 0;
    if (x < a + 1) {
      let ap = a, del = 1 / a, sum = del;
      for (let n = 0; n < 200; n++) {
        ap++; del *= x / ap; sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-10) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - MI.logGamma(a));
    } else {
      let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
      for (let i = 1; i <= 200; i++) {
        let an = -i * (i - a);
        b += 2; d = an * d + b;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        c = b + an / c;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d; h *= d * c;
        if (Math.abs(d * c - 1) < 1e-10) break;
      }
      return 1 - Math.exp(-x + a * Math.log(x) - MI.logGamma(a)) * h;
    }
  },
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
    return (h / 3) * s / MI.beta(a, b);
  },
  tCDF: function(t, nu) {
    const x = nu / (nu + t * t);
    const p = 0.5 * MI.betaInc(x, nu / 2, 0.5);
    return t >= 0 ? 1 - p : p;
  },
  chi2CDF: function(x, k) { return x > 0 ? MI.gammaInc(k / 2, x / 2) : 0; },
  invNormal: function(p) {
    let lo = -10, hi = 10;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (MI.normCDF(mid) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  },
  invT: function(p, nu) {
    let lo = -50, hi = 50;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (MI.tCDF(mid, nu) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  },
  invChi2: function(p, k) {
    let lo = 0, hi = Math.max(50, k * 10);
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (MI.chi2CDF(mid, k) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
};

// ═══ INTERVALOS DE CONFIANZA ═══════════════════════════════════════════════

function icMediaZ({ n, xbarra, sigma, confianza }) {
  const alpha = 1 - confianza;
  const z = MI.invNormal(1 - alpha / 2);
  const margen = z * (sigma / Math.sqrt(n));
  return { valorCritico: z, nombreCritico: 'Z', margen, inferior: xbarra - margen, superior: xbarra + margen, puntual: xbarra };
}

function icMediaT({ n, xbarra, s, confianza }) {
  const alpha = 1 - confianza;
  const df = n - 1;
  const t = MI.invT(1 - alpha / 2, df);
  const margen = t * (s / Math.sqrt(n));
  return { valorCritico: t, nombreCritico: 't', df, margen, inferior: xbarra - margen, superior: xbarra + margen, puntual: xbarra };
}

function icProporcion({ x, n, confianza }) {
  const pgorro = x / n;
  const alpha = 1 - confianza;
  const z = MI.invNormal(1 - alpha / 2);
  const margen = z * Math.sqrt(pgorro * (1 - pgorro) / n);
  return { valorCritico: z, nombreCritico: 'Z', margen, inferior: Math.max(0, pgorro - margen), superior: Math.min(1, pgorro + margen), puntual: pgorro };
}

function icVarianza({ n, s2, confianza }) {
  const alpha = 1 - confianza;
  const df = n - 1;
  const chiSup = MI.invChi2(1 - alpha / 2, df); // valor crítico superior (cola derecha)
  const chiInf = MI.invChi2(alpha / 2, df);     // valor crítico inferior (cola izquierda)
  const inferior = (df * s2) / chiSup;
  const superior = (df * s2) / chiInf;
  return { df, chiInf, chiSup, inferior, superior, puntual: s2 };
}

function tamanoMuestraMedia({ sigma, error, confianza }) {
  const alpha = 1 - confianza;
  const z = MI.invNormal(1 - alpha / 2);
  const nExacto = Math.pow((z * sigma) / error, 2);
  return { valorCritico: z, nExacto, nRedondeado: Math.ceil(nExacto) };
}

function tamanoMuestraProporcion({ pEstimado, error, confianza }) {
  const alpha = 1 - confianza;
  const z = MI.invNormal(1 - alpha / 2);
  const p = pEstimado === null || pEstimado === undefined ? 0.5 : pEstimado;
  const nExacto = (z * z * p * (1 - p)) / (error * error);
  return { valorCritico: z, nExacto, nRedondeado: Math.ceil(nExacto), pUsado: p };
}

function resumenBasicoIC(datos) {
  const n = datos.length;
  const media = datos.reduce((a, b) => a + b, 0) / n;
  const s = n > 1 ? Math.sqrt(datos.reduce((acc, x) => acc + (x - media) ** 2, 0) / (n - 1)) : NaN;
  return { n, media, s, s2: s * s };
}

function parsearDatosIC(texto) {
  const partes = texto.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  const numeros = partes.map(Number);
  if (numeros.some(isNaN)) return null;
  return numeros;
}
