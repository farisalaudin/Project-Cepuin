import { createSupabaseAdminClient } from '@/lib/supabase/utils'

export const getSupabaseAdmin = () => createSupabaseAdminClient()