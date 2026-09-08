import axios from 'axios'
import humps from 'humps'
import { useAuthStore } from '~/stores/Auth'

const REFRESH_BUFFER_MS = 2 * 60 * 1000
let refreshLock: Promise<boolean> | null = null

export function normalizeExpireAtMs (tokenExpiresIn: number, now: number): number | null {
  if (!Number.isFinite(tokenExpiresIn) || tokenExpiresIn <= 0) return null

  if (tokenExpiresIn > 1_000_000_000_000) {
    return tokenExpiresIn
  }

  if (tokenExpiresIn > 1_000_000_000) {
    return tokenExpiresIn * 1000
  }

  return now + tokenExpiresIn * 1000
}

export function shouldRefreshToken (): boolean {
  const authStore = useAuthStore()
  const now = Date.now()

  // Prefer absolute timestamp from server (fixes the always-5-min bug)
  if (authStore.userToken.tokenExpireAt) {
    return authStore.userToken.tokenExpireAt * 1000 - now <= REFRESH_BUFFER_MS
  }

  // Fallback to relative duration (legacy)
  const tokenExpiresIn = authStore.userToken.tokenExpiresIn
  if (!tokenExpiresIn || tokenExpiresIn <= 0) return false
  const expireAtMs = normalizeExpireAtMs(tokenExpiresIn, now)
  if (!expireAtMs) return false
  return expireAtMs - now <= REFRESH_BUFFER_MS
}

export async function resetToken (): Promise<boolean> {
  const authStore = useAuthStore()
  if (!authStore.userToken.refreshToken) return false

  const baseURL = import.meta.env.VITE_ENV_BASE_API?.toString() || 'http://localhost:3001'

  try {
    const rawResponse = await axios.post(`${baseURL}/auth/sessions/refresh`, {
      refreshToken: authStore.userToken.refreshToken
    })

    const response = humps.camelizeKeys(rawResponse.data) as any

    authStore.userToken.accessToken = response.accessToken
    authStore.userToken.refreshToken = response.refreshToken
    authStore.userToken.tokenExpiresIn = response.tokenExpiresIn
    authStore.userToken.tokenExpireAt = response.tokenExpireAt ?? null

    return true
  } catch (err: any) {
    console.error('[authRefresh] Error in resetToken:', err)
    return false
  }
}

export async function tryRefreshToken (options?: { showSpinner?: boolean }): Promise<boolean> {
  if (refreshLock) {
    return await refreshLock
  }

  if (!shouldRefreshToken()) return true

  const showSpinner = options?.showSpinner ?? false

  refreshLock = (async (): Promise<boolean> => {
    try {
      if (showSpinner) {
        const { $handleLoading } = useNuxtApp()
        const result = await $handleLoading(resetToken)
        return result === true
      } else {
        return await resetToken()
      }
    } catch {
      return false
    } finally {
      refreshLock = null
    }
  })()

  return await refreshLock
}

export async function forceRefreshToken (): Promise<boolean> {
  if (refreshLock) {
    return await refreshLock
  }

  refreshLock = (async (): Promise<boolean> => {
    try {
      return await resetToken()
    } catch {
      return false
    } finally {
      refreshLock = null
    }
  })()

  return await refreshLock
}

export function clearPersistedAuth (): void {
  if (import.meta.client) {
    localStorage.removeItem('Auth')
  }
}
