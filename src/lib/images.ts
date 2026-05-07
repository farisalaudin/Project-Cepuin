const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif'])
const COMMON_RASTER_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'avif',
  'jfif',
  'heic',
  'heif',
])

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.78

const getFileExtension = (fileName: string) => {
  const segments = fileName.split('.')
  return segments.length > 1 ? segments.at(-1)?.toLowerCase() ?? '' : ''
}

const isHeicLikeFile = (file: File) =>
  HEIC_MIME_TYPES.has(file.type.toLowerCase()) ||
  ['heic', 'heif'].includes(getFileExtension(file.name))

const isRasterImageFile = (file: File) =>
  file.type.startsWith('image/') || COMMON_RASTER_EXTENSIONS.has(getFileExtension(file.name))

const createObjectUrl = (file: Blob) => URL.createObjectURL(file)

const drawBitmapToJpegBlob = async (bitmap: ImageBitmap): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Browser tidak mendukung pemrosesan canvas untuk gambar ini.')
  }

  let width = bitmap.width
  let height = bitmap.height

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height / width) * MAX_DIMENSION)
      width = MAX_DIMENSION
    } else {
      width = Math.round((width / height) * MAX_DIMENSION)
      height = MAX_DIMENSION
    }
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  })

  if (!blob) {
    throw new Error('Gagal mengompres gambar.')
  }

  return blob
}

const loadImageElement = (objectUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () =>
      reject(new Error('Gagal memproses gambar. File mungkin rusak atau tidak didukung browser.'))
    image.src = objectUrl
  })

const getConvertedHeicBlob = async (file: File) => {
  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: JPEG_QUALITY,
  })

  return Array.isArray(result) ? result[0] : result
}

const drawImageToJpegBlob = async (sourceFile: File): Promise<Blob> => {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(sourceFile)
      try {
        return await drawBitmapToJpegBlob(bitmap)
      } finally {
        bitmap.close()
      }
    } catch {
      // Fallback ke HTMLImageElement untuk browser/file yang tidak cocok dengan createImageBitmap.
    }
  }

  const objectUrl = createObjectUrl(sourceFile)

  try {
    const image = await loadImageElement(objectUrl)
    const bitmap = await createImageBitmap(image)
    try {
      return await drawBitmapToJpegBlob(bitmap)
    } finally {
      bitmap.close()
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export interface PreparedImageAsset {
  file: File
  previewUrl: string
  mimeType: string
}

export const prepareImageForUpload = async (file: File): Promise<PreparedImageAsset> => {
  if (!isRasterImageFile(file)) {
    throw new Error('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau HEIC.')
  }

  let normalizedBlob: Blob

  if (isHeicLikeFile(file)) {
    normalizedBlob = await getConvertedHeicBlob(file)
  } else if (isRasterImageFile(file)) {
    normalizedBlob = await drawImageToJpegBlob(file)
  } else {
    throw new Error('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau HEIC.')
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'report-photo'
  const normalizedFile = new File([normalizedBlob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })

  return {
    file: normalizedFile,
    previewUrl: createObjectUrl(normalizedFile),
    mimeType: normalizedFile.type,
  }
}
