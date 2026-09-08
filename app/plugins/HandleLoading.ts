import type { Ref } from 'vue'
import { useLoadingStore } from '@/stores/Loading'
import type { TErrorResponse } from '@/models/response/Response.model'
import type { ToastMessageOptions } from 'primevue/toast'
import type { ToastServiceMethods } from 'primevue/toastservice'
import { forceRefreshToken } from '~/utils/authRefresh'

interface IHandleToastOptions {
  instance: ToastServiceMethods
  success?: ToastMessageOptions
  error?: ToastMessageOptions
}

interface HandleLoadingOptions {
  loadingUnit?: Ref<boolean>
  errorCallBack?: (error?: TErrorResponse) => unknown
  toast?: IHandleToastOptions
}

function handleToastService (toast?: IHandleToastOptions, type?: 'success' | 'error', error?: TErrorResponse): void {
  if (type === 'success') {
    toast?.instance?.add({
      severity: 'success',
      summary: 'สำเร็จ',
      life: 2000,
      detail: 'ดำเนินการสำเร็จ',
      ...toast?.success
    })
  } else {
    const detail = error?.response?.data?.message || error?.message || 'มีบางอย่างผิดพลาด'
    toast?.instance?.add({
      severity: 'error',
      summary: 'ผิดพลาด',
      life: 3000,
      ...toast?.error,
      detail
    })
  }
}

/**
  * Sets the loading state in the application.
  *
  * This function can update a local loading state or interact with a global store to manage the loading status.
  *
  * @param isLoading - A boolean indicating whether to set the loading state to true or false.
  * @param loadingUnit - An optional `Ref<boolean>` to control the local loading state. If not provided, global loading state is updated.
  *
  * @returns A current loading state
*/
function setIsLoading (isLoading: boolean, loadingUnit?: Ref<boolean>): boolean {
  if (loadingUnit) {
    return loadingUnit.value = isLoading
  }

  const loadingStore = useLoadingStore()
  return isLoading
    ? loadingStore.addLoading()
    : loadingStore.removeLoading()
}

function defaultErrorCallback (error?: TErrorResponse): void {
  console.error('Unhandled Loading Error:', error)
}

function isUnauthorizedError (error?: TErrorResponse): boolean {
  const code = error?.code ?? error?.statusCode ?? error?.status ?? error?.response?.status
  const msg = String(error?.message ?? error?.response?.data?.message ?? error ?? '').toLowerCase()

  const unauthorizedMsgs = [
    'unauthorized', 'invalid refresh token', 'token expired',
    'refresh token not found', 'authentication required'
  ]

  return code === 401 || unauthorizedMsgs.some((m: string): boolean => msg.includes(m))
}

function redirectToVerify (): void {
  const authStore = useAuthStore()
  authStore.logout()

  if (import.meta.client) {
    localStorage.removeItem('Auth')
  }

  const router = useRouter()
  router.replace({ name: 'auth-verify' })
}

async function authErrorCallback (error?: TErrorResponse): Promise<boolean> {
  if (!isUnauthorizedError(error)) return false

  const isRefreshSuccess = await forceRefreshToken()

  if (!isRefreshSuccess) {
    redirectToVerify()
  }

  return isRefreshSuccess
}

/**
  * Handles loading state and performs an async operation, with optional toast notifications and form validation.
  *
  * @param callBack - The async operation to execute (e.g., an API call).
  * @param options - (optional): An object containing optional settings for handling the operation:
  * - `loadingUnit` (optional): A `Ref<boolean>` for tracking the loading state.
  * - `errorCallBack` (optional): A callback to handle errors if the async operation fails.
  * @param args - (optional): Arguments for async function callback.
  *
  * @returns A promise that resolves when the async operation completes.
  *
  * @example
  * handleLoading(submitForm, {
  * loadingUnit: isLoadingRef,
  * errorCallBack: (error) => {
  * console.error('Submission failed', error);
  * }
  * }, formData.value);
*/
export async function handleLoading<T> (
  callBack: (...args: unknown[]) => Promise<T> | T,
  options: HandleLoadingOptions = {},
  ...args: unknown[]
): Promise<T | undefined> {
  const { loadingUnit, errorCallBack, toast } = options

  try {
    setIsLoading(true, loadingUnit)
    const result = await callBack(...args)
    handleToastService(toast, 'success')
    return result
  } catch (error: TErrorResponse) {
    const isRecoveredAuthError = await authErrorCallback(error)

    if (isRecoveredAuthError) {
      try {
        const retryResult = await callBack(...args)
        handleToastService(toast, 'success')
        return retryResult
      } catch (retryError: TErrorResponse) {
        defaultErrorCallback(retryError)

        if (isUnauthorizedError(retryError)) {
          redirectToVerify()
          return undefined
        }

        errorCallBack?.(retryError)
        handleToastService(toast, 'error', retryError)
        return undefined
      }
    }

    defaultErrorCallback(error)
    errorCallBack?.(error)
    handleToastService(toast, 'error', error)
    return undefined
  } finally {
    setIsLoading(false, loadingUnit)
  }
}

export default defineNuxtPlugin((_nuxtApp: any): {
  provide: {
    handleLoading: typeof handleLoading
  }
} => {
  return {
    provide: {
      handleLoading
    }
  }
})
