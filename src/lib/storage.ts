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
  // Always save as jpg to match compressed output and bucket MIME policy.
  const fileName = `${reportId}/${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from('photos')
    .upload(fileName, file, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error(error.message || 'Gagal mengupload foto. Silakan coba lagi.')
  }

  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}
