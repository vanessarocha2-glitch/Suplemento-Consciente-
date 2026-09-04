// Versão pinada — os paths abaixo apontam pro CDN nessa mesma versão,
// evitando que o Next/Turbopack tente empacotar o worker/wasm do Tesseract.
// ATENÇÃO: precisa ficar em sincronia com a versão exata de "tesseract.js"
// em package.json — se uma atualizar sem a outra, o worker/core baixados
// do CDN ficam de uma versão diferente do wrapper JS instalado localmente.
const TESSERACT_VERSION = '7.0.0'

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
    const { data } = await worker.recognize(file)
    return data.text.trim()
  } finally {
    await worker.terminate()
  }
}
