<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { io } from 'socket.io-client'
import axios from 'axios'

// ================= TYPES =================
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

// ================= SOCKET =================
const socket = io('http://localhost:3000')

// ================= ROUTE =================
const route = useRoute()
const groupId = (route.query.group as string) || 'test123'

// ================= USER =================
const userId = ref<number | null>(null)
const username = ref('')

// ================= CHAT =================
const message = ref('')
const messages = ref<Message[]>([])
const messagesRef = ref<HTMLElement | null>(null)

// ================= MAP =================
let map: L.Map
const markers: Record<number, L.Marker> = {}
let myMarker: L.Marker | null = null

// ================= API =================
const api = axios.create({
  baseURL: 'http://localhost:3000'
})

// ================= INIT USER =================
const initUser = async () => {
  try {
    const saved = localStorage.getItem('user')
    if (saved) return JSON.parse(saved)

    const res = await api.post('/users', {
      username: 'Guest-' + Math.floor(Math.random() * 1000)
    })

    localStorage.setItem('user', JSON.stringify(res.data))
    return res.data

  } catch (err) {
    console.log('❌ USER CREATE ERROR:', err)
    return { id: 1, username: 'fallback' } // موقت
  }
}

// ================= SCROLL =================
const scrollToBottom = () => {
  void nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// ================= ICON =================
const createIcon = (id: number) => {
  return L.divIcon({
    html: `<div class="avatar-marker">${id}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

// ================= MOUNT =================
onMounted(async () => {
  const user = await initUser()
  userId.value = user.id
  username.value = user.username

  // ===== MAP =====
  map = L.map('map').setView([35.7, 51.4], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    .addTo(map)

  // ===== LOAD USERS =====
  const res = await api.get<UserLocation[]>(`/users?groupId=${groupId}`)

  res.data.forEach((u) => {
    if (u.lat == null || u.lng == null) return

    markers[u.id] = L.marker([u.lat, u.lng], {
      icon: createIcon(u.id)
    }).addTo(map)
  })

  // ===== JOIN GROUP (IMPORTANT FIX) =====
  socket.emit('joinGroup', {
    userId: userId.value,
    groupId
  })

  // ===== MESSAGE =====
  socket.on('receiveMessage', (msg: Message) => {
    messages.value.push(msg)
    scrollToBottom()
  })

  socket.on('connect', () => {
    console.log('✅ SOCKET CONNECTED:', socket.id)

socket.emit('joinGroup', {
  userId: userId.value,
  groupId
})
})

socket.on('connect_error', (err) => {
  console.log('❌ SOCKET ERROR:', err.message)
})

  // ===== LOCATION =====
  socket.on('receiveLocation', (user: UserLocation) => {
    if (user.lat == null || user.lng == null) return
    if (user.id === userId.value) return

    const marker = markers[user.id]

    if (!marker) {
      markers[user.id] = L.marker([user.lat, user.lng], {
        icon: createIcon(user.id)
      }).addTo(map)
    } else {
      marker.setLatLng([user.lat, user.lng])
    }
  })

  // ===== MY LOCATION =====
  navigator.geolocation.watchPosition((pos) => {
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

// ================= SEND MESSAGE =================
const sendMessage = () => {
  if (!message.value.trim() || !userId.value) return

  const temp: Message = {
    userId: userId.value,
    username: username.value,
    text: message.value,
    time: new Date()
  }

  messages.value.push(temp)
  scrollToBottom()

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
        placeholder="پیام بنویس..."
      />
      <button @click="sendMessage">ارسال</button>
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