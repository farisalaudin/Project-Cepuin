'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
  ChevronRight,
  ThumbsUp,
  AlertCircle
} from 'lucide-react'
import { DetectedLocation, Report, ReportCategory } from '@/types'
import { createReport, findNearbyDuplicates } from '@/lib/reports'
import { uploadReportPhoto } from '@/lib/storage'
import { submitVote } from '@/lib/votes'
import { getReporterGPS } from '@/lib/getReporterGPS'
import CategorySelect from './CategorySelect'
import PhotoUpload from './PhotoUpload'
import LocationDetect from './LocationDetect'
import { cn } from '@/lib/cn'
import { useToast } from '@/components/ui/Toast'

export default function ReportForm() {
  const MAX_DESCRIPTION_LENGTH = 280
  const router = useRouter()
  const toast = useToast()

  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ReportCategory | ''>('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [location, setLocation] = useState<DetectedLocation | null>(null)
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [rating] = useState<number>(0)
  const [feedbackComment] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<string>('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [photoWarning, setPhotoWarning] = useState<string>('')
  const [duplicates, setDuplicates] = useState<Report[]>([])
  const [reportId, setReportId] = useState<string>('')
  const [votedIds, setVotedIds] = useState<string[]>([])

  const handleCategoryChange = async (cat: ReportCategory) => {
    setCategory(cat)
    if (location) {
      const dups = await findNearbyDuplicates(location.lat, location.lng, cat)
      setDuplicates(dups)
    }
  }

  const handleLocationFound = async (detectedLocation: DetectedLocation) => {
    setLocation(detectedLocation)
    if (category) {
      const dups = await findNearbyDuplicates(
        detectedLocation.lat,
        detectedLocation.lng,
        category as ReportCategory
      )
      setDuplicates(dups)
    }
  }

  const handleQuickVote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (votedIds.includes(id)) return
    
    try {
      await submitVote(id)
      setVotedIds([...votedIds, id])
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !location || !disclaimerAgreed) return

    setIsSubmitting(true)
    setSubmissionStatus('Mendeteksi metadata perangkat...')
    setPhotoWarning('')
    let newReport: Report | null = null

    try {
      // 1. Silently get reporter's actual GPS for audit/risk calculation
      const reporterGps = await getReporterGPS()
      
      // Prepare upload path and optional photo URL first.
      setSubmissionStatus('Menyimpan data laporan...')
      const uploadFolderId = crypto.randomUUID()
      let photoUrl: string | null = null

      if (photo) {
        try {
          setSubmissionStatus('Mengompres foto...')
          await new Promise(r => setTimeout(r, 500))

          setSubmissionStatus('Mengunggah foto ke server...')
          photoUrl = await uploadReportPhoto(photo, uploadFolderId)
        } catch (photoErr) {
          console.error('Photo upload warning:', photoErr)
          setPhotoWarning('Foto gagal diunggah. Laporan tetap akan dikirim tanpa foto.')
          setSubmissionStatus('Menyimpan laporan tanpa foto...')
        }
      }

      // Create the report through the secured RPC so users cannot spoof internal fields.
      newReport = await createReport({
        category: category as ReportCategory,
        description,
        rating: rating || null,
        feedback_comment: feedbackComment,
        photo_url: photoUrl,
        
        // Pin location -> incident location
        lat: location.lat,
        lng: location.lng,
        gps_accuracy: location.accuracy,
        address: location.displayName,
        kelurahan: location.kelurahan,
        kecamatan: location.kecamatan,
        kabupaten: location.kabupaten,
        provinsi: location.provinsi,
        wilayah_id: location.wilayahId,

        // Reporter GPS -> audit metadata
        reporter_lat: reporterGps?.lat ?? null,
        reporter_lon: reporterGps?.lon ?? null,
        reporter_accuracy: reporterGps?.accuracy ?? null,
        reporter_gps_timestamp: reporterGps?.timestamp ?? null,

        // Disclaimer
        disclaimer_agreed: disclaimerAgreed,
        disclaimer_agreed_at: new Date().toISOString()
      })

      setSubmissionStatus('Selesai!')
      setReportId(newReport.id)
      setIsSuccess(true)
    } catch (err) {
      console.error('Submission error:', err)
      const typedError = err as Error & { code?: string; details?: unknown }
      if (typedError.code === 'DUPLICATE_REPORT' && Array.isArray(typedError.details)) {
        setDuplicates(typedError.details as Report[])
      }
      const message = typedError.message || 'Terjadi kesalahan sistem.'
      toast(`Gagal mengirim: ${message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mb-6 shadow-lg shadow-success/20">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Laporan Berhasil Dikirim!
        </h1>
        <p className="text-sm text-muted mb-8 max-w-xs leading-relaxed">
          Terima kasih telah berkontribusi menjaga kota kita. Laporan #{reportId.slice(0, 8)} sudah masuk sistem.
        </p>
        {photoWarning && (
          <div className="mb-6 w-full rounded-2xl border border-accent/30 bg-accent-light/40 p-4 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-accent-dark" />
              <p className="text-xs font-semibold text-accent-dark">{photoWarning}</p>
            </div>
          </div>
        )}

        <div className="w-full space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-2xl hover:bg-primary-dark transition-all duration-300 shadow-lg active:scale-95"
          >
            Lihat Laporan Lain
          </button>
          <button
            onClick={() => router.push('/riwayat')}
            className="w-full py-3.5 bg-white border-2 border-border text-foreground font-semibold rounded-2xl hover:bg-muted-light transition-all duration-200 active:scale-95"
          >
            Pantau Riwayat & Status
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-10">
      
      {/* Description */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">
          Deskripsi Masalah <span className="text-muted text-xs font-normal">(Opsional)</span>
        </label>
        <div className="relative group">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
            placeholder="Contoh: Lubang di tengah jalan sedalam 10cm, sangat membahayakan pengendara motor di malam hari..."
            rows={3}
            className="w-full p-5 rounded-[28px] border-2 border-border/50 focus:border-primary focus:outline-none transition-all duration-300 text-sm resize-none bg-white/50 backdrop-blur-sm shadow-sm group-hover:border-primary/30"
          />
          <div className="absolute bottom-4 right-4 text-[10px] font-black text-muted/40 uppercase tracking-widest">
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <CategorySelect value={category} onChange={handleCategoryChange} />

      {/* Photo Upload */}
      <PhotoUpload onPhotoSelected={setPhoto} />

      {/* Location Detection (Pin Picker) */}
      <LocationDetect onLocationFound={handleLocationFound} />

      {/* Duplicate Alert (Moved below Location so it appears after they pick location & category) */}
      {duplicates.length > 0 && (
        <div className="p-4 bg-accent-light border-2 border-accent rounded-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <AlertTriangle className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Masalah ini sudah dilaporkan!
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Ada {duplicates.length} laporan serupa di lokasi yang sama. Ingin dukung laporan yang sudah ada?
              </p>
              <div className="mt-3 space-y-2">
                {duplicates.slice(0, 2).map((dup) => (
                  <div 
                    key={dup.id}
                    className="flex flex-col gap-2 p-3 bg-white/80 rounded-xl border border-accent/20 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/laporan/${dup.id}`)}
                      className="flex items-center justify-between w-full text-left group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                          {dup.address || 'Lokasi Terdeteksi'}
                        </span>
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> {dup.vote_count + (votedIds.includes(dup.id) ? 1 : 0)} votes
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-accent transition-transform group-hover:translate-x-1" />
                    </button>
                    
                    <button
                      type="button"
                      disabled={votedIds.includes(dup.id)}
                      onClick={(e) => handleQuickVote(e, dup.id)}
                      className={cn(
                        "w-full py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
                        votedIds.includes(dup.id)
                          ? "bg-success-light text-success"
                          : "bg-accent text-white hover:bg-accent-dark shadow-sm"
                      )}
                    >
                      {votedIds.includes(dup.id) ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Sudah Didukung
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="w-3 h-3" />
                          Ini Juga Saya Alami!
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer (Mandatory) */}
      <div className="pt-4 border-t border-border">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              type="checkbox"
              checked={disclaimerAgreed}
              onChange={(e) => setDisclaimerAgreed(e.target.checked)}
              className="peer sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
              disclaimerAgreed 
                ? "bg-primary border-primary" 
                : "border-muted group-hover:border-primary"
            )}>
              {disclaimerAgreed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
          <p className="text-[11px] text-muted leading-relaxed flex-1 select-none">
            &quot;Saya menyatakan bahwa lokasi yang saya pilih merupakan lokasi kejadian 
            yang sebenarnya. Penyampaian laporan palsu, manipulasi lokasi, atau 
            informasi yang tidak sesuai dapat mengakibatkan pembatasan atau 
            penangguhan akun.&quot;
          </p>
        </label>
      </div>

      {/* Submit Button */}
      <div className="space-y-3 pt-2">
        {isSubmitting && (
          <div className="w-full bg-muted-light rounded-full h-1.5 overflow-hidden">
            <div 
              className={cn(
                "h-full bg-primary transition-all duration-500",
                submissionStatus.includes('Mendeteksi') ? "w-[10%]" :
                submissionStatus.includes('Menyimpan') ? "w-[30%]" :
                submissionStatus.includes('Mengompres') ? "w-[50%]" :
                submissionStatus.includes('Mengunggah') ? "w-[80%]" :
                submissionStatus.includes('Selesai') ? "w-full" : "w-[90%]"
              )} 
            />
          </div>
        )}
        
        <button
          type="submit"
          disabled={!category || !location || !disclaimerAgreed || isSubmitting}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2",
            (!category || !location || !disclaimerAgreed || isSubmitting)
              ? "bg-muted cursor-not-allowed grayscale"
              : duplicates.length > 0 
                ? "bg-muted-dark hover:bg-foreground active:scale-95 shadow-muted/20"
                : "bg-primary hover:bg-primary-dark active:scale-95 shadow-primary/20"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {submissionStatus || "Mengirim Laporan..."}
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5" />
              {duplicates.length > 0 ? "Tetap Laporkan (Masalah Berbeda)" : "Laporkan Sekarang"}
            </>
          )}
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-start gap-2 px-2 text-center">
        <div className="mt-0.5">
          <Info className="w-3 h-3 text-muted" />
        </div>
        <p className="text-[10px] text-muted leading-relaxed">
          Sebagai langkah anti-spam, sistem akan mencatat metadata GPS perangkat Anda secara transparan saat Anda menekan tombol kirim. Data GPS perangkat hanya digunakan untuk keperluan audit internal dan tidak dipublikasikan.
        </p>
      </div>
    </form>
  )
}
