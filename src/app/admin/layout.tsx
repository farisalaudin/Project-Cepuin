import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'

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
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sederhana: Cek apakah email ada di daftar admin
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/login?next=' + encodeURIComponent('/admin'))
  }

  return (
    <div className="min-h-screen bg-muted-light">
      <AdminHeader userEmail={user.email} />
      
      <main className="max-w-7xl mx-auto p-8">
        {children}
      </main>
    </div>
  )
}
