<script setup lang="ts">
import { ref } from 'vue'
import ConnectionBar from './components/ConnectionBar.vue'
import ReferenceAudioPanel from './components/ReferenceAudioPanel.vue'
import TextInputPanel from './components/TextInputPanel.vue'
import SynthesisPanel from './components/SynthesisPanel.vue'
import type { TextChunk } from './types'

const activeConfig = ref<any>(null)
const currentChunks = ref<TextChunk[]>([])

function onConfigSelect(cfg: any) {
  activeConfig.value = cfg
}

function onStartSynthesis(chunks: TextChunk[]) {
  currentChunks.value = chunks
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>GPT-SoVITS 合成工具</h1>
      <p class="subtitle">多配置管理 · 文本分割 · 批量语音合成</p>
    </header>

    <ConnectionBar class="section" @connected="(url) => console.log('已连接:', url)" />

    <div class="main-grid">
      <ReferenceAudioPanel @select="onConfigSelect" />
      <TextInputPanel
        :config="activeConfig"
        @start-synthesis="onStartSynthesis"
      />
    </div>

    <SynthesisPanel
      :config="activeConfig"
      :chunks="currentChunks"
    />

    <footer class="app-footer">
      <span>GPT-SoVITS Web 工具 </span>
      <a href="https://github.com/RVC-Boss/GPT-SoVITS" target="_blank" class="footer-link">GPT-SoVITS</a>
    </footer>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #0a0a12; color: #e0e0e0; min-height: 100vh;
}
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }

.btn {
  display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px;
  border-radius: 6px; border: 1px solid #2a2a4a; background: rgba(255,255,255,.04);
  color: #c0c0d0; font-size: .82rem; cursor: pointer; white-space: nowrap;
}
.btn:hover { background: rgba(255,255,255,.08); border-color: #3a3a5a; }
.btn:disabled { opacity: .4; cursor: not-allowed; }
.btn-sm { padding: 4px 10px; font-size: .78rem; }
.btn-xs { padding: 2px 8px; font-size: .72rem; }
.btn-primary { background: linear-gradient(135deg,#8b5cf6,#7c3aed); border-color: #8b5cf6; color: #fff; font-weight: 600; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-danger { color: #fb7185; border-color: rgba(251,113,133,.3); }
.btn-danger:hover { background: rgba(251,113,133,.1); }

.app-container { max-width: 1200px; margin: 0 auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; min-height: 100vh; }
.app-header { text-align: center; padding: 8px 0; }
.app-header h1 { font-size: 1.5rem; font-weight: 700; background: linear-gradient(135deg,#c084fc,#06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.subtitle { font-size: .85rem; color: #5a5a7a; margin-top: 4px; }
.main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media(max-width:768px) { .main-grid { grid-template-columns: 1fr; } }
.app-footer { display: flex; justify-content: space-between; padding: 16px 0; font-size: .78rem; color: #3a3a5a; border-top: 1px solid #1a1a2e; margin-top: auto; }
.footer-link { color: #5a5a8a; text-decoration: none; }
.footer-link:hover { color: #8b5cf6; }
</style>
