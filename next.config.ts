/** @type {import('next').NextConfig} */
const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) return null
    return new URL(url).hostname
  } catch {
    return null
  }
})()

const remotePatterns = [
  {
    protocol: 'https',
    hostname: '**.supabase.co',
    port: '',
    pathname: '/storage/v1/object/public/**',
  },
  {
    protocol: 'https',
    hostname: 'picsum.photos',
    port: '',
    pathname: '/**',
  },
]

if (supabaseHostname && supabaseHostname !== '**.supabase.co') {
  remotePatterns.push({
    protocol: 'https',
    hostname: supabaseHostname,
    port: '',
    pathname: '/storage/v1/object/public/**',
  })
}

const nextConfig = {
  images: {
    remotePatterns,
  },
}

export default nextConfig
