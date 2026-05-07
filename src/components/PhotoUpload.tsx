'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { prepareImageForUpload } from '@/lib/images'

interface PhotoUploadProps {
  onPhotoSelected: (file: File | null) => void
}

export default function PhotoUpload({ onPhotoSelected }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const lastPreviewUrlRef = useRef<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)
    try {
      const preparedAsset = await prepareImageForUpload(file)

      if (lastPreviewUrlRef.current) {
        URL.revokeObjectURL(lastPreviewUrlRef.current)
      }

      lastPreviewUrlRef.current = preparedAsset.previewUrl
      setPreview(preparedAsset.previewUrl)
      onPhotoSelected(preparedAsset.file)
    } catch (err) {
      console.error('Error processing image:', err)
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Gagal memproses gambar. Coba format lain seperti JPG atau PNG.'
      setError(message)
      setPreview(null)
      onPhotoSelected(null)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    } finally {
      setIsProcessing(false)
    }
  }

  const removePhoto = () => {
    if (lastPreviewUrlRef.current) {
      URL.revokeObjectURL(lastPreviewUrlRef.current)
      lastPreviewUrlRef.current = null
    }
    setPreview(null)
    setError(null)
    onPhotoSelected(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  useEffect(() => {
    return () => {
      if (lastPreviewUrlRef.current) {
        URL.revokeObjectURL(lastPreviewUrlRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-foreground">
        Lampirkan Foto (Opsional)
      </label>

      {preview ? (
        <div className="relative group w-full aspect-video rounded-2xl overflow-hidden border-2 border-primary shadow-lg">
          <Image
            src={preview}
            alt="Preview foto laporan"
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute top-3 right-3 p-2 bg-danger/90 text-white rounded-xl shadow-lg hover:bg-danger transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-3 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-xs font-medium text-primary-dark">
            Pratinjau Foto
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-border bg-white text-muted hover:border-primary-light hover:bg-muted-light transition-all duration-200 group active:scale-95"
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <Camera className="w-8 h-8 mb-2 group-hover:text-primary transition-colors" />
            )}
            <span className="text-xs font-medium">Ambil Foto</span>
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-border bg-white text-muted hover:border-primary-light hover:bg-muted-light transition-all duration-200 group active:scale-95"
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <ImageIcon className="w-8 h-8 mb-2 group-hover:text-primary transition-colors" />
            )}
            <span className="text-xs font-medium">Dari Galeri</span>
          </button>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraInputRef}
        onChange={handleFileChange}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={galleryInputRef}
        onChange={handleFileChange}
      />
      {error ? (
        <p className="text-[10px] font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-[10px] text-muted italic">
        * Foto akan dinormalisasi otomatis agar lebih kompatibel saat pratinjau dan upload.
      </p>
    </div>
  )
}