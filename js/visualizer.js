// Canvas-based audio visualizer
// Depends on: state.js, dom.js

var vizAnimId = null;

function openVisualizer() {
  isVisualizerOpen = true;
  visualizerOverlay.classList.remove("hidden");
  resizeCanvas();
  drawVisualizerFrame();
}

function closeVisualizer() {
  isVisualizerOpen = false;
  visualizerOverlay.classList.add("hidden");
  if (vizAnimId) {
    cancelAnimationFrame(vizAnimId);
    vizAnimId = null;
  }
}

function resizeCanvas() {
  visualizerCanvas.width = window.innerWidth;
  visualizerCanvas.height = window.innerHeight;
}

function drawVisualizerFrame() {
  if (!isVisualizerOpen) return;

  var canvas = visualizerCanvas;
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  var time = Date.now() / 1000;
  var barCount = 64;
  var barWidth = W / barCount;
  var centerY = H * 0.55;

  for (var i = 0; i < barCount; i++) {
    var baseHeight;
    if (isPlaying) {
      var wave1 = Math.sin(time * 3 + i * 0.4) * 0.5 + 0.5;
      var wave2 = Math.sin(time * 5 + i * 0.7) * 0.3 + 0.5;
      var wave3 = Math.cos(time * 2 + i * 0.2) * 0.2 + 0.5;
      baseHeight = (wave1 + wave2 + wave3) / 3;
      baseHeight = baseHeight * 0.8 + Math.random() * 0.2;
    } else {
      baseHeight = (Math.sin(time * 0.5 + i * 0.3) + 1) / 2 * 0.1;
    }

    var barH = baseHeight * H * 0.35 + 2;
    var hue = (i / barCount) * 80 + time * 20;

    ctx.fillStyle = "hsla(" + hue + ", 70%, 55%, " + (0.4 + baseHeight * 0.5) + ")";
    ctx.fillRect(i * barWidth, centerY - barH, barWidth - 2, barH);

    ctx.fillStyle = "hsla(" + hue + ", 70%, 55%, " + (0.1 + baseHeight * 0.15) + ")";
    ctx.fillRect(i * barWidth, centerY, barWidth - 2, barH * 0.4);
  }

  if (isPlaying) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(29, 185, 84, 0.3)";
    ctx.lineWidth = 2;
    for (var x = 0; x < W; x += 3) {
      var y = centerY + Math.sin(x * 0.015 + time * 2.5) * 40 + Math.sin(x * 0.03 + time * 4) * 15;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  vizAnimId = requestAnimationFrame(drawVisualizerFrame);
}
