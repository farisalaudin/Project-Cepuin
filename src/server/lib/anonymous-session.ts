import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ANONYMOUS_SESSION_COOKIE = 'cepuin_anon_session'
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

const getAnonymousSessionSecret = () => {
  const secret =
    process.env.ANONYMOUS_SESSION_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'cepuin-dev-anonymous-session-secret' : '')

  if (!secret) {
    throw new Error('ANONYMOUS_SESSION_SECRET belum dikonfigurasi.')
  }

  return secret
}

const signSessionId = (sessionId: string) =>
  createHmac('sha256', getAnonymousSessionSecret()).update(sessionId).digest('hex')

const packSignedSession = (sessionId: string) => `${sessionId}.${signSessionId(sessionId)}`

const unpackSignedSession = (rawValue: string | undefined) => {
  if (!rawValue) return null

  const [sessionId, signature] = rawValue.split('.', 2)
  if (!sessionId || !signature) return null

  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(signSessionId(sessionId))

  if (providedBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null
  }

  return sessionId
}

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ONE_YEAR_IN_SECONDS,
})

export const getAnonymousSessionIdFromCookie = async () => {
  const cookieStore = await cookies()
  return unpackSignedSession(cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value)
}

export const ensureAnonymousSessionId = async () => {
  const existingSessionId = await getAnonymousSessionIdFromCookie()
  if (existingSessionId) {
    return { sessionId: existingSessionId, isNew: false }
  }

  return { sessionId: crypto.randomUUID(), isNew: true }
}

export const attachAnonymousSessionCookie = (
  response: NextResponse,
  sessionId: string
) => {
  response.cookies.set(
    ANONYMOUS_SESSION_COOKIE,
    packSignedSession(sessionId),
    buildCookieOptions()
  )
}
