<template>
  <header class="bg-white/90 border-b border-slate-200/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 pb-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] px-4 md:px-6 relative shrink-0 transition-colors duration-250">
    <div class="absolute bg-gradient-primary bottom-0 h-[1px] left-0 opacity-60 right-0" />

    <div class="flex flex-col md:flex-row gap-3 md:items-center justify-between max-w-7xl mx-auto shrink-0 w-full">
      <div class="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
        <div class="flex gap-3 items-center min-w-0">
          <ButtonBack
            :to="{ name: 'public-rent-chat' }"
            class="active:scale-95 shrink-0 text-slate-600 transition-transform dark:text-slate-300"
            icon="mdi:arrow-left" />

          <div class="relative shrink-0">
            <img
              :class="store.currentPartner?.sessionStatus === 'finished' ? 'opacity-60 grayscale-[35%]' : ''"
              :src="store.partnerProfileImg"
              alt="Profile Image"
              class="border border-slate-200/60 h-10 object-cover rounded-xl shadow-sm w-10 dark:border-slate-800">
            <span
              v-if="store.currentPartner?.sessionStatus === 'finished'"
              class="absolute bg-rose-550 border border-white flex h-3.5 items-center justify-center rounded-full text-[8px] text-white w-3.5 -bottom-0.5 -right-0.5 dark:border-slate-900 font-bold">
              <i class="pi pi-times" />
            </span>
            <span
              v-else-if="store.partner?.isOnline === true"
              class="absolute bg-emerald-500 border-2 border-white h-3 rounded-full w-3 -bottom-0.5 -right-0.5 dark:border-slate-900" />
            <span
              v-else-if="store.partner?.isOnline === false"
              class="absolute bg-amber-500 border-2 border-white h-3 rounded-full w-3 -bottom-0.5 -right-0.5 dark:border-slate-900" />
          </div>

          <!-- Partner Name & Category -->
          <div class="leading-tight min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-bold text-slate-850 text-sm truncate dark:text-slate-50 md:text-base">
                {{ store.partnerName }}
              </p>
            </div>

            <p
              v-if="store.item?.status === RentStatusEnum.COMPLETED"
              class="flex items-center gap-2 font-semibold mt-1 text-[11px] text-rose-500">
              <span class="bg-rose-550 h-2 rounded-full w-2" />
              เซสชันสิ้นสุดแล้ว
            </p>
            <p
              v-else-if="store.item?.status === RentStatusEnum.EXPIRED"
              class="flex items-center gap-2 font-semibold mt-1 text-[11px] text-amber-500">
              <span class="bg-amber-500 h-2 rounded-full w-2" />
              หมดเวลาแล้ว
            </p>
          </div>
        </div>

        <!-- Mobile Countdown / price rate overlay -->
        <div class="flex md:hidden items-center gap-3 shrink-0">
          <SessionTimer
            v-if="(store.currentPartner?.sessionStatus === 'active' || store.item?.status === RentStatusEnum.EXPIRED) && id"
            :session-id="Number(id)" />
          <div
            v-else
            class="bg-white/50 border border-slate-200 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs dark:bg-slate-950/50 dark:border-slate-850">
            <i class="pi pi-coin text-amber-500" />
            <span class="font-bold text-slate-700 dark:text-slate-200">{{ store.countdownText }}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons Row (shown below on mobile, inline on desktop) -->
      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <!-- Extend Session Button -->
        <ExtendSessionButton
          v-if="canExtend"
          :coin-rate-per-minute="store.item?.hirePost?.coinRatePerMinute ?? 0"
          :current-duration="store.item?.durationMinutes ?? 0"
          :max-duration="store.currentPartner?.maxDurationMinutes ?? 0"
          :session-id="Number(id)" />

        <!-- Request Session Completion Button -->
        <Button
          v-if="canComplete"
          icon="pi pi-sign-out"
          label="ออกจากห้องสนทนา"
          pt:label:class="font-semibold text-xs"
          pt:root:class="bg-rose-550/10 hover:bg-rose-550/20 text-rose-600 border border-rose-550/20 px-3.5 py-1.5 rounded-xl shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:border-rose-900/40 dark:text-rose-400 w-full md:w-auto"
          @click="requestSessionCompletion" />

        <!-- Completing State Rendering -->
        <template
          v-if="(store.item?.status === RentStatusEnum.ACTIVE && store.isCompleting) || store.item?.status === RentStatusEnum.COMPLETING">
          <!-- Disabled Request Button for Requester -->
          <Button
            v-if="isRequester"
            icon="pi pi-clock"
            label="ขอออกจากเซสชั่นไปแล้ว"
            pt:label:class="font-semibold text-xs text-slate-400 dark:text-slate-500"
            pt:root:class="bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 w-full md:w-auto cursor-not-allowed dark:bg-slate-850/20 dark:border-slate-800/40"
            disabled />

          <!-- Confirm Session Completion Box for The Other Side -->
          <div
            v-else
            class="flex flex-col sm:flex-row items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 md:py-1.5 md:px-3.5 dark:bg-amber-950/20 dark:border-amber-900/40 w-full md:w-auto">
            <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 text-center sm:text-left">
              <i class="pi pi-exclamation-triangle text-amber-500 animate-pulse" />
              คู่สนทนาต้องการออกจากห้องสนทนาก่อนหมดเวลา
            </p>
            <Button
              icon="pi pi-check"
              label="ยินดีให้ออกจากห้องสนทนา"
              pt:label:class="font-semibold text-xs text-white"
              pt:root:class="bg-gradient-primary border-none px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 w-full sm:w-auto"
              @click="confirmSessionCompletion" />
          </div>
        </template>
      </div>

      <!-- Desktop Countdown / price rate overlay -->
      <div class="hidden md:flex items-center gap-3 shrink-0">
        <SessionTimer
          v-if="(store.currentPartner?.sessionStatus === 'active' || store.item?.status === RentStatusEnum.EXPIRED) && id"
          :session-id="Number(id)" />
        <div
          v-else
          class="bg-white/50 border border-slate-200 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs dark:bg-slate-950/50 dark:border-slate-850">
          <i class="pi pi-coin text-amber-500" />
          <span class="font-bold text-slate-700 dark:text-slate-200">{{ store.countdownText }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import ExtendSessionButton from '~/components/rent/ExtendSessionButton.vue'
import SessionTimer from '~/components/rent/SessionTimer.vue'
import { RentStatusEnum } from '~/models/enums/Rent.enum'
import type { TBaseParamsId } from '~/models/request/Request.model'
import type { IRentCustomerProvider } from '~/resource/provider/RentCustomer.provider'
import RentCustomerProvider from '~/resource/provider/RentCustomer.provider'
import { useAuthStore } from '~/stores/Auth'
import { useRentChatStore } from '~/stores/RentChat'

const { $handleLoading } = useNuxtApp()

const toast = useToast()
const rentCustomerService: IRentCustomerProvider = new RentCustomerProvider()
const authStore = useAuthStore()
const store = useRentChatStore()
const id = computed((): TBaseParamsId => store.item?.id)

const handleUserPresence = (event: Event): void => {
  const customEvent = event as CustomEvent<{ userId: number, isOnline: boolean }>
  const detail = customEvent.detail
  if (detail && store.partner && detail.userId === store.partner.id) {
    store.updatePartnerPresence(detail.isOnline)
  }
}

onMounted((): void => {
  if (typeof window !== 'undefined') {
    window.addEventListener('ws:user_presence', handleUserPresence)
  }
})

onUnmounted((): void => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('ws:user_presence', handleUserPresence)
  }
})

const isRequester = computed((): boolean => {
  const reqId = store.item?.completionRequestedBy || store.requestCompleteBy || store.item?.requestCompleteBy || store.item?.requestCompletedBy
  return Number(reqId) === authStore.user.id
})

const canExtend = computed((): boolean => {
  const status = store.item?.status
  if (!status) return false
  const isExtendableStatus
    = status === RentStatusEnum.ACTIVE
      || status === RentStatusEnum.EXPIRED
      || status === RentStatusEnum.ACCEPTED
      || status === RentStatusEnum.COMPLETING
  return isExtendableStatus && !store.isCompleting
})

const canComplete = computed((): boolean => {
  const status = store.item?.status
  return (status === RentStatusEnum.ACTIVE || status === RentStatusEnum.EXPIRED) && !store.isCompleting
})

async function onRequestSessionCompletion (): Promise<void> {
  await rentCustomerService.requestSessionCompletion(Number(id.value))
  store.requestCompleteBy = authStore.user.id
}

function requestSessionCompletion (): void {
  $handleLoading(onRequestSessionCompletion, {
    toast: {
      instance: toast }
  })
}
async function onConfirmSessionCompletion (): Promise<void> {
  await rentCustomerService.confirmSessionCompletion(Number(id.value))
  if (store.item && authStore.user.id === store.item.customerId) {
    await navigateTo({ name: 'public-rent-review', query: { sessionId: id.value } })
  } else {
    await navigateTo({ name: 'public-rent-chat' })
  }
}

function confirmSessionCompletion (): void {
  $handleLoading(onConfirmSessionCompletion, {
    toast: {
      instance: toast }
  })
}
</script>
