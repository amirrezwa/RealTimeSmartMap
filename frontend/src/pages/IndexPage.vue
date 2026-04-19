<script setup lang="ts">
import { onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

let map: L.Map
let socket: Socket
let marker: L.Marker | null = null

onMounted(() => {
  console.log('mounted ok')

  map = L.map('map').setView([35.7, 51.4], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map)

  socket = io('http://localhost:3000')

  navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude

    socket.emit('sendLocation', {
      userId: 1,
      lat,
      lng
    })

    if (!marker) {
      marker = L.marker([lat, lng]).addTo(map)
    } else {
      marker.setLatLng([lat, lng])
    }

    map.setView([lat, lng], 16)
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
</style>