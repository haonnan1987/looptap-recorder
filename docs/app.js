const timer = document.querySelector("#timer");
const statusText = document.querySelector("#statusText");
const meterBar = document.querySelector("#meterBar");
const formatSelect = document.querySelector("#formatSelect");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const downloadBox = document.querySelector("#downloadBox");
const downloadLink = document.querySelector("#downloadLink");
const fileMeta = document.querySelector("#fileMeta");

let stream = null;
let recorder = null;
let audioContext = null;
let processor = null;
let source = null;
let analyser = null;
let chunks = [];
let wavBuffers = [];
let sampleRate = 48000;
let startedAt = 0;
let timerId = null;
let meterId = null;

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function setRecordingUi(isRecording) {
  startButton.disabled = isRecording;
  stopButton.disabled = !isRecording;
  formatSelect.disabled = isRecording;
}

function startTimer() {
  startedAt = Date.now();
  timerId = window.setInterval(() => {
    timer.textContent = formatDuration(Math.floor((Date.now() - startedAt) / 1000));
  }, 250);
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = null;
}

function startMeter() {
  const data = new Uint8Array(analyser.frequencyBinCount);
  meterId = window.setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (const value of data) {
      peak = Math.max(peak, Math.abs(value - 128));
    }
    meterBar.style.width = `${Math.min(100, Math.round((peak / 128) * 100))}%`;
  }, 120);
}

function stopMeter() {
  window.clearInterval(meterId);
  meterId = null;
  meterBar.style.width = "0%";
}

async function requestAudioStream() {
  const capture = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });

  if (capture.getAudioTracks().length === 0) {
    capture.getTracks().forEach((track) => track.stop());
    throw new Error("没有捕获到音频轨道。请重新选择标签页/窗口/屏幕，并勾选共享音频。");
  }

  return capture;
}

function prepareAudioGraph(inputStream) {
  audioContext = new AudioContext();
  sampleRate = audioContext.sampleRate;
  source = audioContext.createMediaStreamSource(inputStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
}

function startWavRecording(inputStream) {
  wavBuffers = [];
  processor = audioContext.createScriptProcessor(4096, 2, 2);
  source.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (event) => {
    const left = new Float32Array(event.inputBuffer.getChannelData(0));
    const right = event.inputBuffer.numberOfChannels > 1
      ? new Float32Array(event.inputBuffer.getChannelData(1))
      : left;
    wavBuffers.push({ left, right });
  };
}

function startWebmRecording(inputStream) {
  chunks = [];
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  recorder = new MediaRecorder(inputStream, { mimeType });
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(1000);
}

function encodeWav(buffers, rate) {
  const totalFrames = buffers.reduce((sum, item) => sum + item.left.length, 0);
  const dataSize = totalFrames * 2 * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const item of buffers) {
    for (let i = 0; i < item.left.length; i += 1) {
      view.setInt16(offset, floatToInt16(item.left[i]), true);
      offset += 2;
      view.setInt16(offset, floatToInt16(item.right[i]), true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function floatToInt16(value) {
  const clipped = Math.max(-1, Math.min(1, value));
  return clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
}

function cleanup() {
  if (processor) {
    processor.disconnect();
    processor.onaudioprocess = null;
  }
  if (source) source.disconnect();
  if (audioContext) audioContext.close();
  if (stream) stream.getTracks().forEach((track) => track.stop());
  processor = null;
  source = null;
  analyser = null;
  audioContext = null;
  stream = null;
}

startButton.addEventListener("click", async () => {
  downloadBox.hidden = true;
  try {
    stream = await requestAudioStream();
    prepareAudioGraph(stream);

    if (formatSelect.value === "wav") {
      startWavRecording(stream);
    } else {
      startWebmRecording(stream);
    }

    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        if (!stopButton.disabled) stopButton.click();
      };
    });

    statusText.textContent = "正在录制共享音频...";
    setRecordingUi(true);
    startTimer();
    startMeter();
  } catch (error) {
    statusText.textContent = error.message;
    cleanup();
    setRecordingUi(false);
  }
});

stopButton.addEventListener("click", async () => {
  setRecordingUi(false);
  stopTimer();
  stopMeter();
  statusText.textContent = "正在生成音频文件...";

  let blob;
  let extension;
  if (formatSelect.value === "wav") {
    blob = encodeWav(wavBuffers, sampleRate);
    extension = "wav";
  } else {
    if (recorder && recorder.state !== "inactive") {
      await new Promise((resolve) => {
        recorder.onstop = resolve;
        recorder.stop();
      });
    }
    blob = new Blob(chunks, { type: "audio/webm" });
    extension = "webm";
  }

  cleanup();

  if (!blob || blob.size === 0) {
    statusText.textContent = "没有生成音频。请确认共享源正在播放声音。";
    return;
  }

  const filename = `looptap-web-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = filename;
  fileMeta.textContent = `${filename} · ${formatBytes(blob.size)}`;
  downloadBox.hidden = false;
  statusText.textContent = "录音已生成。";
});
