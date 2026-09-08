<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-8">
    <div class="p-4 rounded-2xl bg-gradient-primary shadow-[0_10px_30px_rgba(120,120,255,0.3)]">
      <i class="pi pi-link text-3xl text-white" />
    </div>
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
        จับคู่เพื่อนใหม่
      </h1>
      <p class="text-sm text-surface-500 dark:text-surface-400 max-w-md">
        กดสุ่มเพื่อค้าหาคนแปลกหน้าทันทีเพื่อแชท, สร้างมิตรภาพใหม่ หรือกดข้ามเพื่อหาเพื่อนใหม่ที่น่าสนใจอื่นๆ
      </p>
    </div>
    <MatchingFilter
      v-model:payload="payload"
      class="w-full max-w-md" />
    <Button
      @click="handleMatch"
      size="large"
      icon="pi pi-bolt"
      label="เริ่มจับคู่ตอนนี้"
      pt:root:class="w-full max-w-xs bg-gradient-primary border-none rounded-xl py-3
        text-white font-semibold tracking-wide
        shadow-lg shadow-indigo-500/30
        hover:scale-105 active:scale-95 transition-all duration-200"
    />

    <div class="grid grid-cols-3 gap-4 w-full max-w-md">
      <Card pt:root:class="rounded-xl bg-white/60 dark:bg-surface-800/60 backdrop-blur shadow-sm">
        <template #content>
          <div class="flex flex-col items-center gap-1 py-2">
            <p class="text-lg font-bold text-green-500">{{ formattedOnlineCount }}</p>
            <p class="text-xs text-surface-500">ออนไลน์</p>
          </div>
        </template>
      </Card>
      <Card pt:root:class="rounded-xl bg-white/60 dark:bg-surface-800/60 backdrop-blur shadow-sm">
        <template #content>
          <div class="flex flex-col items-center gap-1 py-2">
            <p class="text-lg font-bold text-primary">{{ formattedTotalUsers }}</p>
            <p class="text-xs text-surface-500">ผู้ใช้ทั้งหมด</p>
          </div>
        </template>
      </Card>

      <Card pt:root:class="rounded-xl bg-white/60 dark:bg-surface-800/60 backdrop-blur shadow-sm">
        <template #content>
          <div class="flex flex-col items-center gap-1 py-2">
            <p class="text-lg font-bold text-indigo-500">{{ estimatedWaitTime }}</p>
            <p class="text-xs text-surface-500">เวลารอ</p>
          </div>
        </template>
      </Card>

    </div>

  </div>
</template>

<script lang="ts" setup>
import { useToast } from 'primevue/usetoast'
import MatchingFilter from '~/components/input/MatchingFilter.vue'
import { genderQueryEnum } from '~/models/enums/User.enum'
import type { IJoinTheRandomMatchQueuePayload } from '~/models/request/MatchReq.model'
import type { IMatchProvider } from '~/resource/provider/Match.provider'
import MatchProvider from '~/resource/provider/Match.provider'
import UserProvider from '~/resource/provider/User.provider'
import { useAuthStore } from '~/stores/Auth'
import { useUserStore } from '~/stores/User'
import type { TErrorResponse } from '~/models/response/Response.model'

interface IUserPresence {
  id?: number
  isOnline?: boolean
}

definePageMeta({ layout: "navbar" })

const { $handleLoading, $ws } = useNuxtApp()
const matchService: IMatchProvider = new MatchProvider()
const userService = new UserProvider()
const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

const payload = ref<IJoinTheRandomMatchQueuePayload>({
  gender: genderQueryEnum.ALL,
  minAge: 16,
  maxAge: 26
})

// --- Real-time online count (via WebSocket) ---
const safeUsers = computed<IUserPresence[]>((): IUserPresence[] => {
  return Array.isArray(userStore.users) ? userStore.users : []
})

const onlineCount = computed<number>((): number => {
  if (!safeUsers.value.length) return 0

  const currentUserId = authStore.user.id
  const onlineFromUsers = safeUsers.value.filter((user: IUserPresence): boolean => !!user?.isOnline).length
  const hasCurrentUserInList = currentUserId > 0
    && safeUsers.value.some((user: IUserPresence): boolean => user?.id === currentUserId)

  return hasCurrentUserInList ? onlineFromUsers : onlineFromUsers + (currentUserId > 0 ? 1 : 0)
})

const formattedOnlineCount = computed<string>((): string => {
  return new Intl.NumberFormat('en-US').format(onlineCount.value)
})

let socketMessageListener: ((event: MessageEvent) => void) | null = null
let syncTimer: ReturnType<typeof setInterval> | null = null

function requestUsersViaSocket (): void {
  const socket = typeof $ws === 'function' ? $ws() : null
  if (!socket || socket.readyState !== WebSocket.OPEN) return

  socket.send(JSON.stringify({
    event: 'users:paginate',
    data: {
      page: 1,
      limit: 200
    }
  }))
}

function handlePresenceEvent (e: Event): void {
  const detail = (e as CustomEvent<{ userId: number, isOnline: boolean }>).detail
  if (detail && typeof detail.userId === 'number') {
    userStore.updateUserPresence(detail.userId, detail.isOnline)
  }
}

function handleReconnected (): void {
  attachSocketMessageListener()
  requestUsersViaSocket()
}

function attachSocketMessageListener (): void {
  const socket = typeof $ws === 'function' ? $ws() : null
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  if (socketMessageListener) return

  socketMessageListener = (event: MessageEvent): void => {
    try {
      const payload = JSON.parse(event.data)

      if (payload?.event === 'user:presence') {
        const uid = typeof payload.data?.userId === 'number'
          ? payload.data.userId
          : Number(payload.data?.userId)
        const online = payload.data?.isOnline === true
        if (Number.isFinite(uid)) {
          userStore.updateUserPresence(uid, online)
        }
        return
      }

      const isUsersEvent = payload?.event === 'users:update'
        || payload?.event === 'users:list'
        || payload?.event === 'users:paginate:response'

      if (!isUsersEvent) return

      const data = payload.data
      const incoming = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
            ? data.users
            : []

      if (incoming.length > 0) {
        userStore.setUsers(incoming)
      }
    } catch {
      // Ignore non-JSON websocket payloads.
    }
  }

  socket.addEventListener('message', socketMessageListener)
}

function setupRealtimeOnlineCount (): void {
  attachSocketMessageListener()
  requestUsersViaSocket()

  if (typeof window !== 'undefined') {
    window.addEventListener('ws:user_presence', handlePresenceEvent)
    window.addEventListener('ws:reconnected', handleReconnected)
  }

  if (!syncTimer) {
    syncTimer = setInterval((): void => {
      attachSocketMessageListener()
      requestUsersViaSocket()
    }, 15000)
  }
}

function teardownRealtimeOnlineCount (): void {
  const socket = typeof $ws === 'function' ? $ws() : null
  if (socket && socketMessageListener) {
    socket.removeEventListener('message', socketMessageListener)
  }
  socketMessageListener = null

  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('ws:user_presence', handlePresenceEvent)
    window.removeEventListener('ws:reconnected', handleReconnected)
  }
}

// --- Total user count (via API) ---
const totalUsers = ref<number>(0)

const formattedTotalUsers = computed<string>((): string => {
  return new Intl.NumberFormat('en-US').format(totalUsers.value)
})

async function fetchTotalUsers (): Promise<void> {
  try {
    const response = await userService.findAllUsersPaginate({ page: 1, limit: 1 })
    totalUsers.value = response?.pagination?.total ?? 0
  } catch (err: TErrorResponse) {
    console.error('Failed to fetch total users:', err)
  }
}

// --- Estimated wait time (derived from online count) ---
const estimatedWaitTime = computed<string>((): string => {
  const online = onlineCount.value
  if (online >= 50) return '~30 วินาที'
  if (online >= 20) return '~1 นาที'
  if (online >= 10) return '~2 นาที'
  if (online >= 5) return '~3 นาที'
  if (online >= 1) return '~5 นาที'
  return 'ไม่ทราบ'
})

// --- Match action ---
async function onMatch (): Promise<void> {
  if (import.meta.client) {
    const { $wsConnect } = useNuxtApp() as any
    if (typeof $wsConnect === 'function') {
      $wsConnect()
    }
  }
  await matchService.JoinTheRandomMatchQueue(payload.value)
  router.push({ name: 'public-find-match-loading' })
}

function handleMatch (): void {
  $handleLoading(onMatch, {
    toast: {
      instance: toast
    }
  })
}

// --- Lifecycle ---
onMounted((): void => {
  setupRealtimeOnlineCount()
  fetchTotalUsers()
})

onBeforeUnmount((): void => {
  teardownRealtimeOnlineCount()
})
</script>

<style>

</style>