<template>
  <div class="landing-root relative w-full min-h-dvh overflow-hidden">
    <div class="ambient ambient-cyan" />
    <div class="ambient ambient-indigo" />
    <div class="ambient ambient-aurora" />
    <div class="ambient ambient-grid" />
    <div class="ambient ambient-vignette" />

    <main class="relative z-10 min-h-dvh w-full px-4 py-6 md:px-10 md:py-10">
      <div class="md:h-screen md:mt-[-5rem] mx-auto grid min-h-full max-w-5xl grid-cols-1 items-center gap-10 text-center md:grid-cols-2 md:text-left">
        <section class="w-full space-y-6">
          <p class="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs tracking-[0.2em] text-white/80 uppercase backdrop-blur-sm">
            บัดดี้ ฮับ
            <span class="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_2px_rgba(16,185,129,0.8)]" />
          </p>

          <div class="space-y-3">
            <h1 class="mx-auto text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              ค้นหาเพื่อนคุยใหม่
              <span class="bg-gradient-primary bg-clip-text text-transparent">ในวันที่เหงาใจ</span>
            </h1>
            <p class="mx-auto max-w-xl text-sm text-surface-200 sm:text-base">
              มาที่นี่แล้วคุณจะได้พบคนใหม่ที่คุยสนุก เข้าใจ และพร้อมเปิดใจในทุกโมเมนต์
              ทุกห้องแชทคือโอกาสใหม่ ทุกการทักคือจุดเริ่มต้นที่น่าจดจำ
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-3 text-xs text-surface-200">
            <span class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <i class="pi pi-comments" />
              แชททันใจแบบเรียลไทม์
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <i class="pi pi-users" />
              จับคู่เพื่อนคุยถูกใจ
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <i class="pi pi-bolt" />
              ลื่นไหล ใช้งานง่าย
            </span>
          </div>

          <div class="flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-center">
            <NuxtLink
              class="w-full sm:w-auto"
              to="/public/home">
              <Button
                class="w-full sm:w-auto"
                icon="pi pi-compass"
                label="เริ่มหาเพื่อนตอนนี้"
                pt:root:class="bg-gradient-primary border-none text-surface-900 font-semibold px-6 py-3 rounded-xl shadow-[0_20px_40px_-20px_rgba(111,143,232,0.9)] hover:brightness-105" />
            </NuxtLink>

            <NuxtLink
              class="w-full sm:w-auto"
              to="/auth/verify">
              <SecondaryButton
                class="w-full sm:w-auto"
                icon="pi pi-sign-in"
                icon-pos="right"
                label="เข้าสู่ระบบ"
                pt:root:class="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20" />
            </NuxtLink>
          </div>
        </section>

        <section class="scene-wrap w-full">
          <div class="scene perspective">
            <Card pt:root:class="layer layer-base">
              <template #content>
                <div class="space-y-3">
                  <p class="text-xs uppercase tracking-[0.18em] text-surface-300">
                    โซนยอดนิยม
                  </p>
                  <div class="space-y-2 text-sm">
                    <div class="module-row">
                      <i class="pi pi-home" />
                      <span>โฮมฟีดแนะนำเพื่อนใหม่</span>
                    </div>
                    <div class="module-row">
                      <i class="pi pi-comments" />
                      <span>ห้องแชทนัดคุยทันที</span>
                    </div>
                    <div class="module-row">
                      <i class="pi pi-users" />
                      <span>เชื่อมต่อเพื่อนคุยถูกใจ</span>
                    </div>
                    <div class="module-row">
                      <i class="pi pi-user" />
                      <span>โปรไฟล์โดดเด่น น่าค้นหา</span>
                    </div>
                  </div>
                </div>
              </template>
            </Card>

            <Card pt:root:class="layer layer-float layer-float-a">
              <template #content>
                <div class="space-y-2">
                  <p class="text-xs uppercase tracking-[0.18em] text-surface-300">
                    ออนไลน์ตอนนี้
                  </p>
                  <p :class="['text-3xl font-black text-white', { 'online-count-bump': isOnlineCountAnimating }]">
                    {{ formattedOnlineCount }}
                  </p>
                  <p class="text-xs text-surface-300">
                    คนกำลังคุยสนุกในชั่วโมงนี้
                  </p>
                </div>
              </template>
            </Card>

            <Card pt:root:class="layer layer-float layer-float-b">
              <template #content>
                <div class="space-y-2">
                  <p class="text-xs uppercase tracking-[0.18em] text-surface-300">
                    เข้าได้ทันที
                  </p>
                  <p class="text-lg font-bold text-white">
                    พร้อมเริ่มคุยกับคนใหม่เลยตอนนี้
                  </p>
                  <div class="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-200">
                    <span class="h-2 w-2 rounded-full bg-emerald-300" />
                    ระบบพร้อมใช้งาน
                  </div>
                </div>
              </template>
            </Card>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script lang="ts" setup>
import UserProvider from '~/resource/provider/User.provider'
import { useAuthStore } from '~/stores/Auth'
import { useUserStore } from '~/stores/User'
import Button from '~/volt/Button.vue'
import Card from '~/volt/Card.vue'
import SecondaryButton from '~/volt/SecondaryButton.vue'

interface IUserPresence {
  id?: number
  isOnline?: boolean
}

const { $ws } = useNuxtApp()
const authStore = useAuthStore()
const userStore = useUserStore()
const userService = new UserProvider()
const fallbackOnlineCount = 1234
const isOnlineCountAnimating = ref(false)
const lastOnlineCount = ref<number>(fallbackOnlineCount)
const safeUsers = computed<IUserPresence[]>((): IUserPresence[] => {
  return Array.isArray(userStore.users) ? userStore.users : []
})
const onlineCount = computed<number>((): number => {
  if (!safeUsers.value.length) return fallbackOnlineCount

  const currentUserId = authStore.user.id
  const onlineFromUsers = safeUsers.value.filter((user: IUserPresence): boolean => !!user?.isOnline).length
  const hasCurrentUserInList = currentUserId > 0
    && safeUsers.value.some((user: IUserPresence): boolean => user?.id === currentUserId)

  // Socket user list can exclude current user; include self once when logged in.
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

async function fetchInitialUsers (): Promise<void> {
  if (userStore.users.length > 0) return
  try {
    const res = await userService.findAllUsersPaginate({ page: 1, limit: 200 })
    if (Array.isArray(res?.data) && res.data.length > 0 && userStore.users.length === 0) {
      userStore.setUsers(res.data)
    }
  } catch (err: any) {
    console.debug('[Index] Initial user fetch skipped:', err)
  }
}

watch(onlineCount, (newValue: number, oldValue: number): void => {
  if (newValue === oldValue || newValue === lastOnlineCount.value) return

  lastOnlineCount.value = newValue
  isOnlineCountAnimating.value = false

  requestAnimationFrame((): void => {
    isOnlineCountAnimating.value = true
    setTimeout((): void => {
      isOnlineCountAnimating.value = false
    }, 380)
  })
})

onMounted((): void => {
  void fetchInitialUsers()
  setupRealtimeOnlineCount()
})

onBeforeUnmount((): void => {
  teardownRealtimeOnlineCount()
})

const runtimeConfig = useRuntimeConfig()
const siteUrl = String(runtimeConfig.public.siteUrl || 'http://localhost:5000').replace(/\/$/, '')
const siteName = String(runtimeConfig.public.siteName || 'Buddy Hub')
const pageUrl = `${siteUrl}/`
const pageTitle = 'หาเพื่อนคุยออนไลน์ ปลอดภัย และใช้งานง่าย'
const pageDescription = 'Buddy Hub ช่วยให้คุณค้นหาเพื่อนคุยใหม่ได้ทันทีผ่านห้องแชทออนไลน์ พูดคุยลื่นไหล และเริ่มต้นความสัมพันธ์ดีๆ สามารถหาที่ปรึกษาทางใจหรือเล่าเรื่องราว ได้ทุกวัน'
const defaultOgImage = String(runtimeConfig.public.defaultOgImage || '/png/logo-buddy-hub.png')
const ogImageUrl = defaultOgImage.startsWith('http')
  ? defaultOgImage
  : `${siteUrl}${defaultOgImage}`

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  robots: 'index, follow, max-image-preview:large',
  keywords: 'หาเพื่อนคุย, แชทออนไลน์, หาเพื่อนใหม่, buddy hub, คุยกับคนใหม่',
  ogType: 'website',
  ogTitle: `Buddy Hub | ${pageTitle}`,
  ogDescription: pageDescription,
  ogUrl: pageUrl,
  ogImage: ogImageUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: `Buddy Hub | ${pageTitle}`,
  twitterDescription: pageDescription,
  twitterImage: ogImageUrl
})

useHead({
  script: [
    {
      key: 'ld-json-website',
      type: 'application/ld+json',
      textContent: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': siteName,
        'url': siteUrl,
        'inLanguage': 'th-TH',
        'description': pageDescription,
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${siteUrl}/public/home?keyword={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      })
    },
    {
      key: 'ld-json-organization',
      type: 'application/ld+json',
      textContent: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': siteName,
        'url': siteUrl,
        'logo': ogImageUrl,
        'sameAs': []
      })
    }
  ]
})
</script>

<style scoped>
.landing-root {
  background: radial-gradient(circle at 12% 20%, #0f2a46 0%, transparent 42%),
    radial-gradient(circle at 88% 80%, #28184a 0%, transparent 40%),
    linear-gradient(145deg, #040b18 0%, #091827 45%, #060915 100%);
  isolation: isolate;
}

.ambient {
  pointer-events: none;
  position: absolute;
  inset: 0;
}

.ambient-cyan {
  background: radial-gradient(circle at 20% 30%, rgba(57, 198, 214, 0.26) 0%, transparent 38%);
  filter: blur(6px);
  animation: driftA 12s ease-in-out infinite alternate;
}

.ambient-indigo {
  background: radial-gradient(circle at 78% 70%, rgba(111, 143, 232, 0.3) 0%, transparent 40%);
  filter: blur(8px);
  animation: driftB 15s ease-in-out infinite alternate;
}

.ambient-aurora {
  background: conic-gradient(from 140deg at 50% 50%, rgba(16, 185, 129, 0.09), rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.11), rgba(16, 185, 129, 0.09));
  mix-blend-mode: screen;
  opacity: 0.65;
  transform-origin: center;
  animation: auroraSpin 26s linear infinite;
}

.ambient-grid {
  background-image: linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 10%, transparent 88%);
  opacity: 0.25;
}

.ambient-vignette {
  background: radial-gradient(circle at center, transparent 55%, rgba(2, 6, 23, 0.55) 100%);
}

.scene-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.scene {
  position: relative;
  width: min(520px, 92vw);
  height: clamp(300px, 44vw, 420px);
  transform-style: preserve-3d;
}

.perspective {
  perspective: 1100px;
}

.layer {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(160deg, rgba(39, 39, 42, 0.82), rgba(9, 9, 11, 0.7));
  backdrop-filter: blur(10px);
  color: white;
}

.layer-base {
  inset: 24px 30px 20px 12px;
  transform: rotateY(-16deg) rotateX(7deg) translateZ(0);
  box-shadow: 0 24px 60px -28px rgba(0, 0, 0, 0.7);
}

.layer-float {
  width: 220px;
  transform-style: preserve-3d;
}

.layer-float-a {
  top: 20px;
  right: 0;
  transform: rotateY(-18deg) rotateX(8deg) translateZ(86px);
  animation: levitateA 5.4s ease-in-out infinite;
}

.online-count-bump {
  animation: onlineCountBump 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.layer-float-b {
  bottom: 0;
  left: 10px;
  transform: rotateY(-10deg) rotateX(6deg) translateZ(64px);
  animation: levitateB 6.2s ease-in-out infinite;
}

.module-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 0.6rem 0.75rem;
  color: rgb(228 228 231);
  background: rgba(39, 39, 42, 0.45);
}

@keyframes driftA {
  from {
    transform: translate3d(-8px, -6px, 0) scale(1);
  }
  to {
    transform: translate3d(12px, 18px, 0) scale(1.05);
  }
}

@keyframes driftB {
  from {
    transform: translate3d(8px, -8px, 0) scale(1);
  }
  to {
    transform: translate3d(-10px, 20px, 0) scale(1.06);
  }
}

@keyframes auroraSpin {
  from {
    transform: rotate(0deg) scale(1.15);
  }
  to {
    transform: rotate(360deg) scale(1.15);
  }
}

@keyframes levitateA {
  0%,
  100% {
    transform: rotateY(-18deg) rotateX(8deg) translateZ(86px) translateY(0);
  }
  50% {
    transform: rotateY(-18deg) rotateX(8deg) translateZ(96px) translateY(-8px);
  }
}

@keyframes levitateB {
  0%,
  100% {
    transform: rotateY(-10deg) rotateX(6deg) translateZ(64px) translateY(0);
  }
  50% {
    transform: rotateY(-10deg) rotateX(6deg) translateZ(74px) translateY(-10px);
  }
}

@keyframes onlineCountBump {
  0% {
    transform: translateY(0) scale(1);
    text-shadow: 0 0 0 rgba(96, 165, 250, 0);
  }
  50% {
    transform: translateY(-2px) scale(1.07);
    text-shadow: 0 0 16px rgba(96, 165, 250, 0.5);
  }
  100% {
    transform: translateY(0) scale(1);
    text-shadow: 0 0 0 rgba(96, 165, 250, 0);
  }
}

@media (max-width: 1024px) {
  .scene {
    width: min(500px, 96vw);
    height: clamp(280px, 62vw, 360px);
  }

  .layer-base {
    inset: 20px 20px 20px 10px;
  }
}

@media (max-width: 640px) {
  .scene {
    width: 100%;
    height: clamp(260px, 72vw, 320px);
  }

  .layer-float {
    width: min(46vw, 180px);
  }

  .layer-float-a {
    right: 2px;
  }

  .layer-base {
    inset: 18px 12px 16px 8px;
  }
}
</style>
