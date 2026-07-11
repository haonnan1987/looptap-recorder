# LoopTap

LoopTap 是一个 Windows 本地网页录音工具，专注于一件事：快速录制电脑正在播放的声音，并导出无损音频文件。

它使用 Windows WASAPI loopback 捕获默认扬声器/耳机输出，不读取麦克风输入。适合录制网页音频、播放器回放、会议回放、课程片段、播客素材和任何系统正在播放的声音。

## 亮点

- 只录电脑播放声，不录麦克风
- 本地网页 UI，打开浏览器即可操作
- 支持 WAV 24-bit、FLAC 24-bit、WAV 32-bit Float
- 停止录制后自动保存，并提供下载按钮
- 录音文件保存在本机，不上传云端
- 可打包成单文件 exe 分发

## 快速开始

### 方式一：双击启动

1. 安装 Python 3.11 或更高版本。
2. 双击 `run.bat`。
3. 首次运行会自动创建 `.venv` 并安装依赖。
4. 浏览器会自动打开 `http://127.0.0.1:8765`。
5. 播放电脑声音，点击“开始录制”。
6. 点击“停止并保存”，然后下载音频文件。

### 方式二：命令行启动

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

然后打开：

```text
http://127.0.0.1:8765
```

## 导出格式

| 格式 | 说明 | 推荐场景 |
| --- | --- | --- |
| WAV 24-bit PCM | 无损、兼容性好 | 默认推荐，剪辑、存档 |
| FLAC 24-bit | 无损压缩、文件更小 | 长时间录制、分享 |
| WAV 32-bit Float | 后期余量更高、文件较大 | 音频后期处理 |

## 文件保存位置

录音会自动保存到：

```text
recordings/
```

网页关闭不会停止后端服务。需要停止服务时，关闭启动窗口、按 `Ctrl+C`，或双击 `stop_server.bat`。

## 打包 exe

双击：

```text
build_exe.bat
```

生成结果：

```text
dist\LoopTap.exe
```

## 常见问题

### 为什么录不到声音？

请确认 Windows 默认输出设备就是正在播放声音的扬声器或耳机。切换蓝牙耳机、声卡或 HDMI 输出后，建议重启 LoopTap。

### 会录到麦克风吗？

不会。LoopTap 使用默认播放设备的 loopback 输入，只捕获电脑输出声。

### 音频会上传吗？

不会。LoopTap 是本地工具，录音保存在你的电脑上。

## 开发文档

查看 [DEVELOPMENT.md](DEVELOPMENT.md)。

## 开源协议

MIT License. See [LICENSE](LICENSE).
