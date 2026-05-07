/** GPT-SoVITS API v2 类型定义 */

/** 完整 TTS 请求参数（匹配 api_v2 TTS_Request schema） */
export interface TtsRequest {
  text: string
  text_lang: string
  ref_audio_path: string
  aux_ref_audio_paths?: string[]
  prompt_lang: string
  prompt_text?: string
  top_k?: number
  top_p?: number
  temperature?: number
  text_split_method?: string
  batch_size?: number
  batch_threshold?: number
  split_bucket?: boolean
  speed_factor?: number
  fragment_interval?: number
  seed?: number
  media_type?: 'wav' | 'mp3'
  streaming_mode?: boolean | number
  parallel_infer?: boolean
  repetition_penalty?: number
  sample_steps?: number
  super_sampling?: boolean
  overlap_length?: number
  min_chunk_length?: number
}

/** 情绪参考音槽位 */
export interface EmotionSlot {
  key: string   // 唯一标识，如 'happy' / 'custom_1'
  label: string // 显示名，如 "开心"
  color: string // 标记色，如 '#fbbf24'
  path: string  // 参考音频路径
  text: string  // 对应文本
}

/** 文本分割结果 */
export interface TextChunk {
  index: number
  content: string
  length: number
  status: 'pending' | 'processing' | 'done' | 'error'
  emotion: string   // 'default' 或自定义情绪 key
  error?: string
}

/** 分割配置 */
export interface SplitConfig {
  method: 'cut0' | 'cut1' | 'cut2' | 'cut3' | 'cut4' | 'cut5'
  maxLength: number
  separator?: string
}

/** 合成任务 */
export interface SynthesisJob {
  id: string
  name: string
  refAudioPath: string
  refAudioName: string
  chunks: TextChunk[]
  totalChunks: number
  completedChunks: number
  status: 'pending' | 'running' | 'done' | 'error'
  createdAt: string
}

/** 连接状态 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/** API 配置 */
export interface ApiConfig {
  baseUrl: string
  timeout: number
}

/** 参考音频条目（用户维护的列表） */
export interface RefAudioEntry {
  id: string
  name: string
  path: string
  text: string
  lang: string
}
