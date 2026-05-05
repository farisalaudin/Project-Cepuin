'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

interface AdminHeaderProps {
  userEmail: string | undefined
}

export default function AdminHeader({ userEmail }: AdminHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-border px-8 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-primary/20">
            C
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground uppercase tracking-wider">
              Admin Dashboard
            </h1>
            <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest">
              Pemerintah Kota
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-foreground">{userEmail}</p>
            <p className="text-[10px] text-success font-bold uppercase tracking-widest">Petugas Aktif</p>
          </div>
          <button 
            className="px-4 py-2 bg-muted-light/50 hover:bg-border rounded-xl text-xs font-bold text-muted transition-all active:scale-95"
            onClick={handleLogout}
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  )
}
