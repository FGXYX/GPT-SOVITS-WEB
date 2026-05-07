<template>
  <div class="connection-bar" :class="statusClass">
    <span class="status-dot"></span>
    <span class="status-text">{{ statusText }}</span>
    <div class="connection-controls">
      <input
        v-model="localUrl"
        type="text"
        class="url-input"
        placeholder="http://localhost:9880"
        @keyup.enter="connect"
      />
      <button
        class="btn btn-sm"
        :disabled="status === 'connecting'"
        @click="connect"
      >
        {{ status === 'connecting' ? '连接中...' : '连接' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getApiClient } from '../api/gptsovits'
import type { ConnectionStatus } from '../types'

const emit = defineEmits<{
  connected: [url: string]
}>()

const localUrl = ref(localStorage.getItem('gptsovits_url') || '')
const status = ref<ConnectionStatus>('disconnected')

const statusClass = computed(() => `status-${status.value}`)
const statusText = computed(() => {
  switch (status.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'error': return '连接失败'
    default: return '未连接'
  }
})

async function connect() {
  const api = getApiClient()
  if (localUrl.value) {
    api.setBaseUrl(localUrl.value)
  } else {
    api.setBaseUrl('') // 使用代理模式
  }
  localStorage.setItem('gptsovits_url', localUrl.value)

  status.value = 'connecting'
  const result = await api.checkConnection()
  status.value = result

  if (result === 'connected') {
    emit('connected', localUrl.value)
  } else {
    setTimeout(() => {
      status.value = 'disconnected'
    }, 3000)
  }
}

onMounted(() => {
  // 自动尝试连接已保存的地址
  if (localUrl.value) {
    connect()
  }
})
</script>

<style scoped>
.connection-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
  flex-wrap: wrap;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-connected .status-dot { background: #34d399; box-shadow: 0 0 6px #34d399; }
.status-connecting .status-dot { background: #fbbf24; animation: pulse 1s infinite; }
.status-error .status-dot { background: #fb7185; }
.status-disconnected .status-dot { background: #4a4a6a; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

.status-text {
  font-size: 0.82rem;
  color: #a0a0c0;
  min-width: 60px;
}
.connection-controls {
  display: flex;
  gap: 6px;
  flex: 1;
  max-width: 400px;
}
.url-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #2a2a4a;
  background: #0f0f1a;
  color: #e0e0e0;
  font-size: 0.82rem;
  outline: none;
  font-family: 'Consolas', 'Courier New', monospace;
}
.url-input:focus { border-color: #8b5cf6; }
</style>
