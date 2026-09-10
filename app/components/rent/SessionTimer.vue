<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Error State -->
    <div
      v-if="hasError"
      class="bg-rose-550/10 border border-rose-550/20 dark:border-rose-550/30 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200">
      <i class="pi pi-exclamation-circle text-rose-500" />
      <span>ระบบจับเวลาไม่พร้อมใช้งาน</span>
    </div>

    <!-- Expired State -->
    <div
      v-else-if="isExpired"
      class="bg-rose-550/10 border border-rose-550/20 dark:border-rose-550/30 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 opacity-75 cursor-not-allowed">
      <i class="pi pi-times-circle text-rose-500" />
      <span>เซสชันสิ้นสุดแล้ว</span>
    </div>

    <!-- Not Started State (Waiting for first message) -->
    <div
      v-else-if="isNotStarted"
      class="bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm transition-all duration-200">
      <i class="pi pi-clock text-blue-500" />
      <span>{{ formatTime(remainingSeconds) }}</span>
      <span class="hidden sm:inline text-[10px] font-medium opacity-80">(รอเริ่มคุย)</span>
    </div>

    <!-- Active States -->
    <template v-else>
      <!-- Main Timer -->
      <div
        :class="[
          isWarning
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
        ]"
        class="border flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm transition-all duration-200">
        <i
          :class="[
            isWarning
              ? 'pi pi-clock text-amber-500'
              : 'pi pi-clock text-emerald-500'
          ]" />
        <span>{{ formatTime(remainingSeconds) }}</span>
      </div>

      <!-- Completing Timer (if active) -->
      <div
        v-if="completingSeconds > 0"
        class="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 animate-pulse">
        <i class="pi pi-sign-out text-amber-500" />
        <span>กำลังออกจากเซสชัน: {{ formatTime(completingSeconds) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useSessionTimer } from '~/composables/useSessionTimer'

const props = defineProps<{
  sessionId: number
}>()

const {
  remainingSeconds,
  completingSeconds,
  isExpired,
  isNotStarted,
  isWarning,
  hasError
} = useSessionTimer(props.sessionId)

function formatTime (seconds: number): string {
  if (seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')

  if (h > 0) {
    const hh = String(h).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}
</script>
