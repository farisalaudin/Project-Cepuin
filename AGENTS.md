'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Report {
  id: string
  category: string
  description: string
  photo_url: string | null
  address: string
  status: string
  vote_count: number
  urgency_score: number
  created_at: string
}

export default function AdminPage() {
  const supabase = createClientComponentClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('id, category, description, photo_url, address, status, vote_count, urgency_score, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
    } else {
      setReports(data || [])
    }
    setLoading(false)
  }

  const getPhotoUrl = (photoPath: string | null) => {
    if (!photoPath) return null
    
    const { data } = supabase.storage
      .from('reports')
      .getPublicUrl(photoPath)
    
    return data.publicUrl
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard Admin</h1>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-3 text-left">Foto</th>
              <th className="border p-3 text-left">Kategori</th>
              <th className="border p-3 text-left">Lokasi</th>
              <th className="border p-3 text-left">Status</th>
              <th className="border p-3 text-left">Vote</th>
              <th className="border p-3 text-left">Urgensi</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-100">
                <td className="border p-3">
                  {report.photo_url ? (
                    <div className="relative w-20 h-20">
                      <Image
                        src={getPhotoUrl(report.photo_url) || ''}
                        alt={report.category}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Tidak ada foto</span>
                  )}
                </td>
                <td className="border p-3">{report.category}</td>
                <td className="border p-3 text-sm">{report.address}</td>
                <td className="border p-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {report.status}
                  </span>
                </td>
                <td className="border p-3 text-center">{report.vote_count}</td>
                <td className="border p-3 text-center">{report.urgency_score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}