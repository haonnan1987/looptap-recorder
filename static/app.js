const timer = document.querySelector("#timer");
const statusText = document.querySelector("#statusText");
const statePill = document.querySelector("#statePill");
const levelBar = document.querySelector("#levelBar");
const formatSelect = document.querySelector("#formatSelect");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const downloadBox = document.querySelector("#downloadBox");
const downloadLink = document.querySelector("#downloadLink");
const fileMeta = document.querySelector("#fileMeta");

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function setRecordingUi(recording) {
  startButton.disabled = recording;
  stopButton.disabled = !recording;
  formatSelect.disabled = recording;
  statePill.classList.toggle("recording", recording);
  statePill.textContent = recording ? "录制中" : "准备就绪";
}

function renderStatus(data) {
  setRecordingUi(data.recording);
  timer.textContent = formatDuration(data.elapsed || 0);
  statusText.textContent = data.error || translateStatus(data.status);
  levelBar.style.width = data.recording ? "100%" : "0%";

  if (data.downloadUrl) {
    downloadBox.hidden = false;
    downloadLink.href = data.downloadUrl;
    downloadLink.download = data.lastFile;
    fileMeta.textContent = `${data.lastFile}${data.bytesWritten ? ` · ${formatBytes(data.bytesWritten)}` : ""}`;
  }
}

function translateStatus(status) {
  if (!status) return "准备就绪";
  if (status === "Ready") return "准备就绪";
  if (status === "Starting") return "正在初始化录音设备...";
  if (status === "Stopping") return "正在停止录制...";
  if (status === "Saved") return "已停止并保存录音。";
  if (status === "No audio captured") return "没有录到音频。请确认电脑正在播放声音，并且默认输出设备正确。";
  if (status === "Error") return "录制失败。";
  if (status.startsWith("Recording from ")) return `正在录制：${status.replace("Recording from ", "")}`;
  return status;
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "操作失败");
  }
  return data;
}

startButton.addEventListener("click", async () => {
  downloadBox.hidden = true;
  try {
    const data = await api(`/api/start/${formatSelect.value}`, { method: "POST" });
    renderStatus(data);
  } catch (error) {
    statusText.textContent = error.message;
  }
});

stopButton.addEventListener("click", async () => {
  stopButton.disabled = true;
  statusText.textContent = "正在停止并保存...";
  try {
    const data = await api("/api/stop", { method: "POST" });
    renderStatus(data);
  } catch (error) {
    statusText.textContent = error.message;
  }
});

async function refreshStatus() {
  try {
    const data = await api("/api/status");
    renderStatus(data);
  } catch (error) {
    statusText.textContent = "无法连接本地录音服务。";
    setRecordingUi(false);
  }
}

refreshStatus();
setInterval(refreshStatus, 500);
