<template>
  <div class="panel">
    <div class="panel-header">
      <h2><i class="icon-mic"></i> 语音配置</h2>
      <label class="switch" title="开启/关闭 TTS">
        <input type="checkbox" v-model="enabled" @change="saveAll" />
        <span class="slider"></span>
      </label>
    </div>

    <!-- 配置列表 -->
    <div class="engine-list" :style="{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }">
      <div
        v-for="cfg in configs" :key="cfg.id"
        :class="['engine-item', { active: activeId === cfg.id, editing: editingId === cfg.id }]"
        @click="editCfg(cfg.id)"
      >
        <div class="engine-info">
          <span class="engine-name">{{ cfg.name }}</span>
          <span v-if="activeId === cfg.id" class="badge">当前</span>
        </div>
        <div class="engine-actions">
          <button v-if="activeId !== cfg.id" class="text-btn" @click.stop="setActive(cfg.id)">启用</button>
          <button v-if="configs.length > 1" class="text-btn danger" @click.stop="removeCfg(cfg.id)">删除</button>
        </div>
      </div>
      <button class="add-btn" @click="addCfg">+ 新增配置</button>
    </div>

    <!-- 编辑表单 -->
    <div v-if="editingCfg" class="edit-form">
      <div class="field">
        <label>配置名称</label>
        <input v-model="editingCfg.name" placeholder="例如：女声1" @blur="saveAll" />
      </div>
      <div class="field">
        <label>引擎类型</label>
        <select v-model="editingCfg.engineType" @change="saveAll">
          <option value="gpt-sovits">GPT-SoVITS</option>
          <option value="openai">OpenAI 协议</option>
        </select>
      </div>

      <template v-if="editingCfg.engineType === 'gpt-sovits'">
        <div class="field">
          <label>API 地址</label>
          <input v-model="editingCfg.apiUrl" placeholder="http://127.0.0.1:9880" @blur="saveAll" />
        </div>

        <!-- === 可折叠：模型权重 === -->
        <details class="cfg-section" :open="sections.weights">
          <summary @click.prevent="toggleSec('weights')">
            <span class="sec-marker"></span>
            <span class="sec-arrow">{{ sections.weights ? '--' : '+' }}</span>
            模型权重
          </summary>
          <div class="sec-body">
            <div class="field">
              <label>GPT 模型路径 (.ckpt)</label>
              <input v-model="editingCfg.gptWeightPath" placeholder="选填" @blur="saveAll" />
            </div>
            <div class="field">
              <label>SoVITS 模型路径 (.pth)</label>
              <input v-model="editingCfg.sovitsWeightPath" placeholder="选填" @blur="saveAll" />
            </div>
            <div class="field">
              <button class="btn btn-sm" :disabled="switchingModel" @click="switchModels">
                {{ switchingModel ? '切换中...' : '应用模型权重' }}
              </button>
            </div>
          </div>
        </details>

        <!-- === 可折叠：参考音频 === -->
        <details class="cfg-section" :open="sections.refAudio">
          <summary @click.prevent="toggleSec('refAudio')">
            <span class="sec-marker sec-audio"></span>
            <span class="sec-arrow">{{ sections.refAudio ? '--' : '+' }}</span>
            参考音频
          </summary>
          <div class="sec-body">
            <div class="field">
              <label>参考音频路径</label>
              <input v-model="editingCfg.refAudioPath" placeholder="D:\\Voice\\ref.wav" @blur="saveAll" />
            </div>
            <div class="field">
              <label>音频对应文本</label>
              <textarea v-model="editingCfg.promptText" placeholder="参考音频里说的话..." @blur="saveAll"></textarea>
            </div>
            <div class="row">
              <div class="field">
                <label>音频语种</label>
                <select v-model="editingCfg.promptLang" @change="saveAll">
                  <option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option>
                </select>
              </div>
              <div class="field">
                <label>合成语种</label>
                <select v-model="editingCfg.textLang" @change="saveAll">
                  <option value="zh">中文</option><option value="ja">日文</option><option value="en">英文</option>
                  <option value="all_zh">中英混合</option><option value="auto">自动识别</option>
                </select>
              </div>
            </div>
            <div class="field">
              <div class="flex-label">
                <label>语速</label>
                <span class="val">{{ editingCfg.speed || 1.0 }}x</span>
              </div>
              <input type="range" v-model.number="editingCfg.speed" min="0.5" max="2.0" step="0.1" @change="saveAll" />
              <div class="range-marks"><span>0.5x</span><span>1.0x</span><span>2.0x</span></div>
            </div>
          </div>
        </details>

        <!-- === 可折叠：情绪参考音 === -->
        <details class="cfg-section" :open="sections.emotions">
          <summary @click.prevent="toggleSec('emotions')">
            <span class="sec-marker sec-emotion"></span>
            <span class="sec-arrow">{{ sections.emotions ? '--' : '+' }}</span>
            情绪参考音
          </summary>
          <div class="sec-body">
            <p class="hint">批量合成时可选择不同情绪的音色。留空则用上方默认参考音。可自定义添加情绪槽。</p>
            <div class="emotion-grid">
              <div
                v-for="(slot, i) in editingCfg.emotionSlots"
                :key="slot.key"
                class="emotion-card"
              >
                <div class="emo-header">
                  <span
                    class="emo-dot"
                    :style="{ background: slot.color || '#8b5cf6' }"
                  >{{ (slot.label || '?')[0] }}</span>
                  <input
                    class="emo-color-input"
                    type="color"
                    v-model="slot.color"
                    @blur="saveAll"
                    title="点击修改标记色"
                  />
                  <input
                    class="emo-label-input"
                    v-model="slot.label"
                    placeholder="情绪名"
                    @blur="saveAll"
                  />
                  <button
                    class="emo-del-btn"
                    :disabled="editingCfg.emotionSlots.length <= 1"
                    @click="removeEmotion(i)"
                    title="删除此情绪槽"
                  >x</button>
                </div>
                <input v-model="slot.path" placeholder="音频路径..." @blur="saveAll" />
                <input v-model="slot.text" placeholder="对应文本..." @blur="saveAll" />
              </div>
            </div>
            <button class="add-emotion-btn" @click="addEmotion">+ 添加情绪</button>
          </div>
        </details>
      </template>

      <template v-else>
        <div class="field"><label>Base URL</label><input v-model="editingCfg.apiUrl" placeholder="https://api.openai.com/v1" @blur="saveAll" /></div>
        <div class="field"><label>API Key</label><input type="password" v-model="editingCfg.apiKey" placeholder="sk-..." @blur="saveAll" /></div>
        <div class="field"><label>音色 ID</label><input v-model="editingCfg.voiceId" placeholder="alloy" @blur="saveAll" /></div>
      </template>

      <div class="test-section">
        <button class="test-btn" :disabled="testing" @click="testCfg">
          {{ testing ? '播放中...' : '测试此配置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { getApiClient } from '../api/gptsovits'
import type { EmotionSlot } from '../types'

const STORAGE_KEY = 'gptsovits_configs'

export interface TtsConfig {
  id: string; name: string; engineType: 'gpt-sovits' | 'openai'
  apiUrl: string; speed: number; apiKey: string; voiceId: string
  gptWeightPath: string; sovitsWeightPath: string
  refAudioPath: string; promptText: string; promptLang: string; textLang: string
  emotionSlots: EmotionSlot[]
}

const DEFAULT_EMOTIONS: EmotionSlot[] = [
  { key: 'happy', label: '开心', color: '#fbbf24', path: '', text: '' },
  { key: 'sad', label: '悲伤', color: '#93c5fd', path: '', text: '' },
  { key: 'angry', label: '生气', color: '#fb7185', path: '', text: '' },
  { key: 'shy', label: '害羞', color: '#c084fc', path: '', text: '' },
]

const emit = defineEmits<{ select: [cfg: TtsConfig] }>()

const enabled = ref(true)
const configs = ref<TtsConfig[]>([])
const activeId = ref('')
const editingId = ref('')
const testing = ref(false)
const switchingModel = ref(false)
const sections = reactive({ weights: false, refAudio: true, emotions: false })

function toggleSec(k: 'weights' | 'refAudio' | 'emotions') { sections[k] = !sections[k] }

const editingCfg = computed(() => configs.value.find(c => c.id === editingId.value))

/** 将旧格式（happyPath/sadPath/...及 icon 字段）迁移到新格式 */
function migrateOldCfg(cfg: any): TtsConfig {
  if (!cfg.emotionSlots && (cfg.happyPath !== undefined || cfg.sadPath !== undefined)) {
    const colors = ['#fbbf24', '#93c5fd', '#fb7185', '#c084fc']
    cfg.emotionSlots = [
      { key: 'happy', label: '开心', color: colors[0], path: cfg.happyPath || '', text: cfg.happyText || '' },
      { key: 'sad', label: '悲伤', color: colors[1], path: cfg.sadPath || '', text: cfg.sadText || '' },
      { key: 'angry', label: '生气', color: colors[2], path: cfg.angryPath || '', text: cfg.angryText || '' },
      { key: 'shy', label: '害羞', color: colors[3], path: cfg.shyPath || '', text: cfg.shyText || '' },
    ]
    delete cfg.happyPath; delete cfg.happyText; delete cfg.sadPath; delete cfg.sadText
    delete cfg.angryPath; delete cfg.angryText; delete cfg.shyPath; delete cfg.shyText
  }
  // 迁移旧 icon 字段到 color
  if (cfg.emotionSlots) {
    cfg.emotionSlots.forEach((s: any) => {
      if (!s.color && s.icon) {
        // 从旧 emoji icon 推导色值
        const iconColor: Record<string, string> = {
          'happy': '#fbbf24', 'sad': '#93c5fd', 'angry': '#fb7185', 'shy': '#c084fc',
        }
        s.color = iconColor[s.key] || '#8b5cf6'
      }
      if (!s.color) s.color = '#8b5cf6'
      if (s.icon) delete s.icon
    })
  }
  return cfg as TtsConfig
}

function defaultCfg(): TtsConfig {
  return {
    id: 'cfg_' + Date.now(), name: '新配置', engineType: 'gpt-sovits',
    apiUrl: 'http://127.0.0.1:9880', speed: 1.0, apiKey: '', voiceId: '',
    gptWeightPath: '', sovitsWeightPath: '', refAudioPath: '', promptText: '',
    promptLang: 'zh', textLang: 'zh',
    emotionSlots: DEFAULT_EMOTIONS.map(s => ({ ...s })),
  }
}

function loadAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    enabled.value = data.enabled !== false
    configs.value = (data.configs || []).map(migrateOldCfg)
    activeId.value = data.activeId || ''
    if (!activeId.value && configs.value.length > 0) activeId.value = configs.value[0].id
    editingId.value = activeId.value
    const active = configs.value.find(c => c.id === activeId.value)
    if (active) emit('select', active)
  } catch { configs.value = [] }
}

function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: enabled.value, configs: configs.value, activeId: activeId.value }))
  const active = configs.value.find(c => c.id === activeId.value)
  if (active) emit('select', active)
}

function editCfg(id: string) { editingId.value = id }

function setActive(id: string) { activeId.value = id; saveAll() }

function addCfg() {
  const cfg = defaultCfg()
  configs.value.push(cfg); editingId.value = cfg.id
  if (!activeId.value) activeId.value = cfg.id
  saveAll()
}

function removeCfg(id: string) {
  if (configs.value.length <= 1) return
  configs.value = configs.value.filter(c => c.id !== id)
  if (activeId.value === id) activeId.value = configs.value[0]?.id || ''
  if (editingId.value === id) editingId.value = activeId.value
  saveAll()
}

/** 添加自定义情绪槽 */
function addEmotion() {
  const c = editingCfg.value
  if (!c) return
  const n = c.emotionSlots.length + 1
  c.emotionSlots.push({
    key: 'custom_' + Date.now(),
    label: '情绪' + n,
    color: '#8b5cf6',
    path: '',
    text: '',
  })
  saveAll()
}

/** 删除情绪槽 */
function removeEmotion(i: number) {
  const c = editingCfg.value
  if (!c || c.emotionSlots.length <= 1) return
  c.emotionSlots.splice(i, 1)
  saveAll()
}

async function switchModels() {
  const c = editingCfg.value
  if (!c || (!c.gptWeightPath && !c.sovitsWeightPath)) { alert('请填写至少一个模型路径'); return }
  switchingModel.value = true
  try {
    const api = getApiClient()
    if (c.gptWeightPath) await api.setGptWeights(c.gptWeightPath)
    if (c.sovitsWeightPath) await api.setSovitsWeights(c.sovitsWeightPath)
    alert('模型切换成功')
  } catch (e: any) { alert('切换失败: ' + e.message) }
  finally { switchingModel.value = false }
}

async function testCfg() {
  const c = editingCfg.value
  if (!c || (!c.refAudioPath && c.engineType === 'gpt-sovits')) { alert('请填写参考音频路径'); return }
  testing.value = true
  try {
    const api = getApiClient()
    if (c.engineType === 'gpt-sovits') {
      const url = api.getTtsAudioUrl({
        text: '主人你好呀！欢迎使用语音合成工具！',
        text_lang: c.textLang, ref_audio_path: c.refAudioPath,
        prompt_lang: c.promptLang, prompt_text: c.promptText || undefined,
        speed_factor: c.speed,
      })
      const audio = new Audio(url); await audio.play()
      audio.onended = () => { testing.value = false }
      audio.onerror = () => { alert('播放失败'); testing.value = false }
    } else {
      const res = await fetch(`${c.apiUrl}/audio/speech`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {}) },
        body: JSON.stringify({ model: 'tts-1', input: 'Test voice.', voice: c.voiceId || 'alloy' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const audio = new Audio(URL.createObjectURL(blob)); await audio.play()
      audio.onended = () => { testing.value = false }
      audio.onerror = () => { alert('播放失败'); testing.value = false }
    }
  } catch (e: any) { alert('请求异常: ' + e.message); testing.value = false }
}

onMounted(loadAll)
</script>

<style scoped>
.panel { background: #1a1a2e; border-radius: 10px; padding: 16px; border: 1px solid #2a2a4a; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.panel-header h2 { font-size: 1rem; font-weight: 600; color: #e0e0e0; display: flex; align-items: center; gap: 6px; }

/* CSS 小图标 */
.icon-mic {
  display: inline-block; width: 16px; height: 16px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  position: relative; flex-shrink: 0;
}
.icon-mic::after {
  content: ''; position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -70%);
  width: 4px; height: 6px; background: #1a1a2e; border-radius: 2px;
}

.switch { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #3a3a5a; border-radius: 11px; transition: .2s; }
.slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: .2s; }
.switch input:checked + .slider { background: #8b5cf6; }
.switch input:checked + .slider::before { transform: translateX(18px); }

.engine-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.engine-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 6px; background: rgba(255,255,255,.02); cursor: pointer; border: 1px solid transparent; }
.engine-item:hover { border-color: #3a3a5a; }
.engine-item.active { border-color: #8b5cf6; background: rgba(139,92,246,.08); }
.engine-item.editing { border-color: #06b6d4; background: rgba(6,182,212,.06); }
.engine-info { display: flex; align-items: center; gap: 6px; }
.engine-name { font-size: .85rem; font-weight: 600; color: #d0d0e0; }
.badge { font-size: .7rem; padding: 1px 6px; border-radius: 3px; background: rgba(52,211,153,.2); color: #34d399; }
.engine-actions { display: flex; gap: 4px; }
.text-btn { background: none; border: none; color: #6a6a8a; cursor: pointer; font-size: .75rem; padding: 2px 6px; }
.text-btn:hover { color: #8b5cf6; }
.text-btn.danger:hover { color: #fb7185; }
.add-btn { width: 100%; padding: 8px; border-radius: 6px; border: 1px dashed #2a2a4a; background: transparent; color: #6a6a8a; cursor: pointer; font-size: .82rem; }
.add-btn:hover { border-color: #8b5cf6; color: #8b5cf6; }

.edit-form { border-top: 1px solid #2a2a4a; padding-top: 14px; }

/* 可折叠区域 */
.cfg-section { border: 1px solid #2a2a4a; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
.cfg-section summary {
  padding: 8px 12px; cursor: pointer; font-size: .82rem; font-weight: 600; color: #c0c0d0;
  background: rgba(255,255,255,.02); user-select: none; display: flex; align-items: center; gap: 6px;
}
.cfg-section summary:hover { background: rgba(255,255,255,.04); }
.sec-arrow { font-size: .7rem; color: #4a4a6a; width: 14px; font-family: monospace; }

/* 折叠区左侧色条标记 — 替代 emoji */
.sec-marker {
  display: inline-block; width: 3px; height: 14px;
  border-radius: 2px; background: #6a6a8a; flex-shrink: 0;
}
.sec-audio { background: #06b6d4; }
.sec-emotion { background: #c084fc; }

.sec-body { padding: 10px 12px; border-top: 1px solid #2a2a4a; }

.field { margin-bottom: 10px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: .75rem; color: #6a6a8a; margin-bottom: 3px; }
.field input, .field select, .field textarea {
  width: 100%; padding: 7px 10px; border-radius: 5px; border: 1px solid #2a2a4a;
  background: #0f0f1a; color: #e0e0e0; font-size: .82rem; outline: none; font-family: inherit; box-sizing: border-box;
}
.field textarea { height: 50px; min-height: 50px; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: #8b5cf6; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.flex-label { display: flex; justify-content: space-between; align-items: center; }
.val { font-size: .8rem; color: #8b5cf6; font-weight: 600; }
input[type='range'] { width: 100%; accent-color: #8b5cf6; margin: 4px 0; }
.range-marks { display: flex; justify-content: space-between; font-size: .65rem; color: #4a4a6a; }
.hint { font-size: .72rem; color: #5a5a7a; margin-bottom: 8px; line-height: 1.5; }

.emotion-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.emotion-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06); border-radius: 8px; padding: 8px; }
.emo-header { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }

/* 情绪颜色圆点 — 替代 emoji */
.emo-dot {
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: .6rem; font-weight: 700; color: #fff;
  flex-shrink: 0; line-height: 1;
}
.emo-color-input {
  width: 22px; height: 22px; padding: 0; border: 1px solid transparent;
  border-radius: 4px; cursor: pointer; flex-shrink: 0;
  background: transparent;
}
.emo-color-input::-webkit-color-swatch-wrapper { padding: 0; }
.emo-color-input::-webkit-color-swatch { border: 1px solid #2a2a4a; border-radius: 3px; }
.emo-color-input::-moz-color-swatch { border: 1px solid #2a2a4a; border-radius: 3px; }

.emo-label-input {
  flex: 1; padding: 2px 6px; font-size: .72rem; font-weight: 600;
  background: transparent; border: 1px solid transparent; border-radius: 4px;
  color: #c0c0d0; outline: none; min-width: 0;
}
.emo-label-input:focus { border-color: #3a3a5a; }
.emo-del-btn {
  width: 20px; height: 20px; border-radius: 4px; border: none;
  background: transparent; color: #4a4a6a; cursor: pointer; font-size: .72rem;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.emo-del-btn:hover { color: #fb7185; background: rgba(251,113,133,.1); }
.emo-del-btn:disabled { opacity: .3; cursor: not-allowed; }
/* emotion card 的路径/文本输入框 — 用 direct child 避免覆盖 header 内输入框 */
.emotion-card > input {
  width: 100%; background: #0f0f1a; border: 1px solid #2a2a4a;
  color: #e0e0e0; padding: 4px 6px; border-radius: 4px; font-size: .7rem;
  outline: none; margin-bottom: 3px; box-sizing: border-box;
}
.emotion-card > input:focus { border-color: #8b5cf6; }
.emotion-card > input:last-child { margin-bottom: 0; }

.add-emotion-btn {
  width: 100%; margin-top: 6px; padding: 6px; border-radius: 6px;
  border: 1px dashed #2a2a4a; background: transparent; color: #6a6a8a;
  cursor: pointer; font-size: .75rem;
}
.add-emotion-btn:hover { border-color: #8b5cf6; color: #8b5cf6; }

.test-section { margin-top: 12px; }
.test-btn {
  width: 100%; padding: 10px; border-radius: 8px;
  border: 1px solid #8b5cf6; background: rgba(139,92,246,.08);
  color: #c084fc; font-size: .85rem; font-weight: 600; cursor: pointer;
}
.test-btn:hover { background: rgba(139,92,246,.15); }
.test-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
