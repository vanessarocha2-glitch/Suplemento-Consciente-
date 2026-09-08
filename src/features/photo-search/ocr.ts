// Versão pinada — os paths abaixo apontam pro CDN nessa mesma versão,
// evitando que o Next/Turbopack tente empacotar o worker/wasm do Tesseract.
// ATENÇÃO: precisa ficar em sincronia com a versão exata de "tesseract.js"
// em package.json — se uma atualizar sem a outra, o worker/core baixados
// do CDN ficam de uma versão diferente do wrapper JS instalado localmente.
const TESSERACT_VERSION = '7.0.0'

// Testado manualmente com fotos reais de rótulo: sem isso, o Tesseract erra
// sistematicamente o texto grande/em negrito (o nome do produto, justamente
// o que mais importa). Redimensionar pra uma largura fixa (ajuda tanto fotos
// pequenas quanto reduz fotos de celular enormes) + converter pra escala de
// cinza com contraste normalizado melhorou a leitura nos 3 rótulos testados,
// sem precisar mudar nenhum parâmetro do Tesseract em si.
const PREPROCESS_TARGET_WIDTH = 2000

/** Redimensiona e normaliza contraste em escala de cinza antes do OCR. */
async function preprocessForOcr(file: File): Promise<Blob> {
  // `imageOrientation: 'from-image'` explícito (em vez de confiar no default
  // da engine) evita foto de rótulo saindo de lado por EXIF mal interpretado.
  // `resizeWidth` deixa o navegador decodificar já no tamanho final, em vez
  // de decodificar a foto inteira do celular (podendo ser 12+ megapixels)
  // pra só depois reduzir — mais leve de memória numa foto de câmera real.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
    resizeWidth: PREPROCESS_TARGET_WIDTH,
    resizeQuality: 'medium',
  })
  const { width, height } = bitmap

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não suportado neste navegador')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData
  const pixelCount = width * height
  const gray = new Uint8ClampedArray(pixelCount)

  let min = 255
  let max = 0
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4
    const value = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]
    gray[i] = value
    if (value < min) min = value
    if (value > max) max = value
  }

  const range = max - min || 1
  for (let i = 0; i < pixelCount; i++) {
    const normalized = ((gray[i] - min) / range) * 255
    const offset = i * 4
    data[offset] = normalized
    data[offset + 1] = normalized
    data[offset + 2] = normalized
  }

  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Falha ao gerar imagem processada para OCR'))
    }, 'image/png')
  })
}

/**
 * Lê o texto de uma foto de rótulo, 100% no navegador (Tesseract.js).
 * Importado dinamicamente para nunca entrar no bundle inicial.
 * Qualquer erro (rede, worker, timeout) propaga — quem decide o fallback
 * é quem chama esta função, não este módulo.
 */
export async function readLabelText(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js')

  const worker = await createWorker('por+eng', 1, {
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
    corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_VERSION}`,
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  })

  try {
    const preprocessed = await preprocessForOcr(file)
    const { data } = await worker.recognize(preprocessed)
    return data.text.trim()
  } finally {
    await worker.terminate()
  }
}
