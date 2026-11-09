// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE REGRESIÓN LINEAL — Estadilab
//  Regresión simple (una variable) y múltiple (con inversión de matriz
//  Gauss-Jordan para resolver las ecuaciones normales).
// ═══════════════════════════════════════════════════════════════════════════

const MR = {
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
  beta: function(a, b) { return Math.exp(MR.logGamma(a) + MR.logGamma(b) - MR.logGamma(a + b)); },
  // Fracción continua de Lentz para la función beta incompleta regularizada
  // (algoritmo estándar de Numerical Recipes — robusto incluso con a o b pequeños,
  // a diferencia de una integración numérica simple que falla cerca de las
  // singularidades cuando a<1 o b<1).
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
    const bt = Math.exp(MR.logGamma(a + b) - MR.logGamma(a) - MR.logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * MR.betacf(x, a, b) / a;
    return 1 - bt * MR.betacf(1 - x, b, a) / b;
  },
  tCDF: function(t, nu) {
    const x = nu / (nu + t * t);
    const p = 0.5 * MR.betaInc(x, nu / 2, 0.5);
    return t >= 0 ? 1 - p : p;
  },
  // F-CDF vía la relación con la Beta incompleta
  fCDF: function(f, d1, d2) {
    if (f <= 0) return 0;
    const x = (d1 * f) / (d1 * f + d2);
    return MR.betaInc(x, d1 / 2, d2 / 2);
  }
};

function parsearListaNum(texto) {
  const partes = texto.split(/[,;\s\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  const numeros = partes.map(Number);
  if (numeros.some(isNaN)) return null;
  return numeros;
}

// ═══ REGRESIÓN LINEAL SIMPLE ═══
function regresionSimple(x, y) {
  const n = x.length;
  const xbar = x.reduce((a, b) => a + b, 0) / n;
  const ybar = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - xbar) * (y[i] - ybar);
    sxx += (x[i] - xbar) ** 2;
    syy += (y[i] - ybar) ** 2;
  }
  const b1 = sxy / sxx;
  const b0 = ybar - b1 * xbar;

  const yhat = x.map(xi => b0 + b1 * xi);
  const sse = y.reduce((acc, yi, i) => acc + (yi - yhat[i]) ** 2, 0);
  const ssr = syy - sse;
  const sst = syy;
  const r2 = ssr / sst;

  const dfR = 1, dfE = n - 2;
  const mse = sse / dfE;
  const msr = ssr / dfR;
  const f = msr / mse;
  const pF = 1 - MR.fCDF(f, dfR, dfE);

  const se = Math.sqrt(mse);
  const seB1 = se / Math.sqrt(sxx);
  const seB0 = se * Math.sqrt(1 / n + (xbar * xbar) / sxx);
  const tB1 = b1 / seB1;
  const tB0 = b0 / seB0;
  const pB1 = 2 * (1 - MR.tCDF(Math.abs(tB1), dfE));
  const pB0 = 2 * (1 - MR.tCDF(Math.abs(tB0), dfE));

  return {
    b0, b1, r: Math.sign(b1) * Math.sqrt(r2), r2,
    anova: { ssr, sse, sst, dfR, dfE, msr, mse, f, pF },
    se, seB0, seB1, tB0, tB1, pB0, pB1,
    n,
    predict: (xVal) => b0 + b1 * xVal
  };
}

// ═══ ÁLGEBRA DE MATRICES (para regresión múltiple) ═══
function multiplicarMatrices(A, B) {
  const r = A.length, c = B[0].length, k = B.length;
  const R = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++)
      for (let m = 0; m < k; m++)
        R[i][j] += A[i][m] * B[m][j];
  return R;
}

function transponer(A) {
  return A[0].map((_, j) => A.map(fila => fila[j]));
}

function invertirGaussJordan(M) {
  const n = M.length;
  const A = M.map((fila, i) => [...fila, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivFila = col;
    for (let f = col + 1; f < n; f++) if (Math.abs(A[f][col]) > Math.abs(A[pivFila][col])) pivFila = f;
    [A[col], A[pivFila]] = [A[pivFila], A[col]];
    const piv = A[col][col];
    if (Math.abs(piv) < 1e-12) throw new Error('Matriz singular: revisa si tienes variables predictoras perfectamente correlacionadas entre sí (multicolinealidad exacta).');
    for (let j = 0; j < 2 * n; j++) A[col][j] /= piv;
    for (let f = 0; f < n; f++) {
      if (f === col) continue;
      const factor = A[f][col];
      for (let j = 0; j < 2 * n; j++) A[f][j] -= factor * A[col][j];
    }
  }
  return A.map(fila => fila.slice(n));
}

/**
 * Regresión lineal múltiple.
 * @param {number[]} Y - vector de la variable dependiente
 * @param {number[][]} X - matriz de predictores, cada fila = [x1, x2, ..., xk] (SIN columna de 1s)
 */
function regresionMultiple(Y, X) {
  const n = Y.length;
  const k = X[0].length; // número de predictores
  const Xd = X.map(fila => [1, ...fila]); // agregar columna de intercepto

  const Xt = transponer(Xd);
  const XtX = multiplicarMatrices(Xt, Xd);
  const XtXinv = invertirGaussJordan(XtX);
  const XtY = multiplicarMatrices(Xt, Y.map(v => [v]));
  const B = multiplicarMatrices(XtXinv, XtY).map(fila => fila[0]); // [b0, b1, ..., bk]

  const yhat = Xd.map(fila => fila.reduce((acc, v, j) => acc + v * B[j], 0));
  const ybar = Y.reduce((a, b) => a + b, 0) / n;
  const sse = Y.reduce((acc, yi, i) => acc + (yi - yhat[i]) ** 2, 0);
  const sst = Y.reduce((acc, yi) => acc + (yi - ybar) ** 2, 0);
  const ssr = sst - sse;
  const r2 = ssr / sst;
  const r2Ajustado = 1 - (1 - r2) * (n - 1) / (n - k - 1);

  const dfR = k, dfE = n - k - 1;
  const mse = sse / dfE;
  const msr = ssr / dfR;
  const f = msr / mse;
  const pF = 1 - MR.fCDF(f, dfR, dfE);
  const se = Math.sqrt(mse);

  const coeficientes = B.map((b, j) => {
    const seB = se * Math.sqrt(XtXinv[j][j]);
    const t = b / seB;
    const p = 2 * (1 - MR.tCDF(Math.abs(t), dfE));
    return { nombre: j === 0 ? 'Intercepto (b0)' : `X${j}`, valor: b, se: seB, t, p };
  });

  return {
    coeficientes, n, k,
    r2, r2Ajustado,
    anova: { ssr, sse, sst, dfR, dfE, msr, mse, f, pF },
    se,
    predict: (xVals) => {
      let pred = B[0];
      for (let j = 0; j < k; j++) pred += B[j + 1] * xVals[j];
      return pred;
    }
  };
}
