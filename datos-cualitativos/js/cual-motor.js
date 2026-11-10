/* Motor de datos cualitativos — Estadilab
   Frecuencias (IC de Wilson), ji-cuadrado y G de independencia, Fisher exacto (2×2 y r×c),
   McNemar y kappa de Cohen. Usa funciones de np-motor.js (NPM). */
const CUM = (function () {
  'use strict';
  const M = NPM, sum = a => a.reduce((s, v) => s + v, 0), lf = n => M.lgamma(n + 1);
  const Z95 = 1.959963984540054;

  // ───────── Frecuencias ─────────
  function wilson(x, n, z) { z = z || Z95; if (!n) return [NaN, NaN]; const p = x / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)]; }
  function frecuencias(cats, f, opt) { // cats: nombres, f: frecuencias (≥0)
    opt = opt || {}; const k = cats.length; if (k < 2) throw new Error('Se necesitan al menos 2 categorías.');
    if (f.some(v => !(v >= 0) || !isFinite(v))) throw new Error('Las frecuencias deben ser números no negativos.');
    const n = sum(f); if (n <= 0) throw new Error('La suma de frecuencias debe ser mayor que 0.');
    let idx = cats.map((_, i) => i); if (opt.orden === 'desc') idx.sort((a, b) => f[b] - f[a] || a - b); else if (opt.orden === 'asc') idx.sort((a, b) => f[a] - f[b] || a - b); else if (opt.orden === 'alfa') idx.sort((a, b) => String(cats[a]).localeCompare(String(cats[b]), 'es'));
    let acc = 0; const filas = idx.map(i => { acc += f[i]; return { nombre: cats[i], f: f[i], rf: f[i] / n, pct: 100 * f[i] / n, cum: acc, cumPct: 100 * acc / n, ic: wilson(f[i], n) }; });
    const mx = Math.max.apply(null, f), modas = cats.filter((_, i) => f[i] === mx);
    const p = f.map(v => v / n), H = -sum(p.map(q => q > 0 ? q * Math.log(q) : 0)), chi = sum(f.map(v => (v - n / k) ** 2 / (n / k)));
    return { prueba: 'frec', n, k, filas, modas, moda_f: mx, entropiaNorm: H / Math.log(k), chiUnif: chi, pUnif: M.chi2Sf(chi, k - 1), enteros: f.every(v => v === Math.floor(v)) };
  }

  // ───────── Independencia ─────────
  function checkTabla(T) { const r = T.length, c = T[0].length; if (r < 2 || c < 2) throw new Error('La tabla debe tener al menos 2 filas y 2 columnas.'); T.forEach(f => { if (f.length !== c) throw new Error('Todas las filas deben tener el mismo número de columnas.'); f.forEach(v => { if (!(v >= 0) || v !== Math.floor(v) || !isFinite(v)) throw new Error('Las celdas deben ser frecuencias enteras no negativas.'); }); }); return [r, c]; }
  function margenes(T) { const r = T.length, c = T[0].length, R = T.map(sum), C = Array.from({ length: c }, (_, j) => sum(T.map(f => f[j]))); return { R, C, n: sum(R), r, c }; }
  function chi2ind(T, yates) {
    const [r, c] = checkTabla(T), m = margenes(T), n = m.n; if (m.R.some(v => v === 0) || m.C.some(v => v === 0)) throw new Error('Hay filas o columnas con total cero; elimínelas antes de calcular.');
    const E = T.map((f, i) => f.map((_, j) => m.R[i] * m.C[j] / n)); let chi = 0, G = 0, chiY = 0, minE = Infinity, menos5 = 0;
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { const o = T[i][j], e = E[i][j]; chi += (o - e) ** 2 / e; if (o > 0) G += o * Math.log(o / e); const adj = Math.min(0.5, Math.abs(o - e)); chiY += (Math.abs(o - e) - adj) ** 2 / e; minE = Math.min(minE, e); if (e < 5) menos5++; }
    G *= 2; const df = (r - 1) * (c - 1), usaY = !!yates && r === 2 && c === 2, stat = usaY ? chiY : chi;
    const resA = T.map((f, i) => f.map((o, j) => (o - E[i][j]) / Math.sqrt(E[i][j] * (1 - m.R[i] / n) * (1 - m.C[j] / n))));
    const V = Math.sqrt(chi / (n * Math.min(r - 1, c - 1)));
    let phi = null; if (r === 2 && c === 2) { const [a, b, cc, d] = [T[0][0], T[0][1], T[1][0], T[1][1]]; phi = (a * d - b * cc) / Math.sqrt(m.R[0] * m.R[1] * m.C[0] * m.C[1]); }
    return { prueba: 'chi2ind', r, c, n, df, E, chi, chiY, usaYates: usaY, stat, p: M.chi2Sf(stat, df), pSinCorr: M.chi2Sf(chi, df), G, pG: M.chi2Sf(G, df), V, C: Math.sqrt(chi / (chi + n)), phi, resA, minE, menos5, pctMenos5: menos5 / (r * c), R: m.R, Cc: m.C };
  }

  // ───────── Fisher 2×2 ─────────
  function nhyper(a, b, c, d) { // soporte y log-pmf (θ = 1) de X = a
    const m = a + b, nn = c + d, k = a + c, lo = Math.max(0, k - nn), hi = Math.min(m, k), lp = []; for (let x = lo; x <= hi; x++) lp.push(lchoose(m, x) + lchoose(nn, k - x)); return { m, nn, k, lo, hi, lp, tot: lchoose(m + nn, k) };
  }
  function lchoose(n, k) { return lf(n) - lf(k) - lf(n - k); }
  const pmfTheta = (S, theta) => { const w = S.lp.map((l, i) => l + (S.lo + i) * Math.log(theta)), mx = Math.max.apply(null, w), e = w.map(v => Math.exp(v - mx)), z = sum(e); return e.map(v => v / z); };
  function biseccion(f, lo, hi, creciente) { let a = Math.log(lo), b = Math.log(hi); for (let i = 0; i < 200; i++) { const m = (a + b) / 2, v = f(Math.exp(m)); if ((v < 0) === creciente) a = m; else b = m; } return Math.exp((a + b) / 2); }
  function fisher2x2(T, alt) {
    checkTabla(T); if (T.length !== 2 || T[0].length !== 2) throw new Error('Fisher 2×2 requiere una tabla 2×2.'); alt = alt || 'two-sided';
    const [a, b, c, d] = [T[0][0], T[0][1], T[1][0], T[1][1]], S = nhyper(a, b, c, d), pm = pmfTheta(S, 1), i0 = a - S.lo, p0 = pm[i0]; let p;
    if (alt === 'greater') p = sum(pm.slice(i0)); else if (alt === 'less') p = sum(pm.slice(0, i0 + 1)); else p = sum(pm.filter(v => v <= p0 * (1 + 1e-7)));
    p = Math.min(1, p); const orM = (b * c) === 0 ? ((a * d) === 0 ? NaN : Infinity) : (a * d) / (b * c);
    const mean = th => { const q = pmfTheta(S, th); return sum(q.map((v, i) => v * (S.lo + i))); };
    let mle; if (a === S.lo) mle = 0; else if (a === S.hi) mle = Infinity; else mle = biseccion(th => mean(th) - a, 1e-12, 1e12, true);
    const al = 0.05 / 2, lower = th => sum(pmfTheta(S, th).slice(0, i0 + 1)), upper = th => sum(pmfTheta(S, th).slice(i0));
    const lowCI = a === S.lo ? 0 : biseccion(th => upper(th) - al, 1e-12, 1e12, true), upCI = a === S.hi ? Infinity : biseccion(th => lower(th) - al, 1e-12, 1e12, false);
    const n1 = a + b, n2 = c + d, p1 = a / n1, p2 = c / n2, rr = p2 === 0 ? Infinity : p1 / p2;
    return { prueba: 'fisher2', T, n: a + b + c + d, alt, p, orMuestral: orM, orMLE: mle, orIC: [lowCI, upCI], p1, p2, difP: p1 - p2, rr, minE: Math.min((a + b) * (a + c), (a + b) * (b + d), (c + d) * (a + c), (c + d) * (b + d)) / (a + b + c + d) };
  }
  // ───────── Fisher-Freeman-Halton (r×c) ─────────
  function fisherRxC(T, B) {
    const [r, c] = checkTabla(T), m = margenes(T), n = m.n; if (m.R.some(v => v === 0) || m.C.some(v => v === 0)) throw new Error('Hay filas o columnas con total cero; elimínelas antes de calcular.');
    const K = sum(m.R.map(lf)) + sum(m.C.map(lf)) - lf(n), S0 = sum(T.map(f => sum(f.map(lf)))), lp0 = K - S0, lim = lp0 + Math.log1p(1e-7);
    let visit = 0, tot = 0, p = 0, abort = false; const cap = 3e6;
    const rem = m.R.slice();
    (function col(j, acc) {
      if (abort) return;
      if (j === c - 1) { let s = acc; for (let i = 0; i < r; i++) s += lf(rem[i]); visit++; const lp = K - s; tot += Math.exp(lp); if (lp <= lim) p += Math.exp(lp); if (visit > cap) abort = true; return; }
      (function fila(i, resto, s) {
        if (abort) return; if (i === r - 1) { if (resto > rem[i]) return; rem[i] -= resto; col(j + 1, s + lf(resto)); rem[i] += resto; return; }
        for (let v = 0; v <= Math.min(resto, rem[i]); v++) { rem[i] -= v; fila(i + 1, resto - v, s + lf(v)); rem[i] += v; }
      })(0, m.C[j], acc);
    })(0, 0);
    let metodo = 'exacto', pp = Math.min(1, p);
    if (abort) { // simulación Monte Carlo con márgenes fijos
      B = B || 20000; const rand = (function (s) { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(20261109);
      const filas = []; m.R.forEach((v, i) => { for (let q = 0; q < v; q++) filas.push(i); }); let ge = 0;
      for (let b = 0; b < B; b++) { for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = filas[i]; filas[i] = filas[j]; filas[j] = t; } const X = Array.from({ length: r }, () => new Array(c).fill(0)); let pos = 0; for (let j = 0; j < c; j++) for (let q = 0; q < m.C[j]; q++) X[filas[pos++]][j]++; const s = sum(X.map(f => sum(f.map(lf)))); if (K - s <= lim) ge++; }
      pp = (ge + 1) / (B + 1); metodo = 'Monte Carlo (' + B + ' tablas)';
    }
    return { prueba: 'fisherrxc', r, c, n, p: pp, metodo, probObs: Math.exp(lp0), V: Math.sqrt(chi2ind(T).chi / (n * Math.min(r - 1, c - 1))), minE: chi2ind(T).minE };
  }

  // ───────── McNemar ─────────
  function mcnemar(T) {
    checkTabla(T); if (T.length !== 2 || T[0].length !== 2) throw new Error('McNemar requiere una tabla 2×2 (antes × después).');
    const [a, b, c, d] = [T[0][0], T[0][1], T[1][0], T[1][1]], n = a + b + c + d, nd = b + c; if (nd === 0) throw new Error('No hay pares discordantes (b = c = 0); la prueba no es aplicable.');
    const ex = M.binomTest(b, nd, 0.5, 'two-sided'), chi = (b - c) ** 2 / nd, chiC = (Math.abs(b - c) - 1) ** 2 / nd, pI = ex.ic;
    return { prueba: 'mcnemar', T, n, a, b, c, d, nd, pExacto: ex.p, chi, chiC, pChi: M.chi2Sf(chi, 1), pChiC: M.chi2Sf(chiC, 1), or: c === 0 ? Infinity : b / c, orIC: [pI[0] / (1 - pI[0]), pI[1] >= 1 ? Infinity : pI[1] / (1 - pI[1])], pm1: (a + b) / n, pm2: (a + c) / n, dif: (b - c) / n };
  }

  // ───────── Kappa de Cohen ─────────
  function kappa(T, pesos) {
    const [r, c] = checkTabla(T); if (r !== c) throw new Error('La tabla de acuerdo debe ser cuadrada (mismas categorías en filas y columnas).'); const k = r, n = sum(T.map(sum)); if (n === 0) throw new Error('La tabla está vacía.');
    const P = T.map(f => f.map(v => v / n)), pi = P.map(sum), pj = Array.from({ length: k }, (_, j) => sum(P.map(f => f[j])));
    const w = (i, j) => pesos === 'linear' ? 1 - Math.abs(i - j) / (k - 1) : pesos === 'quad' ? 1 - ((i - j) / (k - 1)) ** 2 : (i === j ? 1 : 0);
    let po = 0, pe = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { po += w(i, j) * P[i][j]; pe += w(i, j) * pi[i] * pj[j]; }
    if (pe === 1) throw new Error('Todos los evaluadores usaron una sola categoría; el kappa no está definido.');
    const kap = (po - pe) / (1 - pe), wi = i => sum(Array.from({ length: k }, (_, j) => pj[j] * w(i, j))), wj = j => sum(Array.from({ length: k }, (_, i) => pi[i] * w(i, j)));
    let s1 = 0, s0 = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { s1 += P[i][j] * (w(i, j) - (wi(i) + wj(j)) * (1 - kap)) ** 2; s0 += pi[i] * pj[j] * (w(i, j) - (wi(i) + wj(j))) ** 2; }
    const se = Math.sqrt((s1 - (kap - pe * (1 - kap)) ** 2) / (n * (1 - pe) ** 2)), se0 = Math.sqrt((s0 - pe * pe) / (n * (1 - pe) ** 2)), z0 = kap / se0;
    return { prueba: 'kappa', k, n, po, pe, kappa: kap, se, ic: [kap - Z95 * se, kap + Z95 * se], se0, z0, p: M.normSf(z0), pos2: 2 * M.normSf(Math.abs(z0)), pesos: pesos || 'none', marg1: pi, marg2: pj };
  }
  return { wilson, frecuencias, chi2ind, fisher2x2, fisherRxC, mcnemar, kappa };
})();
if (typeof module !== 'undefined') module.exports = CUM;
