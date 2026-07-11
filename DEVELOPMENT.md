# LoopTap 开发文档

本文档面向想要本地开发、二次开发或参与贡献的开发者。

## 项目定位

LoopTap 是一个 Windows system audio recorder。它通过 WASAPI loopback 录制默认播放设备输出，并用 Flask 提供本地网页控制台。

核心目标：

- 录制系统播放声，而不是麦克风
- 保持本地运行，不依赖云服务
- 提供简单稳定的开始、停止、下载工作流
- 导出无损且通用的音频格式

## 技术栈

- Python 3.11+
- Flask：本地 Web 服务和 API
- soundcard：访问 WASAPI loopback 设备
- soundfile：写入 WAV / FLAC
- NumPy：处理音频块数据
- 原生 HTML / CSS / JavaScript：前端 UI

## 目录结构

```text
.
├── app.py                # Flask 服务、录音控制、文件下载
├── docs/                 # GitHub Pages 网页版
├── templates/
│   └── index.html        # Web UI
├── static/
│   ├── app.js            # 前端状态轮询和按钮交互
│   └── styles.css        # 页面样式
├── recordings/           # 录音输出目录，运行时生成
├── requirements.txt      # Python 依赖
├── run.bat               # Windows 一键启动脚本
├── stop_server.bat       # 停止本地服务
└── build_exe.bat         # PyInstaller 打包脚本
```

## 运行流程

1. 用户打开 `http://127.0.0.1:8765`。
2. 前端调用 `POST /api/start/<format_key>`。
3. 后端读取默认扬声器名称，并通过 `soundcard.get_microphone(..., include_loopback=True)` 获取 loopback 输入。
4. 后端按块录制音频数据，并实时写入文件。
5. 前端轮询 `GET /api/status` 更新计时、状态和下载链接。
6. 用户点击停止后，前端调用 `POST /api/stop`。
7. 后端关闭音频文件，返回下载地址。

## API

### `GET /`

返回网页 UI。

### `POST /api/start/<format_key>`

开始录制。

支持的 `format_key`：

- `wav24`
- `flac24`
- `wavfloat`

### `POST /api/stop`

停止录制并保存文件。

### `GET /api/status`

返回当前状态。

示例：

```json
{
  "recording": false,
  "elapsed": 0,
  "status": "Ready",
  "error": null,
  "framesWritten": 0,
  "lastFile": null,
  "downloadUrl": null,
  "bytesWritten": 0
}
```

### `GET /recordings/<filename>`

下载录音文件。

## 本地开发

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

开发时访问：

```text
http://127.0.0.1:8765
```

## 验证

基础语法检查：

```powershell
.\.venv\Scripts\python.exe -m py_compile app.py
```

接口冒烟测试：

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8765/api/status" -UseBasicParsing
```

## 打包

```powershell
.\build_exe.bat
```

打包脚本使用 PyInstaller，并把 `templates` 与 `static` 一起放进可执行文件。

## 设计约束

- 只绑定 `127.0.0.1`，避免把录音控制接口暴露到局域网。
- 录音数据边录边写入文件，减少长时间录制时的内存占用。
- 默认采样率为 48 kHz，符合大多数 Windows 播放设备和视频/音频工作流。
- 切换系统默认输出设备后，建议重启应用。

## 后续可做

- 增加输入/输出设备选择
- 增加实时音量电平
- 增加录音历史列表
- 增加自动停止计时器
- 增加 GitHub Actions 构建 exe
