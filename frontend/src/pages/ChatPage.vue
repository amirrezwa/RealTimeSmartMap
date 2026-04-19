<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { io } from 'socket.io-client'

type Message = {
  userId: number
  username: string
  text: string
  time: string | Date
}

const socket = io('http://localhost:3000/api')
const route = useRoute()

const groupId = route.query.group as string

const userId = Math.floor(Math.random() * 1000)
const username = `User-${userId}`

const message = ref('')
const messages = ref<Message[]>([])
const onlineUsers = ref<number[]>([])
const messagesRef = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  void nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

onMounted(() => {
  socket.emit('joinGroup', { userId, groupId })

  socket.on('receiveMessage', (msg: Message) => {
    if (msg.userId === userId) {
      return
    }

    messages.value.push(msg)
    scrollToBottom()
  })

  socket.on('onlineUsers', (users: number[]) => {
    onlineUsers.value = users
  })
})

const sendMessage = () => {
  if (!message.value.trim()) {
    return
  }

  const tempMsg: Message = {
    userId,
    username,
    text: message.value,
    time: new Date()
  }

  messages.value.push(tempMsg)
  scrollToBottom()

  socket.emit('sendMessage', {
    userId,
    text: message.value,
    groupId
  })

  message.value = ''
}

const formatTime = (time: string | Date) => {
  const d = new Date(time)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="chat">

    <div class="online-bar">
      🟢 Online: {{ onlineUsers.length }}

      <span
        v-for="id in onlineUsers"
        :key="id"
        class="user-dot"
      >
        {{ id }}
      </span>
    </div>

    <div class="messages" ref="messagesRef">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="bubble-wrapper"
        :class="{ me: m.userId === userId }"
      >
        <div class="bubble">
          <div class="username" v-if="m.userId !== userId">
            {{ m.username }}
          </div>

          <div class="text">
            {{ m.text }}
          </div>

          <div class="time">
            {{ formatTime(m.time) }}
          </div>
        </div>
      </div>
    </div>

    <div class="input">
      <input
        v-model="message"
        placeholder="type message..."
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">Send</button>
    </div>

  </div>
</template>

<style>
.chat {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.online-bar {
  padding: 8px;
  font-size: 14px;
  background: #f3f4f6;
  border-radius: 8px;
  margin-bottom: 10px;
}

.user-dot {
  display: inline-block;
  margin-left: 6px;
  padding: 4px 8px;
  background: #22c55e;
  color: white;
  border-radius: 999px;
  font-size: 12px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 10px;
}

.bubble-wrapper {
  display: flex;
}

.bubble-wrapper.me {
  justify-content: flex-end;
}

.bubble {
  max-width: 70%;
  padding: 10px 12px;
  border-radius: 14px;
  background: #eee;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble-wrapper.me .bubble {
  background: #4f46e5;
  color: white;
}

.username {
  font-size: 12px;
  font-weight: bold;
  opacity: 0.7;
}

.text {
  font-size: 14px;
}

.time {
  font-size: 10px;
  opacity: 0.6;
  align-self: flex-end;
}

.input {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
}

button {
  padding: 10px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>