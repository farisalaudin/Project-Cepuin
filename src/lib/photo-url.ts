export const resolveSafePhotoUrl = (photoUrl?: string | null) => {
  const trimmedUrl = photoUrl?.trim()
  if (!trimmedUrl) return null

  try {
    const parsed = new URL(trimmedUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

    const host = parsed.hostname.toLowerCase()
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.toLowerCase()
      : null

    if (supabaseHost && host === supabaseHost) return trimmedUrl
    if (host.endsWith('.supabase.co')) return trimmedUrl

    return null
  } catch {
    return null
  }
}
