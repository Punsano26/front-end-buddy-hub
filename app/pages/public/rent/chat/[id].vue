<template>
  <div class="bg-slate-50 flex h-full min-h-0 flex-col overflow-hidden relative transition-colors duration-250 dark:bg-slate-950">
    <!-- Ambient subtle background decorative blurs -->
    <div class="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <div class="absolute animate-pulse bg-blue-500/10 blur-3xl h-96 w-96 rounded-full -left-40 -top-40 dark:bg-blue-600/5" style="animation-duration: 8s" />
      <div class="absolute animate-pulse bg-purple-500/10 blur-3xl h-96 w-96 rounded-full -bottom-40 -right-40 dark:bg-purple-600/5" style="animation-duration: 12s; animation-delay: 1.5s" />
    </div>

    <template v-if="store.currentPartner">
      <RentChatHeader />

      <RentChatMessagesList
        ref="messagesListRef"
        @check-approval="checkApprovalStatus"
        @edit="onEdit"
      />

      <RentChatInput
        v-model="userMessageText"
        @send="handleSendMessage"
        @sticker-click="showStickerAlert"
      />
    </template>
    <div v-else class="flex flex-col items-center justify-center flex-1 py-12">
      <i class="pi pi-spin pi-spinner text-2xl text-blue-500 mb-3" />
      <span class="text-sm font-medium text-slate-500 dark:text-400">กำลังโหลดห้องสนทนา...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import RentChatHeader from '~/components/rent/RentChatHeader.vue'
import RentChatMessagesList from '~/components/rent/RentChatMessagesList.vue'
import RentChatInput from '~/components/rent/RentChatInput.vue'
import { RentStatusEnum } from '~/models/enums/Rent.enum'
import { useAuthStore } from '~/stores/Auth'
import { useRentChatStore } from '~/stores/RentChat'

definePageMeta({ layout: 'chat-rent', title: 'แชท' })

const { $handleLoading } = useNuxtApp()

const route = useRoute()
const id = computed((): number => Number(route.params.id))
const userMessageText = ref('')
const toast = useToast()
const authStore = useAuthStore()
const store = useRentChatStore()
const { pagination } = usePagination()
const silentLoadingUnit = ref(false)
const messagesListRef = ref<any>(null)

async function useFetch (): Promise<void> {
  await store.fetchSession(id.value)
}

function fetch (): void {
  $handleLoading(useFetch)
}

async function useFetchMessages (): Promise<void> {
  await store.fetchMessages(id.value, pagination.value)
  await store.markSessionMessagesAsRead(id.value, authStore.user.id)
  await nextTick()
  if (messagesListRef.value) {
    void messagesListRef.value.scrollToBottom()
  }
}

function fetchMessages (): void {
  $handleLoading(useFetchMessages, { loadingUnit: silentLoadingUnit })
}

function checkApprovalStatus (): void {
  toast.add({
    severity: 'info',
    summary: 'ตรวจสอบสถานะ',
    detail: 'กำลังตรวจสอบสถานะกับเซิร์ฟเวอร์...',
    life: 1500
  })
  fetch()
}

function onEdit (message: { id: number; text: string }): void {
  userMessageText.value = message.text
}

async function handleSendMessage (text: string): Promise<void> {
  await $handleLoading(async (): Promise<void> => {
    await store.handleSendMessage(id.value, text, authStore.user.id)
    userMessageText.value = ''
    await nextTick()
    if (messagesListRef.value) {
      void messagesListRef.value.scrollToBottom()
    }
  }, {
    loadingUnit: silentLoadingUnit
  })
}

function showStickerAlert (): void {
  toast.add({
    severity: 'info',
    summary: 'ฟีเจอร์รูปภาพ/สติกเกอร์',
    detail: 'ฟีเจอร์ส่งรูปภาพ/สติกเกอร์จะเปิดให้บริการในเร็วๆ นี้ค่ะ',
    life: 2000
  })
}

const handleReconnected = (): void => {
  fetch()
  fetchMessages()
}

const handleVisibility = (): void => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    fetchMessages()
    void store.markSessionMessagesAsRead(id.value, authStore.user.id)
  }
}

const handleUserPresence = (event: Event): void => {
  const customEvent = event as CustomEvent<{ userId: number, isOnline: boolean }>
  const detail = customEvent.detail
  if (detail && store.partner && detail.userId === store.partner.id) {
    store.updatePartnerPresence(detail.isOnline)
  }
}

onMounted((): void => {
  fetch()
  fetchMessages()

  if (typeof window !== 'undefined') {
    window.addEventListener('ws:reconnected', handleReconnected)
    window.addEventListener('focus', handleVisibility)
    window.addEventListener('ws:user_presence', handleUserPresence)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibility)
  }
})

onBeforeUnmount((): void => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('ws:reconnected', handleReconnected)
    window.removeEventListener('focus', handleVisibility)
    window.removeEventListener('ws:user_presence', handleUserPresence)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibility)
  }
  store.clear()
})

// Watch route parameter changes to re-initialize
watch(
  (): number => id.value,
  (): void => {
    store.cancelEditMessage()
    userMessageText.value = ''
    fetch()
    fetchMessages()
  }
)

// Watch sessionStatus or partner ID changes to trigger countdown
watch(
  [(): number | undefined => store.currentPartner?.id, (): string | undefined => store.currentPartner?.sessionStatus],
  (): void => {
    if (store.currentPartner?.sessionStatus === 'active') {
      store.startCountdown()
    } else {
      store.stopCountdown()
    }
  },
  { immediate: true }
)

// Watch session status to navigate when completed
watch(
  (): string | undefined => store.item?.status,
  (newStatus: string | undefined, oldStatus: string | undefined): void => {
    if (
      newStatus === RentStatusEnum.COMPLETED
      && oldStatus
      && oldStatus !== RentStatusEnum.COMPLETED
    ) {
      if (store.item && authStore.user.id === store.item.customerId) {
        void navigateTo({ name: 'public-rent-review', query: { sessionId: id.value } })
      } else {
        void navigateTo({ name: 'public-rent-chat' })
      }
    }
  }
)
</script>