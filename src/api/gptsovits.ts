import type { TtsRequest, ConnectionStatus, ApiConfig } from '../types'

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: '',
  timeout: 60000,
}

class GptSoVitsClient {
  private config: ApiConfig
  private _status: ConnectionStatus = 'disconnected'

  constructor(config?: Partial<ApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  get status() { return this._status }
  get baseUrl() { return this.config.baseUrl }

  setBaseUrl(url: string) {
    this.config.baseUrl = url.replace(/\/+$/, '')
  }
  /** 构造请求路径：有 baseUrl 时直连，空时走 Vite 代理 */
  private buildUrl(endpoint: string): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const base = this.config.baseUrl
    if (base) {
      // 直连模式：baseUrl/api 是错误路径，去掉 /api 前缀
      return `${base}${path}`
    }
    // 代理模式：加 /api 前缀让 Vite 转发
    return `/api${path}`
  }

  /** 直接生成音频 URL（GET 方式，Yuki 的调用方式） */
  getTtsAudioUrl(params: TtsRequest): string {
    const base = this.config.baseUrl
    // 直连：http://localhost:9880/tts  代理：http://localhost:3000/api/tts
    const baseUrl = base ? `${base}/tts` : `${window.location.origin}/api/tts`
    const url = new URL(baseUrl)
    const query: Record<string, string> = {
      text: params.text,
      text_lang: params.text_lang,
      ref_audio_path: params.ref_audio_path,
      prompt_lang: params.prompt_lang,
    }
    if (params.prompt_text) query.prompt_text = params.prompt_text
    if (params.text_split_method) query.text_split_method = params.text_split_method
    if (params.media_type) query.media_type = params.media_type
    if (params.speed_factor) query.speed_factor = String(params.speed_factor)

    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
    return url.toString()
  }

  /** 检查连接 */
  async checkConnection(): Promise<ConnectionStatus> {
    this._status = 'connecting'
    try {
      const res = await fetch(this.buildUrl('/docs'), { signal: AbortSignal.timeout(5000) })
      this._status = res.ok || res.status === 404 ? 'connected' : 'error'
    } catch { this._status = 'error' }
    return this._status
  }

  /** 切换 GPT 权重 */
  async setGptWeights(path: string): Promise<any> {
    const params = new URLSearchParams({ weights_path: path })
    const res = await fetch(`${this.buildUrl('/set_gpt_weights')}?${params}`, {
      signal: AbortSignal.timeout(this.config.timeout),
    })
    if (!res.ok) throw new Error(`GPT 权重切换失败: ${await res.text()}`)
    return res.json()
  }

  /** 切换 SoVITS 权重 */
  async setSovitsWeights(path: string): Promise<any> {
    const params = new URLSearchParams({ weights_path: path })
    const res = await fetch(`${this.buildUrl('/set_sovits_weights')}?${params}`, {
      signal: AbortSignal.timeout(this.config.timeout),
    })
    if (!res.ok) throw new Error(`SoVITS 权重切换失败: ${await res.text()}`)
    return res.json()
  }

  /** POST /tts 合成 */
  async synthesize(params: TtsRequest): Promise<Blob> {
    const body: Record<string, any> = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) body[k] = v
    }
    const res = await fetch(this.buildUrl('/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout * 3),
    })
    if (!res.ok) throw new Error(`TTS 失败 (${res.status}): ${(await res.text()).slice(0, 200)}`)
    return res.blob()
  }

  /** 批量合成 */
  async synthesizeBatch(
    texts: string[],
    params: Omit<TtsRequest, 'text'>,
    onProgress?: (done: number, total: number) => void,
  ): Promise<Blob[]> {
    const results: Blob[] = []
    for (let i = 0; i < texts.length; i++) {
      const blob = await this.synthesize({ ...params, text: texts[i] })
      results.push(blob)
      onProgress?.(i + 1, texts.length)
    }
    return results
  }

  async control(command: string): Promise<any> {
    const params = new URLSearchParams({ command })
    const res = await fetch(`${this.buildUrl('/control')}?${params}`, {
      signal: AbortSignal.timeout(this.config.timeout),
    })
    if (!res.ok) throw new Error(`control 失败: ${await res.text()}`)
    return res.json()
  }
}

let client: GptSoVitsClient | null = null
export function getApiClient(): GptSoVitsClient {
  if (!client) client = new GptSoVitsClient()
  return client
}
export function createApiClient(config?: Partial<ApiConfig>): GptSoVitsClient {
  client = new GptSoVitsClient(config)
  return client
}
