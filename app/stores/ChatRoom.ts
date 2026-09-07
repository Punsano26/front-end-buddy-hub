import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useChatStore } from './Chat'
import type { ICreateMessagePayload } from '~/models/request/ChatReq.model'
import type { ICreateMessageData, ICreateMessageResponse, IGetMessageLimitResponse } from '~/models/response/ChatRes.model'
import type { IMessageResponse, TErrorResponse } from '~/models/response/Response.model'
import ChatProvider, { type IChatProvider } from '~/resource/provider/Chat.provider'
import { chatEnum } from '~/models/enums/Chat.enum'
import { AttachmentTypeEnum } from '~/models/enums/Attachment.enum'
import { UploadCategoryEnum } from '~/models/enums/Upload.enum'
import UploadProvider, { type IUploadProvider } from '~/resource/provider/Upload.provider'
import type { ICreateUploadResponse } from '~/models/response/UploadRes.model'

export type IChatMessageItem = ICreateMessageData & {
  isSending?: boolean
  isEditing?: boolean
}

const FALLBACK_SEND_ERROR = 'เกิดข้อผิดพลาดระหว่างส่งข้อความ'

interface ISubmitMessageOptions {
  messageText: string
  receiverId: number
  messageType: ICreateMessagePayload['messageType']
  currentUserId: number
  isEditingMessage?: boolean
  editingMessageId?: number | null
  onMessagesUpdated?: () => Promise<void> | void
}

export interface ISubmitMediaMessageOptions {
  file: File
  previewUrl: string
  receiverId: number
  currentUserId: number
  onMessagesUpdated?: () => Promise<void> | void
}

interface IChatRoomState {
  messages: IChatMessageItem[]
  isSubmittingMessage: boolean
  sendErrors: Record<number, string>
}

function toReadableMessage (value: unknown): string {
  if (typeof value === 'string') return value.trim()

  if (Array.isArray(value)) {
    const firstString = value.find((item: unknown): item is string => typeof item === 'string')
    return firstString?.trim() || ''
  }

  return ''
}

function normalizeErrorMessage (error: TErrorResponse): string {
  const topLevelMessage = toReadableMessage(error?.message)
  if (topLevelMessage) return topLevelMessage


  return FALLBACK_SEND_ERROR
}

export const useChatRoomStore = defineStore('ChatRoom', {
  state: (): IChatRoomState => ({
    messages: [],
    isSubmittingMessage: false,
    sendErrors: {}
  }),

  actions: {
    setMessages (messages: ICreateMessageData[]): void {
      this.messages = messages
    },

    clearMessages (): void {
      this.messages = []
    },

    markMessagesAsRead (messageIds: number[]): void {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return

      this.messages = this.messages.map((item: IChatMessageItem): IChatMessageItem => {
        if (messageIds.includes(item.id)) {
          return { ...item, isRead: true }
        }
        return item
      })
    },

    getSendError (receiverId: number): string {
      if (receiverId <= 0) return ''

      return this.sendErrors[receiverId] || ''
    },

    setSendError (receiverId: number, message: string): void {
      if (receiverId <= 0) return

      this.sendErrors = {
        ...this.sendErrors,
        [receiverId]: message
      }
    },

    clearSendError (receiverId: number): void {
      if (receiverId <= 0 || !this.sendErrors[receiverId]) return

      const { [receiverId]: _removed, ...nextErrors } = this.sendErrors
      this.sendErrors = nextErrors
    },

    upsertMessage (message: ICreateMessageData | IChatMessageItem): void {
      const existingIndex = this.messages.findIndex((item: IChatMessageItem): boolean => item.id === message.id)

      if (existingIndex >= 0) {
        this.messages[existingIndex] = message
        return
      }

      this.messages.push(message)
    },

    removeMessageById (messageId: number): void {
      this.messages = this.messages.filter((item: IChatMessageItem): boolean => item.id !== messageId)
    },

    replaceMessageById (messageId: number, nextMessage: ICreateMessageData): void {
      let isReplaced = false

      this.messages = this.messages.map((item: IChatMessageItem): IChatMessageItem => {
        if (item.id === messageId) {
          isReplaced = true
          return nextMessage
        }

        return item
      })

      if (!isReplaced) {
        this.messages.push(nextMessage)
      }
    },

    setMessageEditingState (messageId: number, isEditing: boolean): void {
      this.messages = this.messages.map((item: IChatMessageItem): IChatMessageItem => {
        if (item.id !== messageId) return item

        return {
          ...item,
          isEditing
        }
      })
    },

    async editMessage (messageId: number, messageText: string, receiverId: number): Promise<boolean> {
      const chatService: IChatProvider = new ChatProvider()
      const { $handleLoading } = useNuxtApp()
      const silentLoadingUnit = ref(false)
      let requestError: TErrorResponse | undefined
      const nextMessageText = messageText.trim()

      if (!nextMessageText || messageId <= 0) return false

      if (!this.messages.some((item: IChatMessageItem): boolean => item.id === messageId)) return false

      this.setMessageEditingState(messageId, true)

      try {
        const editRequest = (): Promise<IMessageResponse> => chatService.updateMessage({ messageId, messageText: nextMessageText })
        const response = await $handleLoading<IMessageResponse>(editRequest, {
          loadingUnit: silentLoadingUnit,
          errorCallBack: (error?: TErrorResponse): void => {
            requestError = error
          }
        })

        if (!response) {
          this.setSendError(receiverId, normalizeErrorMessage(requestError))
          return false
        }

        this.messages = this.messages.map((item: IChatMessageItem): IChatMessageItem => {
          if (item.id !== messageId) return item

          return {
            ...item,
            messageText: nextMessageText,
            isEditing: false
          }
        })

        return true
      } finally {
        this.setMessageEditingState(messageId, false)
      }
    },

    async checkMessageLimit (receiverId: number): Promise<boolean> {
      const chatService: IChatProvider = new ChatProvider()
      const { $handleLoading } = useNuxtApp()
      const silentLoadingUnit = ref(false)

      if (receiverId <= 0) return true

      const limitRequest = (): Promise<IGetMessageLimitResponse> => chatService.getMessageLimit(receiverId)
      const response = await $handleLoading<IGetMessageLimitResponse>(limitRequest, {
        loadingUnit: silentLoadingUnit
      })

      if (!response?.data) return true

      if (response.data.limitReached) {
        this.setSendError(receiverId, response.message || '')
        return false
      }

      this.clearSendError(receiverId)
      return true
    },

    async sendOptimisticMessage (options: ISubmitMessageOptions): Promise<boolean> {
      const chatService: IChatProvider = new ChatProvider()
      const chatStore = useChatStore()
      const { $handleLoading } = useNuxtApp()
      const silentLoadingUnit = ref(false)
      const nextMessageText = options.messageText.trim()

      if (!nextMessageText) return false

      const payload: ICreateMessagePayload = {
        receiverId: options.receiverId,
        messageType: options.messageType,
        messageText: nextMessageText
      }

      const now = new Date().toISOString()
      const tempMessageId = -(Date.now() + Math.floor(Math.random() * 1000))
      const optimisticMessage: IChatMessageItem = {
        id: tempMessageId,
        senderId: options.currentUserId,
        receiverId: options.receiverId,
        messageType: payload.messageType,
        messageText: payload.messageText,
        createdAt: now,
        updatedAt: now,
        deletedAt: '',
        attachments: [],
        isRead: false,
        isSending: true
      }

      this.upsertMessage(optimisticMessage)
      await options.onMessagesUpdated?.()

      try {
        const createRequest = (): Promise<ICreateMessageResponse> => chatService.createMessage(payload)
        const response = await $handleLoading<ICreateMessageResponse>(createRequest, {
          loadingUnit: silentLoadingUnit
        })

        if (!response?.data) {
          this.removeMessageById(tempMessageId)
          return false
        }

        const isMessageAlreadySynced = this.messages.some(
          (item: IChatMessageItem): boolean => item.id === response.data.id
        )

        if (isMessageAlreadySynced) {
          this.removeMessageById(tempMessageId)
        } else {
          this.replaceMessageById(tempMessageId, response.data)
        }

        chatStore.pushConversationActivityFromMessage(response.data, options.currentUserId)
        await options.onMessagesUpdated?.()
        return true
      } catch (error: TErrorResponse) {
        this.removeMessageById(tempMessageId)
        throw error
      }
    },

    async submitMessage (options: ISubmitMessageOptions): Promise<boolean> {
      if (this.isSubmittingMessage) return false

      this.isSubmittingMessage = true
      this.clearSendError(options.receiverId)

      try {
        const nextMessageText = options.messageText.trim()

        if (!nextMessageText) return false

        if (options.isEditingMessage) {
          const messageId = options.editingMessageId || 0

          return await this.editMessage(messageId, nextMessageText, options.receiverId)
        }

        const canSend = await this.checkMessageLimit(options.receiverId)

        if (!canSend) return false

        return await this.sendOptimisticMessage({
          ...options,
          messageText: nextMessageText
        })
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || 'เกิดข้อผิดพลาดระหว่างส่งข้อความ'
        this.setSendError(options.receiverId, errorMsg)
        return false
      } finally {
        this.isSubmittingMessage = false
      }
    },

    async sendOptimisticMediaMessage (options: ISubmitMediaMessageOptions): Promise<boolean> {
      const uploadService: IUploadProvider = new UploadProvider()
      const chatStore = useChatStore()
      const { $handleLoading } = useNuxtApp()
      const silentLoadingUnit = ref(false)

      const now = new Date().toISOString()
      const tempMessageId = -(Date.now() + Math.floor(Math.random() * 1000))
      const optimisticMessage: IChatMessageItem = {
        id: tempMessageId,
        senderId: options.currentUserId,
        receiverId: options.receiverId,
        messageType: chatEnum.MEDIA,
        messageText: '',
        createdAt: now,
        updatedAt: now,
        deletedAt: '',
        attachments: [
          {
            id: tempMessageId,
            attachmentType: AttachmentTypeEnum.IMAGE,
            url: options.previewUrl,
            name: options.file.name,
            size: options.file.size,
            mimeType: options.file.type
          }
        ],
        isRead: false,
        isSending: true
      }

      this.upsertMessage(optimisticMessage)
      await options.onMessagesUpdated?.()

      try {
        const uploadRequest = (): Promise<ICreateUploadResponse> => uploadService.onUpload({
          category: UploadCategoryEnum.MESSAGE,
          files: options.file,
          partnerId: options.receiverId
        })

        const response = await $handleLoading<ICreateUploadResponse>(uploadRequest, {
          loadingUnit: silentLoadingUnit
        })

        const messageData = response?.data as ICreateMessageData | undefined
        if (!messageData || typeof messageData.id !== 'number') {
          this.removeMessageById(tempMessageId)
          return false
        }

        const isMessageAlreadySynced = this.messages.some(
          (item: IChatMessageItem): boolean => item.id === messageData.id
        )

        if (isMessageAlreadySynced) {
          this.removeMessageById(tempMessageId)
        } else {
          this.replaceMessageById(tempMessageId, messageData)
        }

        chatStore.pushConversationActivityFromMessage(messageData, options.currentUserId)
        await options.onMessagesUpdated?.()
        return true
      } catch (error: any) {
        this.removeMessageById(tempMessageId)
        throw error
      }
    },

    async submitMediaMessage (options: ISubmitMediaMessageOptions): Promise<boolean> {
      if (this.isSubmittingMessage) return false

      this.isSubmittingMessage = true
      this.clearSendError(options.receiverId)

      try {
        const canSend = await this.checkMessageLimit(options.receiverId)
        if (!canSend) return false

        return await this.sendOptimisticMediaMessage(options)
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || 'เกิดข้อผิดพลาดระหว่างส่งรูปภาพ'
        this.setSendError(options.receiverId, errorMsg)
        return false
      } finally {
        this.isSubmittingMessage = false
      }
    }
  }
})
