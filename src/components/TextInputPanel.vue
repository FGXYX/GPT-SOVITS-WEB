<template>
  <div class="panel">
    <div class="panel-header">
      <h2>
        <span class="icon-pen"></span>
        文本输入
      </h2>
      <div class="header-actions">
        <label class="file-label">
          <span class="icon-folder"></span> 导入
          <input type="file" accept=".txt" hidden @change="importText" />
        </label>
        <button class="btn btn-sm" @click="doSplit">
          <span class="icon-split"></span> 分割
        </button>
      </div>
    </div>

    <textarea
      v-model="inputText"
      class="text-input"
      placeholder="在此输入要合成的文本…&#10;支持导入 .txt 文件"
      rows="5"
    ></textarea>

    <div class="split-config">
      <label class="cfg-label">分割：</label>
      <select v-model="splitMethod" class="select">
        <option value="cut0">cut0 按句</option>
        <option value="cut1">cut1 逗号</option>
        <option value="cut2">cut2 标点</option>
        <option value="cut3">cut3 智能</option>
        <option value="cut4">cut4 段落</option>
        <option value="cut5">cut5 api默认</option>
      </select>
      <label class="cfg-label">最长</label>
      <input v-model.number="maxLength" type="number" class="num-input" min="10" max="200" />
      <button class="btn btn-sm btn-primary" @click="emitStart" :disabled="chunks.length === 0">
        <span class="icon-play"></span> 合成
      </button>
    </div>

    <!-- 分割结果：每段可单独选情绪 -->
    <div v-if="chunks.length" class="chunk-list">
      <div class="chunk-header">
        <span>{{ chunks.length }} 段</span>
        <button class="btn btn-xs" @click="resetAllEmotion" title="全部重置为默认">重置情绪</button>
      </div>
      <div
        v-for="(chunk, i) in chunks"
        :key="chunk.index"
        :class="['chunk-item', 's-' + chunk.status]"
      >
        <div class="chunk-top">
          <span class="chunk-idx">{{ i + 1 }}</span>
          <span class="chunk-text">{{ chunk.content }}</span>
          <span class="chunk-len">{{ chunk.length }}字</span>
          <button class="btn btn-xs btn-del-chunk" title="删除此段" @click="removeChunk(i)">删除</button>
        </div>
        <div class="chunk-emotion">
          <button
            v-for="e in emotionOptions"
            :key="e.key"
            :class="['emo-btn', { active: chunk.emotion === e.key }]"
            :title="e.label"
            @click="chunk.emotion = e.key"
          >
            <span
              v-if="e.key !== 'default'"
              class="emo-indicator"
              :style="{ background: e.color }"
            ></span>
            <span v-else class="emo-indicator emo-default"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { splitText } from '../utils/textSplitter'
import { downloadBlob } from '../utils/textSplitter'
import type { TextChunk, SplitConfig, EmotionSlot } from '../types'

interface TtsCfg {
  id: string; name: string
  refAudioPath: string; promptText: string; promptLang: string; textLang: string
  speed: number; apiUrl: string
  emotionSlots: EmotionSlot[]
  engineType: string; apiKey: string; voiceId: string
  gptWeightPath: string; sovitsWeightPath: string
}

const props = defineProps<{ config: TtsCfg | null }>()

const emit = defineEmits<{
  startSynthesis: [chunks: TextChunk[]]
}>()

/** 从配置的 emotionSlots 构建情绪选项（+ 默认） */
const emotionOptions = computed(() => {
  const base: Array<{ key: string; color: string; label: string }> = [
    { key: 'default', color: '#8b5cf6', label: '默认音色' },
  ]
  if (!props.config?.emotionSlots) return base
  return base.concat(
    props.config.emotionSlots.map(s => ({
      key: s.key,
      color: s.color || '#8b5cf6',
      label: s.label || s.key,
    }))
  )
})

const inputText = ref('')
const splitMethod = ref<SplitConfig['method']>('cut2')
const maxLength = ref(50)
const chunks = ref<TextChunk[]>([])

function doSplit() {
  if (!inputText.value.trim()) return
  chunks.value = splitText(inputText.value, { method: splitMethod.value, maxLength: maxLength.value })
  chunks.value.forEach(c => { c.emotion = 'default' })
}

function resetAllEmotion() {
  chunks.value.forEach(c => { c.emotion = 'default' })
}

function emitStart() {
  if (chunks.value.length) emit('startSynthesis', chunks.value)
}

function importText(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { inputText.value = reader.result as string }
  reader.readAsText(file)
}

function removeChunk(i: number) {
  chunks.value.splice(i, 1)
}
</script>

<style scoped>
.panel { background: #1a1a2e; border-radius: 10px; padding: 16px; border: 1px solid #2a2a4a; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.panel-header h2 { font-size: 1rem; font-weight: 600; color: #e0e0e0; display: flex; align-items: center; gap: 6px; }

/* CSS 小图标 */
.icon-pen {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid #8b5cf6; border-radius: 2px;
  transform: rotate(45deg); flex-shrink: 0;
  position: relative; margin-right: 2px;
}
.icon-pen::after {
  content: ''; position: absolute;
  left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 6px; height: 6px; background: #8b5cf6; border-radius: 50%;
}
.icon-folder {
  display: inline-block; width: 14px; height: 11px;
  border: 2px solid #6a6a8a; border-radius: 2px 2px 3px 3px;
  position: relative; top: 1px; flex-shrink: 0;
}
.icon-folder::before {
  content: ''; position: absolute; top: -5px; left: 1px;
  width: 8px; height: 4px; border: 2px solid #6a6a8a;
  border-bottom: none; border-radius: 2px 2px 0 0;
}
.icon-split {
  display: inline-block; width: 12px; height: 12px;
  position: relative; flex-shrink: 0;
}
.icon-split::before, .icon-split::after {
  content: ''; position: absolute;
  width: 2px; height: 100%; background: #6a6a8a; border-radius: 1px;
}
.icon-split::before { left: 0; }
.icon-split::after { right: 0; }
.icon-play {
  display: inline-block; width: 0; height: 0;
  border-style: solid; border-width: 5px 0 5px 8px;
  border-color: transparent transparent transparent #fff;
  flex-shrink: 0;
}

.header-actions { display: flex; gap: 6px; align-items: center; }
.file-label {
  cursor: pointer; font-size: .82rem; color: #a0a0c0;
  padding: 4px 10px; border-radius: 4px;
  display: flex; align-items: center; gap: 4px;
}
.file-label:hover { background: rgba(255,255,255,.05); }

.text-input {
  width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #2a2a4a;
  background: #0f0f1a; color: #e0e0e0; font-size: .85rem; resize: vertical;
  outline: none; font-family: inherit; line-height: 1.6;
}
.text-input:focus { border-color: #8b5cf6; }
.text-input::placeholder { color: #4a4a6a; }

.split-config {
  display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap;
}
.cfg-label { font-size: .78rem; color: #6a6a8a; }
.select, .num-input {
  padding: 4px 8px; border-radius: 4px; border: 1px solid #2a2a4a;
  background: #0f0f1a; color: #e0e0e0; font-size: .78rem; outline: none;
}
.num-input { width: 55px; }

.chunk-list { margin-top: 10px; max-height: 420px; overflow-y: auto; }
.chunk-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: .82rem; color: #a0a0c0; }

.chunk-item {
  background: rgba(255,255,255,.02); border-radius: 8px; padding: 8px 10px; margin-bottom: 6px;
  border: 1px solid rgba(255,255,255,.05);
}
.chunk-item.s-done { border-color: rgba(52,211,153,.2); }
.chunk-item.s-processing { border-color: rgba(251,191,36,.2); }
.chunk-item.s-error { border-color: rgba(251,113,133,.2); }

.chunk-top { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
.chunk-idx {
  width: 20px; height: 20px; border-radius: 50%; background: #2a2a4a;
  display: flex; align-items: center; justify-content: center;
  font-size: .65rem; font-weight: 700; color: #8b5cf6; flex-shrink: 0;
}
.chunk-text { flex: 1; font-size: .8rem; color: #c0c0d0; line-height: 1.5; }
.chunk-len { font-size: .65rem; color: #4a4a6a; flex-shrink: 0; margin-top: 2px; }

.chunk-emotion { display: flex; gap: 4px; margin-left: 28px; flex-wrap: wrap; }
.emo-btn {
  width: 22px; height: 22px; border-radius: 6px; border: 1px solid #2a2a4a;
  background: rgba(255,255,255,.03); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .12s; padding: 0;
}
.emo-btn:hover { border-color: #3a3a5a; }
.emo-btn.active { border-color: #8b5cf6; background: rgba(139,92,246,.15); box-shadow: 0 0 6px rgba(139,92,246,.2); }

/* 情绪指示色点 */
.emo-indicator {
  display: inline-block; width: 10px; height: 10px;
  border-radius: 50%;
}
.emo-indicator.emo-default {
  width: 8px; height: 8px; border: 2px solid #8b5cf6;
  background: transparent; border-radius: 50%;
}

.btn-del-chunk { color: #fb7185; border-color: rgba(251,113,133,.2); flex-shrink: 0; margin-left: 4px; }
.btn-del-chunk:hover { background: rgba(251,113,133,.1); }
</style>
