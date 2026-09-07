<template>
  <NuxtLink
    :to="{ name: 'public-chat-id', params: { id: props.conversation.id } }"
    class="block w-full min-w-0">
    <Card
      class="w-full max-w-full overflow-hidden"
      pt:body:class="pt-2">
      <template #content>
        <div
          v-if="unreadCount > 0"
          class="flex justify-end">
          <Badge
            :value="unreadCount"
            severity="success"
            size="small" />
        </div>
        <div class="flex items-center gap-3 min-w-0">

          <img
            :src="props.conversation.profileImg ? imageBaseUrl + props.conversation.profileImg : '/png/upload-profile.png'"
            class="w-10 h-10 rounded-sm object-cover shrink-0">

          <div class="flex-1 min-w-0 overflow-hidden pr-2">

            <p class="font-semibold truncate">
              {{ props.conversation.nickname || props.conversation.username }}
            </p>

            <p class="text-sm text-gray-500 line-clamp-1">
              <span v-if="props.conversation.lastMessageType?.toUpperCase() === 'MEDIA'">
                📷 {{ props.conversation.lastMessageText || 'รูปภาพ' }}
              </span>
              <span v-else>
                {{ props.conversation.lastMessageText }}
              </span>
            </p>
          </div>

          <span class="text-xs text-gray-400 whitespace-nowrap shrink-0 ml-2">
            {{ dayjs(props.conversation.lastMessageCreatedAt).format('hh:mm A') }}
          </span>

        </div>
      </template>
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { IFindAllConversationsList } from '~/models/response/ChatRes.model'
import { useChatStore } from '~/stores/Chat'

const props = defineProps<{
  conversation: IFindAllConversationsList
}>()

const chatStore = useChatStore()
const imageBaseUrl = import.meta.env.VITE_ENV_BASE_FILE_URL + '/'

const unreadCount = computed((): number => {
  return chatStore.unreadConversationCount(props.conversation.id)
})
</script>

<style scoped>
</style>
