# GPT-SoVITS 合成工具

[![Vue.js](https://img.shields.io/badge/Vue-3.0-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![GPT-SoVITS](https://img.shields.io/badge/GPT--SoVITS-API_v2-FF6B35)](https://github.com/RVC-Boss/GPT-SoVITS)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) 的 Web 批量语音合成前端。支持多配置管理、文本分割、情绪参考音选择、批量导出。

## 截图

![](https://i.ibb.co/HLvTGwW2/image.png)

## 前置条件

需要先启动 **GPT-SoVITS api_v2.py** 后端服务（默认端口 9880）：

```bash
# 在 GPT-SoVITS 项目目录下
python api_v2.py -p 9880
```

> 后端可运行在 Windows 或 Linux 上，本前端通过 HTTP 连接即可。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:3000` 即可。

## 使用流程

### 1. 连接后端

顶部连接栏输入 GPT-SoVITS API 地址（默认 `http://localhost:9880`），点击「连接」。连接成功会显示绿色指示灯。

### 2. 配置语音

左侧「语音配置」面板管理 TTS 参数：

- **配置管理** — 支持多套配置（女声/男声/不同角色），点击「启用」切换，可增删

![](https://i.ibb.co/VpJ0VQsr/image.png)

- **模型权重** — 可选填 GPT 和 SoVITS 模型路径，切换后即时生效

![](https://i.ibb.co/4wxmSNX4/image.png)

- **参考音频** — 填写参考音频路径、对应文本、语种、合成语种、语速
- **情绪参考音** — 可为开心/悲伤/生气/害羞等情绪设置独立的参考音频，支持自定义添加

![](https://i.ibb.co/zVXwHW8W/image.png)

配置更改后自动保存到浏览器本地存储。

### 3. 输入文本

右侧「文本输入」面板：

1. 在文本框中输入或粘贴要合成的文本（支持导入 `.txt` 文件）
2. 选择分割方式（按句/逗号/标点/智能/段落）和单段最大长度
3. 点击「分割」将长文本拆分为多段
4. 每段可独立选择情绪（默认/开心/悲伤/生气/害羞/自定义）

![](https://i.ibb.co/d4Q1SGBb/image.png)

5. 点击段落后面的「删除」可移除不需要的段落

### 4. 批量合成

下方「批量合成」面板：

1. 点击「开始批量合成」，逐段调用 API 生成音频
2. 合成完成后每段可试听、重新合成、单独下载
3. 可删除不需要的结果后再统一导出

### 5. 导出

- **单段下载** — 每段后面的「下载」按钮，文件名为该段文本内容（自动过滤非法字符）
- **导出全部** — 导出所有已合成的音频文件（命名同单段下载）
- **清除结果** — 清空全部结果列表

## 构建部署

```bash
# 构建为静态文件
npm run build:fast

# 产物在 dist/ 目录，可直接部署到任意静态服务器
```

## 技术栈

- Vue 3 + TypeScript
- Vite
- GPT-SoVITS API v2
