// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE PRUEBAS DE HIPÓTESIS — Estadilab
//  Autónomo (no depende de motor-calculo.js de Distribuciones, para evitar
//  acoplar carpetas). Incluye su propio subconjunto de funciones matemáticas.
// ═══════════════════════════════════════════════════════════════════════════

const MH = {
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
  gamma: function(z) { return Math.exp(MH.logGamma(z)); },
  beta: function(a, b) { return Math.exp(MH.logGamma(a) + MH.logGamma(b) - MH.logGamma(a + b)); },
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
      return sum * Math.exp(-x + a * Math.log(x) - MH.logGamma(a));
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
      return 1 - Math.exp(-x + a * Math.log(x) - MH.logGamma(a)) * h;
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
    return (h / 3) * s / MH.beta(a, b);
  },
  tCDF: function(t, nu) {
    const x = nu / (nu + t * t);
    const p = 0.5 * MH.betaInc(x, nu / 2, 0.5);
    return t >= 0 ? 1 - p : p;
  },
  chi2CDF: function(x, k) {
    return x > 0 ? MH.gammaInc(k / 2, x / 2) : 0;
  },
  // Inversas por bisección (mismo enfoque validado en Distribuciones)
  invNormal: function(p) {
    let lo = -10, hi = 10;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (MH.normCDF(mid) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  },
  invT: function(p, nu) {
    let lo = -50, hi = 50;
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (MH.tCDF(mid, nu) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  },
  invChi2: function(p, k) {
    let lo = 0, hi = Math.max(50, k * 10);
    for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (MH.chi2CDF(mid, k) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
};

/**
 * Evalúa una prueba de hipótesis dado el estadístico y su distribución bajo H0.
 * @param {number} stat - valor del estadístico calculado
 * @param {function} cdf - función CDF bajo H0 (recibe x, retorna P(X<=x))
 * @param {function} inv - función inversa (recibe p, retorna x)
 * @param {number} alpha - nivel de significancia
 * @param {string} cola - 'bilateral' | 'derecha' | 'izquierda'
 * @param {boolean} simetrica - true para Z/t (simétricas en 0), false para Chi-cuadrado
 */
function evaluarPrueba(stat, cdf, inv, alpha, cola, simetrica) {
  let pValor, valorCritico, rechazaH0;

  if (simetrica) {
    if (cola === 'bilateral') {
      pValor = 2 * (1 - cdf(Math.abs(stat)));
      const vc = inv(1 - alpha / 2);
      valorCritico = `±${vc.toFixed(4)}`;
      rechazaH0 = Math.abs(stat) > vc;
    } else if (cola === 'derecha') {
      pValor = 1 - cdf(stat);
      const vc = inv(1 - alpha);
      valorCritico = `${vc.toFixed(4)}`;
      rechazaH0 = stat > vc;
    } else {
      pValor = cdf(stat);
      const vc = inv(alpha);
      valorCritico = `${vc.toFixed(4)}`;
      rechazaH0 = stat < vc;
    }
  } else {
    if (cola === 'bilateral') {
      pValor = 2 * Math.min(cdf(stat), 1 - cdf(stat));
      const vcInf = inv(alpha / 2);
      const vcSup = inv(1 - alpha / 2);
      valorCritico = `${vcInf.toFixed(4)} y ${vcSup.toFixed(4)}`;
      rechazaH0 = stat < vcInf || stat > vcSup;
    } else if (cola === 'derecha') {
      pValor = 1 - cdf(stat);
      const vc = inv(1 - alpha);
      valorCritico = `${vc.toFixed(4)}`;
      rechazaH0 = stat > vc;
    } else {
      pValor = cdf(stat);
      const vc = inv(alpha);
      valorCritico = `${vc.toFixed(4)}`;
      rechazaH0 = stat < vc;
    }
  }
  pValor = Math.max(0, Math.min(1, pValor));
  return { pValor, valorCritico, rechazaH0 };
}

// ═══ PRUEBAS ═══════════════════════════════════════════════════════════════

function pruebaZMedia({ n, xbarra, sigma, mu0, alpha, cola }) {
  const stat = (xbarra - mu0) / (sigma / Math.sqrt(n));
  const ev = evaluarPrueba(stat, MH.normCDF, MH.invNormal, alpha, cola, true);
  return { estadistico: stat, nombreEstadistico: 'Z', df: null, ...ev };
}

function pruebaTMedia({ n, xbarra, s, mu0, alpha, cola }) {
  const df = n - 1;
  const stat = (xbarra - mu0) / (s / Math.sqrt(n));
  const ev = evaluarPrueba(stat, x => MH.tCDF(x, df), p => MH.invT(p, df), alpha, cola, true);
  return { estadistico: stat, nombreEstadistico: 't', df, ...ev };
}

function pruebaTDosMuestras({ n1, xbarra1, s1, n2, xbarra2, s2, alpha, cola, varianzasIguales }) {
  let stat, df;
  if (varianzasIguales) {
    const sp2 = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2);
    stat = (xbarra1 - xbarra2) / Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
  } else {
    const se2_1 = (s1 * s1) / n1, se2_2 = (s2 * s2) / n2;
    stat = (xbarra1 - xbarra2) / Math.sqrt(se2_1 + se2_2);
    df = Math.pow(se2_1 + se2_2, 2) / (Math.pow(se2_1, 2) / (n1 - 1) + Math.pow(se2_2, 2) / (n2 - 1));
  }
  const ev = evaluarPrueba(stat, x => MH.tCDF(x, df), p => MH.invT(p, df), alpha, cola, true);
  return { estadistico: stat, nombreEstadistico: 't', df, ...ev };
}

function pruebaTPareada({ diferencias, mu0, alpha, cola }) {
  const n = diferencias.length;
  const dbarra = diferencias.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(diferencias.reduce((acc, d) => acc + (d - dbarra) ** 2, 0) / (n - 1));
  const df = n - 1;
  const stat = (dbarra - mu0) / (sd / Math.sqrt(n));
  const ev = evaluarPrueba(stat, x => MH.tCDF(x, df), p => MH.invT(p, df), alpha, cola, true);
  return { estadistico: stat, nombreEstadistico: 't', df, dbarra, sd, ...ev };
}

function pruebaZProporcion({ x, n, p0, alpha, cola }) {
  const pgorro = x / n;
  const stat = (pgorro - p0) / Math.sqrt(p0 * (1 - p0) / n);
  const ev = evaluarPrueba(stat, MH.normCDF, MH.invNormal, alpha, cola, true);
  return { estadistico: stat, nombreEstadistico: 'Z', df: null, pgorro, ...ev };
}

function pruebaZDosProporciones({ x1, n1, x2, n2, alpha, cola }) {
  const p1 = x1 / n1, p2 = x2 / n2;
  const pPool = (x1 + x2) / (n1 + n2);
  const stat = (p1 - p2) / Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const ev = evaluarPrueba(stat, MH.normCDF, MH.invNormal, alpha, cola, true);
  return { estadistico: stat, nombreEstadistico: 'Z', df: null, p1, p2, ...ev };
}

function pruebaChi2Varianza({ n, s2, sigma0_2, alpha, cola }) {
  const df = n - 1;
  const stat = (df * s2) / sigma0_2;
  const ev = evaluarPrueba(stat, x => MH.chi2CDF(x, df), p => MH.invChi2(p, df), alpha, cola, false);
  return { estadistico: stat, nombreEstadistico: 'χ²', df, ...ev };
}

// ═══ UTILIDAD: estadísticos básicos desde datos crudos ═══
function resumenBasico(datos) {
  const n = datos.length;
  const media = datos.reduce((a, b) => a + b, 0) / n;
  const s = n > 1 ? Math.sqrt(datos.reduce((acc, x) => acc + (x - media) ** 2, 0) / (n - 1)) : NaN;
  return { n, media, s };
}

function parsearDatosPruebas(texto) {
  const partes = texto.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  const numeros = partes.map(Number);
  if (numeros.some(isNaN)) return null;
  return numeros;
}
