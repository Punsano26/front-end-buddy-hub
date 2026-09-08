<template>
  <form @submit.prevent="register()">
    <div class="grid md:flex md:gap-2 gap-4 pt-2">
      <InputLabelField
        v-model="form.email"
        :rules="formRules.email"
        :show-error="submitted"
        label="อีเมล"
        placeholder="อีเมลของคุณ" />
      <InputLabelField
        v-model="form.username"
        :rules="formRules.username"
        :show-error="submitted"
        label="ชื่อผู้ใช้"
        placeholder="ชื่อผู้ใช้ของคุณ" />
    </div>
    <div class="grid md:flex md:gap-2 gap-4">
      <InputLabelField
        label="เพศ">
        <Select
          v-model="form.gender"
          :options="gender"
          class="rounded-xl w-full"
          option-label="label"
          option-value="value"
          placeholder="เลือกเพศของคุณ" />
      </InputLabelField>
      <InputBirthDatePicker
        v-model="form.dateOfBirth"
        :rules="formRules.dateOfBirth"
        :show-error="submitted"
        label="วันเกิด"
        placeholder="เลือกวันเกิดของคุณ"
        required />
    </div>

    <InputPasswordField
      v-model="form.password"
      :rules="formRules.password"
      :show-error="submitted"
      label="รหัสผ่าน" />
    <CheckPasswordStrength :password="form.password" />

    <InputPasswordField
      v-model="form.confirmPassword"
      :rules="formRules.confirmPassword"
      :show-error="submitted"
      label="ยืนยันรหัสผ่าน" />

    <CheckPolicyAccept v-model="checked" />

    <Button
      :disabled="!checked"
      label="สมัครสมาชิก"
      pt:label:class="font-bold"
      pt:root:class="bg-gradient-primary border-none rounded-xl py-3"
      type="submit" />
  </form>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import CheckPasswordStrength from '~/components/input/CheckPasswordStrength.vue'
import CheckPolicyAccept from '~/components/input/CheckPolicyAccept.vue'
import InputLabelField from '~/components/input/InputLabelField.vue'
import { genderEnum } from '~/models/enums/User.enum'
import type { IBaseOptions } from '~/models/Global.model'
import type { IAuthRegisterPayload } from '~/models/request/AuthReq.model'
import { validate, validateForm } from '~/plugins/Validate'
import type { IAuthProvider } from '~/resource/provider/Auth.provider'
import AuthProvider from '~/resource/provider/Auth.provider'
import PolicyProvider, { type IPolicyProvider } from '~/resource/provider/Policy.provider'

definePageMeta({
  title: 'สมัครสมาชิก',
  backPath: { name: 'auth-verify' }
})

const authService: IAuthProvider = new AuthProvider()
const policyService: IPolicyProvider = new PolicyProvider()
const toast = useToast()
const { $handleLoading } = useNuxtApp()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const submitted = ref(false)
const checked = ref(false)
const accountFromQuery = computed((): string => {
  const account = route.query.account
  if (Array.isArray(account)) return account[0] ?? ''
  return account ?? ''
})
const form = ref<IAuthRegisterPayload>({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  gender: genderEnum.MALE,
  dateOfBirth: ''
})

const formRules = computed((): Record<string, ((v: any) => boolean | string)[]> => ({
  email: [validate.required, validate.email],
  username: [validate.required, validate.textEnglish],
  dateOfBirth: [validate.required],
  password: [validate.required],
  confirmPassword: [
    validate.required,
    (val: string): boolean | string => validate.confirmPassword(val, form.value.password)
  ]
}))


const gender = ref<IBaseOptions[]>([
  {
    label: 'ผู้ชาย',
    value: genderEnum.MALE
  },
  {
    label: 'ผู้หญิง',
    value: genderEnum.FEMALE
  },
  {
    label: 'อื่นๆ',
    value: genderEnum.OTHER
  }
])

function checkQuery (): void {
  const account = accountFromQuery.value.trim()
  if (!account) return
  const isEmail = validate.email(account) === true
  form.value.email = isEmail ? account : ''
  form.value.username = isEmail ? '' : account
}

async function onRegister (): Promise<void> {
  if (!form.value.email || !form.value.username || !form.value.password || !form.value.confirmPassword
    || !form.value.gender || !form.value.dateOfBirth) {
    return
  }

  const payload: IAuthRegisterPayload = {
    email: form.value.email,
    username: form.value.username,
    password: form.value.password,
    confirmPassword: form.value.confirmPassword,
    gender: form.value.gender,
    dateOfBirth: form.value.dateOfBirth
  }
  const response = await authService.register(payload)
  const expireAt = response.tokenExpireAt ? Number(response.tokenExpireAt) : null
  authStore.userLogin(response.data, response.accessToken, response.refreshToken, Number(response.tokenExpiresIn), expireAt)

  try {
    await policyService.recordConsent()
  } catch (err: any) {
    console.warn('Failed to record policy consent during registration:', err)
  }

  router.push({ name: 'public-home' })
}

function register (): void {
  submitted.value = true
  if (!checked.value) {
    return
  }

  if (!validateForm(form.value, formRules.value)) {
    return
  }

  $handleLoading(onRegister, {
    toast: {
      instance: toast
    }
  })
}

onBeforeMount((): void => {
  if (!accountFromQuery.value) {
    router.replace({ name: 'auth-verify' })
    return
  }
  checkQuery()
})
</script>

<style scoped>

</style>
