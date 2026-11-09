// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE CÁLCULO — Estadilab
//  Este archivo NO depende del HTML. Se puede importar en cualquier
//  calculadora nueva (pruebas de hipótesis, ANOVA, regresión) con:
//  <script src="../js/motor-calculo.js"></script>
//
//  Expone tres objetos globales: M, DISTRIBUTIONS, CALC
// ═══════════════════════════════════════════════════════════════════════════

const DISTRIBUTIONS = {
  // ─── DISCRETAS ───────────────────────────────────────────────────────────
  binomial: {
    name: "Binomial", type: "discrete", icon: "🎯",
    formula: "P(X=k) = C(n,k)·pᵏ·(1-p)ⁿ⁻ᵏ",
    desc: "Modela el número de éxitos en n ensayos independientes de Bernoulli con probabilidad de éxito p.",
    params: [
      { id: "n", label: "n (ensayos)", hint: "entero ≥ 1", default: 10 },
      { id: "p", label: "p (prob. éxito)", hint: "0 < p < 1", default: 0.5 },
      { id: "k", label: "x (valor consulta)", hint: "0 ≤ k ≤ n", default: 3 }
    ],
    queryTypes: ["P(X = x)", "P(X ≤ x)", "P(X ≥ x)", "P(X < x)"]
  },
  uniforme_discreta: {
    name: "Uniforme Discreta", type: "discrete", icon: "⚖️",
    formula: "P(X=k) = 1/n",
    desc: "Cada valor del conjunto {a, a+1, ..., b} tiene la misma probabilidad de ocurrir.",
    params: [
      { id: "a", label: "a (mínimo)", hint: "entero", default: 1 },
      { id: "b", label: "b (máximo)", hint: "entero > a", default: 6 },
      { id: "k", label: "x (valor consulta)", hint: "a ≤ x ≤ b", default: 3 }
    ],
    queryTypes: ["P(X = x)", "P(X ≤ x)", "P(X ≥ x)", "P(X < x)"]
  },
  hipergeometrica: {
    name: "Hipergeométrica", type: "discrete", icon: "🎱",
    formula: "P(X=k) = C(K,k)·C(N-K,n-k) / C(N,n)",
    desc: "Modela el número de éxitos al extraer n elementos sin reemplazo de una población de N con K éxitos.",
    params: [
      { id: "N", label: "N (población total)", hint: "entero ≥ 1", default: 20 },
      { id: "K", label: "K (éxitos en población)", hint: "0 ≤ K ≤ N", default: 7 },
      { id: "n", label: "n (muestra)", hint: "1 ≤ n ≤ N", default: 5 },
      { id: "k", label: "x (valor consulta)", hint: "0 ≤ x ≤ min(n,K)", default: 2 }
    ],
    queryTypes: ["P(X = x)", "P(X ≤ x)", "P(X ≥ x)", "P(X < x)"]
  },
  binomial_negativa: {
    name: "Binomial Negativa", type: "discrete", icon: "🔄",
    formula: "P(X=k) = C(k-1,r-1)·pʳ·(1-p)^(k-r)",
    desc: "Número de ensayos necesarios para obtener el r-ésimo éxito, con probabilidad p por ensayo.",
    params: [
      { id: "r", label: "r (éxitos deseados)", hint: "entero ≥ 1", default: 3 },
      { id: "p", label: "p (prob. éxito)", hint: "0 < p ≤ 1", default: 0.4 },
      { id: "k", label: "x (valor consulta)", hint: "x ≥ r", default: 7 }
    ],
    queryTypes: ["P(X = x)", "P(X ≤ x)", "P(X ≥ x)", "P(X < x)"]
  },
  pascal: {
    name: "Pascal", type: "discrete", icon: "📐",
    formula: "P(X=k) = C(k+r-1,k)·pʳ·(1-p)ᵏ",
    desc: "Número de fracasos antes de obtener r éxitos. Parametrización alternativa de la Binomial Negativa.",
    params: [
      { id: "r", label: "r (éxitos deseados)", hint: "entero ≥ 1", default: 3 },
      { id: "p", label: "p (prob. éxito)", hint: "0 < p < 1", default: 0.5 },
      { id: "k", label: "x (fracasos, consulta)", hint: "x ≥ 0", default: 2 }
    ],
    queryTypes: ["P(X = x)", "P(X ≤ x)", "P(X ≥ x)", "P(X < x)"]
  },
  poisson: {
    name: "Poisson", type: "discrete", icon: "🐟",
    formula: "P(X=k) = e^(-λ)·λᵏ / k!",
    desc: "Modela el número de eventos que ocurren en un intervalo fijo, dado que ocurren a tasa promedio λ.",
    params: [
      { id: "lambda", label: "λ (tasa promedio)", hint: "λ > 0", default: 4 },
      { id: "k", label: "x (valor consulta)", hint: "entero ≥ 0", default: 3 }
    ],
    queryTypes: ["P(X = x)", "P(X ≤ x)", "P(X ≥ x)", "P(X < x)"]
  },
  geometrica: {
    name: "Geométrica", type: "discrete", icon: "📍",
    formula: "P(X=k) = (1-p)^(k-1)·p",
    desc: "Número de ensayos hasta obtener el primer éxito. Tiene la propiedad de pérdida de memoria.",
    params: [
      { id: "p", label: "p (prob. éxito)", hint: "0 < p ≤ 1", default: 0.3 },
      { id: "k", label: "x (valor consulta)", hint: "entero ≥ 1", default: 3 }
    ],
    queryTypes: ["P(X = x)", "P(X ≤ x)", "P(X ≥ x)", "P(X < x)"]
  },

  // ─── CONTINUAS ───────────────────────────────────────────────────────────
  normal: {
    name: "Normal", type: "continuous", icon: "🔔",
    formula: "f(x) = (1/σ√2π)·exp(-(x-μ)²/2σ²)",
    desc: "La distribución más importante en estadística. Simétrica, con media μ y desviación estándar σ.",
    params: [
      { id: "mu", label: "μ (media)", hint: "cualquier real", default: 0 },
      { id: "sigma", label: "σ (desv. estándar)", hint: "σ > 0", default: 1 },
      { id: "x", label: "x (valor consulta)", hint: "cualquier real", default: 1.5 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  uniforme_continua: {
    name: "Uniforme Continua", type: "continuous", icon: "▬",
    formula: "f(x) = 1/(b-a)  para  a ≤ x ≤ b",
    desc: "Todos los valores en el intervalo [a, b] son igualmente probables. También llamada distribución rectangular.",
    params: [
      { id: "a", label: "a (mínimo)", hint: "real", default: 0 },
      { id: "b", label: "b (máximo)", hint: "real > a", default: 10 },
      { id: "x", label: "x (valor consulta)", hint: "a ≤ x ≤ b", default: 4 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  exponencial: {
    name: "Exponencial", type: "continuous", icon: "📉",
    formula: "f(x) = λ·e^(-λx)  para  x ≥ 0",
    desc: "Modela el tiempo entre eventos en un proceso de Poisson. Tiene la propiedad de pérdida de memoria.",
    params: [
      { id: "lambda", label: "λ (tasa)", hint: "λ > 0", default: 0.5 },
      { id: "x", label: "x (valor consulta)", hint: "x ≥ 0", default: 2 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  lognormal: {
    name: "Lognormal", type: "continuous", icon: "📈",
    formula: "f(x) = (1/xσ√2π)·exp(-(ln x - μ)²/2σ²)",
    desc: "Si ln(X) ~ Normal(μ, σ), entonces X sigue una distribución Lognormal. Útil para datos positivos sesgados.",
    params: [
      { id: "mu", label: "μ (media del log)", hint: "real", default: 0 },
      { id: "sigma", label: "σ (desv. del log)", hint: "σ > 0", default: 0.5 },
      { id: "x", label: "x (valor consulta)", hint: "x > 0", default: 2 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  logistica: {
    name: "Logística", type: "continuous", icon: "〰️",
    formula: "f(x) = e^(-(x-μ)/s) / s(1+e^(-(x-μ)/s))²",
    desc: "Similar a la normal pero con colas más pesadas. Usada en regresión logística y modelos de crecimiento.",
    params: [
      { id: "mu", label: "μ (localización)", hint: "real", default: 0 },
      { id: "s", label: "s (escala)", hint: "s > 0", default: 1 },
      { id: "x", label: "x (valor consulta)", hint: "real", default: 1 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  gamma: {
    name: "Gamma", type: "continuous", icon: "Γ",
    formula: "f(x) = x^(α-1)·e^(-x/β) / (β^α·Γ(α))",
    desc: "Generaliza la exponencial. Útil para modelar tiempos de espera de múltiples eventos.",
    params: [
      { id: "alpha", label: "α (forma)", hint: "α > 0", default: 2 },
      { id: "beta", label: "β (escala)", hint: "β > 0", default: 2 },
      { id: "x", label: "x (valor consulta)", hint: "x > 0", default: 3 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  beta: {
    name: "Beta", type: "continuous", icon: "β",
    formula: "f(x) = x^(α-1)·(1-x)^(β-1) / B(α,β)",
    desc: "Definida en [0,1], modela proporciones y probabilidades. Extremadamente flexible en su forma.",
    params: [
      { id: "alpha", label: "α (forma 1)", hint: "α > 0", default: 2 },
      { id: "beta", label: "β (forma 2)", hint: "β > 0", default: 3 },
      { id: "x", label: "x (valor consulta)", hint: "0 < x < 1", default: 0.4 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  ji_cuadrado: {
    name: "Ji-Cuadrado (χ²)", type: "continuous", icon: "χ",
    formula: "f(x) = x^(k/2-1)·e^(-x/2) / (2^(k/2)·Γ(k/2))",
    desc: "Suma de k variables normales estándar al cuadrado. Fundamental en pruebas de bondad de ajuste e independencia.",
    params: [
      { id: "k", label: "k (grados de libertad)", hint: "entero ≥ 1", default: 5 },
      { id: "x", label: "x (valor consulta)", hint: "x > 0", default: 6 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  t_student: {
    name: "t-Student", type: "continuous", icon: "t",
    formula: "f(t) = Γ((ν+1)/2) / (√(νπ)·Γ(ν/2))·(1+t²/ν)^(-(ν+1)/2)",
    desc: "Similar a la normal pero con colas pesadas. Usada en inferencia con muestras pequeñas y varianza desconocida.",
    params: [
      { id: "nu", label: "ν (grados de libertad)", hint: "entero ≥ 1", default: 10 },
      { id: "x", label: "x (valor consulta)", hint: "real", default: 1.5 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  cauchy: {
    name: "Cauchy", type: "continuous", icon: "©",
    formula: "f(x) = 1 / (πγ(1+((x-x₀)/γ)²))",
    desc: "Distribución de colas muy pesadas. No tiene media ni varianza finita. Aparece como cociente de normales.",
    params: [
      { id: "x0", label: "x₀ (localización)", hint: "real", default: 0 },
      { id: "gamma", label: "γ (escala)", hint: "γ > 0", default: 1 },
      { id: "x", label: "x (valor consulta)", hint: "real", default: 1 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  weibull: {
    name: "Weibull", type: "continuous", icon: "⚙️",
    formula: "f(x) = (k/λ)·(x/λ)^(k-1)·e^(-(x/λ)ᵏ)",
    desc: "Muy usada en análisis de fiabilidad y supervivencia. Puede modelar tasas de fallo crecientes, constantes o decrecientes.",
    params: [
      { id: "k", label: "k (forma)", hint: "k > 0", default: 2 },
      { id: "lambda", label: "λ (escala)", hint: "λ > 0", default: 3 },
      { id: "x", label: "x (valor consulta)", hint: "x ≥ 0", default: 2 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  laplace: {
    name: "Laplace", type: "continuous", icon: "Λ",
    formula: "f(x) = (1/2b)·exp(-|x-μ|/b)",
    desc: "También llamada 'doble exponencial'. Tiene picos más pronunciados y colas más pesadas que la normal.",
    params: [
      { id: "mu", label: "μ (localización)", hint: "real", default: 0 },
      { id: "b", label: "b (escala)", hint: "b > 0", default: 1 },
      { id: "x", label: "x (valor consulta)", hint: "real", default: 1 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  },
  pareto: {
    name: "Pareto", type: "continuous", icon: "📊",
    formula: "f(x) = α·xₘ^α / x^(α+1)  para  x ≥ xₘ",
    desc: "Distribución de ley de potencia. Modela el principio 80/20 y fenómenos con colas muy pesadas.",
    params: [
      { id: "alpha", label: "α (forma / índice)", hint: "α > 0", default: 2 },
      { id: "xm", label: "xₘ (mínimo)", hint: "xₘ > 0", default: 1 },
      { id: "x", label: "x (valor consulta)", hint: "x ≥ xₘ", default: 3 }
    ],
    queryTypes: ["P(X ≤ x)", "P(X ≥ x)", "P(X = x) [densidad]", "P(a ≤ X ≤ b)"]
  }
};

const M = {
  fact: function(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  },
  C: function(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 0; i < k; i++) { r *= (n - i); r /= (i + 1); }
    return r;
  },
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
  gamma: function(z) { return Math.exp(M.logGamma(z)); },
  beta: function(a, b) { return Math.exp(M.logGamma(a) + M.logGamma(b) - M.logGamma(a + b)); },
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
  normPDF: function(x) { return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI); },
  gammaInc: function(a, x) {
    if (x < 0) return 0;
    if (x === 0) return 0;
    if (x < a + 1) {
      let ap = a, del = 1 / a, sum = del;
      for (let n = 0; n < 200; n++) {
        ap++; del *= x / ap; sum += del;
        if (Math.abs(del) < Math.abs(sum) * 1e-10) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - M.logGamma(a));
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
      return 1 - Math.exp(-x + a * Math.log(x) - M.logGamma(a)) * h;
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
      if (t > 0 && t < 1)
        s += w * Math.pow(t, a - 1) * Math.pow(1 - t, b - 1);
    }
    return (h / 3) * s / M.beta(a, b);
  },
  tCDF: function(t, nu) {
    const x = nu / (nu + t * t);
    const p = 0.5 * M.betaInc(x, nu / 2, 0.5);
    return t >= 0 ? 1 - p : p;
  },
  integrate: function(f, a, b, n = 2000) {
    if (a === b) return 0;
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) {
      s += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
    }
    return (h / 3) * s;
  }
};

const CALC = {
  binomial: {
    pmf: (k, p) => { const {n} = p; const {p: pr} = p; return M.C(n, k) * Math.pow(pr, k) * Math.pow(1-pr, n-k); },
    cdf: (k, p) => { let s=0; for(let i=0;i<=k;i++) s+=CALC.binomial.pmf(i,p); return s; },
    stats: (p) => {
      const {n, p: pr} = p;
      return { E: n*pr, Var: n*pr*(1-pr), SD: Math.sqrt(n*pr*(1-pr)),
               Asim: (1-2*pr)/Math.sqrt(n*pr*(1-pr)), Kurt: (1-6*pr*(1-pr))/(n*pr*(1-pr)) };
    },
    tableRange: (p) => { const mu=p.n*p.p; const sd=Math.sqrt(p.n*p.p*(1-p.p)); return [Math.max(0,Math.round(mu-4*sd)), Math.min(p.n,Math.round(mu+4*sd))]; }
  },
  uniforme_discreta: {
    pmf: (k, p) => { const {a,b}=p; return (k>=a&&k<=b) ? 1/(b-a+1) : 0; },
    cdf: (k, p) => { const {a,b}=p; if(k<a)return 0; if(k>=b)return 1; return (Math.floor(k)-a+1)/(b-a+1); },
    stats: (p) => {
      const {a,b}=p; const n=b-a+1;
      return { E:(a+b)/2, Var:(n*n-1)/12, SD:Math.sqrt((n*n-1)/12), Asim:0, Kurt:-6*(n*n+1)/(5*(n*n-1)) };
    },
    tableRange: (p) => [p.a, p.b]
  },
  hipergeometrica: {
    pmf: (k, p) => { const {N,K,n}=p; return M.C(K,k)*M.C(N-K,n-k)/M.C(N,n); },
    cdf: (k, p) => { let s=0; for(let i=0;i<=k;i++) s+=CALC.hipergeometrica.pmf(i,p); return s; },
    stats: (p) => {
      const {N,K,n}=p;
      const E=n*K/N, Var=n*K*(N-K)*(N-n)/(N*N*(N-1));
      return { E, Var, SD:Math.sqrt(Var), Asim:(N-2*K)*Math.sqrt(N-1)*Math.sqrt(N-2*n)/(Math.sqrt(n*K*(N-K)*(N-n))*(N-2)), Kurt:0 };
    },
    tableRange: (p) => [Math.max(0,p.n+p.K-p.N), Math.min(p.n,p.K)]
  },
  binomial_negativa: {
    pmf: (k, p) => { const {r, p: pr}=p; return M.C(k-1,r-1)*Math.pow(pr,r)*Math.pow(1-pr,k-r); },
    cdf: (k, p) => { let s=0; for(let i=p.r;i<=k;i++) s+=CALC.binomial_negativa.pmf(i,p); return s; },
    stats: (p) => {
      const {r, p: pr}=p;
      return { E:r/pr, Var:r*(1-pr)/(pr*pr), SD:Math.sqrt(r*(1-pr)/(pr*pr)), Asim:(2-pr)/Math.sqrt(r*(1-pr)), Kurt:6/r+pr*pr/(r*(1-pr)) };
    },
    tableRange: (p) => [p.r, Math.min(p.r+50, Math.round(p.r/p.p+4*Math.sqrt(p.r*(1-p.p)/(p.p*p.p))))]
  },
  pascal: {
    pmf: (k, p) => { const {r, p: pr}=p; return M.C(k+r-1,k)*Math.pow(pr,r)*Math.pow(1-pr,k); },
    cdf: (k, p) => { let s=0; for(let i=0;i<=k;i++) s+=CALC.pascal.pmf(i,p); return s; },
    stats: (p) => {
      const {r, p: pr}=p; const q=1-pr;
      return { E:r*q/pr, Var:r*q/(pr*pr), SD:Math.sqrt(r*q/(pr*pr)), Asim:(2-pr)/Math.sqrt(r*q), Kurt:6/r+pr*pr/(r*q) };
    },
    tableRange: (p) => [0, Math.min(60, Math.round(p.r*(1-p.p)/p.p+5*Math.sqrt(p.r*(1-p.p)/(p.p*p.p))))]
  },
  poisson: {
    pmf: (k, p) => { const {lambda:l}=p; return Math.exp(-l)*Math.pow(l,k)/M.fact(k); },
    cdf: (k, p) => { let s=0; for(let i=0;i<=k;i++) s+=CALC.poisson.pmf(i,p); return s; },
    stats: (p) => {
      const {lambda:l}=p;
      return { E:l, Var:l, SD:Math.sqrt(l), Asim:1/Math.sqrt(l), Kurt:1/l };
    },
    tableRange: (p) => [0, Math.max(15, Math.round(p.lambda+5*Math.sqrt(p.lambda)))]
  },
  geometrica: {
    pmf: (k, p) => { const {p: pr}=p; return Math.pow(1-pr,k-1)*pr; },
    cdf: (k, p) => { const {p: pr}=p; return 1-Math.pow(1-pr,k); },
    stats: (p) => {
      const {p: pr}=p; const q=1-pr;
      return { E:1/pr, Var:q/(pr*pr), SD:Math.sqrt(q)/(pr), Asim:(2-pr)/Math.sqrt(q), Kurt:6+pr*pr/q };
    },
    tableRange: (p) => [1, Math.min(30, Math.round(1/p.p+5*Math.sqrt((1-p.p)/(p.p*p.p))))]
  },
  normal: {
    pdf: (x, p) => { const {mu,sigma}=p; return M.normPDF((x-mu)/sigma)/sigma; },
    cdf: (x, p) => { const {mu,sigma}=p; return M.normCDF((x-mu)/sigma); },
    stats: (p) => {
      const {mu,sigma}=p;
      return { E:mu, Var:sigma*sigma, SD:sigma, Asim:0, Kurt:0 };
    },
    plotRange: (p) => [p.mu-4*p.sigma, p.mu+4*p.sigma]
  },
  uniforme_continua: {
    pdf: (x, p) => { const {a,b}=p; return (x>=a&&x<=b) ? 1/(b-a) : 0; },
    cdf: (x, p) => { const {a,b}=p; if(x<a)return 0; if(x>b)return 1; return (x-a)/(b-a); },
    stats: (p) => {
      const {a,b}=p;
      return { E:(a+b)/2, Var:(b-a)*(b-a)/12, SD:(b-a)/Math.sqrt(12), Asim:0, Kurt:-6/5 };
    },
    plotRange: (p) => [p.a-0.5, p.b+0.5]
  },
  exponencial: {
    pdf: (x, p) => { const {lambda:l}=p; return x>=0 ? l*Math.exp(-l*x) : 0; },
    cdf: (x, p) => { const {lambda:l}=p; return x>=0 ? 1-Math.exp(-l*x) : 0; },
    stats: (p) => {
      const {lambda:l}=p;
      return { E:1/l, Var:1/(l*l), SD:1/l, Asim:2, Kurt:6 };
    },
    plotRange: (p) => [0, 6/p.lambda]
  },
  lognormal: {
    pdf: (x, p) => { const {mu,sigma}=p; return x>0 ? M.normPDF((Math.log(x)-mu)/sigma)/(x*sigma) : 0; },
    cdf: (x, p) => { const {mu,sigma}=p; return x>0 ? M.normCDF((Math.log(x)-mu)/sigma) : 0; },
    stats: (p) => {
      const {mu,sigma}=p; const s2=sigma*sigma;
      return { E:Math.exp(mu+s2/2), Var:(Math.exp(s2)-1)*Math.exp(2*mu+s2), SD:Math.sqrt((Math.exp(s2)-1)*Math.exp(2*mu+s2)), Asim:(Math.exp(s2)+2)*Math.sqrt(Math.exp(s2)-1), Kurt:Math.exp(4*s2)+2*Math.exp(3*s2)+3*Math.exp(2*s2)-6 };
    },
    plotRange: (p) => { const m=Math.exp(p.mu+p.sigma*p.sigma/2); return [0.001, m+5*Math.sqrt((Math.exp(p.sigma*p.sigma)-1)*Math.exp(2*p.mu+p.sigma*p.sigma))]; }
  },
  logistica: {
    pdf: (x, p) => { const {mu,s}=p; const e=Math.exp(-(x-mu)/s); return e/(s*(1+e)*(1+e)); },
    cdf: (x, p) => { const {mu,s}=p; return 1/(1+Math.exp(-(x-mu)/s)); },
    stats: (p) => {
      const {mu,s}=p;
      return { E:mu, Var:Math.PI*Math.PI*s*s/3, SD:Math.PI*s/Math.sqrt(3), Asim:0, Kurt:1.2 };
    },
    plotRange: (p) => [p.mu-6*p.s, p.mu+6*p.s]
  },
  gamma: {
    pdf: (x, p) => { const {alpha:a,beta:b}=p; return x>0 ? Math.exp((a-1)*Math.log(x)-x/b-a*Math.log(b)-M.logGamma(a)) : 0; },
    cdf: (x, p) => { const {alpha:a,beta:b}=p; return x>0 ? M.gammaInc(a,x/b) : 0; },
    stats: (p) => {
      const {alpha:a,beta:b}=p;
      return { E:a*b, Var:a*b*b, SD:Math.sqrt(a)*b, Asim:2/Math.sqrt(a), Kurt:6/a };
    },
    plotRange: (p) => { const mu=p.alpha*p.beta; const sd=Math.sqrt(p.alpha)*p.beta; return [0, mu+4*sd]; }
  },
  beta: {
    pdf: (x, p) => { const {alpha:a,beta:b}=p; return (x>0&&x<1) ? Math.exp((a-1)*Math.log(x)+(b-1)*Math.log(1-x)-M.logGamma(a)-M.logGamma(b)+M.logGamma(a+b)) : 0; },
    cdf: (x, p) => { const {alpha:a,beta:b}=p; return M.betaInc(x,a,b); },
    stats: (p) => {
      const {alpha:a,beta:b}=p; const ab=a+b;
      return { E:a/ab, Var:a*b/(ab*ab*(ab+1)), SD:Math.sqrt(a*b/(ab*ab*(ab+1))), Asim:2*(b-a)*Math.sqrt(ab+1)/(Math.sqrt(a*b)*(ab+2)), Kurt:6*(a*a*a-a*a*(2*b-1)+b*b*(b+1)-2*a*b*(b+2))/(a*b*(ab+2)*(ab+3)) };
    },
    plotRange: () => [0.001, 0.999]
  },
  ji_cuadrado: {
    pdf: (x, p) => { const {k}=p; return x>0 ? Math.exp((k/2-1)*Math.log(x)-x/2-k/2*Math.log(2)-M.logGamma(k/2)) : 0; },
    cdf: (x, p) => { const {k}=p; return x>0 ? M.gammaInc(k/2,x/2) : 0; },
    stats: (p) => {
      const {k}=p;
      return { E:k, Var:2*k, SD:Math.sqrt(2*k), Asim:Math.sqrt(8/k), Kurt:12/k };
    },
    plotRange: (p) => [0, p.k+5*Math.sqrt(2*p.k)]
  },
  t_student: {
    pdf: (x, p) => {
      const {nu}=p;
      return Math.exp(M.logGamma((nu+1)/2)-M.logGamma(nu/2))/Math.sqrt(nu*Math.PI)*Math.pow(1+x*x/nu,-(nu+1)/2);
    },
    cdf: (x, p) => { return M.tCDF(x, p.nu); },
    stats: (p) => {
      const {nu}=p;
      return { E:nu>1?0:NaN, Var:nu>2?nu/(nu-2):NaN, SD:nu>2?Math.sqrt(nu/(nu-2)):NaN, Asim:nu>3?0:NaN, Kurt:nu>4?6/(nu-4):NaN };
    },
    plotRange: (p) => { const s=p.nu>2?Math.sqrt(p.nu/(p.nu-2)):2; return [-5*s, 5*s]; }
  },
  cauchy: {
    pdf: (x, p) => { const {x0,gamma:g}=p; return 1/(Math.PI*g*(1+((x-x0)/g)**2)); },
    cdf: (x, p) => { const {x0,gamma:g}=p; return 0.5+Math.atan((x-x0)/g)/Math.PI; },
    stats: () => ({ E:'∞', Var:'∞', SD:'∞', Asim:'∞', Kurt:'∞' }),
    plotRange: (p) => [p.x0-8*p.gamma, p.x0+8*p.gamma]
  },
  weibull: {
    pdf: (x, p) => { const {k,lambda:l}=p; return x>=0 ? (k/l)*Math.pow(x/l,k-1)*Math.exp(-Math.pow(x/l,k)) : 0; },
    cdf: (x, p) => { const {k,lambda:l}=p; return x>=0 ? 1-Math.exp(-Math.pow(x/l,k)) : 0; },
    stats: (p) => {
      const {k,lambda:l}=p;
      const g1=M.gamma(1+1/k), g2=M.gamma(1+2/k);
      return { E:l*g1, Var:l*l*(g2-g1*g1), SD:l*Math.sqrt(g2-g1*g1), Asim:0, Kurt:0 };
    },
    plotRange: (p) => { const mu=p.lambda*M.gamma(1+1/p.k); return [0, mu+4*p.lambda]; }
  },
  laplace: {
    pdf: (x, p) => { const {mu,b}=p; return Math.exp(-Math.abs(x-mu)/b)/(2*b); },
    cdf: (x, p) => { const {mu,b}=p; return x<mu ? 0.5*Math.exp((x-mu)/b) : 1-0.5*Math.exp(-(x-mu)/b); },
    stats: (p) => {
      const {mu,b}=p;
      return { E:mu, Var:2*b*b, SD:Math.sqrt(2)*b, Asim:0, Kurt:3 };
    },
    plotRange: (p) => [p.mu-6*p.b, p.mu+6*p.b]
  },
  pareto: {
    pdf: (x, p) => { const {alpha:a,xm}=p; return x>=xm ? a*Math.pow(xm,a)/Math.pow(x,a+1) : 0; },
    cdf: (x, p) => { const {alpha:a,xm}=p; return x>=xm ? 1-Math.pow(xm/x,a) : 0; },
    stats: (p) => {
      const {alpha:a,xm}=p;
      return {
        E: a>1 ? a*xm/(a-1) : '∞',
        Var: a>2 ? xm*xm*a/((a-1)*(a-1)*(a-2)) : '∞',
        SD: a>2 ? xm*Math.sqrt(a)/((a-1)*Math.sqrt(a-2)) : '∞',
        Asim: a>3 ? 2*(a+1)*Math.sqrt(a-2)/(Math.sqrt(a)*(a-3)) : '∞',
        Kurt: a>4 ? 6*(a*a*a+a*a-6*a-2)/(a*(a-3)*(a-4)) : '∞'
      };
    },
    plotRange: (p) => [p.xm, p.xm+6*p.xm/Math.max(p.alpha-1,0.5)]
  }
};
