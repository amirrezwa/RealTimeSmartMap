<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { io } from 'socket.io-client'
import axios from 'axios'


type ApiMessage = {
  id: number
  text: string | null
  lat: number | null
  lng: number | null
  userId: number
  createdAt: string
  user: {
    id: number
    username: string
  }
}

type Message = {
  userId: number
  username: string
  text?: string | null
  lat?: number | null
  lng?: number | null
  time: string | Date
}

const socket = io('http://localhost:3000')
const route = useRoute()
const groupId = route.query.group as string

const userId = ref<number | null>(null)
const username = ref('')

const message = ref('')
const messages = ref<Message[]>([])
const messagesRef = ref<HTMLElement | null>(null)

const initUser = async () => {
  const saved = localStorage.getItem('user')
  if (saved) return JSON.parse(saved)

  const res = await api.post('/users', {
  username: 'Guest-' + Math.floor(Math.random() * 1000)
})

  localStorage.setItem('user', JSON.stringify(res.data))
  return res.data
}

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
})

const scrollToBottom = () => {
  void nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

onMounted(async () => {
  const user = await initUser()
  userId.value = user.id
  username.value = user.username

  socket.emit('joinGroup', {
    userId: user.id,
    groupId
  })

  const res = await api.get(`/messages?groupId=${groupId}`)

  messages.value = res.data.map((m: ApiMessage) => ({
    userId: m.userId,
    username: m.user.username,
    text: m.text,
    lat: m.lat,
    lng: m.lng,
    time: m.createdAt
  }))

  socket.on('receiveMessage', (msg: Message) => {
    messages.value.push(msg)
    scrollToBottom()
  })
})

  scrollToBottom()

  socket.on('receiveMessage', (msg: Message) => {
    if (msg.userId === userId.value) {
      return
    }
    messages.value.push(msg)
    scrollToBottom()
  })

const sendMessage = () => {
  if (!message.value.trim() || !userId.value) {
    return
  }

  const tempMsg: Message = {
    userId: userId.value,
    username: username.value,
    text: message.value,
    time: new Date()
  }

  messages.value.push(tempMsg)
  scrollToBottom()

  socket.emit('sendMessage', {
    userId: userId.value,
    text: message.value,
    groupId
  })

  message.value = ''
}

const sendLocation = () => {
  if (!userId.value) return

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude

    const tempMsg: Message = {
      userId: userId.value!,
      username: username.value,
      lat,
      lng,
      time: new Date()
    }

    messages.value.push(tempMsg)
    scrollToBottom()

    socket.emit('sendMessage', {
      userId,
      lat,
      lng,
      groupId
    })
  })
}

const openMap = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
}

const formatTime = (time: string | Date) => {
  const d = new Date(time)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="chat">

    <div class="messages" ref="messagesRef">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="bubble"
        :class="{ me: m.userId === userId }"
      >
        <div v-if="m.text">{{ m.text }}</div>

        <div v-if="m.lat && m.lng" class="location">
          📍 Location
          <button @click="openMap(m.lat, m.lng)">
            View
          </button>
        </div>

        <div class="time">{{ formatTime(m.time) }}</div>
      </div>
    </div>

    <div class="input">
      <input v-model="message" @keyup.enter="sendMessage" placeholder="Type a message..." />
      <button @click="sendMessage">Send</button>
      <button @click="sendLocation">📍</button>
    </div>

  </div>
</template>

<style>
.chat {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
}

.bubble {
  background: #eee;
  margin: 5px;
  padding: 10px;
  border-radius: 10px;
}

.me {
  background: #4f46e5;
  color: white;
}

.location button {
  margin-top: 5px;
}

.input {
  display: flex;
  gap: 10px;
}
</style>