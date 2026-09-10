import { ref, computed, onMounted, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import RentCustomerProvider from '~/resource/provider/RentCustomer.provider'
import { RentStatusEnum } from '~/models/enums/Rent.enum'
import { useRentChatStore } from '~/stores/RentChat'

export interface IUseSessionTimer {
  remainingSeconds: Ref<number>
  completingSeconds: Ref<number>
  isExpired: Ref<boolean>
  isNotStarted: Ref<boolean>
  isWarning: ComputedRef<boolean>
  hasError: Ref<boolean>
  syncWithServer: () => Promise<void>
}

interface ActiveTimer {
  remainingSeconds: Ref<number>
  completingSeconds: Ref<number>
  isExpired: Ref<boolean>
  isNotStarted: Ref<boolean>
  hasError: Ref<boolean>
  timerInterval: any
  socketSyncInterval: any
  currentSocket: WebSocket | null
  wsListener: ((event: MessageEvent) => void) | null
  refCount: number
}

export function useSessionTimer (sessionId: number): IUseSessionTimer {
  const rentProvider = new RentCustomerProvider()
  const { $ws } = useNuxtApp()
  const nuxtApp = useNuxtApp()

  // Ensure the global timers map exists on the Nuxt app instance to avoid cross-request leakage
  if (!(nuxtApp as any)._sessionTimers) {
    ;(nuxtApp as any)._sessionTimers = new Map<number, ActiveTimer>()
  }
  const timersMap = (nuxtApp as any)._sessionTimers as Map<number, ActiveTimer>

  let timerState: ActiveTimer

  if (timersMap.has(sessionId)) {
    timerState = timersMap.get(sessionId)!
    timerState.refCount++
  } else {
    const remainingSeconds = useState<number>(`session-timer-remaining-${sessionId}`, (): number => 0)
    const completingSeconds = useState<number>(`session-timer-completing-${sessionId}`, (): number => 0)
    const isExpired = useState<boolean>(`session-timer-expired-${sessionId}`, (): boolean => false)
    const isNotStarted = useState<boolean>(`session-timer-not-started-${sessionId}`, (): boolean => false)
    const hasError = ref<boolean>(false)

    timerState = {
      remainingSeconds,
      completingSeconds,
      isExpired,
      isNotStarted,
      hasError,
      timerInterval: null,
      socketSyncInterval: null,
      currentSocket: null,
      wsListener: null,
      refCount: 1
    }
    timersMap.set(sessionId, timerState)
  }

  async function syncWithServer (): Promise<void> {
    try {
      const response = await rentProvider.findRealtimeSessionMessages(sessionId)
      if (response?.data) {
        const rentChatStore = useRentChatStore()
        const sessionData = response.data
        const expiresAt = sessionData.sessionExpiresAt
        const remainingSec = sessionData.sessionRemainingSeconds ?? 0
        const completingSec = sessionData.completingRemainingSeconds ?? 0

        timerState.completingSeconds.value = completingSec

        const sessionItem = rentChatStore.item?.id === sessionId ? rentChatStore.item : null
        const hasStarted = !!expiresAt || !!sessionItem?.startedAt || !!sessionItem?.expiresAt
        const isFinished = sessionItem?.status === RentStatusEnum.COMPLETED
          || sessionItem?.status === RentStatusEnum.CANCELLED
          || sessionItem?.status === RentStatusEnum.REJECTED
          || sessionItem?.status === RentStatusEnum.EXPIRED

        if (!hasStarted && !isFinished) {
          const defaultDurationSec = (sessionItem?.durationMinutes ?? 0) * 60
          timerState.remainingSeconds.value = remainingSec > 0 ? remainingSec : defaultDurationSec
          timerState.isNotStarted.value = true
          timerState.isExpired.value = false
        } else {
          timerState.isNotStarted.value = false
          timerState.remainingSeconds.value = remainingSec
          timerState.isExpired.value = remainingSec <= 0
        }
        timerState.hasError.value = false
      } else {
        timerState.hasError.value = true
      }
    } catch (error: any) {
      timerState.hasError.value = true
      console.error('Failed to sync session timer with server:', error)
    }
  }

  function startCountdown (): void {
    stopCountdown()
    if (timerState.isNotStarted.value) {
      return
    }
    timerState.timerInterval = setInterval((): void => {
      if (timerState.remainingSeconds.value > 0) {
        timerState.remainingSeconds.value--
        if (timerState.remainingSeconds.value <= 0) {
          timerState.isExpired.value = true
        }
      } else {
        timerState.isExpired.value = true
      }

      if (timerState.completingSeconds.value > 0) {
        timerState.completingSeconds.value--
      }
    }, 1000)
  }

  function stopCountdown (): void {
    if (timerState.timerInterval) {
      clearInterval(timerState.timerInterval)
      timerState.timerInterval = null
    }
  }

  function removeSocketListener (): void {
    if (timerState.currentSocket && timerState.wsListener) {
      timerState.currentSocket.removeEventListener('message', timerState.wsListener)
    }
    timerState.currentSocket = null
    timerState.wsListener = null
  }

  function setupSocketListener (): void {
    const socket = $ws() as WebSocket | null
    if (!socket) {
      removeSocketListener()
      return
    }

    if (timerState.currentSocket === socket && timerState.wsListener) return

    removeSocketListener()

    const onMessage = (event: MessageEvent): void => {
      let payload: any
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      if (!payload || typeof payload.event !== 'string') return

      const data = payload.data
      const getSessionId = (d: any): number | null => {
        if (!d) return null
        if (typeof d === 'number') return d
        if (typeof d === 'string') return Number(d)
        const val = d.sessionId || d.session_id || d.hireSessionId || d.hire_session_id || d.id
        return val ? Number(val) : null
      }

      const incomingId = getSessionId(data) || getSessionId(payload)
      if (incomingId !== sessionId) return

      switch (payload.event) {
        case 'session_timer_sync': {
          if (data) {
            if (typeof data.sessionRemainingSeconds === 'number') {
              timerState.remainingSeconds.value = data.sessionRemainingSeconds
            }
            if (data.sessionExpiresAt) {
              timerState.isNotStarted.value = false
              timerState.isExpired.value = timerState.remainingSeconds.value <= 0
            }
          }
          break
        }
        case 'session_started': {
          if (data) {
            timerState.isNotStarted.value = false
            if (typeof data.sessionRemainingSeconds === 'number') {
              timerState.remainingSeconds.value = data.sessionRemainingSeconds
            } else if (data.expiresAt) {
              const expiryTime = new Date(data.expiresAt).getTime()
              timerState.remainingSeconds.value = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000))
            }
            timerState.isExpired.value = timerState.remainingSeconds.value <= 0
            startCountdown()
          }
          break
        }
        case 'session_expired': {
          timerState.remainingSeconds.value = 0
          timerState.isExpired.value = true
          stopCountdown()
          break
        }
        case 'session_expiry_status': {
          if (data) {
            if (data.expired) {
              timerState.remainingSeconds.value = 0
              timerState.isExpired.value = true
              stopCountdown()
            }
          }
          break
        }
        default: {
          break
        }
      }
    }

    socket.addEventListener('message', onMessage)
    timerState.currentSocket = socket
    timerState.wsListener = onMessage
  }

  function startSocketSync (intervalMs: number = 1000): void {
    stopSocketSync()
    setupSocketListener()
    timerState.socketSyncInterval = setInterval((): void => {
      setupSocketListener()
    }, intervalMs)
  }

  function stopSocketSync (): void {
    if (timerState.socketSyncInterval) {
      clearInterval(timerState.socketSyncInterval)
      timerState.socketSyncInterval = null
    }
  }

  onMounted(async (): Promise<void> => {
    if (!timerState.timerInterval) {
      await syncWithServer()
      startCountdown()
      startSocketSync()
    }
  })

  onBeforeUnmount((): void => {
    timerState.refCount--
    if (timerState.refCount <= 0) {
      stopCountdown()
      stopSocketSync()
      removeSocketListener()
      timersMap.delete(sessionId)
    }
  })

  const isWarning = computed((): boolean => timerState.remainingSeconds.value < 60 && timerState.remainingSeconds.value > 0)

  return {
    remainingSeconds: timerState.remainingSeconds,
    completingSeconds: timerState.completingSeconds,
    isExpired: timerState.isExpired,
    isNotStarted: timerState.isNotStarted,
    isWarning,
    hasError: timerState.hasError,
    syncWithServer
  }
}

export default useSessionTimer
