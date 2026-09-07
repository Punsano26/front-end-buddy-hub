<template>
  <div
    class="chat-room-input-container border-t border-slate-200/80 bg-white/95 px-4 pt-3 dark:border-slate-850 dark:bg-slate-900/95 backdrop-blur-md transition-colors duration-250">
    <!-- Editing -->
    <Transition name="fade">
      <div
        v-if="isEditing"
        class="mb-2 flex items-center justify-between rounded-xl bg-violet-50/80 border border-violet-100/50 px-3.5 py-2 dark:bg-violet-950/20 dark:border-violet-900/30">
        <div class="flex items-center gap-3">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-white shadow-sm">
            <i class="pi pi-pencil text-xs" />
          </div>

          <div class="flex flex-col">
            <span
              class="text-xs font-bold text-slate-800 dark:text-slate-200">
              กำลังแก้ไขข้อความ
            </span>

            <span
              class="text-[10px] text-slate-500 dark:text-slate-400">
              Edit your message
            </span>
          </div>
        </div>

        <button
          class="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-slate-200/50 dark:hover:bg-slate-800"
          type="button"
          @click="handleCancelEdit">
          <i class="pi pi-times text-xs" />
        </button>
      </div>
    </Transition>

    <!-- Image Preview -->
    <Transition name="fade">
      <div
        v-if="allowMedia && imagePreview"
        class="mb-2 flex items-center gap-3.5 rounded-xl bg-slate-50 border border-slate-150 p-2.5 dark:bg-slate-950/40 dark:border-slate-850">
        <div class="relative shrink-0">
          <img
            :src="imagePreview"
            alt="Preview"
            class="h-14 w-14 rounded-xl object-cover ring-2 ring-white shadow-sm dark:ring-slate-800">

          <button
            class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition hover:scale-105 active:scale-95 dark:bg-slate-800 dark:text-slate-200"
            type="button"
            @click="clearImageSelection">
            <i class="pi pi-times text-[9px]" />
          </button>
        </div>

        <div class="min-w-0 flex-1">
          <p
            class="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
            {{ selectedImageName || 'Image' }}
          </p>

          <p
            class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            พร้อมส่งรูปภาพ (Ready to send)
          </p>
        </div>
      </div>
    </Transition>

    <!-- Chat Input -->
    <div
      class="flex min-h-[42px] items-end gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 shadow-inner transition-all duration-200 focus-within:border-slate-350 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950/30 dark:focus-within:border-slate-750 dark:focus-within:bg-slate-950/60 dark:focus-within:ring-indigo-500/5">
      <!-- Upload -->
      <template v-if="allowMedia">
        <button
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 active:scale-95"
          type="button"
          @click="onSelectImage">
          <i class="pi pi-image text-lg" />
        </button>

        <input
          ref="imageInput"
          accept="image/*"
          class="hidden"
          type="file"
          @change="onImageChange">
      </template>

      <button
        v-if="allowCoin"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 active:scale-95"
        type="button"
        @click="isSendCoinVisible = true">
        <img
          alt="coin"
          class="h-5 w-5 dark:hidden"
          src="/svg/coin-logo-black.svg">
        <img
          alt="coin"
          class="h-5 w-5 hidden dark:block"
          src="/svg/coin-logo-white.svg">
      </button>

      <!-- Input -->
      <div class="flex-1 min-w-0 pb-0.5">
        <textarea
          v-model="messageModel"
          :placeholder="
            isEditing
              ? 'แก้ไขข้อความ...'
              : 'พิมพ์ข้อความ...'
          "
          class="chat-input w-full text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          rows="1"
          @keydown.enter.prevent="handleSend" />
      </div>

      <!-- Send -->
      <button
        :class="
          canSend
            ? 'bg-gradient-primary text-white shadow-md shadow-indigo-500/15 hover:shadow-indigo-500/25 active:scale-95'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
        "
        :disabled="!canSend"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-180 hover:scale-105"
        type="button"
        @click="handleSend">
        <i
          v-if="!isEditing"
          class="pi pi-send text-xs" />

        <i
          v-else
          class="pi pi-check text-xs" />
      </button>
    </div>

    <!-- Send Coin Modal Dialog -->
    <SendCoinModalDialog
      v-if="allowCoin"
      v-model:form-send-coins="formSendCoins"
      v-model:visible="isSendCoinVisible"
      :avatar="partnerProfileImg"
      :coin-balance="coinBalance"
      :nickname="partnerNickname"
      :username="partnerUsername"
      @confirm="onSendCoins" />
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { CoinGrantedEvent } from '~/models/enums/Coin.enum'
import type { ISendCoinsToAnotherUserPayload } from '~/models/request/WalletReq.model'
import type { ICreateMessageData } from '~/models/response/ChatRes.model'
import UserProvider, { type IUserProvider } from '~/resource/provider/User.provider'
import WalletProvider, { type IWalletProvider } from '~/resource/provider/Wallet.provider'

export interface ISendMediaMessagePayload {
  file: File
  previewUrl: string
}

interface IProps {
  modelValue?: string
  isEditing?: boolean
  partnerId?: number
  allowMedia?: boolean
  allowCoin?: boolean
}
const { $handleLoading, $ws } = useNuxtApp()
const emit = defineEmits<{
  'update:modelValue': [message: string]
  'createMessage': [message: string]
  'createMediaMessage': [payload: ISendMediaMessagePayload | string | ICreateMessageData]
  'cancelEdit': []
}>()
const WalletService: IWalletProvider = new WalletProvider()
const UserService: IUserProvider = new UserProvider()
const props = withDefaults(defineProps<IProps>(), {
  modelValue: '',
  isEditing: false,
  partnerId: undefined,
  allowMedia: true,
  allowCoin: true
})

const messageModel = computed({
  get (): string {
    return props.modelValue
  },
  set (value: string): void {
    emit('update:modelValue', value)
  }
})

let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null
let lastTypingSent = false

watch(messageModel, (val: string): void => {
  const isTyping = val.trim().length > 0

  if (isTyping === lastTypingSent) return

  if (typingDebounceTimer) clearTimeout(typingDebounceTimer)

  if (isTyping) {
    // Send immediately on start typing
    sendTypingEvent(true)
    lastTypingSent = true
  } else {
    // Debounce stop-typing
    typingDebounceTimer = setTimeout((): void => {
      sendTypingEvent(false)
      lastTypingSent = false
    }, 500)
  }
})

function sendTypingEvent (isTyping: boolean): void {
  const socket = typeof $ws === 'function' ? $ws() : null
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  if (!props.partnerId) return
  socket.send(JSON.stringify({
    event: 'typing',
    data: { receiverId: props.partnerId, isTyping }
  }))
}
const formSendCoins = ref<ISendCoinsToAnotherUserPayload>({
  receiverId: props.partnerId || 0,
  amount: 10, // Example amount
  description: ''
})
const toast = useToast()

const isSendCoinVisible = ref(false)
const partnerNickname = ref('')
const partnerUsername = ref('')
const partnerProfileImg = ref('')
const coinBalance = ref(0)
const allowCoin = computed((): boolean => props.allowCoin)

async function fetchPartnerInfo (): Promise<void> {
  if (!props.partnerId) return

  const response = await UserService.findOneUserById(props.partnerId)
  if (response && response.data) {
    partnerNickname.value = response.data.nickname || ''
    partnerUsername.value = response.data.username || ''
    partnerProfileImg.value = response.data.profileImg || ''
  }
}

async function fetchWalletBalance (): Promise<void> {
  const response = await WalletService.findWalletBalance()
  if (response && response.data) {
    coinBalance.value = response.data.balance
  }
}

watch((): number | undefined => props.partnerId, (newId: number | undefined): void => {
  if (newId) {
    if (props.allowCoin) {
      fetchPartnerInfo()
    }
    formSendCoins.value.receiverId = newId
  }
}, { immediate: true })

onMounted((): void => {
  if (props.allowCoin) {
    fetchWalletBalance()
  }
})

const isEditing = computed((): boolean => props.isEditing)
const allowMedia = computed((): boolean => props.allowMedia)
const imageInput = ref<HTMLInputElement | null>(null)
const imagePreview = ref<string>('')
const selectedFile = ref<File | null>(null)
const selectedImageName = computed((): string => selectedFile.value?.name || '')
const canSend = computed((): boolean => {
  return Boolean(messageModel.value.trim()) || (allowMedia.value && Boolean(selectedFile.value))
})

function handleSend (): void {
  sendTypingEvent(false)
  lastTypingSent = false
  if (typingDebounceTimer) clearTimeout(typingDebounceTimer)

  const trimmedMessage = messageModel.value.trim()
  const file = allowMedia.value ? selectedFile.value : null

  if (!trimmedMessage && !file) return

  if (file) {
    const preview = imagePreview.value
    emit('createMediaMessage', { file, previewUrl: preview })
    clearImageSelection()
    if (trimmedMessage) {
      emit('createMessage', trimmedMessage)
    }
    return
  }

  emit('createMessage', trimmedMessage)
}

function onSelectImage (): void {
  if (!allowMedia.value) return
  imageInput.value?.click()
}

function onImageChange (event: Event): void {
  if (!allowMedia.value) return
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
  const MAX_GIF_SIZE = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  if (!allowedTypes.includes(file.type)) {
    toast.add({
      severity: 'warn',
      summary: 'ประเภทไฟล์ไม่ถูกต้อง',
      detail: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WEBP, GIF)',
      life: 3000
    })
    if (imageInput.value) imageInput.value.value = ''
    return
  }

  const maxSize = file.type === 'image/gif' ? MAX_GIF_SIZE : MAX_IMAGE_SIZE
  if (file.size > maxSize) {
    toast.add({
      severity: 'warn',
      summary: 'ขนาดไฟล์เกินกำหนด',
      detail: file.type === 'image/gif' ? 'ขนาดไฟล์ GIF ต้องไม่เกิน 10MB' : 'ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB',
      life: 3000
    })
    if (imageInput.value) imageInput.value.value = ''
    return
  }

  selectedFile.value = file
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imagePreview.value = URL.createObjectURL(file)
}

function clearImageSelection (): void {
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
  }
  imagePreview.value = ''
  selectedFile.value = null
  if (imageInput.value) {
    imageInput.value.value = ''
  }
}
function handleCancelEdit (): void {
  sendTypingEvent(false)
  lastTypingSent = false
  if (typingDebounceTimer) clearTimeout(typingDebounceTimer)
  emit('cancelEdit')
}


async function sendCoins (): Promise<void> {
  const response = await WalletService.sendCoinsToAnotherUser(formSendCoins.value)
  if (response && response.data) {
    coinBalance.value = response.data.senderBalance
    isSendCoinVisible.value = false
    formSendCoins.value.amount = 10
    formSendCoins.value.description = ''
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CoinGrantedEvent.SPEND_COIN))
    }
  }
}

function onSendCoins (): void {
  if (!formSendCoins.value.amount || formSendCoins.value.amount <= 0) {
    toast.add({
      severity: 'warn',
      summary: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      detail: 'กรุณากรอกจำนวนเหรียญให้ถูกต้อง',
      life: 3000
    })
    return
  }
  if (formSendCoins.value.amount > coinBalance.value) {
    toast.add({
      severity: 'warn',
      summary: 'เหรียญไม่พอ',
      detail: 'จำนวนเหรียญคงเหลือไม่เพียงพอสำหรับการโอน',
      life: 3000
    })
    return
  }
  $handleLoading(sendCoins, {
    toast: {
      instance: toast
    }
  })
}

onUnmounted((): void => {
  if (typingDebounceTimer) clearTimeout(typingDebounceTimer)
  sendTypingEvent(false)
})
</script>

<style scoped>
.chat-input {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  resize: none !important;

  padding: 4px 0 !important;

  font-size: 16px !important;
  line-height: 24px !important;

  min-height: 24px !important;
  max-height: 120px !important;

  overflow-y: auto !important;
}

.chat-input:focus {
  outline: none !important;
  box-shadow: none !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.chat-room-input-container {
  padding-bottom: calc(env(safe-area-inset-bottom) + 0.75rem);
}

/* When any input inside is focused (keyboard is visible), remove safe-area padding */
.chat-room-input-container:has(textarea:focus, input:focus) {
  padding-bottom: 0.75rem;
}
</style>
