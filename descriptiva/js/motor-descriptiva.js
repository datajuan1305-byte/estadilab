// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DE ESTADÍSTICA DESCRIPTIVA — Estadilab
//  Calcula el resumen estadístico completo (28 medidas) a partir de un
//  arreglo de números. Autónomo, sin dependencias de motor-calculo.js.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Percentil por interpolación lineal (método tipo 7, el más común:
 * el mismo que usa Excel PERCENTILE.INC y R por defecto).
 * @param {number[]} sorted - datos YA ordenados ascendentemente
 * @param {number} p - proporción entre 0 y 1
 */
function percentilLineal(sorted, p) {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const idx = p * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] + w * (sorted[hi] - sorted[lo]);
}

function mediana(sorted) {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function calcularModa(datos) {
  const freq = new Map();
  for (const x of datos) freq.set(x, (freq.get(x) || 0) + 1);
  const maxFreq = Math.max(...freq.values());
  if (maxFreq === 1) return { valores: [], texto: 'No hay moda (todos los valores son únicos)', maxFreq };
  const modas = [...freq.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v).sort((a, b) => a - b);
  return { valores: modas, texto: modas.join(', ') + (modas.length > 1 ? ' (multimodal)' : ''), maxFreq };
}

function mediaRecortada(sorted, gamma = 0.05) {
  const n = sorted.length;
  const g = Math.floor(n * gamma);
  const recortados = sorted.slice(g, n - g);
  if (recortados.length === 0) return NaN;
  return recortados.reduce((a, b) => a + b, 0) / recortados.length;
}

function mediaYSigmaWinsorizada(sorted, gamma = 0.05) {
  const n = sorted.length;
  const g = Math.floor(n * gamma);
  if (n - 2 * g <= 0) return { media: NaN, sigma: NaN };
  const winsorizado = sorted.map((_, i) => {
    if (i < g) return sorted[g];
    if (i >= n - g) return sorted[n - 1 - g];
    return sorted[i];
  });
  const mediaW = winsorizado.reduce((a, b) => a + b, 0) / n;
  const sumaSqDesv = winsorizado.reduce((acc, y) => acc + (y - mediaW) ** 2, 0);
  const sigmaW = Math.sqrt(sumaSqDesv / (n - 1));
  return { media: mediaW, sigma: sigmaW };
}

function calcularDAM(datos, med) {
  const desviaciones = datos.map(x => Math.abs(x - med)).sort((a, b) => a - b);
  return mediana(desviaciones);
}

function calcularSbi(datos, med, dam) {
  if (dam === 0) return NaN;
  const n = datos.length;
  let numerador = 0;
  let denominador = 0;
  for (const x of datos) {
    const u = (x - med) / (9 * dam);
    if (Math.abs(u) < 1) {
      const u2 = u * u;
      numerador += (x - med) ** 2 * (1 - u2) ** 4;
      denominador += (1 - u2) * (1 - 5 * u2);
    }
  }
  if (denominador === 0) return NaN;
  return Math.sqrt(n * numerador) / Math.abs(denominador);
}

/**
 * Calcula el resumen estadístico completo.
 * @param {number[]} datos - arreglo de números (no necesita estar ordenado)
 * @returns {object} objeto con las 28 medidas solicitadas
 */
function calcularDescriptiva(datos) {
  const n = datos.length;
  if (n === 0) throw new Error('No hay datos para analizar');

  const sorted = [...datos].sort((a, b) => a - b);
  const suma = datos.reduce((a, b) => a + b, 0);
  const sumaCuadrados = datos.reduce((a, b) => a + b * b, 0);
  const promedio = suma / n;

  const med = mediana(sorted);
  const moda = calcularModa(datos);

  const todosPositivos = datos.every(x => x > 0);
  const mediaGeometrica = todosPositivos
    ? Math.exp(datos.reduce((acc, x) => acc + Math.log(x), 0) / n)
    : null;

  const mRecortada = n >= 4 ? mediaRecortada(sorted, 0.05) : NaN;
  const { media: mWinsorizada, sigma: sigmaWinsorizada } = n >= 4
    ? mediaYSigmaWinsorizada(sorted, 0.05)
    : { media: NaN, sigma: NaN };

  const sumaSqDesv = datos.reduce((acc, x) => acc + (x - promedio) ** 2, 0);
  const varianza = n > 1 ? sumaSqDesv / (n - 1) : NaN;
  const desvEst = Math.sqrt(varianza);
  const coefVariacion = promedio !== 0 ? (desvEst / Math.abs(promedio)) * 100 : NaN;
  const errorEstandar = n > 0 ? desvEst / Math.sqrt(n) : NaN;

  const dam = calcularDAM(datos, med);
  const sbi = calcularSbi(datos, med, dam);

  const minimo = sorted[0];
  const maximo = sorted[n - 1];
  const rango = maximo - minimo;

  const q1 = percentilLineal(sorted, 0.25);
  const q3 = percentilLineal(sorted, 0.75);
  const riq = q3 - q1;

  const sextil1_6 = percentilLineal(sorted, 1 / 6);
  const sextil5_6 = percentilLineal(sorted, 5 / 6);
  const rangoIntersextil = sextil5_6 - sextil1_6;

  const m2 = sumaSqDesv / n;
  const m3 = datos.reduce((acc, x) => acc + (x - promedio) ** 3, 0) / n;
  const m4 = datos.reduce((acc, x) => acc + (x - promedio) ** 4, 0) / n;

  const sesgo = m2 > 0 ? m3 / Math.pow(m2, 1.5) : NaN;
  const sesgoEstandarizado = sesgo / Math.sqrt(6 / n);
  const curtosis = m2 > 0 ? m4 / (m2 * m2) - 3 : NaN;
  const curtosisEstandarizada = curtosis / Math.sqrt(24 / n);

  return {
    recuento: n,
    promedio,
    mediana: med,
    moda,
    mediaGeometrica,
    mediaRecortada5: mRecortada,
    mediaWinsorizada5: mWinsorizada,
    varianza,
    desviacionEstandar: desvEst,
    coeficienteVariacion: coefVariacion,
    errorEstandar,
    sigmaWinsorizada5: sigmaWinsorizada,
    dam,
    sbi,
    minimo,
    maximo,
    rango,
    cuartilInferior: q1,
    cuartilSuperior: q3,
    rangoIntercuartilico: riq,
    sextil1_6: sextil1_6,
    sextil5_6: sextil5_6,
    rangoIntersextil,
    sesgo,
    sesgoEstandarizado,
    curtosis,
    curtosisEstandarizada,
    suma,
    sumaCuadrados
  };
}
