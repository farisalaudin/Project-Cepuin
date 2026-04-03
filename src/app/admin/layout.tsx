import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const ADMIN_EMAILS = ['admin@cepuin.id', 'test@admin.com'] // Hardcoded for MVP

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sederhana: Cek apakah email ada di daftar admin
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/login?next=/admin')
  }

  return (
    <div className="min-h-screen bg-muted-light">
      <header className="bg-white border-b border-border px-8 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black">
              C
            </div>
            <div>
              <h1 className="text-sm font-black text-foreground uppercase tracking-wider">
                Admin Dashboard
              </h1>
              <p className="text-[10px] font-bold text-muted uppercase">
                Pemerintah Kota
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground">{user.email}</p>
              <p className="text-[10px] text-success font-bold uppercase">Petugas Aktif</p>
            </div>
            <button 
              className="px-4 py-2 bg-muted-light hover:bg-border rounded-xl text-xs font-bold text-muted transition-all"
              onClick={async () => {
                // Logout logic here (will need a client component or server action)
              }}
            >
              Keluar
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-8">
        {children}
      </main>
    </div>
  )
}
