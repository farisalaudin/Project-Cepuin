import { createSupabaseMiddlewareClient } from '@/lib/supabase/utils'
import { NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { supabase, res } = createSupabaseMiddlewareClient(request)
  // getUser() verifies the token with Supabase server, unlike getSession() which only reads the local cookie
  await supabase.auth.getUser()
  return res
}