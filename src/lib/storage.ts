// ============================
// Supabase Storage Utilities
// ============================

import { supabase } from './supabase/client'

/**
 * Upload a report photo to Supabase storage.
 * @param file - File object to upload
 * @param reportId - ID of the report for the folder structure
 * @returns Public URL of the uploaded photo
 */
export const uploadReportPhoto = async (file: File, reportId: string) => {
  // Compress before upload (target < 800KB)
  const compressedFile = await compressImage(file)

  const extension = file.name.split('.').pop() || 'jpg'
  const fileName = `${reportId}/${Date.now()}.${extension}`

  const { error } = await supabase.storage
    .from('photos')
    .upload(fileName, compressedFile)

  if (error) {
    console.error('Upload error:', error)
    throw new Error('Gagal mengupload foto. Silakan coba lagi.')
  }

  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

/**
 * Simple client-side image compression using Canvas API.
 * Resizes image to max 1200px and reduces quality to 0.75.
 */
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    img.onerror = () => {
      reject(new Error('Gagal memproses gambar. File mungkin rusak atau tidak didukung.'))
    }

    img.onload = () => {
      let { width, height } = img
      const maxDim = 1200

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim
          width = maxDim
        } else {
          width = (width / height) * maxDim
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengompres gambar.'))
            return
          }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.75
      )
    }

    img.src = URL.createObjectURL(file)
  })
}
