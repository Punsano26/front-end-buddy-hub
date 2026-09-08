import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { defineStore } from 'pinia'
import { chatEnum } from '~/models/enums/Chat.enum'
import { RentStatusEnum } from '~/models/enums/Rent.enum'
import type { ICustomer, IFindOneSessionsMessagesList, IProvider, IRentAPostData } from '~/models/response/RentRes.model'
import RentCustomerProvider from '~/resource/provider/RentCustomer.provider'
import { useHireTimer } from '~/composables/useHireTimer'
import { useAuthStore } from '~/stores/Auth'

export interface IRentAPostDataWithStatus extends IRentAPostData {
  sessionStatus?: string
}

export interface IPartnerInfo {
  id: number
  nickname: string
  username: string
  profileImg: string
  status: string
  sessionStatus: 'active' | 'pending' | 'finished' | ''
  maxDurationMinutes: number
  welcomeMessage: string
}

export interface IRentMessageItem {
  id: number
  sender: 'self' | 'partner'
  text: string
  createdAt: Date
  isRead?: boolean
  isSending?: boolean
  isEditing?: boolean
}

export interface IRentChatStore {
  messages: Ref<IRentMessageItem[]>
  item: Ref<IRentAPostData | undefined>
  isCompleting: Ref<boolean>
  requestCompleteBy: Ref<number | null>
  remainingSeconds: Ref<number>
  editingMessageId: Ref<number | null>
  activeMenuMessageId: Ref<number | null>
  isTyping: Ref<boolean>
  isMarkingRead: Ref<boolean>
  partner: ComputedRef<ICustomer | IProvider | null>
  partnerName: ComputedRef<string>
  partnerProfileImg: ComputedRef<string>
  currentPartner: ComputedRef<IPartnerInfo | null>
  countdownText: ComputedRef<string>
  clear: () => void
  fetchSession: (sessionId: number) => Promise<void>
  markSessionMessagesAsRead: (sessionId: number, currentUserId: number) => Promise<void>
  fetchMessages: (sessionId: number, paginationVal: any) => Promise<void>
  handleSendMessage: (sessionId: number, text: string, currentUserId: number) => Promise<void>
  confirmDeleteMessage: (messageId: number, sessionId: number) => Promise<void>
  startCountdown: () => void
  stopCountdown: () => void
  setTyping: (value: boolean) => void
  startEditMessage: (message: { id: number, text: string }) => void
  cancelEditMessage: () => void
  updatePartnerPresence: (isOnline: boolean) => void
  handleSocketMessage: (event: MessageEvent, sessionId: number, currentUserId: number) => void
}

export const useRentChatStore = defineStore('RentChat', (): IRentChatStore => {
  const rentCustomerProvider = new RentCustomerProvider()
  const imageBaseUrl = import.meta.env.VITE_ENV_BASE_FILE_URL + '/'

  // --- State ---
  const messages = ref<IRentMessageItem[]>([])
  const item = ref<IRentAPostData | undefined>(undefined)
  const isCompleting = ref<boolean>(false)
  const requestCompleteBy = ref<number | null>(null)
  const { remainingSeconds, formattedTime, isExpired } = useHireTimer(item)
  const editingMessageId = ref<number | null>(null)
  const activeMenuMessageId = ref<number | null>(null)
  const isTyping = ref<boolean>(false)
  const isMarkingRead = ref<boolean>(false)

  const conversationsRent = useState<IRentAPostDataWithStatus[]>('conversationsRent', (): IRentAPostDataWithStatus[] => [])

  watch(
    (): boolean => isExpired.value, (val: boolean): void => {
      if (val && item.value && item.value.status === RentStatusEnum.ACTIVE) {
        item.value.status = RentStatusEnum.EXPIRED
      }
    }
  )

  // --- Getters / Computed ---
  const partner = computed((): ICustomer | IProvider | null => {
    if (item.value) {
      const authStore = useAuthStore()
      return authStore.user.id === item.value.customerId
        ? item.value.provider
        : item.value.customer
    }
    return null
  })

  const partnerName = computed((): string => {
    const p = partner.value
    return p?.nickname || p?.username || ''
  })

  const partnerProfileImg = computed((): string => {
    const p = partner.value
    if (item.value && p?.profileImg) {
      return imageBaseUrl + p.profileImg
    }
    return p?.profileImg ? p.profileImg : '/png/upload-profile.png'
  })

  const currentPartner = computed((): IPartnerInfo | null => {
    if (!item.value) {
      return null
    }
    const p = partner.value
    const isFinishedVal = item.value.status === RentStatusEnum.COMPLETED
      || item.value.status === RentStatusEnum.CANCELLED
      || item.value.status === RentStatusEnum.REJECTED
    const isPendingVal = item.value.status === RentStatusEnum.PENDING
    const statusStr = isPendingVal ? 'pending' : (isFinishedVal ? 'finished' : 'active')

    return {
      id: item.value.id,
      nickname: p?.nickname || p?.username || '',
      username: p?.username || '',
      profileImg: p?.profileImg ? imageBaseUrl + p.profileImg : '/png/upload-profile.png',
      status: p?.isOnline ? 'online' : 'offline',
      sessionStatus: statusStr,
      maxDurationMinutes: item.value.hirePost?.maxDurationMinutes ?? 0,
      welcomeMessage: item.value.hirePost?.tagline || ''
    }
  })

  const countdownText = computed((): string => {
    if (!currentPartner.value) return 'รออนุมัติ...'
    if (currentPartner.value.sessionStatus === 'pending') return 'รออนุมัติ...'
    if (currentPartner.value.sessionStatus === 'finished') return 'สิ้นสุดเซสชัน'

    return `นับถอยหลัง ${formattedTime.value}`
  })

  // --- Actions ---
  function clear (): void {
    messages.value = []
    item.value = undefined
    isCompleting.value = false
    requestCompleteBy.value = null
    remainingSeconds.value = 0
    editingMessageId.value = null
    activeMenuMessageId.value = null
    isTyping.value = false
    isMarkingRead.value = false
  }

  async function fetchSession (sessionId: number): Promise<void> {
    const response = await rentCustomerProvider.findOneConversationSessionById(sessionId)
    if (response.data) {
      item.value = response.data
      isCompleting.value = response.data.status === RentStatusEnum.COMPLETING
        || !!(
          response.data.requestCompleteBy
          || response.data.requestCompletedBy
          || response.data.completionRequestedBy
          || response.data.isCompleting
        )
      requestCompleteBy.value = response.data.requestCompleteBy
        || response.data.requestCompletedBy
        || response.data.completionRequestedBy
        || null
      const idx = conversationsRent.value.findIndex((p: IRentAPostDataWithStatus): boolean => p.id === response.data.id)
      const isFinishedVal = response.data.status === RentStatusEnum.COMPLETED
        || response.data.status === RentStatusEnum.CANCELLED
        || response.data.status === RentStatusEnum.REJECTED
      const isPendingVal = response.data.status === RentStatusEnum.PENDING
      const statusStr = isPendingVal ? 'pending' : (isFinishedVal ? 'finished' : 'active')

      if (idx !== -1) {
        conversationsRent.value[idx] = {
          ...conversationsRent.value[idx],
          ...response.data,
          sessionStatus: statusStr
        }
      } else {
        conversationsRent.value.push({
          ...response.data,
          sessionStatus: statusStr
        })
      }
    }
  }

  async function markSessionMessagesAsRead (sessionId: number, currentUserId: number): Promise<void> {
    if (isMarkingRead.value) return
    if (currentUserId <= 0 || sessionId <= 0) return

    const hasUnread = messages.value.some(
      (m: IRentMessageItem): boolean => m.sender === 'partner' && !m.isRead
    )
    if (!hasUnread) return

    isMarkingRead.value = true
    try {
      await rentCustomerProvider.markMessagesAsRead(sessionId)
      messages.value = messages.value.map((m: IRentMessageItem): IRentMessageItem => {
        if (m.sender === 'partner') {
          return { ...m, isRead: true }
        }
        return m
      })
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    } finally {
      isMarkingRead.value = false
    }
  }

  async function fetchMessages (sessionId: number, paginationVal: any): Promise<void> {
    const authStore = useAuthStore()
    const response = await rentCustomerProvider.findOneSessionMessagesPaginate({
      page: paginationVal.page,
      limit: paginationVal.limit
    }, sessionId)

    if (response?.data) {
      const rawMessages: IFindOneSessionsMessagesList[] = response.data
      messages.value = rawMessages.map((m: IFindOneSessionsMessagesList): IRentMessageItem => ({
        id: m.id,
        sender: m.senderId === authStore.user.id ? 'self' : 'partner',
        text: m.messageText,
        createdAt: new Date(m.createdAt),
        isRead: m.isRead
      })).sort((a: IRentMessageItem, b: IRentMessageItem): number => Number(a.createdAt) - Number(b.createdAt))
    } else {
      messages.value = []
    }
  }

  async function handleSendMessage (sessionId: number, text: string, currentUserId: number): Promise<void> {
    const trimmedText = text.trim()
    if (!trimmedText) return
    if (currentPartner.value?.sessionStatus === 'finished') return

    if (editingMessageId.value !== null) {
      const messageId = editingMessageId.value
      const response = await rentCustomerProvider.updateSessionMessage({
        messageText: trimmedText
      }, messageId, sessionId)

      if (response.data) {
        messages.value = messages.value.map((m: IRentMessageItem): IRentMessageItem => {
          if (m.id === messageId) {
            return {
              ...m,
              text: response.data.messageText
            }
          }
          return m
        })
      }
      cancelEditMessage()
    } else {
      const response = await rentCustomerProvider.createSessionMessage({
        messageType: chatEnum.TEXT,
        messageText: trimmedText
      }, sessionId)

      if (response.data) {
        const data: IFindOneSessionsMessagesList = response.data
        if (!messages.value.some((m: IRentMessageItem): boolean => m.id === data.id)) {
          messages.value.push({
            id: data.id,
            sender: data.senderId === currentUserId ? 'self' : 'partner',
            text: data.messageText,
            createdAt: new Date(data.createdAt),
            isRead: data.isRead
          })
        }
      }
    }
  }

  async function confirmDeleteMessage (messageId: number, sessionId: number): Promise<void> {
    await rentCustomerProvider.deleteSessionMessage(messageId, sessionId)
    messages.value = messages.value.filter(
      (m: IRentMessageItem): boolean => m.id !== messageId
    )
    if (editingMessageId.value === messageId) {
      cancelEditMessage()
    }
  }

  function startCountdown (): void {
    // Timer is managed reactively via useHireTimer using item.value.expiresAt
  }

  function stopCountdown (): void {
    // Timer is managed reactively via useHireTimer using item.value.expiresAt
  }

  function setTyping (value: boolean): void {
    isTyping.value = value
  }

  function startEditMessage (message: { id: number, text: string }): void {
    editingMessageId.value = message.id
  }

  function cancelEditMessage (): void {
    editingMessageId.value = null
  }

  function updatePartnerPresence (isOnline: boolean): void {
    if (!item.value) return
    const authStore = useAuthStore()
    if (authStore.user.id === item.value.customerId) {
      if (item.value.provider) {
        item.value.provider.isOnline = isOnline
      }
    } else {
      if (item.value.customer) {
        item.value.customer.isOnline = isOnline
      }
    }
  }

  function handleSocketMessage (event: MessageEvent, sessionId: number, currentUserId: number): void {
    let payload: any
    try {
      payload = JSON.parse(event.data)
    } catch {
      return
    }
    if (!payload || !payload.event) return

    console.log('RentChat WS Event:', payload.event, payload)

    const getSessionId = (data: any, root: any): number | null => {
      if (data) {
        if (typeof data === 'number') return data
        if (typeof data === 'string') {
          const num = Number(data)
          return isNaN(num) ? null : num
        }
        const val = data.hireSessionId || data.hire_session_id || data.id || data.sessionId || data.session_id
        if (val) return Number(val)
      }
      if (root) {
        const val = root.hireSessionId || root.hire_session_id || root.id || root.sessionId || root.session_id
        if (val) return Number(val)
      }
      return null
    }

    if (payload.event === 'service_new_message') {
      const data = payload.data
      if (data && Number(data.hireSessionId) === Number(sessionId)) {
        if (!messages.value.some((m: IRentMessageItem): boolean => m.id === data.id)) {
          messages.value.push({
            id: data.id,
            sender: data.senderId === currentUserId ? 'self' : 'partner',
            text: data.messageText,
            createdAt: new Date(data.createdAt),
            isRead: data.isRead
          })
          if (data.senderId !== currentUserId) {
            void markSessionMessagesAsRead(sessionId, currentUserId)
          }
        }
      }
    } else if (payload.event === 'service_message_updated') {
      const data = payload.data
      if (data && Number(data.hireSessionId) === Number(sessionId)) {
        messages.value = messages.value.map((m: IRentMessageItem): IRentMessageItem => {
          if (m.id === data.id) {
            return {
              ...m,
              text: data.messageText
            }
          }
          return m
        })
      }
    } else if (payload.event === 'service_message_deleted') {
      const data = payload.data
      const deletedId = data?.id || data
      if (deletedId) {
        messages.value = messages.value.filter((m: IRentMessageItem): boolean => m.id !== deletedId)
        if (editingMessageId.value === deletedId) {
          cancelEditMessage()
        }
      }
    } else if (payload.event === 'service_message_read') {
      messages.value = messages.value.map((m: IRentMessageItem): IRentMessageItem => {
        if (m.sender === 'self') {
          return { ...m, isRead: true }
        }
        return m
      })
    } else if (
      payload.event === 'session_started'
      || payload.event === 'session_expired'
      || payload.event === 'session_completing'
      || payload.event === 'session_completed'
      || payload.event === 'session_completing_expired'
    ) {
      const incomingSessionId = getSessionId(payload.data, payload)
      if (incomingSessionId !== null && Number(incomingSessionId) === Number(sessionId)) {
        if (payload.event === 'session_completing') {
          isCompleting.value = true
          const reqUserId = payload.data?.requestCompleteBy
            || payload.data?.requestCompletedBy
            || payload.data?.completionRequestedBy
            || payload.data?.requestedBy
            || payload.data?.userId
            || payload.data?.user_id
          if (reqUserId) {
            requestCompleteBy.value = Number(reqUserId)
          }
        } else if (payload.event === 'session_completed' || payload.event === 'session_completing_expired') {
          isCompleting.value = false
          requestCompleteBy.value = null
          if (payload.event === 'session_completed' && item.value) {
            item.value.status = RentStatusEnum.COMPLETED
          }
        }
        void fetchSession(sessionId)
      }
    }
  }

  return {
    messages,
    item,
    isCompleting,
    requestCompleteBy,
    remainingSeconds,
    editingMessageId,
    activeMenuMessageId,
    isTyping,
    isMarkingRead,
    partner,
    partnerName,
    partnerProfileImg,
    currentPartner,
    countdownText,
    clear,
    fetchSession,
    markSessionMessagesAsRead,
    fetchMessages,
    handleSendMessage,
    confirmDeleteMessage,
    startCountdown,
    stopCountdown,
    setTyping,
    startEditMessage,
    cancelEditMessage,
    updatePartnerPresence,
    handleSocketMessage
  }
})
