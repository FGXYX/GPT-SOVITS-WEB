import type { SplitConfig, TextChunk } from '../types'

/** 默认分割配置 */
export const DEFAULT_SPLIT_CONFIG: SplitConfig = {
  method: 'cut2',
  maxLength: 50,
  separator: '。！？\n',
}

/** 按标点分割文本 */
function splitByPunctuation(text: string, separators: string): string[] {
  const parts: string[] = []
  let current = ''
  for (const char of text) {
    current += char
    if (separators.includes(char) && current.trim()) {
      parts.push(current.trim())
      current = ''
    }
  }
  if (current.trim()) {
    parts.push(current.trim())
  }
  return parts
}

/** 按最大长度强制分割 */
function splitByMaxLength(text: string, maxLength: number): string[] {
  const parts: string[] = []
  for (let i = 0; i < text.length; i += maxLength) {
    parts.push(text.slice(i, i + maxLength))
  }
  return parts
}

/** 智能分割：先按标点，再按最大长度 */
function smartSplit(text: string, config: SplitConfig): string[] {
  // 先按标点分割
  let segments = splitByPunctuation(text, config.separator || '。！？\n')

  // 如果某段过长，再按最大长度拆分
  const result: string[] = []
  for (const seg of segments) {
    if (seg.length > config.maxLength) {
      result.push(...splitByMaxLength(seg, config.maxLength))
    } else {
      result.push(seg)
    }
  }
  return result.filter(s => s.trim().length > 0)
}

/** 按句子分割（cut0：简单按句号分割） */
function cut0(text: string): string[] {
  return text.split(/[。！？\n]+/).filter(s => s.trim().length > 0)
}

/** 按标点分割（cut2：按句号、感叹号、问号） */
function cut2(text: string): string[] {
  const parts: string[] = []
  let current = ''
  const separators = '。！？\n'
  for (const char of text) {
    current += char
    if (separators.includes(char) && current.trim().length > 1) {
      parts.push(current.trim())
      current = ''
    }
  }
  if (current.trim().length > 0) {
    parts.push(current.trim())
  }
  return parts
}

/** 按逗号分割（cut1：按逗号、句号等） */
function cut1(text: string): string[] {
  const parts: string[] = []
  let current = ''
  const separators = '，。,．！？\n'
  for (const char of text) {
    current += char
    if (separators.includes(char) && current.trim().length > 1) {
      parts.push(current.trim())
      current = ''
    }
  }
  if (current.trim().length > 0) {
    parts.push(current.trim())
  }
  return parts
}

/** 分割文本并生成 TextChunk 列表 */
export function splitText(text: string, config: SplitConfig = DEFAULT_SPLIT_CONFIG): TextChunk[] {
  let segments: string[]

  switch (config.method) {
    case 'cut0':
      segments = cut0(text)
      break
    case 'cut1':
      segments = cut1(text)
      break
    case 'cut2':
      segments = cut2(text)
      break
    case 'cut3':
    case 'cut4':
    case 'cut5':
      segments = smartSplit(text, config)
      break
    default:
      segments = smartSplit(text, config)
  }

  if (segments.length === 0) {
    segments = [text]
  }

  return segments.map((content, index) => ({
    index,
    content,
    length: content.length,
    status: 'pending' as const,
    emotion: 'default',
  }))
}

/** 合并音频 Blob */
export function mergeAudioBlobs(blobs: Blob[]): Blob {
  // 简单合并：如果都是同一格式，可考虑更复杂的拼接
  // 这里简单返回最后一个或第一个
  return blobs[0] || new Blob()
}

/** 下载 Blob 为文件 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 将文本转为安全的文件名（去非法字符，截断） */
export function sanitizeFilename(text: string, maxLen = 30): string {
  let name = text.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  if (name.length > maxLen) name = name.slice(0, maxLen)
  if (name.length === 0) name = 'unnamed'
  return name
}
