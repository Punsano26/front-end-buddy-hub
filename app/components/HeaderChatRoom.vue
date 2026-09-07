<template>
  <header
    class="relative w-full shrink-0 border-b border-slate-200/80 bg-white/90 dark:bg-slate-900/90 dark:border-slate-800/80 backdrop-blur-md transition-colors duration-200">
    <div class="absolute inset-x-0 bottom-0 h-px bg-gradient-primary opacity-60" />

    <div
      class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
      <!-- Left -->
      <div class="flex items-center gap-4 min-w-0">
        <ButtonBack
          :to="{ name: 'public-chat' }"
          class="h-10 w-10 shrink-0 rounded-xl text-slate-600 dark:text-slate-300 transition active:scale-95"
          icon="mdi:arrow-left" />

        <NuxtLink
          :to="{ name: 'public-profile-id', params: { id: user?.id } }"
          class="relative shrink-0">

          <img
            :src="user?.profileImg ? imageBaseUrl + user.profileImg : '/png/upload-profile.png'"
            alt="profile"
            class="h-11 w-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm">

          <span
            v-if="user?.isOnline"
            class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500" />

        </NuxtLink>

        <div class="min-w-0">
          <h2
            class="truncate font-semibold text-[15px] text-slate-800 dark:text-slate-100">
            {{ user?.nickname || user?.username }}
          </h2>

          <div
            v-if="user?.isOnline"
            class="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-green-500">
            <span class="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Online
          </div>

          <div
            v-else
            class="mt-0.5 truncate text-xs text-slate-500">
            ใช้งานเมื่อ {{ dayjs(user?.lastOnlineAt).fromNow() }}
          </div>
        </div>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="user?.isOnline
            && !user?.isBanned
            && currentCallStatus !== CallStatusEnum.ACCEPTED
            && currentCallStatus !== CallStatusEnum.RINGING"
          class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          type="button"
          @click="clickCall">
          <i class="pi pi-phone text-lg" />
        </button>

        <div
          v-if="currentCallStatus === CallStatusEnum.ACCEPTED
            || currentCallStatus === CallStatusEnum.RINGING"
          class="flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-600 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
          <i class="pi pi-phone" />

          <span>
            {{
              currentCallStatus === CallStatusEnum.RINGING
                ? 'กำลังต่อสาย...'
                : 'อยู่ระหว่างการโทร'
            }}
          </span>
        </div>

        <DotMenu
          :items="labelMenu"
          class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" />
      </div>
    </div>

    <ReportModalDialog
      v-model:visible="isReportDialogVisible"
      :reported-user-id="id" />
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import 'dayjs/locale/th'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { IItems } from '~/models/Global.model'
import type { IFindOneCurrentUserData } from '~/models/response/UserRes.model'
import type { IUserProvider } from '~/resource/provider/User.provider'
import UserProvider from '~/resource/provider/User.provider'
import { useCallStore } from '~/stores/Call'
import { CallStatusEnum } from '~/models/enums/Call.enum'

dayjs.extend(relativeTime)
dayjs.locale('th')

// ─── Composables & Providers ───────────────────────────────────────────────────
const router = useRouter()
const { $handleLoading } = useNuxtApp()
const userService: IUserProvider = new UserProvider()
const callStore = useCallStore()

// ─── State Refs ────────────────────────────────────────────────────────────────
const items = ref<IFindOneCurrentUserData[]>([])
const id = computed((): number => Number(useRoute().params.id))
const user = computed((): IFindOneCurrentUserData | undefined => items.value[0])
const imageBaseUrl = import.meta.env.VITE_ENV_BASE_FILE_URL + '/'
const currentCallStatus = computed((): CallStatusEnum | null => callStore.callStatus)

// UI state
const isReportDialogVisible = ref(false)
const labelMenu = computed((): IItems[] => {
  return [
    {
      label: 'รายงานผู้ใช้',
      icon: 'pi pi-flag',
      command: (): void => {
        isReportDialogVisible.value = true
      }
    }
  ]
})

const handlePresence = (e: Event): void => {
  const detail = (e as CustomEvent<{ userId: number, isOnline: boolean }>).detail
  if (detail && detail.userId === id.value && items.value[0]) {
    items.value[0] = {
      ...items.value[0],
      isOnline: detail.isOnline,
      lastOnlineAt: detail.isOnline ? null : new Date().toISOString()
    }
  }
}

// ─── Lifecycle Hooks ──────────────────────────────────────────────────────────
onMounted((): void => {
  fetch()
  if (typeof window !== 'undefined') {
    window.addEventListener('ws:user_presence', handlePresence)
  }
})

onUnmounted((): void => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('ws:user_presence', handlePresence)
  }
})

// ─── Fetch Data ────────────────────────────────────────────────────────────────
async function useFetchDetails (): Promise<void> {
  const response = await userService.findOneUserById(id.value)
  items.value = response?.data ? [response.data] : []
}

function fetch (): void {
  $handleLoading(useFetchDetails)
}

// ─── Call Actions ──────────────────────────────────────────────────────────────
function clickCall (): void {
  const targetUser = user.value
  if (!targetUser) return

  const isDesktop = typeof window !== 'undefined' && !((/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i).test(navigator.userAgent))

  if (isDesktop) {
    const width = 450
    const height = 650
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    const resolved = router.resolve({
      name: 'call',
      query: { targetId: String(targetUser.id) }
    })
    window.open(resolved.href, 'buddyhub_call_window', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`)
  } else {
    $handleLoading(async (): Promise<void> => {
      await callStore.initiateCall(targetUser.id)
      if (callStore.callData) {
        void router.push({
          name: 'call',
          query: { callData: JSON.stringify(callStore.callData) }
        })
      }
    })
  }
}
</script>

<style scoped>

</style>
