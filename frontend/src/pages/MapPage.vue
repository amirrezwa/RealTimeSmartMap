<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { io } from 'socket.io-client'
import axios from 'axios'

type UserLocation = {
  id: number
  lat: number
  lng: number
}

const socket = io('http://localhost:3000')
const route = useRoute()

const groupId = route.query.group as string
const userId = 1

let map: L.Map
let myMarker: L.Marker | null = null
const markers: Record<number, L.Marker> = {}

const createIcon = (id: number) => {
  return L.divIcon({
    className: '',
    html: `
      <div class="avatar-marker">
        ${id}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

onMounted(async () => {
  map = L.map('map').setView([35.7, 51.4], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'map'
  }).addTo(map)

  // گرفتن یوزرها
  const res = await axios.get(`http://localhost:3000/users?groupId=${groupId}`)
  const users = res.data

  users.forEach((user: UserLocation) => {
    if (!user.lat || !user.lng) return

    markers[user.id] = L.marker([user.lat, user.lng], {
      icon: createIcon(user.id)
    }).addTo(map)
  })

  socket.emit('joinGroup', { userId, groupId })

  navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude

    socket.emit('sendLocation', { userId, lat, lng })

    if (!myMarker) {
      myMarker = L.marker([lat, lng], {
        icon: createIcon(userId)
      }).addTo(map)
    } else {
      myMarker.setLatLng([lat, lng])
    }

    map.setView([lat, lng], 15)
  })

  // 👇 این باید داخل onMounted باشه
  socket.on('receiveLocation', (user: UserLocation) => {
    if (!user?.lat || !user?.lng) return
    if (user.id === userId) return

    const marker = markers[user.id]

    if (!marker) {
      markers[user.id] = L.marker([user.lat, user.lng], {
        icon: createIcon(user.id)
      }).addTo(map)
    } else {
      marker.setLatLng([user.lat, user.lng])
    }
  })

}) 
</script>

<template>
  <div id="map"></div>
</template>

<style>
#map {
  height: 100vh;
  width: 100%;
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
  font-weight: bold;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}
</style>