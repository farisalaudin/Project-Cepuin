import { createSupabaseMiddlewareClient } from '@/lib/supabase/utils'
import { NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { supabase, res } = createSupabaseMiddlewareClient(request)
  await supabase.auth.getSession()
  return res
}