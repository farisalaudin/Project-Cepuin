'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Info,
  ChevronRight,
  ThumbsUp
} from 'lucide-react'
import { Report, ReportCategory } from '@/types'
import { createReport, findNearbyDuplicates, deleteReport } from '@/lib/reports'
import { uploadReportPhoto } from '@/lib/storage'
import { calculateUrgencyScore } from '@/lib/urgency'
import { submitVote } from '@/lib/votes'
import { supabase } from '@/lib/supabase/client'
import CategorySelect from './CategorySelect'
import PhotoUpload from './PhotoUpload'
import LocationDetect from './LocationDetect'
import { cn } from '@/lib/cn'

export default function ReportForm() {
  const router = useRouter()
  const [category, setCategory] = useState<ReportCategory | ''>('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<string>('')
  const [isSuccess, setIsSuccess] = useState(false)
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

  const handleLocationFound = async (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address })
    if (category) {
      const dups = await findNearbyDuplicates(lat, lng, category as ReportCategory)
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
      alert((err as Error).message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !location) return

    setIsSubmitting(true)
    setSubmissionStatus('Menghubungkan ke sistem...')
    let newReport: Report | null = null

    try {
      // 0. Get user session if exists
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Create initial report (to get ID)
      setSubmissionStatus('Menyimpan data laporan...')
      const now = new Date().toISOString()
      const initialUrgency = calculateUrgencyScore(0, category as ReportCategory, now)

      newReport = await createReport({
        category: category as ReportCategory,
        description,
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        status: 'dilaporkan',
        urgency_score: initialUrgency,
        vote_count: 0,
        user_id: user?.id || null, // Link to user if logged in
      })

      // 2. Upload photo if exists
      if (photo && newReport.id) {
        try {
          setSubmissionStatus('Mengompres foto...')
          // Delay sedikit agar user bisa baca statusnya (opsional untuk UX)
          await new Promise(r => setTimeout(r, 500))
          
          setSubmissionStatus('Mengunggah foto ke server...')
          const photoUrl = await uploadReportPhoto(photo, newReport.id)
          
          setSubmissionStatus('Menyelesaikan laporan...')
          // Update report with photo URL
          const { error: updateError } = await supabase
            .from('reports')
            .update({ photo_url: photoUrl })
            .eq('id', newReport.id)

          if (updateError) throw updateError
        } catch (photoErr) {
          // If photo upload/update fails, delete the report so user can retry properly
          if (newReport.id) {
            await deleteReport(newReport.id)
          }
          throw photoErr
        }
      }

      setSubmissionStatus('Selesai!')
      setReportId(newReport.id)
      setIsSuccess(true)
    } catch (err) {
      console.error('Submission error:', err)
      const message = (err as Error).message || 'Terjadi kesalahan sistem.'
      alert(`Gagal mengirim laporan: ${message}`)
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
      {/* Category Selection */}
      <CategorySelect value={category} onChange={handleCategoryChange} />

      {/* Duplicate Alert */}
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

      {/* Location Detection */}
      <LocationDetect onLocationFound={handleLocationFound} />

      {/* Photo Upload */}
      <PhotoUpload onPhotoSelected={setPhoto} />

      {/* Description */}
      <div className="space-y-3">
        <label className="text-[10px] font-black text-muted/60 uppercase tracking-widest ml-2">
          Detail Masalah (Opsional)
        </label>
        <div className="relative group">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 280))}
            placeholder="Contoh: Lubang di tengah jalan, membahayakan pengendara motor..."
            rows={3}
            className="w-full p-5 rounded-[28px] border-2 border-border/50 focus:border-primary focus:outline-none transition-all duration-300 text-sm resize-none bg-white/50 backdrop-blur-sm shadow-sm group-hover:border-primary/30"
          />
          <div className="absolute bottom-4 right-4 text-[10px] font-black text-muted/40 uppercase tracking-widest">
            {description.length}/280
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="space-y-3">
        {isSubmitting && (
          <div className="w-full bg-muted-light rounded-full h-1.5 overflow-hidden">
            <div 
              className={cn(
                "h-full bg-primary transition-all duration-500",
                submissionStatus.includes('Menghubungkan') ? "w-[10%]" :
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
          disabled={!category || !location || isSubmitting}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2",
            (!category || !location || isSubmitting)
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

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-2 text-center">
        <div className="mt-0.5">
          <Info className="w-3 h-3 text-muted" />
        </div>
        <p className="text-[10px] text-muted leading-relaxed">
          Dengan melapor, Anda menyetujui bahwa data lokasi dan foto bersifat publik untuk kepentingan transparansi.
        </p>
      </div>
    </form>
  )
}