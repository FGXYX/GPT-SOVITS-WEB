<template>
  <div class="panel">
    <div class="panel-header">
      <h2>
        <span class="icon-speaker"></span>
        批量合成
      </h2>
      <div class="info" v-if="total > 0">{{ done }}/{{ total }} 段</div>
    </div>

    <!-- 进度 -->
    <div v-if="running" class="progress-section">
      <div class="bar"><div class="fill" :style="{ width: pct + '%' }"></div></div>
      <span class="label">{{ idx + 1 }}/{{ total }}</span>
    </div>

    <!-- 操作 -->
    <div class="actions">
      <button class="btn btn-primary" :disabled="!canStart || running" @click="start">
        <span class="icon-play"></span>
        {{ running ? '合成中...' : '开始批量合成' }}
      </button>
      <button v-if="running" class="btn btn-danger" @click="stop">
        <span class="icon-stop"></span> 停止
      </button>
      <button class="btn" :disabled="!hasResults" @click="clearResults">清除结果</button>
      <button class="btn" :disabled="!hasBlobs" @click="exportAll">
        <span class="icon-save"></span> 导出全部
      </button>
    </div>

    <!-- 结果 -->
    <div v-if="results.length" class="results">
      <div v-for="(r, i) in results" :key="i" class="item">
        <span class="num">{{ i + 1 }}</span>
        <span
          v-if="r.emotion !== 'default'"
          class="emotag"
          :style="{ background: emotionColor(r.emotion) }"
        ></span>
        <span v-else class="emotag emo-default"></span>
        <span class="txt">{{ r.text.slice(0, 22) }}{{ r.text.length > 22 ? '...' : '' }}</span>
        <div class="rt" v-if="r.blob && r.url">
          <audio :src="r.url" controls preload="none" class="player"></audio>
          <button class="btn btn-xs" @click="dl(r, i)">下载</button>
          <button
            class="btn btn-xs btn-retry"
            :disabled="synthesizingIdx === i"
            @click="retry(i)"
          >{{ synthesizingIdx === i ? '合成中...' : '重新合成' }}</button>
          <button class="btn btn-xs btn-del" @click="removeResult(i)">删除</button>
        </div>
        <span v-else-if="r.error" class="err">
          {{ r.error }}
          <button class="btn btn-xs btn-retry" @click="retry(i)">重试</button>
        </span>
        <span v-else class="proc">等待...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { getApiClient } from '../api/gptsovits'
import { downloadBlob, sanitizeFilename } from '../utils/textSplitter'
import type { TextChunk, EmotionSlot } from '../types'

interface TtsCfg {
  id: string; engineType: string; apiUrl: string; speed: number
  refAudioPath: string; promptText: string; promptLang: string; textLang: string
  emotionSlots: EmotionSlot[]
}

const props = defineProps<{ config: TtsCfg | null; chunks: TextChunk[] }>()

const running = ref(false)
const idx = ref(0)
const total = ref(0)
const done = ref(0)
const pct = ref(0)
const synthesizingIdx = ref(-1)  // -1 = none, >=0 = that index is being re-synthesized
const results = ref<Array<{ text: string; emotion: string; blob?: Blob; url?: string; error?: string }>>([])
let stopped = false

const canStart = computed(() => !!props.config?.refAudioPath && props.chunks.length > 0)
const hasResults = computed(() => results.value.length > 0)
const hasBlobs = computed(() => results.value.some(r => r.blob))

/** 释放所有 blob URL */
function cleanupUrls() {
  results.value.forEach(r => { if (r.url) URL.revokeObjectURL(r.url) })
}

watch(() => props.chunks, (chunks) => {
  cleanupUrls()
  done.value = 0; total.value = chunks.length
  results.value = chunks.map(c => ({ text: c.content, emotion: c.emotion || 'default' }))
}, { immediate: true })

onUnmounted(cleanupUrls)

/** 根据情绪动态查找参考音频参数 */
function emotionParams(c: TtsCfg, em: string) {
  if (em === 'default') return { ref_audio_path: c.refAudioPath, prompt_text: c.promptText || undefined }
  const slot = c.emotionSlots?.find(s => s.key === em)
  if (!slot?.path) return { ref_audio_path: c.refAudioPath, prompt_text: c.promptText || undefined }
  return { ref_audio_path: slot.path, prompt_text: slot.text || undefined }
}

/** 根据情绪动态获取标记色 */
function emotionColor(em: string) {
  const slot = props.config?.emotionSlots?.find(s => s.key === em)
  return slot?.color || '#8b5cf6'
}

/** 合成单段（被 start 和 retry 共用） */
async function synthesizeOne(i: number) {
  const c = props.config
  if (!c) return
  const em = results.value[i].emotion || 'default'
  const { ref_audio_path, prompt_text } = emotionParams(c, em)
  const api = getApiClient()
  const blob = await api.synthesize({
    text: results.value[i].text,
    text_lang: c.textLang,
    ref_audio_path,
    prompt_lang: c.promptLang,
    prompt_text,
    speed_factor: c.speed,
  })
  // 清理旧 URL
  if (results.value[i].url) URL.revokeObjectURL(results.value[i].url)
  results.value[i].blob = blob
  results.value[i].url = URL.createObjectURL(blob)
  results.value[i].error = undefined
}

async function start() {
  const c = props.config
  if (!c || !props.chunks.length) return
  stopped = false
  running.value = true
  total.value = props.chunks.length
  done.value = 0
  results.value = props.chunks.map(ch => ({ text: ch.content, emotion: ch.emotion || 'default' }))

  for (let i = 0; i < props.chunks.length; i++) {
    if (stopped) break
    idx.value = i; pct.value = (i / props.chunks.length) * 100
    try {
      await synthesizeOne(i)
      done.value = i + 1
    } catch (e: any) {
      results.value[i].error = e.message || '失败'
    }
  }
  pct.value = 100; running.value = false
}

/** 重新合成某一段 */
async function retry(i: number) {
  if (!props.config) return
  synthesizingIdx.value = i
  results.value[i].error = undefined
  try {
    await synthesizeOne(i)
  } catch (e: any) {
    results.value[i].error = e.message || '失败'
  }
  synthesizingIdx.value = -1
}

function stop() { stopped = true; running.value = false }

/** 使用合成文本命名文件 */
function dl(r: { blob?: Blob; text: string }, i: number) {
  if (r.blob) {
    const name = sanitizeFilename(r.text)
    downloadBlob(r.blob, `${name}.wav`)
  }
}

function exportAll() {
  results.value.forEach((r, i) => { if (r.blob) setTimeout(() => dl(r, i), i * 200) })
}

function removeResult(i: number) {
  const r = results.value[i]
  if (r.url) URL.revokeObjectURL(r.url)
  results.value.splice(i, 1)
}
function clearResults() {
  cleanupUrls()
  results.value = []
  done.value = 0; total.value = 0; idx.value = 0; pct.value = 0
}
</script>

<style scoped>
.panel { background: #1a1a2e; border-radius: 10px; padding: 16px; border: 1px solid #2a2a4a; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.panel-header h2 { font-size: 1rem; font-weight: 600; color: #e0e0e0; display: flex; align-items: center; gap: 6px; }

/* CSS 小图标 */
.icon-speaker {
  display: inline-block; width: 16px; height: 12px;
  border: 2px solid #8b5cf6; border-radius: 2px;
  position: relative; flex-shrink: 0;
}
.icon-speaker::before {
  content: ''; position: absolute; right: -3px; top: -4px;
  border-style: solid; border-width: 0 0 12px 6px;
  border-color: transparent transparent transparent #8b5cf6;
}
.icon-play {
  display: inline-block; width: 0; height: 0;
  border-style: solid; border-width: 5px 0 5px 8px;
  border-color: transparent transparent transparent #fff;
  flex-shrink: 0;
}
.icon-stop {
  display: inline-block; width: 10px; height: 10px;
  background: #fb7185; border-radius: 2px; flex-shrink: 0;
}
.icon-save {
  display: inline-block; width: 12px; height: 14px;
  border: 2px solid #6a6a8a; border-radius: 2px;
  position: relative; flex-shrink: 0;
}
.icon-save::before {
  content: ''; position: absolute; bottom: -2px; left: 2px;
  width: 4px; height: 3px; background: #6a6a8a; border-radius: 0 0 1px 1px;
  box-shadow: 4px 0 0 #6a6a8a;
}

.info { font-size: .82rem; color: #34d399; font-weight: 600; }
.progress-section { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.bar { flex: 1; height: 5px; border-radius: 3px; background: #2a2a4a; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #06b6d4); transition: width .3s; }
.label { font-size: .75rem; color: #6a6a8a; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.results { display: flex; flex-direction: column; gap: 3px; max-height: 360px; overflow-y: auto; }
.item { display: flex; align-items: center; gap: 5px; padding: 5px 8px; border-radius: 5px; background: rgba(255,255,255,.02); }
.num { width: 20px; height: 20px; border-radius: 50%; background: #2a2a4a; display: flex; align-items: center; justify-content: center; font-size: .65rem; font-weight: 700; color: #8b5cf6; flex-shrink: 0; }
.emotag { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.emotag.emo-default { width: 8px; height: 8px; border: 2px solid #8b5cf6; background: transparent; }
.txt { flex: 1; font-size: .78rem; color: #a0a0c0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rt { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
.player { height: 28px; border-radius: 3px; }
.err { color: #fb7185; font-size: .72rem; display: flex; align-items: center; gap: 4px; }
.proc { color: #5a5a7a; font-size: .72rem; }
.btn-retry { color: #fbbf24; border-color: rgba(251,191,36,.3); font-size: .68rem; padding: 1px 6px; }
.btn-retry:hover { background: rgba(251,191,36,.1); }
.btn-retry:disabled { opacity: .4; cursor: not-allowed; }
.btn-del { color: #fb7185; border-color: rgba(251,113,133,.2); }
.btn-del:hover { background: rgba(251,113,133,.1); }
</style>
