// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR ANOVA AVANZADO — Estadilab
//  Rangos múltiples (Tukey, Duncan, SNK, LSD, Scheffé, Bonferroni) con letras,
//  supuestos (Shapiro-Wilk, Levene/Brown-Forsythe, Bartlett, Durbin-Watson, rachas),
//  alternativas (Welch + Games-Howell, Kruskal-Wallis + Dunn), potencia y tamaño de muestra.
//  Matemática pura, sin DOM. Validado contra scipy.
// ═══════════════════════════════════════════════════════════════════════════
const MV = (function () {
  // ── Funciones especiales de alta precisión ──
  function logGamma(z) {
    const c = [57.1562356658629235, -59.5979603554754912, 14.1360979747417471, -0.491913816097620199, 0.339946499848118887e-4, 0.465236289270485756e-4, -0.983744753048795646e-4, 0.158088703224912494e-3, -0.210264441724104883e-3, 0.217439618115212643e-3, -0.164318106536763890e-3, 0.844182239838527433e-4, -0.261908384015814087e-4, 0.368991826595316234e-5];
    let y = z, x = z, tmp = x + 5.24218750000000000; tmp = (x + 0.5) * Math.log(tmp) - tmp; let ser = 0.999999999999997092;
    for (let j = 0; j < 14; j++) ser += c[j] / ++y; return tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function normCDF(x) {
    if (!isFinite(x)) return x > 0 ? 1 : 0;
    const z = Math.abs(x) / Math.SQRT2; let p;
    if (z < 2.5) { // serie sin cancelación
      let term = z, sum = z, n = 0; while (Math.abs(term) > 1e-17 * Math.abs(sum) && n < 200) { n++; term *= 2 * z * z / (2 * n + 1); sum += term; }
      p = 1 - 2 / Math.sqrt(Math.PI) * Math.exp(-z * z) * sum / 2 * 2 / 2; // erfc = 1 - erf
      const erf = 2 / Math.sqrt(Math.PI) * Math.exp(-z * z) * sum; p = 1 - erf; // erfc(z)
    } else { // fracción continua de erfc
      let f = 0; for (let k = 60; k >= 1; k--) f = k / 2 / (z + f); p = Math.exp(-z * z) / Math.sqrt(Math.PI) / (z + f);
    }
    return x >= 0 ? 1 - p / 2 : p / 2;
  }
  function invNormal(p) { if (p <= 0) return -Infinity; if (p >= 1) return Infinity; let lo = -40, hi = 40; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (normCDF(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
  function betacf(a, b, x) {
    const FP = 1e-300; const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FP) d = FP; d = 1 / d; let h = d;
    for (let m = 1; m <= 1000; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break; }
    return h;
  }
  function betaInc(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) { let ap = a, del = 1 / a, sum = del; for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; } return sum * Math.exp(-x + a * Math.log(x) - logGamma(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d; for (let i = 1; i <= 1000; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
  }
  const chi2SF = (x, k) => x <= 0 ? 1 : 1 - gammaP(k / 2, x / 2);
  const tCDF = (t, nu) => { const p = 0.5 * betaInc(nu / (nu + t * t), nu / 2, 0.5); return t >= 0 ? 1 - p : p; };
  const tSF2 = (t, nu) => betaInc(nu / (nu + t * t), nu / 2, 0.5); // p de dos colas
  function invT(p, nu) { let lo = -500, hi = 500; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (tCDF(m, nu) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
  const fCDF = (f, d1, d2) => f <= 0 ? 0 : betaInc(d1 * f / (d1 * f + d2), d1 / 2, d2 / 2);
  const fSF = (f, d1, d2) => f <= 0 ? 1 : betaInc(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
  function invF(p, d1, d2) { let lo = 0, hi = 1e5; for (let i = 0; i < 300; i++) { const m = (lo + hi) / 2; if (fCDF(m, d1, d2) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

  // F no central: mezcla de Poisson de betas
  function ncfCDF(x, d1, d2, lam) {
    if (x <= 0) return 0; const y = d1 * x / (d1 * x + d2);
    if (lam <= 0) return betaInc(y, d1 / 2, d2 / 2);
    const h = lam / 2; let j0 = Math.floor(h), sum = 0;
    const w = j => Math.exp(-h + j * Math.log(h) - logGamma(j + 1));
    for (let j = j0; j < j0 + 5000; j++) { const t = w(j) * betaInc(y, d1 / 2 + j, d2 / 2); sum += t; if (w(j) < 1e-17 && j > h) break; }
    for (let j = j0 - 1; j >= 0; j--) { const t = w(j) * betaInc(y, d1 / 2 + j, d2 / 2); sum += t; if (w(j) < 1e-17) break; }
    return Math.min(1, sum);
  }

  // ── Rango estudentizado (ptukey, algoritmo de Copenhaver & Holland 1988 / R) ──
  const XL12 = [0.981560634246719250690549090149, 0.904117256370474856678465866119, 0.769902674194304687036893833213, 0.587317954286617447296702418941, 0.367831498998180193752691536644, 0.125233408511468915472441369464];
  const AL12 = [0.047175336386511827194615961485, 0.106939325995318430960254718194, 0.160078328543346226334652529543, 0.203167426723065921749064455810, 0.233492536538354808760849898925, 0.249147045813402785000562436043];
  const XL16 = [0.989400934991649932596154173450, 0.944575023073232576077988415535, 0.865631202387831743880467897712, 0.755404408355003033895101194847, 0.617876244402643748446671764049, 0.458016777657227386342419442984, 0.281603550779258913230460501460, 0.950125098376374401853193354250e-1];
  const AL16 = [0.271524594117540948517805724560e-1, 0.622535239386478928628438369944e-1, 0.951585116824927848099251076022e-1, 0.124628971255533872052476282192, 0.149595988816576732081501730547, 0.169156519395002538189312079030, 0.182603415044923588866763667969, 0.189450610455068496285396723208];
  function wprob(w, rr, cc) {
    const C1 = -30, C2 = -50, C3 = 60, bb = 8, wlar = 3, wincr1 = 2, wincr2 = 3, nleg = 12, ihalf = 6;
    const qsqz = w * 0.5; if (qsqz >= bb) return 1;
    let prw = 2 * normCDF(qsqz) - 1; prw = prw >= Math.exp(C2 / cc) ? Math.pow(prw, cc) : 0;
    const wincr = w > wlar ? wincr1 : wincr2; let blb = qsqz; const binc = (bb - qsqz) / wincr; let bub = blb + binc, einsum = 0; const cc1 = cc - 1;
    for (let wi = 1; wi <= wincr; wi++) {
      let elsum = 0; const a = 0.5 * (bub + blb), b = 0.5 * (bub - blb);
      for (let jj = 1; jj <= nleg; jj++) {
        let j, xx; if (ihalf < jj) { j = nleg - jj + 1; xx = XL12[j - 1]; } else { j = jj; xx = -XL12[j - 1]; }
        const ac = a + b * xx, qexpo = ac * ac; if (qexpo > C3) break;
        const pplus = 2 * normCDF(ac), pminus = 2 * normCDF(ac - w); let rinsum = pplus * 0.5 - pminus * 0.5;
        if (rinsum >= Math.exp(C1 / cc1)) { rinsum = AL12[j - 1] * Math.exp(-(0.5 * qexpo)) * Math.pow(rinsum, cc1); elsum += rinsum; }
      }
      elsum *= 2 * b * cc * 0.3989422804014327; einsum += elsum; blb = bub; bub += binc;
    }
    prw += einsum; if (prw <= Math.exp(C1 / rr)) return 0; prw = Math.pow(prw, rr); return prw >= 1 ? 1 : prw;
  }
  function ptukey(q, nmeans, df, nranges) {
    const rr = nranges || 1, cc = nmeans; if (q <= 0) return 0; if (df < 2 || rr < 1 || cc < 2) return NaN; if (!isFinite(q)) return 1; if (df > 25000) return wprob(q, rr, cc);
    const nlegq = 16, ihalfq = 8, eps1 = -30, eps2 = 1e-14;
    const f2 = df * 0.5; let f2lf = f2 * Math.log(df) - df * Math.LN2 - logGamma(f2); const f21 = f2 - 1, ff4 = df * 0.25;
    const ulen = df <= 100 ? 1 : df <= 800 ? 0.5 : df <= 5000 ? 0.25 : 0.125; f2lf += Math.log(ulen);
    let ans = 0, otsum = 0;
    for (let i = 1; i <= 50; i++) {
      otsum = 0; const twa1 = (2 * i - 1) * ulen;
      for (let jj = 1; jj <= nlegq; jj++) {
        let j, t1; if (ihalfq < jj) { j = jj - ihalfq - 1; t1 = f2lf + f21 * Math.log(twa1 + XL16[j] * ulen) - (XL16[j] * ulen + twa1) * ff4; }
        else { j = jj - 1; t1 = f2lf + f21 * Math.log(twa1 - XL16[j] * ulen) + (XL16[j] * ulen - twa1) * ff4; }
        if (t1 >= eps1) { const qsqz = ihalfq < jj ? q * Math.sqrt((XL16[j] * ulen + twa1) * 0.5) : q * Math.sqrt((-(XL16[j] * ulen) + twa1) * 0.5); otsum += wprob(qsqz, rr, cc) * AL16[j] * Math.exp(t1); }
      }
      if (i * ulen >= 1 && otsum <= eps2) break; ans += otsum;
    }
    return Math.min(1, ans);
  }
  const ptukeySF = (q, k, df) => 1 - ptukey(q, k, df);
  function qtukey(p, k, df) { let lo = 0, hi = 5; while (ptukey(hi, k, df) < p && hi < 1e4) hi *= 2; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (ptukey(m, k, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

  // ── Utilidades ──
  const sum = a => a.reduce((s, v) => s + v, 0), mean = a => sum(a) / a.length;
  const varm = a => { const m = mean(a); return sum(a.map(v => (v - m) ** 2)) / (a.length - 1); };
  const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  function rankAvg(v) { const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length), ties = []; let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rk; if (j > i) ties.push(j - i + 1); i = j + 1; } return { r, ties }; }

  // ── ANOVA base ──
  function anova(grupos) {
    const k = grupos.length, n = grupos.map(g => g.length), N = sum(n), medias = grupos.map(mean), gm = sum(grupos.map(g => sum(g))) / N;
    let ssb = 0, ssw = 0; grupos.forEach((g, i) => { ssb += n[i] * (medias[i] - gm) ** 2; g.forEach(x => { ssw += (x - medias[i]) ** 2; }); });
    const dfB = k - 1, dfW = N - k, msb = ssb / dfB, msw = ssw / dfW, F = msb / msw;
    return { k, n, N, medias, gm, ssb, ssw, sst: ssb + ssw, dfB, dfW, msb, msw, F, p: fSF(F, dfB, dfW), eta2: ssb / (ssb + ssw), omega2: Math.max(0, (ssb - dfB * msw) / (ssb + ssw + msw)), f: Math.sqrt(ssb / ssw * dfW / N * N / dfW * 1) * 0 + Math.sqrt(ssb / (N * msw)), sd: grupos.map(g => Math.sqrt(varm(g))), sp: Math.sqrt(msw) };
  }

  // ── Comparaciones múltiples ──
  /** Devuelve {metodo, pares:[{i,j,diff,se,p,sig,ic:[a,b]}], sigMat, letras} */
  function comparar(grupos, metodo, alpha) {
    alpha = alpha || 0.05; const A = anova(grupos), { k, n, medias, msw, dfW } = A, pares = [], sig = Array.from({ length: k }, () => new Array(k).fill(false));
    const orden = medias.map((m, i) => i).sort((a, b) => medias[a] - medias[b]); // ascendente
    const mk = (i, j, extra) => Object.assign({ i, j, diff: medias[i] - medias[j] }, extra);
    if (metodo === 'duncan' || metodo === 'snk') {
      const rankOf = new Array(k); orden.forEach((g, r) => rankOf[g] = r);
      const crit = {}, test = {};
      for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
        const p = b - a + 1, gi = orden[a], gj = orden[b], se = Math.sqrt(msw / 2 * (1 / n[gi] + 1 / n[gj])), q = Math.abs(medias[gj] - medias[gi]) / se;
        const ap = metodo === 'duncan' ? 1 - Math.pow(1 - alpha, p - 1) : alpha, qc = qtukey(1 - ap, p, dfW);
        test[a + '_' + b] = { q, qc, ok: q > qc, p, se, ap, pval: 1 - ptukey(q, p, dfW) };
      }
      for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
        let ok = true; for (let c = 0; c <= a && ok; c++) for (let d = b; d < k && ok; d++) if (!test[c + '_' + d].ok) ok = false;
        const t = test[a + '_' + b], gi = orden[a], gj = orden[b]; sig[gi][gj] = sig[gj][gi] = ok;
        const crits = t.qc * t.se;
        pares.push({ i: gj, j: gi, diff: medias[gj] - medias[gi], se: t.se, pasos: t.p, valorCritico: t.qc, rangoCritico: crits, p: t.pval, sig: ok });
      }
    } else {
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
        const diff = medias[i] - medias[j], v = msw * (1 / n[i] + 1 / n[j]), se = Math.sqrt(v); let p, ic, vc;
        if (metodo === 'tukey') { const sq = Math.sqrt(v / 2), q = Math.abs(diff) / sq; p = 1 - ptukey(q, k, dfW); vc = qtukey(1 - alpha, k, dfW); ic = [diff - vc * sq, diff + vc * sq]; }
        else if (metodo === 'lsd') { const t = Math.abs(diff) / se; p = tSF2(t, dfW); vc = invT(1 - alpha / 2, dfW); ic = [diff - vc * se, diff + vc * se]; }
        else if (metodo === 'bonferroni') { const m = k * (k - 1) / 2, t = Math.abs(diff) / se; p = Math.min(1, tSF2(t, dfW) * m); vc = invT(1 - alpha / (2 * m), dfW); ic = [diff - vc * se, diff + vc * se]; }
        else if (metodo === 'scheffe') { const Fs = diff * diff / ((k - 1) * v); p = fSF(Fs, k - 1, dfW); vc = Math.sqrt((k - 1) * invF(1 - alpha, k - 1, dfW)); ic = [diff - vc * se, diff + vc * se]; }
        const s = p < alpha; sig[i][j] = sig[j][i] = s; pares.push(mk(i, j, { se, p, sig: s, ic, valorCritico: vc }));
      }
    }
    return { metodo, alpha, pares, sigMat: sig, letras: letrasCompactas(medias, sig), A };
  }
  function letrasCompactas(medias, sig) {
    const k = medias.length, ord = medias.map((m, i) => i).sort((a, b) => medias[b] - medias[a]);
    let sets = [new Set(ord)];
    for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
      const i = ord[a], j = ord[b]; if (!sig[i][j]) continue; const nuevo = [];
      sets.forEach(s => { if (s.has(i) && s.has(j)) { const s1 = new Set(s); s1.delete(j); const s2 = new Set(s); s2.delete(i); nuevo.push(s1, s2); } else nuevo.push(s); });
      sets = nuevo.filter((s, x) => s.size && !nuevo.some((t, y) => y !== x && t.size >= s.size && [...s].every(e => t.has(e)) && (t.size > s.size || y < x)));
    }
    sets.sort((s1, s2) => Math.min(...[...s1].map(e => ord.indexOf(e))) - Math.min(...[...s2].map(e => ord.indexOf(e))));
    const letras = new Array(k).fill(''); sets.forEach((s, idx) => s.forEach(e => letras[e] += String.fromCharCode(97 + idx))); return letras.map(l => l.split('').sort().join(''));
  }

  // ── Supuestos ──
  function residuos(grupos) { const medias = grupos.map(mean); const r = [], aj = [], gi = []; grupos.forEach((g, i) => g.forEach(x => { r.push(x - medias[i]); aj.push(medias[i]); gi.push(i); })); return { r, aj, gi }; }
  function shapiroWilk(x) { // AS R94 (Royston 1995), n entre 3 y 5000
    const n = x.length; if (n < 3) return null; const xs = [...x].sort((a, b) => a - b), nn2 = Math.floor(n / 2), a = new Array(nn2 + 1).fill(0);
    const poly = (cc, nord, xv) => { let ret = cc[0]; if (nord > 1) { let p = xv * cc[nord - 1]; for (let j = nord - 2; j > 0; j--) p = (p + cc[j]) * xv; ret += p; } return ret; };
    const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], c3 = [0.544, -0.39978, 0.025054, -6.714e-4], c4 = [1.3822, -0.77857, 0.062767, -0.0020322], c5 = [-1.5861, -0.31082, -0.083751, 0.0038915], c6 = [-0.4803, -0.082676, 0.0030302], g = [-2.273, 0.459];
    if (n === 3) a[1] = Math.SQRT1_2; else {
      const an25 = n + 0.25; const m = new Array(nn2 + 1).fill(0); let summ2 = 0; for (let i = 1; i <= nn2; i++) { m[i] = invNormal((i - 0.375) / an25); summ2 += m[i] * m[i]; }
      summ2 *= 2; const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n), a1 = poly(c1, 6, rsn) - m[1] / ssumm2; let i1, fac;
      if (n > 5) { i1 = 3; const a2 = -m[2] / ssumm2 + poly(c2, 6, rsn); fac = Math.sqrt((summ2 - 2 * m[1] * m[1] - 2 * m[2] * m[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2)); a[2] = a2; }
      else { i1 = 2; fac = Math.sqrt((summ2 - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1)); }
      a[1] = a1; for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
    }
    const range = xs[n - 1] - xs[0]; if (range < 1e-19) return { W: NaN, p: NaN, n, constante: true };
    let sx = 0, sa = 0; // sumas
    for (let i = 0; i < n; i++) sx += xs[i] / range; sx /= n;
    // a completo (antisimétrico)
    const A = new Array(n); for (let i = 0; i < nn2; i++) { A[i] = -a[i + 1]; A[n - 1 - i] = a[i + 1]; } if (n % 2) A[nn2] = 0;
    sa = sum(A) / n; let ssa = 0, ssx = 0, sax = 0; for (let i = 0; i < n; i++) { const asa = A[i] - sa, xsx = xs[i] / range - sx; ssa += asa * asa; ssx += xsx * xsx; sax += asa * xsx; }
    const ssassx = Math.sqrt(ssa * ssx), w1 = (ssassx - sax) * (ssassx + sax) / (ssa * ssx), W = 1 - w1; let pw;
    if (n === 3) { const pi6 = 1.90985931710274, stqr = 1.04719755119660; pw = pi6 * (Math.asin(Math.sqrt(W)) - stqr); if (pw < 0) pw = 0; return { W, p: pw, n }; }
    let y = Math.log(w1); const xx = Math.log(n); let mm, s;
    if (n <= 11) { const gm = poly(g, 2, n); if (y >= gm) return { W, p: 1e-99, n }; y = -Math.log(gm - y); mm = poly(c3, 4, n); s = Math.exp(poly(c4, 4, n)); }
    else { mm = poly(c5, 4, xx); s = Math.exp(poly(c6, 3, xx)); }
    pw = 1 - normCDF((y - mm) / s); return { W, p: pw, n };
  }
  function levene(grupos, centro) { // centro: 'media' | 'mediana'
    const z = grupos.map(g => { const c = centro === 'media' ? mean(g) : median(g); return g.map(x => Math.abs(x - c)); }); const r = anova(z); return { W: r.F, df1: r.dfB, df2: r.dfW, p: r.p };
  }
  function bartlett(grupos) {
    const k = grupos.length, n = grupos.map(g => g.length), v = grupos.map(varm), N = sum(n), sp = sum(n.map((ni, i) => (ni - 1) * v[i])) / (N - k);
    const num = (N - k) * Math.log(sp) - sum(n.map((ni, i) => (ni - 1) * Math.log(v[i]))), den = 1 + (sum(n.map(ni => 1 / (ni - 1))) - 1 / (N - k)) / (3 * (k - 1)), T = num / den;
    return { chi2: T, df: k - 1, p: chi2SF(T, k - 1) };
  }
  function durbinWatson(res) { // res ordenados por orden de ejecución
    const n = res.length; let num = 0, den = 0; for (let i = 0; i < n; i++) { den += res[i] * res[i]; if (i) num += (res[i] - res[i - 1]) ** 2; }
    const dw = num / den, r1 = 1 - dw / 2, z = r1 * Math.sqrt(n); return { dw, r1, z, p: 2 * (1 - normCDF(Math.abs(z))), n };
  }
  function rachas(res) { // Wald-Wolfowitz sobre el signo de los residuos
    const s = res.filter(v => v !== 0).map(v => v > 0), n1 = s.filter(Boolean).length, n2 = s.length - n1; if (n1 < 1 || n2 < 1) return null;
    let R = 1; for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]) R++;
    const mu = 2 * n1 * n2 / (n1 + n2) + 1, v = (mu - 1) * (mu - 2) / (n1 + n2 - 1), z = v > 0 ? (R - mu) / Math.sqrt(v) : 0; return { R, n1, n2, mu, z, p: 2 * (1 - normCDF(Math.abs(z))) };
  }

  // ── Alternativas ──
  function welchAnova(grupos) {
    const k = grupos.length, n = grupos.map(g => g.length), m = grupos.map(mean), v = grupos.map(varm), w = n.map((ni, i) => ni / v[i]), W = sum(w), mw = sum(w.map((wi, i) => wi * m[i])) / W;
    const lam = sum(w.map((wi, i) => (1 - wi / W) ** 2 / (n[i] - 1))), F = (sum(w.map((wi, i) => wi * (m[i] - mw) ** 2)) / (k - 1)) / (1 + 2 * (k - 2) / (k * k - 1) * lam), df2 = (k * k - 1) / (3 * lam);
    return { F, df1: k - 1, df2, p: fSF(F, k - 1, df2) };
  }
  function gamesHowell(grupos, alpha) {
    alpha = alpha || 0.05; const k = grupos.length, n = grupos.map(g => g.length), m = grupos.map(mean), v = grupos.map(varm), pares = [], sig = Array.from({ length: k }, () => new Array(k).fill(false));
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const a = v[i] / n[i], b = v[j] / n[j], se = Math.sqrt(a + b), df = (a + b) ** 2 / (a * a / (n[i] - 1) + b * b / (n[j] - 1)), q = Math.abs(m[i] - m[j]) / Math.sqrt((a + b) / 2), p = 1 - ptukey(q, k, df), s = p < alpha;
      sig[i][j] = sig[j][i] = s; pares.push({ i, j, diff: m[i] - m[j], se, df, p, sig: s });
    }
    return { pares, letras: letrasCompactas(m, sig), sigMat: sig };
  }
  function kruskalWallis(grupos) {
    const todos = [].concat(...grupos), N = todos.length, { r, ties } = rankAvg(todos); let pos = 0; const R = [], n = grupos.map(g => g.length);
    grupos.forEach((g, i) => { let s = 0; for (let t = 0; t < g.length; t++) s += r[pos++]; R.push(s); });
    let H = 12 / (N * (N + 1)) * sum(R.map((Ri, i) => Ri * Ri / n[i])) - 3 * (N + 1); const tc = sum(ties.map(t => t * t * t - t)), C = 1 - tc / (N * N * N - N);
    H = C > 0 ? H / C : NaN; const k = grupos.length; return { H, df: k - 1, p: chi2SF(H, k - 1), rangosMedios: R.map((Ri, i) => Ri / n[i]), sumaRangos: R, n, N, ties, epsilon2: H / ((N * N - 1) / (N + 1)) };
  }
  function dunn(grupos, ajuste) {
    const kw = kruskalWallis(grupos), { N, n, rangosMedios } = kw, k = grupos.length, tc = sum(kw.ties.map(t => t * t * t - t)), sigma2 = N * (N + 1) / 12 - tc / (12 * (N - 1)), pares = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const z = (rangosMedios[i] - rangosMedios[j]) / Math.sqrt(sigma2 * (1 / n[i] + 1 / n[j])), p = 2 * (1 - normCDF(Math.abs(z))); pares.push({ i, j, diff: rangosMedios[i] - rangosMedios[j], z, pCrudo: p }); }
    const m = pares.length;
    if (ajuste === 'bonferroni') pares.forEach(c => c.p = Math.min(1, c.pCrudo * m));
    else { const ord = pares.map((c, idx) => idx).sort((a, b) => pares[a].pCrudo - pares[b].pCrudo); let prev = 0; ord.forEach((idx, r) => { const v = Math.min(1, pares[idx].pCrudo * (m - r)); prev = Math.max(prev, v); pares[idx].p = prev; }); }
    const sig = Array.from({ length: k }, () => new Array(k).fill(false)); pares.forEach(c => { c.sig = c.p < 0.05; sig[c.i][c.j] = sig[c.j][c.i] = c.sig; });
    return { pares, letras: letrasCompactas(rangosMedios, sig), kw };
  }

  // ── Potencia ──
  function potencia(k, nPorGrupo, f, alpha) { const N = k * nPorGrupo, d1 = k - 1, d2 = N - k; if (d2 < 1) return 0; const fc = invF(1 - alpha, d1, d2), lam = N * f * f; return 1 - ncfCDF(fc, d1, d2, lam); }
  function potenciaLam(k, N, lam, alpha) { const d1 = k - 1, d2 = N - k; if (d2 < 1) return 0; return 1 - ncfCDF(invF(1 - alpha, d1, d2), d1, d2, lam); }
  function tamanoMuestra(k, f, alpha, potObj) { for (let n = 2; n <= 5000; n++) { if (potencia(k, n, f, alpha) >= potObj) return n; } return null; }
  const fDesdeDiferencia = (delta, sigma, k) => delta / (sigma * Math.sqrt(2 * k)); // dos medias extremas separadas Δ, el resto al centro
  function diferenciaMinima(k, n, sigma, alpha, potObj) { let lo = 0, hi = 10; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, f = m; if (potencia(k, n, f, alpha) < potObj) lo = m; else hi = m; } const f = (lo + hi) / 2; return { f, delta: f * sigma * Math.sqrt(2 * k) }; }

  return { logGamma, normCDF, invNormal, betaInc, tCDF, invT, fSF, fCDF, invF, ncfCDF, chi2SF, ptukey, qtukey, anova, comparar, letrasCompactas, residuos, shapiroWilk, levene, bartlett, durbinWatson, rachas, welchAnova, gamesHowell, kruskalWallis, dunn, potencia, potenciaLam, tamanoMuestra, fDesdeDiferencia, diferenciaMinima, mean, varm, median, rankAvg };
})();
if (typeof module !== 'undefined') module.exports = MV;
