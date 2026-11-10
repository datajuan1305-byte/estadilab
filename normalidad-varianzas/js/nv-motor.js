/* Motor de normalidad y homogeneidad de varianzas — Estadilab (usa NPM) */
const NVM = (function () {
  'use strict';
  const M = (typeof NPM !== 'undefined') ? NPM : require('../../np/js/np-motor.js');
  const sum = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  const mean = a => sum(a) / a.length;
  const vari = a => { const m = mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return s / (a.length - 1); };
  const sortNum = a => Float64Array.from(a).sort();

  // Cuantil normal (Wichura, AS 241, precisión ~1e-16)
  function qnorm(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const q = p - 0.5; let r, v;
    if (Math.abs(q) <= 0.425) { r = 0.180625 - q * q; return q * (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r + 45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r + 133.14166789178437745) * r + 3.387132872796366608) / (((((((r * 5226.495278852545925 + 28729.085735721942674) * r + 39307.89580009271061) * r + 21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r + 42.313330701600911252) * r + 1); }
    r = q < 0 ? p : 1 - p; r = Math.sqrt(-Math.log(r));
    if (r <= 5) { r -= 1.6; v = (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + 0.24178072517745061177) * r + 1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r + 4.6303378461565452959) * r + 1.42343711074968357734) / (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r + 0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r + 2.05319162663775882187) * r + 1); }
    else { r -= 5; v = (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r + 0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r + 5.4637849111641143699) * r + 6.6579046435011037772) / (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r + 7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r + 0.59983220655588793769) * r + 1); }
    return q < 0 ? -v : v;
  }
  const fSf = (f, d1, d2) => f <= 0 ? 1 : M.betaI(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
  const fCdf = (f, d1, d2) => f <= 0 ? 0 : M.betaI(d1 * f / (d1 * f + d2), d1 / 2, d2 / 2);
  function fQuant(p, d1, d2) { let lo = 0, hi = 1; while (fCdf(hi, d1, d2) < p) hi *= 2; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (fCdf(m, d1, d2) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

  // ───── descriptivos ─────
  function momentos(x) {
    const n = x.length, m = mean(x); let m2 = 0, m3 = 0, m4 = 0; for (const v of x) { const d = v - m; m2 += d * d; m3 += d * d * d; m4 += d * d * d * d; }
    m2 /= n; m3 /= n; m4 /= n; const g1 = m3 / Math.pow(m2, 1.5), b2 = m4 / (m2 * m2);
    const G1 = n > 2 ? g1 * Math.sqrt(n * (n - 1)) / (n - 2) : NaN, G2 = n > 3 ? ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * (b2 - 3) + 6) : NaN;
    return { n, media: m, sd: Math.sqrt(vari(x)), g1, b2, curt: b2 - 3, G1, G2, m2 };
  }
  function chequear(x, min) {
    if (x.length < min) throw new Error('Se necesitan al menos ' + min + ' observaciones.');
    const xs = sortNum(x); if (xs[xs.length - 1] - xs[0] === 0) throw new Error('Todos los valores son iguales: no se puede evaluar la normalidad.'); return xs;
  }

  // ───── Shapiro-Wilk (Royston 1995, AS R94) ─────
  const poly = (cc, x) => { let r = cc[0]; if (cc.length > 1) { let p = x * cc[cc.length - 1]; for (let j = cc.length - 2; j >= 1; j--) p = (p + cc[j]) * x; r += p; } return r; };
  function shapiroWilk(x) {
    const n = x.length; if (n < 3) throw new Error('Shapiro-Wilk requiere al menos 3 observaciones.'); if (n > 5000) throw new Error('Shapiro-Wilk está definido para n ≤ 5000; con muestras mayores use Anderson-Darling o D\'Agostino-Pearson.');
    const xs = chequear(x, 3), nn2 = Math.floor(n / 2), a = new Float64Array(nn2 + 1);
    if (n === 3) a[1] = Math.SQRT1_2; else {
      const an25 = n + 0.25, m = new Float64Array(nn2 + 1); let s2 = 0; for (let i = 1; i <= nn2; i++) { m[i] = qnorm((i - 0.375) / an25); s2 += m[i] * m[i]; } s2 *= 2;
      const ss = Math.sqrt(s2), rsn = 1 / Math.sqrt(n), c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
      const a1 = poly(c1, rsn) - m[1] / ss; let i1, fac;
      if (n > 5) { i1 = 3; const a2 = -m[2] / ss + poly(c2, rsn); fac = Math.sqrt((s2 - 2 * m[1] * m[1] - 2 * m[2] * m[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2)); a[2] = a2; }
      else { i1 = 2; fac = Math.sqrt((s2 - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1)); }
      a[1] = a1; for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
    }
    let b = 0; for (let i = 1; i <= nn2; i++) b += a[i] * (xs[n - i] - xs[i - 1]);
    const mu = mean(xs); let ssq = 0; for (const v of xs) ssq += (v - mu) * (v - mu);
    let W = b * b / ssq; if (W > 1) W = 1;
    let p;
    if (n === 3) { p = 1.90985931710274 * (Math.asin(Math.sqrt(W)) - 1.04719755119660); if (p < 0) p = 0; }
    else {
      const w1 = Math.log(1 - W), an = n; let y, mm, s;
      if (n <= 11) { const g = -2.273 + 0.459 * an; if (w1 >= g) { return { prueba: 'shapiro', n, W, p: 1e-99, a }; } y = -Math.log(g - w1); mm = poly([0.544, -0.39978, 0.025054, -6.714e-4], an); s = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], an)); }
      else { const xx = Math.log(an); y = w1; mm = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx); s = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx)); }
      p = M.normSf((y - mm) / s);
    }
    return { prueba: 'shapiro', n, W, p: Math.min(1, p), a };
  }
  // ───── Anderson-Darling (normal, parámetros estimados; Stephens) ─────
  function andersonDarling(x) {
    const n = x.length, xs = chequear(x, 8 > n ? 3 : 3), m = mean(xs), s = Math.sqrt(vari(xs)); const z = Array.from(xs, v => (v - m) / s);
    let S = 0; for (let i = 0; i < n; i++) { const f1 = Math.max(M.normCdf(z[i]), 1e-300), f2 = Math.max(1 - M.normCdf(z[n - 1 - i]), 1e-300); S += (2 * i + 1) * (Math.log(f1) + Math.log(f2)); }
    const A2 = -n - S / n, As = A2 * (1 + 0.75 / n + 2.25 / (n * n)); let p;
    if (As >= 0.6) p = Math.exp(1.2937 - 5.709 * As + 0.0186 * As * As); else if (As >= 0.34) p = Math.exp(0.9177 - 4.279 * As - 1.38 * As * As); else if (As > 0.2) p = 1 - Math.exp(-8.318 + 42.796 * As - 59.938 * As * As); else p = 1 - Math.exp(-13.436 + 101.14 * As - 223.73 * As * As);
    return { prueba: 'ad', n, A2, As, p: Math.max(0, Math.min(1, p)) };
  }
  // ───── D'Agostino-Pearson K² ─────
  function dagostino(x) {
    const n = x.length; if (n < 8) throw new Error('D\'Agostino-Pearson requiere al menos 8 observaciones (se recomienda n ≥ 20).'); chequear(x, 8); const mo = momentos(x);
    let y = mo.g1 * Math.sqrt((n + 1) * (n + 3) / (6 * (n - 2))); const beta2 = 3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3) / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
    const W2 = -1 + Math.sqrt(2 * (beta2 - 1)), delta = 1 / Math.sqrt(Math.log(Math.sqrt(W2))), alpha = Math.sqrt(2 / (W2 - 1)); if (y === 0) y = 1; const ya = y / alpha, Zs = delta * Math.log(ya + Math.sqrt(ya * ya + 1));
    const E = 3 * (n - 1) / (n + 1), varb2 = 24 * n * (n - 2) * (n - 3) / ((n + 1) * (n + 1) * (n + 3) * (n + 5)), xx = (mo.b2 - E) / Math.sqrt(varb2);
    const sb1 = 6 * (n * n - 5 * n + 2) / ((n + 7) * (n + 9)) * Math.sqrt(6 * (n + 3) * (n + 5) / (n * (n - 2) * (n - 3))), A = 6 + 8 / sb1 * (2 / sb1 + Math.sqrt(1 + 4 / (sb1 * sb1)));
    const t1 = 1 - 2 / (9 * A), den = 1 + xx * Math.sqrt(2 / (A - 4)), t2 = den === 0 ? NaN : Math.sign(den) * Math.cbrt(Math.abs((1 - 2 / A) / den)), Zk = (t1 - t2) / Math.sqrt(2 / (9 * A));
    const K2 = Zs * Zs + Zk * Zk; return { prueba: 'dagostino', n, K2, Zs, Zk, pS: 2 * M.normSf(Math.abs(Zs)), pK: 2 * M.normSf(Math.abs(Zk)), p: M.chi2Sf(K2, 2), g1: mo.g1, curt: mo.curt };
  }
  function jarqueBera(x) {
    const n = x.length; chequear(x, 3); const mo = momentos(x), JB = n / 6 * (mo.g1 * mo.g1 + mo.curt * mo.curt / 4);
    return { prueba: 'jb', n, JB, p: M.chi2Sf(JB, 2), g1: mo.g1, curt: mo.curt };
  }
  function lilliefors(x) { chequear(x, 4); const r = M.ks1(x, 'norm', {}, 'two-sided', true); return { prueba: 'lillie', n: x.length, D: r.D, p: r.lillie ? r.lillie.p : r.p, B: r.lillie ? r.lillie.B : null }; }

  // ───── Q-Q e histograma ─────
  function qq(x) {
    const xs = sortNum(x), n = xs.length, a = n <= 10 ? 3 / 8 : 0.5, pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: qnorm((i + 1 - a) / (n + 1 - 2 * a)), y: xs[i] });
    const q = p => { const h = (n - 1) * p, lo = Math.floor(h); return xs[lo] + (h - lo) * ((xs[Math.min(lo + 1, n - 1)]) - xs[lo]); };
    const y1 = q(0.25), y3 = q(0.75), x1 = qnorm(0.25), x3 = qnorm(0.75), sl = (y3 - y1) / (x3 - x1), ic = y1 - sl * x1; return { pts, sl, ic };
  }
  function histo(x) {
    const xs = sortNum(x), n = xs.length, mo = momentos(x); let k = Math.ceil(Math.log2(n) + 1); k = Math.max(4, Math.min(k, 20)); const lo = xs[0], hi = xs[n - 1], w = (hi - lo) / k, c = new Array(k).fill(0);
    for (const v of xs) { let j = Math.floor((v - lo) / w); if (j >= k) j = k - 1; c[j]++; }
    const cent = c.map((_, j) => lo + w * (j + 0.5)), pdf = cent.map(t => n * w * Math.exp(-0.5 * ((t - mo.media) / mo.sd) ** 2) / (mo.sd * Math.sqrt(2 * Math.PI)));
    return { k, w, lo, c, cent, pdf };
  }

  // ───── homogeneidad de varianzas ─────
  function resumenGrupos(g) { return g.map(v => ({ n: v.length, media: mean(v), mediana: M.median(Array.from(v)), var: vari(v), sd: Math.sqrt(vari(v)) })); }
  function fTest(x, y, alt, conf) {
    alt = alt || 'two-sided'; conf = conf || 0.95; const n1 = x.length, n2 = y.length, v1 = vari(x), v2 = vari(y); if (v2 === 0 || v1 === 0) throw new Error('Un grupo tiene varianza cero: no se puede calcular el cociente.');
    const F = v1 / v2, d1 = n1 - 1, d2 = n2 - 1, pl = fCdf(F, d1, d2); let p, ic;
    if (alt === 'two-sided') { p = 2 * Math.min(pl, 1 - pl); const al = 1 - conf; ic = [F / fQuant(1 - al / 2, d1, d2), F / fQuant(al / 2, d1, d2)]; }
    else if (alt === 'greater') { p = 1 - pl; ic = [F / fQuant(conf, d1, d2), Infinity]; } else { p = pl; ic = [0, F / fQuant(1 - conf, d1, d2)]; }
    return { prueba: 'ftest', n1, n2, v1, v2, F, d1, d2, p: Math.min(1, p), ratio: F, ic, alt, conf };
  }
  function bartlett(g) {
    const k = g.length, ns = g.map(v => v.length), vs = g.map(vari); if (vs.some(v => v === 0)) throw new Error('Un grupo tiene varianza cero.'); const N = sum(ns), nu = ns.map(n => n - 1);
    const sp = sum(nu.map((d, i) => d * vs[i])) / (N - k), num = (N - k) * Math.log(sp) - sum(nu.map((d, i) => d * Math.log(vs[i]))), den = 1 + (sum(nu.map(d => 1 / d)) - 1 / (N - k)) / (3 * (k - 1)), T = num / den;
    return { prueba: 'bartlett', k, N, ns, T, df: k - 1, p: M.chi2Sf(T, k - 1), sp, grupos: resumenGrupos(g) };
  }
  function levene(g, centro) {
    centro = centro || 'mean'; const k = g.length, ns = g.map(v => v.length), N = sum(ns);
    const Z = g.map(v => { const c = centro === 'median' ? M.median(Array.from(v)) : mean(v); return Array.from(v, t => Math.abs(t - c)); }), zb = Z.map(mean), zg = sum(Z.map(z => sum(z))) / N;
    const num = sum(ns.map((n, i) => n * (zb[i] - zg) ** 2)), den = sum(Z.map((z, i) => sum(z.map(t => (t - zb[i]) ** 2)))); if (den === 0) throw new Error('Las desviaciones respecto al centro son todas cero.');
    const W = (N - k) / (k - 1) * num / den; return { prueba: 'levene', centro, k, N, ns, W, df1: k - 1, df2: N - k, p: fSf(W, k - 1, N - k), grupos: resumenGrupos(g), zmedias: zb };
  }
  function fligner(g) {
    const k = g.length, ns = g.map(v => v.length), N = sum(ns), Z = g.map(v => { const c = M.median(Array.from(v)); return Array.from(v, t => Math.abs(t - c)); });
    const all = [].concat.apply([], Z), mr = M.midranks(all), a = Array.from(mr.r, r => qnorm(0.5 + r / (2 * (N + 1)))); const abar = mean(a), v2 = vari(a); let pos = 0, st = 0;
    const ab = ns.map(n => { const s = a.slice(pos, pos + n); pos += n; return mean(s); }); st = sum(ns.map((n, i) => n * (ab[i] - abar) ** 2)) / v2;
    return { prueba: 'fligner', k, N, ns, X: st, df: k - 1, p: M.chi2Sf(st, k - 1), grupos: resumenGrupos(g), hayEmpates: mr.ties.length > 0 };
  }
  return { qnorm, fCdf, fSf, fQuant, momentos, shapiroWilk, andersonDarling, dagostino, jarqueBera, lilliefors, qq, histo, fTest, bartlett, levene, fligner, resumenGrupos, mean, vari };
})();
if (typeof module !== 'undefined') module.exports = NVM;
