// ============================
// Anonymous Session Management
// ============================

const SESSION_KEY = 'cepuin_session_id'

/**
 * Get or create a persistent anonymous session ID.
 * Stored in localStorage so it persists across page reloads.
 * Used for anonymous voting (1 vote per session per report).
 */
export const getSessionId = (): string => {
  if (typeof window === 'undefined') {
    return '' // SSR fallback
  }

  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}
