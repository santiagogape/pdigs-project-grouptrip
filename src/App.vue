<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter, RouterView } from 'vue-router'

const router = useRouter()

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null

  return (
    el?.tagName === 'INPUT' ||
    el?.tagName === 'TEXTAREA' ||
    el?.isContentEditable
  )
}

const handleGlobalHotkeys = (event: KeyboardEvent) => {
  if (isTyping(event.target)) return

  if (event.shiftKey && event.key.toLowerCase() === 'n') {
    event.preventDefault()
    router.push({ name: 'new-project' })
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalHotkeys)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalHotkeys)
})
</script>

<template>
  <RouterView />
</template>
<style></style>
