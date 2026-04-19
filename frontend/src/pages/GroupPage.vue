<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const groupId = ref('')

const joinGroup = async () => {
  if (!groupId.value.trim()) return

  await router.push({
    path: '/map',
    query: { group: groupId.value }
  })
}
</script>

<template>
  <div class="container">
    <h2>Join Group 👥</h2>

    <input v-model="groupId" placeholder="group id..." />

    <button @click="joinGroup">Enter</button>
  </div>
</template>

<style>
.container {
  padding: 20px;
}

input {
  padding: 8px;
  margin-bottom: 10px;
}
</style>