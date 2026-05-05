import { supabase } from './supabase/client'

const sanitizeUsername = (raw: string) =>
  raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)

const fallbackUsernameFromEmail = (email: string | null | undefined) => {
  const base = sanitizeUsername((email ?? '').split('@')[0] ?? '')
  if (base.length >= 3) return base
  return `warga_${Math.random().toString(36).slice(2, 8)}`
}

export const ensureUserProfile = async (
  userId: string,
  email: string | null | undefined,
  preferredUsername?: string
) => {
  const username = sanitizeUsername(preferredUsername || '') || fallbackUsernameFromEmail(email)

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        email: email ?? null,
        username,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    throw error
  }
}

