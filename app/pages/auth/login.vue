<template>
  <form @submit.prevent="login">
    <div
      v-if="route.query.banned === 'true'"
      class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex flex-col gap-1">
      <div class="font-bold flex items-center gap-2">
        <span>⚠️</span>
        <span>บัญชีถูกระงับการใช้งาน</span>
      </div>
      <div v-if="route.query.reason">
        สาเหตุ: {{ route.query.reason }}
      </div>
      <div v-if="route.query.expiresAt">
        หมดอายุเมื่อ: {{ formattedQueryExpiresAt }}
      </div>
    </div>

    <div
      v-else-if="route.query.revoked === 'true'"
      class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm flex flex-col gap-1">
      <div class="font-bold flex items-center gap-2">
        <span>ℹ️</span>
        <span>เซสชันถูกเพิกถอน</span>
      </div>
      <div v-if="route.query.reason">
        {{ route.query.reason }}
      </div>
    </div>

    <InputLabelField
      v-model="form.account"
      :disabled="!!route.query.account"
      :rules="formRules.account"
      :show-error="submitted"
      label="อีเมลหรือชื่อผู้ใช้"
      placeholder="กรอกอีเมลหรือชื่อผู้ใช้ของคุณ"
      required />
    <InputPasswordField
      v-model="form.password"
      :rules="formRules.password"
      :show-error="submitted"
      label="รหัสผ่าน" />
    <Button
      label="เข้าสู่ระบบ"
      pt:label:class="font-bold"
      pt:root:class="bg-gradient-primary border-none rounded-xl py-3"
      type="submit" />
    <NuxtLink
      :to="{ name: 'auth-forgot-password', query: { from: 'login' } }"
      class="text-center text-blue-400">
      ลืมรหัสผ่าน ?
    </NuxtLink>
  </form>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import InputLabelField from '~/components/input/InputLabelField.vue'
import InputPasswordField from '~/components/input/InputPasswordField.vue'
import type { IAuthLoginPayload } from '~/models/request/AuthReq.model'
import { validate, validateForm } from '~/plugins/Validate'
import type { IAuthProvider } from '~/resource/provider/Auth.provider'
import AuthProvider from '~/resource/provider/Auth.provider'

const authService: IAuthProvider = new AuthProvider()
const route = useRoute()
const toast = useToast()

const router = useRouter()
const authStore = useAuthStore()
const { $handleLoading } = useNuxtApp()
const submitted = ref(false)

definePageMeta({
  title: 'เข้าสู่ระบบเพื่อใช้งาน',
  backPath: { name: 'auth-verify' }
})

const form = ref<IAuthLoginPayload>({
  account: Array.isArray(route.query.account)
    ? route.query.account[0] ?? ''
    : route.query.account ?? '',
  password: ''
})

const formRules = computed((): Record<string, ((v: any) => boolean | string)[]> => ({
  account: [validate.account],
  password: [validate.required]
}))

const formattedQueryExpiresAt = computed((): string => {
  const expiresAt = route.query.expiresAt
  if (!expiresAt) return ''
  try {
    const date = new Date(String(expiresAt))
    if (isNaN(date.getTime())) return String(expiresAt)
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return String(expiresAt)
  }
})

async function onLogin (): Promise<void> {
  const payload = {
    account: form.value.account,
    password: form.value.password
  }
  const response = await authService.login(payload)
  const expireAt = response.tokenExpireAt ? Number(response.tokenExpireAt) : null
  authStore.userLogin(response.data, response.accessToken, response.refreshToken, Number(response.tokenExpiresIn), expireAt)

  router.push({ name: 'public-home' })
}

function login (): void {
  submitted.value = true
  if (!validateForm(form.value, formRules.value)) {
    return
  }
  $handleLoading(onLogin, {
    toast: {
      instance: toast
    }
  })
}

onBeforeMount((): void => {
  if (route.query.account || route.query.from === 'reset-forgot-password' || route.query.banned === 'true') return
  router.replace({ name: 'auth-verify' })
})

onMounted((): void => {
  if (route.query.banned === 'true' && route.query.reason) {
    let detailText = String(route.query.reason)
    if (route.query.expiresAt) {
      detailText += ` (หมดอายุ: ${formattedQueryExpiresAt.value})`
    }
    toast.add({
      severity: 'error',
      summary: 'บัญชีถูกระงับการใช้งาน',
      detail: detailText,
      life: 7000
    })
  }
})
</script>

<style scoped>

</style>
