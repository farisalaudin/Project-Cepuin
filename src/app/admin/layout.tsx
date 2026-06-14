import { redirect } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: adminMembership, error: adminMembershipError } = user
    ? await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null, error: null }

  if (!user || adminMembershipError || !adminMembership) {
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
