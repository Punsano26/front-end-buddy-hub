import { defineStore } from 'pinia'
import type { chatEnum } from '~/models/enums/Chat.enum'
import type { ICreateMessageData } from '~/models/response/ChatRes.model'

export interface ILatestConversationActivity {
  otherUserId: number
  lastMessage: string
  createdAt: string
  messageType: chatEnum
  activityKey: number
}

interface IChatState {
  unreadMessageIdsByUserId: Record<number, Record<number, true>>
  unreadMessageFriendIdsByUserId: Record<number, Record<number, number>>
  unreadConversationCountsByUserId: Record<number, Record<number, number>>
  activeUserId: number | null
  latestConversationActivity: ILatestConversationActivity | null
}

function toPositiveInt (value: number, fallback: number = 0): number {
  if (!Number.isFinite(value) || value <= 0) return fallback

  return Math.floor(value)
}

export const useChatStore = defineStore('Chat', {
  state: (): IChatState => ({
    unreadMessageIdsByUserId: {},
    unreadMessageFriendIdsByUserId: {},
    unreadConversationCountsByUserId: {},
    activeUserId: null,
    latestConversationActivity: null
  }),

  getters: {
    unreadCount: (state: IChatState): number => {
      if (!state.activeUserId) return 0

      const unreadConversationCounts = state.unreadConversationCountsByUserId[state.activeUserId] || {}

      return Object.values(unreadConversationCounts).reduce((total: number, count: number): number => {
        return total + toPositiveInt(count)
      }, 0)
    },

    unreadConversationCounts: (state: IChatState): Record<number, number> => {
      if (!state.activeUserId) return {}

      return state.unreadConversationCountsByUserId[state.activeUserId] || {}
    },

    unreadConversationCount: (state: IChatState): ((friendId: number) => number) => {
      return (friendId: number): number => {
        if (!state.activeUserId) return 0
        if (!Number.isFinite(friendId) || friendId <= 0) return 0

        const unreadConversationCounts = state.unreadConversationCountsByUserId[state.activeUserId] || {}

        return toPositiveInt(unreadConversationCounts[friendId] ?? 0)
      }
    }
  },

  actions: {
    resolveUserId (userId?: number): number | null {
      if (Number.isFinite(userId as number) && (userId as number) > 0) {
        return userId as number
      }

      return this.activeUserId
    },

    ensureUnreadMessageIdBucket (userId: number): Record<number, true> {
      if (!this.unreadMessageIdsByUserId[userId]) {
        this.unreadMessageIdsByUserId[userId] = {}
      }

      return this.unreadMessageIdsByUserId[userId]
    },

    ensureUnreadConversationCountBucket (userId: number): Record<number, number> {
      if (!this.unreadConversationCountsByUserId[userId]) {
        this.unreadConversationCountsByUserId[userId] = {}
      }

      return this.unreadConversationCountsByUserId[userId]
    },

    ensureUnreadMessageFriendIdBucket (userId: number): Record<number, number> {
      if (!this.unreadMessageFriendIdsByUserId[userId]) {
        this.unreadMessageFriendIdsByUserId[userId] = {}
      }

      return this.unreadMessageFriendIdsByUserId[userId]
    },

    pushConversationActivity (activity: Omit<ILatestConversationActivity, 'activityKey'>): void {
      if (!Number.isFinite(activity.otherUserId) || activity.otherUserId <= 0) return

      this.latestConversationActivity = {
        ...activity,
        activityKey: Date.now()
      }
    },

    pushConversationActivityFromMessage (
      message: Pick<ICreateMessageData, 'senderId' | 'receiverId' | 'messageText' | 'createdAt' | 'messageType'>,
      currentUserId: number
    ): void {
      if (!Number.isFinite(currentUserId) || currentUserId <= 0) return

      const otherUserId = message.senderId === currentUserId
        ? message.receiverId
        : message.senderId

      if (!Number.isFinite(otherUserId) || otherUserId <= 0) return

      const isMedia = message.messageType?.toUpperCase() === 'MEDIA'
      const lastMessage = message.messageText || (isMedia ? '📷 รูปภาพ' : '')

      this.pushConversationActivity({
        otherUserId,
        lastMessage,
        createdAt: message.createdAt,
        messageType: message.messageType
      })
    },

    setActiveUserId (userId: number | null): void {
      this.activeUserId = Number.isFinite(userId as number) && (userId as number) > 0
        ? (userId as number)
        : null
    },

    setConversationUnreadCount (friendId: number, unreadCount: number, userId?: number): void {
      if (!Number.isFinite(friendId) || friendId <= 0) return

      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      const bucket = this.ensureUnreadConversationCountBucket(resolvedUserId)
      const normalizedUnreadCount = toPositiveInt(unreadCount)

      if (normalizedUnreadCount <= 0) {
        const { [friendId]: _, ...rest } = bucket
        this.unreadConversationCountsByUserId[resolvedUserId] = rest as Record<number, number>
        return
      }

      bucket[friendId] = normalizedUnreadCount
    },

    setConversationUnreadCounts (unreadCounts: Record<number, number>, userId?: number): void {
      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      const nextBucket: Record<number, number> = {}

      Object.entries(unreadCounts).forEach(([friendId, unreadCount]: [string, number]): void => {
        const resolvedFriendId = Number(friendId)
        const normalizedUnreadCount = toPositiveInt(unreadCount)

        if (!Number.isFinite(resolvedFriendId) || resolvedFriendId <= 0 || normalizedUnreadCount <= 0) return

        nextBucket[resolvedFriendId] = normalizedUnreadCount
      })

      this.unreadConversationCountsByUserId[resolvedUserId] = nextBucket
      this.unreadMessageIdsByUserId[resolvedUserId] = {}
      this.unreadMessageFriendIdsByUserId[resolvedUserId] = {}
    },

    incrementConversationUnreadCount (friendId: number, amount: number = 1, userId?: number): void {
      if (!Number.isFinite(friendId) || friendId <= 0) return

      const normalizedAmount = toPositiveInt(amount)
      if (normalizedAmount <= 0) return

      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      const bucket = this.ensureUnreadConversationCountBucket(resolvedUserId)
      const currentUnreadCount = toPositiveInt(bucket[friendId] ?? 0)

      bucket[friendId] = currentUnreadCount + normalizedAmount
    },

    decrementConversationUnreadCount (friendId: number, amount: number = 1, userId?: number): void {
      if (!Number.isFinite(friendId) || friendId <= 0) return

      const normalizedAmount = toPositiveInt(amount)
      if (normalizedAmount <= 0) return

      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      const bucket = this.ensureUnreadConversationCountBucket(resolvedUserId)
      const currentUnreadCount = toPositiveInt(bucket[friendId] ?? 0)

      if (currentUnreadCount <= normalizedAmount) {
        const { [friendId]: _, ...rest } = bucket
        this.unreadConversationCountsByUserId[resolvedUserId] = rest as Record<number, number>
        return
      }

      bucket[friendId] = currentUnreadCount - normalizedAmount
    },

    addUnreadMessageId (messageId: number, userId?: number, friendId?: number): void {
      if (!Number.isFinite(messageId) || messageId <= 0) return

      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      const bucket = this.ensureUnreadMessageIdBucket(resolvedUserId)

      if (bucket[messageId]) return

      bucket[messageId] = true

      if (Number.isFinite(friendId as number) && (friendId as number) > 0) {
        const messageFriendIdBucket = this.ensureUnreadMessageFriendIdBucket(resolvedUserId)
        messageFriendIdBucket[messageId] = friendId as number
      }

      if (Number.isFinite(friendId as number) && (friendId as number) > 0) {
        this.incrementConversationUnreadCount(friendId as number, 1, resolvedUserId)
      }
    },

    removeUnreadMessageId (messageId: number, userId?: number, friendId?: number): void {
      if (!Number.isFinite(messageId) || messageId <= 0) return

      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      const bucket = this.unreadMessageIdsByUserId[resolvedUserId]
      if (!bucket || !bucket[messageId]) return

      const messageFriendIdBucket = this.unreadMessageFriendIdsByUserId[resolvedUserId] || {}
      const mappedFriendId = messageFriendIdBucket[messageId]

      const { [messageId]: _, ...rest } = bucket
      this.unreadMessageIdsByUserId[resolvedUserId] = rest as Record<number, true>

      if (messageFriendIdBucket[messageId]) {
        const { [messageId]: __, ...restMessageFriendIds } = messageFriendIdBucket
        this.unreadMessageFriendIdsByUserId[resolvedUserId] = restMessageFriendIds as Record<number, number>
      }

      const resolvedFriendId = Number.isFinite(friendId as number) && (friendId as number) > 0
        ? friendId as number
        : toPositiveInt(mappedFriendId ?? 0)

      if (resolvedFriendId > 0) {
        this.decrementConversationUnreadCount(resolvedFriendId, 1, resolvedUserId)
      }
    },

    removeUnreadMessageIds (messageIds: number[], userId?: number, friendId?: number): void {
      if (!Array.isArray(messageIds) || messageIds.length === 0) return

      const normalizedMessageIds = Array.from(new Set(
        messageIds.filter((messageId: number): boolean => Number.isFinite(messageId) && messageId > 0)
      ))

      if (normalizedMessageIds.length === 0) return

      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      const bucket = this.unreadMessageIdsByUserId[resolvedUserId] || {}
      const messageFriendIdBucket = this.unreadMessageFriendIdsByUserId[resolvedUserId] || {}
      const messageIdSet = new Set(normalizedMessageIds)
      const nextBucket = Object.fromEntries(
        Object.entries(bucket).filter(([key]: [string, true]): boolean => {
          return !messageIdSet.has(Number(key))
        })
      ) as Record<number, true>

      const removedMessageCountsByFriendId: Record<number, number> = {}

      normalizedMessageIds.forEach((messageId: number): void => {
        const mappedFriendId = toPositiveInt(messageFriendIdBucket[messageId] ?? 0)
        if (mappedFriendId <= 0) return

        removedMessageCountsByFriendId[mappedFriendId] = (removedMessageCountsByFriendId[mappedFriendId] ?? 0) + 1
      })

      const nextMessageFriendIdBucket = Object.fromEntries(
        Object.entries(messageFriendIdBucket).filter(([key]: [string, number]): boolean => {
          return !messageIdSet.has(Number(key))
        })
      ) as Record<number, number>

      this.unreadMessageIdsByUserId[resolvedUserId] = nextBucket
      this.unreadMessageFriendIdsByUserId[resolvedUserId] = nextMessageFriendIdBucket

      if (Number.isFinite(friendId as number) && (friendId as number) > 0) {
        this.decrementConversationUnreadCount(friendId as number, normalizedMessageIds.length, resolvedUserId)
        return
      }

      Object.entries(removedMessageCountsByFriendId).forEach(([friendIdKey, count]: [string, number]): void => {
        const resolvedFriendId = Number(friendIdKey)

        if (!Number.isFinite(resolvedFriendId) || resolvedFriendId <= 0) return

        this.decrementConversationUnreadCount(resolvedFriendId, count, resolvedUserId)
      })
    },

    resetUnread (userId?: number): void {
      const resolvedUserId = this.resolveUserId(userId)
      if (!resolvedUserId) return

      this.unreadMessageIdsByUserId[resolvedUserId] = {}
      this.unreadMessageFriendIdsByUserId[resolvedUserId] = {}
      this.unreadConversationCountsByUserId[resolvedUserId] = {}
    }
  },

  persist: {
    pick: ['unreadMessageIdsByUserId', 'unreadConversationCountsByUserId', 'activeUserId'],
    storage: import.meta.client ? localStorage : undefined
  }
})
