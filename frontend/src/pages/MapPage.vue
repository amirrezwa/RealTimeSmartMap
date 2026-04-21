<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { io } from 'socket.io-client'
import axios from 'axios'

type UserLocation = {
  id: number
  lat: number | null
  lng: number | null
}

type Message = {
  userId: number
  username?: string
  text?: string
  time?: string | Date
}

const socket = io('http://localhost:3000')

const route = useRoute()
const groupId = (route.query.group as string) || 'test123'

const userId = ref<number | null>(null)
const username = ref('')

const message = ref('')
const messages = ref<Message[]>([])
const messagesRef = ref<HTMLElement | null>(null)

let map: L.Map
const markers: Record<number, L.Marker> = {}
let myMarker: L.Marker | null = null

const api = axios.create({
  baseURL: 'http://localhost:3000'
})

const initUser = async () => {
  const saved = localStorage.getItem('user')
  if (saved) return JSON.parse(saved)

  const res = await api.post('/users', {
    username: 'Guest-' + Math.floor(Math.random() * 1000)
  })

  localStorage.setItem('user', JSON.stringify(res.data))
  return res.data
}

const scrollToBottom = () => {
  void nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

const createIcon = (id: number) => {
  return L.divIcon({
    html: `<div class="avatar-marker">${id}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

const moveMarkerSmooth = (
  marker: L.Marker,
  from: [number, number],
  to: [number, number],
  duration = 1000
) => {
  const start = performance.now()

  const animate = (time: number) => {
    const progress = Math.min((time - start) / duration, 1)

    const lat = from[0] + (to[0] - from[0]) * progress
    const lng = from[1] + (to[1] - from[1]) * progress

    marker.setLatLng([lat, lng])

    if (progress < 1) requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}

const loadUsers = async () => {
  const res = await api.get<UserLocation[]>(`/users?groupId=${groupId}`)

  res.data.forEach((u) => {
    if (!u.lat || !u.lng) {
      return
    }
    if (u.id === userId.value) {
      return
    }

    markers[u.id] = L.marker([u.lat, u.lng], {
      icon: createIcon(u.id)
    }).addTo(map)
  })
}

onMounted(async () => {
  const user = await initUser()
  userId.value = user.id
  username.value = user.username

  map = L.map('map').setView([35.7, 51.4], 13)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png')
  .addTo(map)

  await loadUsers()

  socket.on('connect', () => {
    console.log('✅ SOCKET CONNECTED:', socket.id)

    socket.emit('joinGroup', {
      userId: userId.value,
      groupId
    })
  })

  socket.on('receiveMessage', (msg: Message) => {
    messages.value.push(msg)
    scrollToBottom()
  })

  socket.on('receiveLocation', (user: UserLocation) => {
    if (!user.lat || !user.lng) {
      return
    }
    if (user.id === userId.value) {
      return
    }

    const marker = markers[user.id]

    if (!marker) {
      markers[user.id] = L.marker([user.lat, user.lng], {
        icon: createIcon(user.id)
      }).addTo(map)
    } else {
      const current = marker.getLatLng()

      moveMarkerSmooth(
        marker,
        [current.lat, current.lng],
        [user.lat, user.lng]
      )
    }
  })

  let lastSent = 0

  navigator.geolocation.watchPosition((pos) => {
    const now = Date.now()
    if (now - lastSent < 2000) {
      return
    }

    lastSent = now

    const lat = pos.coords.latitude
    const lng = pos.coords.longitude

    socket.emit('sendLocation', {
      userId: userId.value,
      lat,
      lng,
      groupId
    })

    if (!myMarker) {
      myMarker = L.marker([lat, lng], {
        icon: createIcon(userId.value!)
      }).addTo(map)
    } else {
      myMarker.setLatLng([lat, lng])
    }
  })
})

const sendMessage = () => {
  if (!message.value.trim() || !userId.value) {
    return
  }

  socket.emit('sendMessage', {
    userId: userId.value,
    text: message.value,
    groupId
  })

  message.value = ''
}
</script>

<template>
  <div id="map"></div>

  <div class="chat-box">
    <div class="messages" ref="messagesRef">
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="msg"
        :class="{ me: m.userId === userId }"
      >
        {{ m.text }}
      </div>
    </div>

    <div class="input">
      <input
        v-model="message"
        @keyup.enter="sendMessage"
        placeholder="Message..."
      />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<style>
#map {
  height: calc(100vh - 200px);
}

.chat-box {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 200px;
  background: white;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #ddd;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.msg {
  background: #eee;
  margin: 5px;
  padding: 8px;
  border-radius: 10px;
}

.me {
  background: #4f46e5;
  color: white;
}

.input {
  display: flex;
  padding: 10px;
  gap: 10px;
}

.avatar-marker {
  width: 38px;
  height: 38px;
  background: #4f46e5;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>