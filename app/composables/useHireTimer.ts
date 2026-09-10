import { ref, computed, onUnmounted, watch, toValue } from 'vue'
import type { Ref, ComputedRef, MaybeRefOrGetter } from 'vue'
import { RentStatusEnum } from '~/models/enums/Rent.enum'

export interface IUseHireTimer {
  remainingSeconds: Ref<number>
  minutes: ComputedRef<number>
  seconds: ComputedRef<number>
  isExpired: Ref<boolean>
  isNotStarted: Ref<boolean>
  formattedTime: ComputedRef<string>
}

export function useHireTimer (session: MaybeRefOrGetter<{
  expiresAt?: string | null
  startedAt?: string | null
  durationMinutes?: number
  status?: RentStatusEnum | string
} | null | undefined>): IUseHireTimer {
  const remainingSeconds = ref<number>(0)
  const isExpired = ref<boolean>(false)
  const isNotStarted = ref<boolean>(false)
  let timerInterval: any = null

  function calculateTime (): void {
    const s = toValue(session)
    const val = s?.expiresAt
    if (!val) {
      const isFinished = s?.status === RentStatusEnum.COMPLETED
        || s?.status === RentStatusEnum.CANCELLED
        || s?.status === RentStatusEnum.REJECTED
        || s?.status === RentStatusEnum.EXPIRED

      if (isFinished) {
        remainingSeconds.value = 0
        isExpired.value = true
        isNotStarted.value = false
      } else {
        const durationSecs = s?.durationMinutes ? s.durationMinutes * 60 : 0
        remainingSeconds.value = durationSecs
        isExpired.value = false
        isNotStarted.value = true
      }
      return
    }

    isNotStarted.value = false
    const expiryTime = new Date(val).getTime()
    const now = Date.now()
    const diff = Math.max(0, Math.floor((expiryTime - now) / 1000))

    remainingSeconds.value = diff
    isExpired.value = diff <= 0
  }

  function startInterval (): void {
    stopInterval()
    calculateTime()

    if (isExpired.value || isNotStarted.value) {
      return
    }

    timerInterval = setInterval((): void => {
      calculateTime()
      if (isExpired.value) {
        stopInterval()
      }
    }, 1000)
  }

  function stopInterval (): void {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  watch(
    (): string | null => toValue(session)?.expiresAt ?? null, (): void => {
      startInterval()
    }, { immediate: true }
  )

  onUnmounted((): void => {
    stopInterval()
  })

  const minutes = computed((): number => {
    return Math.floor(remainingSeconds.value / 60)
  })

  const seconds = computed((): number => {
    return remainingSeconds.value % 60
  })

  const formattedTime = computed((): string => {
    const mm = String(minutes.value).padStart(2, '0')
    const ss = String(seconds.value).padStart(2, '0')
    return `${mm}:${ss}`
  })

  return {
    remainingSeconds,
    minutes,
    seconds,
    isExpired,
    isNotStarted,
    formattedTime
  }
}

export default useHireTimer
