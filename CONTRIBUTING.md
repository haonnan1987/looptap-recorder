# Contributing to LoopTap

欢迎贡献代码、文档、问题反馈和功能建议。

## 开发步骤

1. Fork 仓库。
2. 创建功能分支。
3. 本地运行并验证改动。
4. 提交 Pull Request。

## 提交前检查

```powershell
.\.venv\Scripts\python.exe -m py_compile app.py
```

如果改动了前端，请确认页面可以正常打开，开始/停止按钮状态正确，下载链接可用。

## Issue 建议包含

- Windows 版本
- Python 版本
- 默认播放设备名称
- 是否使用蓝牙耳机、外接声卡或 HDMI 输出
- 复现步骤
- 错误信息或截图
