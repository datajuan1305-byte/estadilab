/* Motor de pruebas no paramétricas — Estadilab
   Pestañas 1 y 2: una muestra (χ² bondad de ajuste, binomial, rachas, Kolmogorov-Smirnov)
   y dos muestras independientes (Mann-Whitney, Moses, Kolmogorov-Smirnov, Wald-Wolfowitz).
   Funciones puras, sin DOM: se validan en Node contra SciPy / statsmodels / R. */
const NPM = (function () {
  'use strict';
  // ───────── Funciones especiales ─────────
  const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1; let a = LG[0]; const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  const lchoose = (n, k) => (k < 0 || k > n) ? -Infinity : lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  const choose = (n, k) => Math.exp(lchoose(n, k));
  function gser(a, x) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; } return sum * Math.exp(-x + a * Math.log(x) - lgamma(a)); }
  function gcf(a, x) {
    const FP = 1e-300; let b = x + 1 - a, c = 1 / FP, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < FP) d = FP; c = b + an / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function gammaQ(a, x) { if (x <= 0) return 1; return x < a + 1 ? 1 - gser(a, x) : gcf(a, x); }
  function gammaP(a, x) { if (x <= 0) return 0; return x < a + 1 ? gser(a, x) : 1 - gcf(a, x); }
  const chi2Sf = (x, df) => gammaQ(df / 2, x / 2);
  function normSf(z) { const q = 0.5 * gammaQ(0.5, z * z / 2); return z >= 0 ? q : 1 - q; }
  const normCdf = z => normSf(-z);
  function betacf(a, b, x) {
    const FP = 1e-300, qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FP) d = FP; d = 1 / d; let h = d;
    for (let m = 1; m <= 1000; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
    return h;
  }
  function betaI(x, a, b) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const binomLogPmf = (k, n, p) => p <= 0 ? (k === 0 ? 0 : -Infinity) : p >= 1 ? (k === n ? 0 : -Infinity) : lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p);
  const binomPmf = (k, n, p) => Math.exp(binomLogPmf(k, n, p));
  const binomSf = (k, n, p) => k <= 0 ? 1 : k > n ? 0 : betaI(p, k, n - k + 1);          // P(X >= k)
  const binomCdf = (k, n, p) => k < 0 ? 0 : k >= n ? 1 : betaI(1 - p, n - k, k + 1);     // P(X <= k)

  // ───────── Utilidades ─────────
  const sum = a => a.reduce((s, v) => s + v, 0);
  const sortNum = a => Float64Array.from(a).sort();
  function median(a) { const s = sortNum(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  function midranks(v) { // rangos medios + información de empates
    const n = v.length, idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => v[a] - v[b]), r = new Array(n), ties = [];
    for (let i = 0; i < n;) { let j = i; while (j + 1 < n && v[idx[j + 1]] === v[idx[i]]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k]] = rk; if (j > i) ties.push(j - i + 1); i = j + 1; }
    return { r, ties };
  }
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function randn(rand) { let u = 0; while (u === 0) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); }

  // ───────── Distribución de rachas ─────────
  function runsPmf(r, n1, n2) {
    if (n1 < 1 || n2 < 1) return r === 1 ? 1 : 0;
    const tot = lchoose(n1 + n2, n1);
    if (r % 2 === 0) { const k = r / 2; return k < 1 ? 0 : 2 * Math.exp(lchoose(n1 - 1, k - 1) + lchoose(n2 - 1, k - 1) - tot); }
    const k = (r - 1) / 2; let t = 0;
    if (k >= 1) t += Math.exp(lchoose(n1 - 1, k) + lchoose(n2 - 1, k - 1) - tot);
    if (k >= 1) t += Math.exp(lchoose(n1 - 1, k - 1) + lchoose(n2 - 1, k) - tot);
    return t;
  }
  function runsCdf(r, n1, n2) { let s = 0; for (let i = 2; i <= r; i++) s += runsPmf(i, n1, n2); return Math.min(1, s); }
  function runsSfGe(r, n1, n2) { let s = 0; for (let i = r; i <= n1 + n2; i++) s += runsPmf(i, n1, n2); return Math.min(1, s); }
  const runsMean = (n1, n2) => 2 * n1 * n2 / (n1 + n2) + 1;
  const runsVar = (n1, n2) => { const N = n1 + n2; return 2 * n1 * n2 * (2 * n1 * n2 - N) / (N * N * (N - 1)); };
  function countRuns(ind) { let r = 1; for (let i = 1; i < ind.length; i++) if (ind[i] !== ind[i - 1]) r++; return r; }

  // ───────── 1. Ji-cuadrado de bondad de ajuste ─────────
  function chi2gof(obs, probs, ddof) {
    ddof = ddof || 0; const k = obs.length, n = sum(obs);
    if (k < 2) throw new Error('Se necesitan al menos 2 categorías.');
    if (obs.some(o => o < 0 || !isFinite(o))) throw new Error('Las frecuencias observadas deben ser no negativas.');
    if (n <= 0) throw new Error('La suma de frecuencias debe ser mayor que 0.');
    let pr = probs && probs.length ? probs.slice() : new Array(k).fill(1 / k);
    if (pr.length !== k) throw new Error('Las frecuencias esperadas deben tener ' + k + ' valores (uno por categoría).');
    if (pr.some(p => !(p > 0))) throw new Error('Las proporciones o frecuencias esperadas deben ser mayores que 0.');
    const sp = sum(pr); pr = pr.map(p => p / sp);
    const exp = pr.map(p => p * n); let stat = 0; const resid = [], std = [];
    for (let i = 0; i < k; i++) { stat += (obs[i] - exp[i]) ** 2 / exp[i]; resid.push((obs[i] - exp[i]) / Math.sqrt(exp[i])); std.push((obs[i] - exp[i]) / Math.sqrt(exp[i] * (1 - pr[i]))); }
    const df = k - 1 - ddof; if (df < 1) throw new Error('Los grados de libertad deben ser ≥ 1 (reduzca los parámetros estimados).');
    const minE = Math.min.apply(null, exp), menos5 = exp.filter(e => e < 5).length;
    return { prueba: 'chi2gof', n, k, df, stat, p: chi2Sf(stat, df), expected: exp, probs: pr, resid, stdResid: std, w: Math.sqrt(stat / n), minE, menos5, pctMenos5: menos5 / k, obs: obs.slice() };
  }

  // ───────── 2. Binomial ─────────
  function binomTest(x, n, p0, alt) {
    if (!(n >= 1) || x < 0 || x > n || x !== Math.floor(x) || n !== Math.floor(n)) throw new Error('Debe cumplirse 0 ≤ éxitos ≤ n con enteros.');
    if (!(p0 > 0 && p0 < 1)) throw new Error('La proporción hipotética debe estar entre 0 y 1 (sin incluir los extremos).');
    alt = alt || 'two-sided'; let p;
    if (alt === 'greater') p = binomSf(x, n, p0);
    else if (alt === 'less') p = binomCdf(x, n, p0);
    else {
      const d = binomPmf(x, n, p0), tol = d * (1 + 1e-7); p = 0;
      if (n <= 2e6) { for (let k = 0; k <= n; k++) { const q = binomPmf(k, n, p0); if (q <= tol) p += q; } }
      else { const z = (x - n * p0) / Math.sqrt(n * p0 * (1 - p0)); p = 2 * normSf(Math.abs(z)); }
      p = Math.min(1, p);
    }
    const a = 0.05; let lo = 0, hi = 1;
    const ci = (xx, nn, al) => { // Clopper-Pearson
      let L = 0, U = 1;
      if (xx > 0) { let a1 = 0, b1 = 1; for (let i = 0; i < 200; i++) { const m = (a1 + b1) / 2; if (betaI(m, xx, nn - xx + 1) < al / 2) a1 = m; else b1 = m; } L = (a1 + b1) / 2; }
      if (xx < nn) { let a1 = 0, b1 = 1; for (let i = 0; i < 200; i++) { const m = (a1 + b1) / 2; if (betaI(1 - m, nn - xx, xx + 1) > al / 2) a1 = m; else b1 = m; } U = (a1 + b1) / 2; }
      return [L, U];
    };
    const c = ci(x, n, a); lo = c[0]; hi = c[1];
    return { prueba: 'binomial', x, n, p0, alt, phat: x / n, p, ic: [lo, hi], exactoAprox: n > 2e6 ? 'aprox' : 'exacto' };
  }

  // ───────── 3. Rachas (una muestra) ─────────
  function runsOne(x, cutType, cutValue) {
    const n = x.length; if (n < 5) throw new Error('Se necesitan al menos 5 observaciones, en el orden en que se obtuvieron.');
    let cut;
    if (cutType === 'mean') cut = sum(x) / n; else if (cutType === 'custom') cut = cutValue;
    else if (cutType === 'mode') { const m = new Map(); x.forEach(v => m.set(v, (m.get(v) || 0) + 1)); let best = -1; m.forEach((c, v) => { if (c > best || (c === best && v < cut)) { best = c; cut = v; } }); }
    else cut = median(x);
    if (!isFinite(cut)) throw new Error('Punto de corte no válido.');
    const ind = x.map(v => v >= cut ? 1 : 0), n1 = sum(ind), n2 = n - n1;
    if (n1 === 0 || n2 === 0) throw new Error('Todos los valores quedan en un solo lado del punto de corte; la prueba no es aplicable. Pruebe otro punto de corte.');
    const R = countRuns(ind), mu = runsMean(n1, n2), v = runsVar(n1, n2), sd = Math.sqrt(v);
    const z = (R - mu) / sd, zc = (R - mu + (R < mu ? 0.5 : R > mu ? -0.5 : 0)) / sd;
    const pe = Math.min(1, 2 * Math.min(runsCdf(R, n1, n2), runsSfGe(R, n1, n2)));
    return { prueba: 'rachas1', n, cut, n1, n2, R, mu, sd, z, zc, pAsin: 2 * normSf(Math.abs(z)), pAsinC: 2 * normSf(Math.abs(zc)), pExacto: pe, ind };
  }

  // ───────── 4. Kolmogorov-Smirnov (una muestra) ─────────
  function matMul(A, B, m) { const C = new Float64Array(m * m); for (let i = 0; i < m; i++) for (let k = 0; k < m; k++) { const a = A[i * m + k]; if (a === 0) continue; for (let j = 0; j < m; j++) C[i * m + j] += a * B[k * m + j]; } return C; }
  function matPow(A, eA, m, n) {
    if (n === 1) return { V: Float64Array.from(A), e: eA };
    const r = matPow(A, eA, m, Math.floor(n / 2)); let B = matMul(r.V, r.V, m), eB = 2 * r.e, V, e;
    if (n % 2 === 0) { V = B; e = eB; } else { V = matMul(A, B, m); e = eA + eB; }
    if (V[(m >> 1) * m + (m >> 1)] > 1e140) { for (let i = 0; i < m * m; i++) V[i] *= 1e-140; e += 140; }
    return { V, e };
  }
  function ksCdfExact(n, d) { // P(D_n < d), Marsaglia-Tsang-Wang (2003)
    const k = Math.floor(n * d) + 1, m = 2 * k - 1, h = k - n * d, H = new Float64Array(m * m);
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) H[i * m + j] = (i - j + 1 < 0) ? 0 : 1;
    for (let i = 0; i < m; i++) { H[i * m] -= Math.pow(h, i + 1); H[(m - 1) * m + i] -= Math.pow(h, m - i); }
    H[(m - 1) * m] += (2 * h - 1 > 0) ? Math.pow(2 * h - 1, m) : 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (i - j + 1 > 0) for (let g = 1; g <= i - j + 1; g++) H[i * m + j] /= g;
    const r = matPow(H, 0, m, n); let s = r.V[(k - 1) * m + k - 1], e = r.e;
    for (let i = 1; i <= n; i++) { s = s * i / n; if (s < 1e-140) { s *= 1e140; e -= 140; } }
    return s * Math.pow(10, e);
  }
  const kolmSf = lam => { if (lam < 0.2) return 1; let s = 0; for (let j = 1; j < 200; j++) { const t = 2 * (j % 2 ? 1 : -1) * Math.exp(-2 * j * j * lam * lam); s += t; if (Math.abs(t) < 1e-18) break; } return Math.min(1, Math.max(0, s)); };
  function ksOneSidedSf(n, d) { // Birnbaum-Tingey: P(D+ >= d)
    if (d <= 0) return 1; if (d >= 1) return 0; let s = 0; const jm = Math.floor(n * (1 - d));
    for (let j = 0; j <= jm; j++) { const a = 1 - d - j / n, b = d + j / n; if (a <= 0) continue; s += Math.exp(lchoose(n, j) + (n - j) * Math.log(a) + (j - 1) * Math.log(b)); }
    return Math.min(1, d * s);
  }
  function ksPvalOne(n, D, alt) {
    if (alt === 'two-sided') { if (n * D * D > 25) return 0; if (n <= 500) return Math.min(1, Math.max(0, 1 - ksCdfExact(n, D))); const lam = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * D; return kolmSf(lam); }
    return ksOneSidedSf(n, D);
  }
  function distCdf(dist, par) {
    if (dist === 'norm') return v => normCdf((v - par.mu) / par.sd);
    if (dist === 'unif') return v => v <= par.a ? 0 : v >= par.b ? 1 : (v - par.a) / (par.b - par.a);
    if (dist === 'exp') return v => v < 0 ? 0 : 1 - Math.exp(-v / par.media);
    throw new Error('Distribución no soportada.');
  }
  function ksStat(xs, F) { // xs ordenado
    const n = xs.length; let dp = 0, dm = 0;
    for (let i = 0; i < n; i++) { const f = F(xs[i]); dp = Math.max(dp, (i + 1) / n - f); dm = Math.max(dm, f - i / n); }
    return { dp, dm, D: Math.max(dp, dm) };
  }
  function ks1(x, dist, par, alt, lilliefors) {
    const n = x.length; if (n < 3) throw new Error('Se necesitan al menos 3 observaciones.');
    alt = alt || 'two-sided'; const xs = sortNum(x); let est = false, P = Object.assign({}, par);
    const mean = sum(x) / n, sd = Math.sqrt(sum(x.map(v => (v - mean) ** 2)) / (n - 1));
    if (dist === 'norm') { if (P.mu == null || isNaN(P.mu)) { P.mu = mean; est = true; } if (P.sd == null || isNaN(P.sd)) { P.sd = sd; est = true; } if (!(P.sd > 0)) throw new Error('La desviación estándar debe ser positiva.'); }
    if (dist === 'unif') { if (P.a == null || isNaN(P.a)) P.a = xs[0]; if (P.b == null || isNaN(P.b)) P.b = xs[n - 1]; if (!(P.b > P.a)) throw new Error('El límite superior debe ser mayor que el inferior.'); }
    if (dist === 'exp') { if (xs[0] < 0) throw new Error('La exponencial requiere datos no negativos.'); if (P.media == null || isNaN(P.media)) { P.media = mean; est = true; } if (!(P.media > 0)) throw new Error('La media de la exponencial debe ser positiva.'); }
    const F = distCdf(dist, P), s = ksStat(xs, F), D = alt === 'greater' ? s.dp : alt === 'less' ? s.dm : s.D;
    const p = ksPvalOne(n, D, alt), out = { prueba: 'ks1', n, dist, par: P, estimados: est, alt, D: s.D, Dmas: s.dp, Dmenos: s.dm, Dusado: D, p, metodo: (alt === 'two-sided' && n > 500) ? 'asintótico' : 'exacto' };
    if (lilliefors && est && alt === 'two-sided' && (dist === 'norm' || dist === 'exp')) {
      const B = Math.max(2000, Math.min(20000, Math.floor(4e7 / (n * Math.log2(n + 1))))), rand = rng(20261109); let ge = 0;
      for (let b = 0; b < B; b++) {
        const z = new Float64Array(n); for (let i = 0; i < n; i++) z[i] = dist === 'norm' ? randn(rand) : -Math.log(1 - rand());
        const m = sum(z) / n; let Fz; if (dist === 'norm') { const sdz = Math.sqrt(sum(Array.from(z).map(v => (v - m) ** 2)) / (n - 1)); Fz = v => normCdf((v - m) / sdz); } else Fz = v => 1 - Math.exp(-v / m);
        z.sort(); if (ksStat(z, Fz).D >= s.D - 1e-12) ge++;
      }
      out.lillie = { p: (ge + 1) / (B + 1), B };
    }
    return out;
  }

  // ───────── 5. Mann-Whitney U ─────────
  function mwExactCounts(m, n) { // distribución de U (sin empates): conteos de subconjuntos
    // c[mm][nn][u]; se calcula por capas en mm
    const maxU = m * n; let prev = []; // prev[nn] = array para mm-1
    for (let nn = 0; nn <= n; nn++) prev.push([1]);
    for (let mm = 1; mm <= m; mm++) {
      const cur = [];
      for (let nn = 0; nn <= n; nn++) {
        const len = mm * nn + 1, a = new Array(len).fill(0);
        // f(mm,nn,u) = f(mm-1,nn,u-nn) + f(mm,nn-1,u)
        const p1 = prev[nn]; for (let u = 0; u < p1.length; u++) a[u + nn] += p1[u];
        if (nn > 0) { const p2 = cur[nn - 1]; for (let u = 0; u < p2.length; u++) a[u] += p2[u]; }
        cur.push(a);
      }
      prev = cur;
    }
    return prev[n];
  }
  function mannWhitney(x, y, alt) {
    const n1 = x.length, n2 = y.length; if (n1 < 2 || n2 < 2) throw new Error('Cada grupo necesita al menos 2 observaciones.');
    alt = alt || 'two-sided'; const N = n1 + n2, mr = midranks(x.concat(y)), R1 = sum(mr.r.slice(0, n1)), U1 = R1 - n1 * (n1 + 1) / 2, U2 = n1 * n2 - U1;
    const tieT = sum(mr.ties.map(t => t * t * t - t)), sigma = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tieT / (N * (N - 1))));
    if (!(sigma > 0)) throw new Error('Todos los valores son idénticos; la prueba no es aplicable.');
    const mu = n1 * n2 / 2, z = (U1 - mu) / sigma;
    let zc, pAs; const cc = 0.5;
    if (alt === 'two-sided') { zc = (Math.abs(U1 - mu) - cc) / sigma; pAs = Math.min(1, 2 * normSf(Math.max(0, zc))); }
    else if (alt === 'greater') { zc = (U1 - mu - cc) / sigma; pAs = normSf(zc); } else { zc = (U1 - mu + cc) / sigma; pAs = normCdf(zc); }
    let pEx = null; const sinEmp = mr.ties.length === 0;
    if (sinEmp && Math.min(n1, n2) <= 50 && Math.max(n1, n2) <= 100) {
      const m = Math.min(n1, n2), n = Math.max(n1, n2), cnt = mwExactCounts(m, n), tot = sum(cnt), Uobs = U1; // simétrica en U <-> mn-U
      const cdf = u => { let s = 0; for (let i = 0; i <= Math.min(Math.floor(u + 1e-9), cnt.length - 1); i++) s += cnt[i]; return s / tot; };
      const sf = u => { let s = 0; for (let i = Math.ceil(u - 1e-9); i < cnt.length; i++) s += cnt[i]; return s / tot; };
      pEx = alt === 'greater' ? sf(Uobs) : alt === 'less' ? cdf(Uobs) : Math.min(1, 2 * Math.min(cdf(Uobs), sf(Uobs)));
    }
    const dif = []; for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) dif.push(x[i] - y[j]);
    return { prueba: 'mw', n1, n2, N, R1, R2: sum(mr.r) - R1, U1, U2, U: Math.min(U1, U2), mu, sigma, z, zc, pAsin: pAs, pExacto: pEx, hayEmpates: !sinEmp, alt,
      rangoBiserial: (U1 - U2) / (n1 * n2), cles: U1 / (n1 * n2), rZ: z / Math.sqrt(N), hl: median(dif), medX: median(x), medY: median(y), mediaRangoX: R1 / n1, mediaRangoY: (sum(mr.r) - R1) / n2 };
  }

  // ───────── 6. Moses (reacciones extremas) ─────────
  function mosesSpanDist(nc, ne, h, s) { // P(S_h <= s) exacta, sin empates
    const N = nc + ne, mm = nc - 2 * h; if (mm < 1) return NaN; let tot = 0;
    for (let ss = (mm === 1 ? 1 : mm); ss <= s; ss++) {
      if (mm === 1 && ss !== 1) continue;
      for (let a = h + 1; a + ss - 1 <= N - h; a++) {
        const b = a + ss - 1; let c = (mm === 1) ? 1 : Math.exp(lchoose(ss - 2, mm - 2));
        if (mm === 1 && ss === 1) c = 1;
        tot += c * Math.exp(lchoose(a - 1, h) + lchoose(N - b, h));
      }
    }
    return Math.min(1, tot / Math.exp(lchoose(N, nc)));
  }
  function moses(ctrl, exper, hUser) {
    const nc = ctrl.length, ne = exper.length, N = nc + ne; if (nc < 4 || ne < 2) throw new Error('El grupo de control necesita al menos 4 observaciones y el experimental al menos 2.');
    let h = (hUser != null && !isNaN(hUser)) ? Math.round(hUser) : Math.max(1, Math.floor(0.05 * nc));
    if (h < 0) h = 0; if (nc - 2 * h < 2) throw new Error('El recorte (h = ' + h + ') es demasiado grande para el grupo de control.');
    const mr = midranks(ctrl.concat(exper)), rc = mr.r.slice(0, nc).sort((a, b) => a - b);
    const hayEmp = mr.ties.length > 0, ceil = v => Math.ceil(v - 1e-9);
    const span0 = ceil(rc[nc - 1] - rc[0] + 1), spanH = ceil(rc[nc - 1 - h] - rc[h] + 1);
    const p0 = mosesSpanDist(nc, ne, 0, span0), pH = mosesSpanDist(nc, ne, h, spanH);
    return { prueba: 'moses', nc, ne, N, h, span0, spanH, p0, pH, hayEmpates: hayEmp };
  }

  // ───────── 7. Kolmogorov-Smirnov (dos muestras) ─────────
  function ks2(x, y) {
    const n = x.length, m = y.length; if (n < 2 || m < 2) throw new Error('Cada grupo necesita al menos 2 observaciones.');
    const xs = sortNum(x), ys = sortNum(y), all = sortNum(x.concat(y)); let dp = 0, dm = 0, i = 0, j = 0;
    for (let k = 0; k < all.length; k++) { const v = all[k]; if (k + 1 < all.length && all[k + 1] === v) continue; while (i < n && xs[i] <= v) i++; while (j < m && ys[j] <= v) j++; const d = i / n - j / m; dp = Math.max(dp, d); dm = Math.max(dm, -d); }
    const D = Math.max(dp, dm), Dint = Math.round(D * n * m), hayEmp = (new Set(x.concat(y))).size < n + m;
    let pEx = null;
    if (n * m <= 3e7) {
      const rowLen = m + 1; let prev = new Float64Array(rowLen), cur = new Float64Array(rowLen);
      // Con empates, la diferencia entre las FDE solo se evalúa al final de cada bloque de valores iguales
      // (p exacto condicional a la estructura de empates, como ks.test de R ≥ 4.2).
      const marca = new Uint8Array(n + m + 1); marca[0] = 1; marca[n + m] = 1;
      for (let k = 0; k < all.length; k++) if (k + 1 === all.length || all[k + 1] !== all[k]) marca[k + 1] = 1;
      const dentro = (a, b) => !marca[a + b] || Math.abs(a * m - b * n) < Dint;
      for (let a = 0; a <= n; a++) {
        for (let b = 0; b <= m; b++) {
          if (!dentro(a, b)) { cur[b] = 0; continue; }
          if (a === 0 && b === 0) { cur[b] = 1; continue; }
          let v = 0; if (a > 0) v += a / (a + b) * prev[b]; if (b > 0) v += b / (a + b) * cur[b - 1]; cur[b] = v;
        }
        const t = prev; prev = cur; cur = t;
      }
      pEx = Math.min(1, Math.max(0, 1 - prev[m]));
    }
    const en = Math.sqrt(n * m / (n + m)), pAs = kolmSf((en + 0.12 + 0.11 / en) * D);
    return { prueba: 'ks2', n, m, D, Dmas: dp, Dmenos: dm, pExacto: pEx, pAsin: pAs, hayEmpates: hayEmp };
  }

  // ───────── 8. Rachas de Wald-Wolfowitz (dos muestras) ─────────
  function wwRunsBounds(labs, vals) { // mínimo y máximo número de rachas posible con empates entre grupos
    const N = vals.length, idx = Array.from({ length: N }, (_, i) => i).sort((a, b) => vals[a] - vals[b]), blocks = [];
    for (let i = 0; i < N;) { let j = i, a = 0, b = 0; while (j < N && vals[idx[j]] === vals[idx[i]]) { if (labs[idx[j]] === 0) a++; else b++; j++; } blocks.push([a, b]); i = j; }
    const opts = (a, b, mode) => { // [primero, último, rachas]
      if (a === 0) return [[1, 1, 1]]; if (b === 0) return [[0, 0, 1]];
      if (mode === 'min') return [[0, 1, 2], [1, 0, 2]];
      const out = []; [0, 1].forEach(st => { let ra = a, rb = b, cur = st, last = st, runs = 0, prevL = -1; // alternar
        while (ra > 0 || rb > 0) { if (cur === 0 && ra > 0) { ra--; if (prevL !== 0) runs++; prevL = 0; last = 0; } else if (cur === 1 && rb > 0) { rb--; if (prevL !== 1) runs++; prevL = 1; last = 1; } else if (ra > 0) { ra--; if (prevL !== 0) runs++; prevL = 0; last = 0; } else { rb--; if (prevL !== 1) runs++; prevL = 1; last = 1; } cur = 1 - cur; }
        out.push([st, last, runs]); }); return out;
    };
    const solve = mode => {
      let st = null; // st[último] = rachas
      blocks.forEach(([a, b], k) => { const o = opts(a, b, mode), nx = [Infinity, Infinity]; const better = mode === 'min' ? (u, v) => u < v : (u, v) => u > v; const init = mode === 'min' ? Infinity : -Infinity; nx[0] = init; nx[1] = init;
        o.forEach(([f, l, r]) => { if (k === 0) { if (better(r, nx[l])) nx[l] = r; } else for (let pl = 0; pl < 2; pl++) { if (st[pl] === init) continue; const tot = st[pl] + r - (pl === f ? 1 : 0); if (better(tot, nx[l])) nx[l] = tot; } }); st = nx; });
      return mode === 'min' ? Math.min(st[0], st[1]) : Math.max(st[0], st[1]);
    };
    return { min: solve('min'), max: solve('max') };
  }
  function waldWolfowitz2(x, y) {
    const n1 = x.length, n2 = y.length; if (n1 < 2 || n2 < 2) throw new Error('Cada grupo necesita al menos 2 observaciones.');
    const N = n1 + n2, vals = x.concat(y), labs = new Array(n1).fill(0).concat(new Array(n2).fill(1)), b = wwRunsBounds(labs, vals), mu = runsMean(n1, n2), sd = Math.sqrt(runsVar(n1, n2));
    const mk = r => ({ R: r, z: (r - mu + (r < mu ? 0.5 : 0)) / sd, pAsin: normCdf((r - mu + (r < mu ? 0.5 : 0)) / sd), pExacto: runsCdf(r, n1, n2) });
    return { prueba: 'ww2', n1, n2, N, mu, sd, hayEmpates: b.min !== b.max, min: mk(b.min), max: mk(b.max) };
  }

  // ═══════════ PESTAÑAS 3-5 ═══════════
  const tTwo = (t, df) => betaI(df / (df + t * t), df / 2, 0.5);     // P(|T| >= |t|)
  function holm(ps) { const m = ps.length, idx = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]), out = new Array(m); let mx = 0; idx.forEach((i, k) => { mx = Math.max(mx, Math.min(1, (m - k) * ps[i])); out[i] = mx; }); return out; }
  function ajustar(ps, metodo) { if (metodo === 'bonferroni') return ps.map(p => Math.min(1, p * ps.length)); if (metodo === 'none') return ps.slice(); return holm(ps); }
  const tieSum = ties => sum(ties.map(t => t * t * t - t));

  // ───────── 3.1 Wilcoxon de rangos con signo (pareadas) ─────────
  function wilcoxonCounts(n) { // distribución de W+ (sin empates): subconjuntos de {1..n}
    const maxS = n * (n + 1) / 2, c = new Float64Array(maxS + 1); c[0] = 1;
    for (let i = 1; i <= n; i++) for (let s = maxS; s >= i; s--) c[s] += c[s - i];
    return c;
  }
  function wilcoxon(x, y, alt) {
    if (x.length !== y.length) throw new Error('Las dos condiciones deben tener la misma cantidad de datos (pares).');
    alt = alt || 'two-sided'; const d0 = x.map((v, i) => v - y[i]), nz = d0.filter(v => v !== 0), n = nz.length, ceros = d0.length - n;
    if (n < 1) throw new Error('Todas las diferencias son cero; la prueba no es aplicable.');
    const ab = nz.map(Math.abs), mr = midranks(ab); let Wp = 0, Wm = 0; nz.forEach((v, i) => { if (v > 0) Wp += mr.r[i]; else Wm += mr.r[i]; });
    const mu = n * (n + 1) / 4, sd = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24 - tieSum(mr.ties) / 48);
    let zc, pAs; if (alt === 'two-sided') { zc = (Math.abs(Wp - mu) - 0.5) / sd; pAs = Math.min(1, 2 * normSf(Math.max(0, zc))); } else if (alt === 'greater') { zc = (Wp - mu - 0.5) / sd; pAs = normSf(zc); } else { zc = (Wp - mu + 0.5) / sd; pAs = normCdf(zc); }
    let pEx = null; if (mr.ties.length === 0 && n <= 50) { const c = wilcoxonCounts(n), tot = Math.pow(2, n); const cdf = u => { let s = 0; for (let i = 0; i <= Math.min(Math.floor(u + 1e-9), c.length - 1); i++) s += c[i]; return s / tot; }, sf = u => { let s = 0; for (let i = Math.ceil(u - 1e-9); i < c.length; i++) s += c[i]; return s / tot; }; pEx = alt === 'greater' ? sf(Wp) : alt === 'less' ? cdf(Wp) : Math.min(1, 2 * Math.min(cdf(Wp), sf(Wp))); }
    const w = []; for (let i = 0; i < n; i++) for (let j = i; j < n; j++) w.push((nz[i] + nz[j]) / 2);
    return { prueba: 'wilcoxon', n, nPares: d0.length, ceros, Wp, Wm, mu, sd, z: (Wp - mu) / sd, zc, pAsin: pAs, pExacto: pEx, hayEmpates: mr.ties.length > 0, alt, rb: (Wp - Wm) / (Wp + Wm), rZ: ((Wp - mu) / sd) / Math.sqrt(n), hl: median(w), medDif: median(d0), diffs: d0, pos: nz.filter(v => v > 0).length, neg: nz.filter(v => v < 0).length };
  }
  // ───────── 3.2 Prueba de los signos ─────────
  function signTest(x, y, alt) {
    if (x.length !== y.length) throw new Error('Las dos condiciones deben tener la misma cantidad de datos (pares).');
    const d = x.map((v, i) => v - y[i]), pos = d.filter(v => v > 0).length, neg = d.filter(v => v < 0).length, emp = d.length - pos - neg;
    if (pos + neg < 1) throw new Error('Todas las diferencias son cero; la prueba no es aplicable.');
    const b = binomTest(pos, pos + neg, 0.5, alt || 'two-sided');
    return { prueba: 'signos', n: d.length, pos, neg, emp, nEf: pos + neg, p: b.p, ic: b.ic, phat: b.phat, alt: alt || 'two-sided', medDif: median(d), diffs: d };
  }

  // ───────── 4.1 Kruskal-Wallis (+ Dunn) ─────────
  function groupsRanks(groups) { const all = [], lab = []; groups.forEach((g, i) => g.forEach(v => { all.push(v); lab.push(i); })); const mr = midranks(all), k = groups.length, R = new Array(k).fill(0); lab.forEach((l, j) => R[l] += mr.r[j]); return { N: all.length, ranks: mr.r, lab, ties: mr.ties, R }; }
  function checkGroups(groups, kmin) { if (groups.length < kmin) throw new Error('Se necesitan al menos ' + kmin + ' grupos.'); groups.forEach((g, i) => { if (g.length < 2) throw new Error('Cada grupo necesita al menos 2 observaciones.'); }); }
  function kruskal(groups, adj) {
    checkGroups(groups, 3); const k = groups.length, gr = groupsRanks(groups), N = gr.N, ns = groups.map(g => g.length); let H = 12 / (N * (N + 1)) * sum(gr.R.map((r, i) => r * r / ns[i])) - 3 * (N + 1);
    const C = 1 - tieSum(gr.ties) / (N * N * N - N); if (!(C > 0)) throw new Error('Todos los valores son idénticos; la prueba no es aplicable.'); H /= C;
    const df = k - 1, p = chi2Sf(H, df), medias = gr.R.map((r, i) => r / ns[i]), pares = [], praw = [];
    const varBase = (N * (N + 1) / 12 - tieSum(gr.ties) / (12 * (N - 1)));
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const z = (medias[i] - medias[j]) / Math.sqrt(varBase * (1 / ns[i] + 1 / ns[j])), pp = 2 * normSf(Math.abs(z)); pares.push({ i, j, z, p: pp }); praw.push(pp); }
    const pa = ajustar(praw, adj || 'holm'); pares.forEach((q, t) => q.padj = pa[t]);
    return { prueba: 'kruskal', k, N, ns, H, df, p, eps2: H / (N - 1), eta2: Math.max(0, (H - k + 1) / (N - k)), medias, medianas: groups.map(median), pares, adj: adj || 'holm', minN: Math.min.apply(null, ns) };
  }
  // ───────── 4.2 Prueba de la mediana ─────────
  function medianTest(groups) {
    checkGroups(groups, 2); const all = [].concat.apply([], groups), M = median(all), k = groups.length, arriba = groups.map(g => g.filter(v => v > M).length), abajo = groups.map((g, i) => g.length - arriba[i]);
    const tA = sum(arriba), tB = sum(abajo), N = all.length; if (tA === 0 || tB === 0) throw new Error('Todos los valores quedan de un solo lado de la mediana global; la prueba no es aplicable.');
    let chi = 0, minE = Infinity, menos5 = 0; groups.forEach((g, i) => { const ea = g.length * tA / N, eb = g.length * tB / N; chi += (arriba[i] - ea) ** 2 / ea + (abajo[i] - eb) ** 2 / eb; minE = Math.min(minE, ea, eb); menos5 += (ea < 5) + (eb < 5); });
    return { prueba: 'mediana', k, N, M, arriba, abajo, ns: groups.map(g => g.length), chi, df: k - 1, p: chi2Sf(chi, k - 1), minE, pctMenos5: menos5 / (2 * k), V: Math.sqrt(chi / (N * Math.min(1, k - 1))) };
  }
  // ───────── 4.3 Jonckheere-Terpstra ─────────
  function jonckheere(groups, alt) {
    checkGroups(groups, 3); alt = alt || 'two-sided'; const k = groups.length, ns = groups.map(g => g.length), N = sum(ns); let J = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) for (const a of groups[i]) for (const b of groups[j]) J += a < b ? 1 : a === b ? 0.5 : 0;
    const all = [].concat.apply([], groups), ties = midranks(all).ties, mu = (N * N - sum(ns.map(n => n * n))) / 4;
    const f1 = n => n * (n - 1) * (2 * n + 5), f2 = n => n * (n - 1) * (n - 2), f3 = n => n * (n - 1);
    const v = (N * (N - 1) * (2 * N + 5) - sum(ns.map(f1)) - sum(ties.map(f1))) / 72 + sum(ns.map(f2)) * sum(ties.map(f2)) / (36 * N * (N - 1) * (N - 2)) + sum(ns.map(f3)) * sum(ties.map(f3)) / (8 * N * (N - 1));
    const z = (J - mu) / Math.sqrt(v), pAs = alt === 'greater' ? normSf(z) : alt === 'less' ? normCdf(z) : Math.min(1, 2 * normSf(Math.abs(z)));
    let pEx = null;
    if (ties.length === 0 && N <= 60) { // convolución de distribuciones de Mann-Whitney (Terpstra)
      let dist = [1], acc = ns[0];
      for (let j = 1; j < k; j++) { const c = mwExactCounts(acc, ns[j]), tot = sum(c), pr = c.map(x => x / tot), out = new Array(dist.length + pr.length - 1).fill(0); for (let a = 0; a < dist.length; a++) for (let b = 0; b < pr.length; b++) out[a + b] += dist[a] * pr[b]; dist = out; acc += ns[j]; }
      const cdf = u => { let s = 0; for (let i = 0; i <= Math.min(Math.floor(u + 1e-9), dist.length - 1); i++) s += dist[i]; return Math.min(1, s); }, sf = u => { let s = 0; for (let i = Math.ceil(u - 1e-9); i < dist.length; i++) s += dist[i]; return Math.min(1, s); };
      pEx = alt === 'greater' ? sf(J) : alt === 'less' ? cdf(J) : Math.min(1, 2 * Math.min(cdf(J), sf(J)));
    }
    return { prueba: 'jt', k, N, ns, J, mu, sd: Math.sqrt(v), z, pAsin: pAs, pExacto: pEx, hayEmpates: ties.length > 0, alt, medianas: groups.map(median) };
  }

  // ───────── 5. Muestras relacionadas ─────────
  function checkMat(M, kmin) { const n = M.length; if (n < 2) throw new Error('Se necesitan al menos 2 sujetos (filas).'); const k = M[0].length; if (k < kmin) throw new Error('Se necesitan al menos ' + kmin + ' condiciones (columnas).'); M.forEach(r => { if (r.length !== k) throw new Error('Todas las filas deben tener el mismo número de valores (' + k + ').'); }); return [n, k]; }
  function friedmanCore(M) {
    const [n, k] = checkMat(M, 3), Rj = new Array(k).fill(0); let tie = 0, A1 = 0; const rk = M.map(row => { const m = midranks(row); tie += tieSum(m.ties); m.r.forEach((r, j) => { Rj[j] += r; A1 += r * r; }); return m.r; });
    const C = 1 - tie / (n * k * (k * k - 1)); if (!(C > 0)) throw new Error('Todos los valores de cada fila son idénticos; la prueba no es aplicable.');
    const chi = (12 / (n * k * (k + 1)) * sum(Rj.map(r => r * r)) - 3 * n * (k + 1)) / C; return { n, k, Rj, chi, df: k - 1, p: chi2Sf(chi, k - 1), W: chi / (n * (k - 1)), A1, rk, hayEmpates: tie > 0 };
  }
  function friedman(M, adj) {
    const f = friedmanCore(M), n = f.n, k = f.k, dfc = (n - 1) * (k - 1), den = Math.sqrt(2 * (n * f.A1 - sum(f.Rj.map(r => r * r))) / dfc), pares = [], praw = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const t = den > 0 ? Math.abs(f.Rj[i] - f.Rj[j]) / den : Infinity, pp = den > 0 ? tTwo(t, dfc) : 0; pares.push({ i, j, t, p: pp, dif: (f.Rj[i] - f.Rj[j]) / n }); praw.push(pp); }
    const pa = ajustar(praw, adj || 'holm'); pares.forEach((q, t) => q.padj = pa[t]);
    return Object.assign({ prueba: 'friedman', mediasRango: f.Rj.map(r => r / n), medianas: null, pares, adj: adj || 'holm', dfc }, f);
  }
  function kendallW(M) {
    const f = friedmanCore(M); return { prueba: 'kendallw', n: f.n, k: f.k, W: f.W, chi: f.chi, df: f.df, p: f.p, Rj: f.Rj, mediasRango: f.Rj.map(r => r / f.n), hayEmpates: f.hayEmpates, rProm: (f.n * f.W - 1) / (f.n - 1) };
  }
  function cochranQ(M, adj) {
    const [n, k] = checkMat(M, 3); if (M.some(r => r.some(v => v !== 0 && v !== 1))) throw new Error('Q de Cochran solo admite datos dicotómicos: todos los valores deben ser 0 o 1.');
    const C = new Array(k).fill(0); let T = 0, SR = 0; M.forEach(r => { const s = sum(r); SR += s * s; T += s; r.forEach((v, j) => C[j] += v); });
    const den = k * T - SR; if (den === 0) throw new Error('Todas las filas son idénticas (todo 0 o todo 1); la prueba no es aplicable.');
    const Q = (k - 1) * (k * sum(C.map(c => c * c)) - T * T) / den, pares = [], praw = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { let b = 0, c = 0; M.forEach(r => { if (r[i] === 1 && r[j] === 0) b++; else if (r[i] === 0 && r[j] === 1) c++; }); const pp = (b + c) === 0 ? 1 : binomTest(b, b + c, 0.5, 'two-sided').p; pares.push({ i, j, b, c, p: pp }); praw.push(pp); }
    const pa = ajustar(praw, adj || 'holm'); pares.forEach((q, t) => q.padj = pa[t]);
    return { prueba: 'cochran', n, k, Q, df: k - 1, p: chi2Sf(Q, k - 1), exitos: C, props: C.map(c => c / n), pares, adj: adj || 'holm', menosFilas: M.filter(r => { const s = sum(r); return s > 0 && s < k; }).length };
  }

  return { lgamma, normSf, normCdf, chi2Sf, betaI, binomPmf, binomSf, binomCdf, runsPmf, runsCdf, runsSfGe, midranks, median, sum, chi2gof, binomTest, runsOne, ks1, ksCdfExact, kolmSf, mannWhitney, mwExactCounts, moses, mosesSpanDist, ks2, waldWolfowitz2, wwRunsBounds, countRuns, holm, wilcoxon, signTest, kruskal, medianTest, jonckheere, friedman, kendallW, cochranQ, tTwo };
})();
if (typeof module !== 'undefined') module.exports = NPM;
