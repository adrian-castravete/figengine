export default class FigEngine {
  constructor(canvas, config = {}) {
    if (!canvas) {
      canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
    }

    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.viewportWidth = config.width || 256;
    this.viewportHeight = config.height || 256;
    this.viewportZoom = config.zoom || 2;
    this.maskOutExtents = config.mask || true;

    this.running = false;
    this.cameraX = 0;
    this.cameraY = 0;
    this.keys = {
      left: null,
      up: null,
      right: null,
      down: null,
      start: null,
      buttonA: null,
      buttonB: null,
      debug: null
    };
    this.currentTick = null;
    this.oldTick = null;
    this.debugEnabled = false;
    this.debugTopLeftText = "";
    this.debugTopRightText = "";
    this.debugBottomLeftText = "";
    this.debugBottomRightText = "";
  }

  start() {
    this.startLoop();
  }

  stop() {
    this.stopLoop();
  }

  startLoop() {
    this.running = true;
    this.update(0);
    this.draw(0);
  }

  stopLoop() {
    this.running = false;
  }

  update(tick) {
    let delta;

    this.currentTick = tick;
    if (this.running && this.level) {
      if (this.oldTick == null) {
        this.oldTick = tick;
      }
      delta = (tick - this.oldTick) / 1000.0;
      this.checkCamera();
      this.level.update(tick, delta);
      this.oldTick = tick;
    }
    if (this.running) {
      this.viewportZoom = Math.min(this.canvas.width / this.viewportWidth,
                                   this.canvas.height / this.viewportHeight) | 0;
      window.setTimeout((newTick) => this.update(newTick), 10, Date.now());
    }
  }

  draw() {
    let g;

    if (this.running) {
      g = this.context;
      this.drawBackground();
      if (this.level) {
        g.save();
        g.translate((this.canvas.width * 0.5) | 0, (this.canvas.height * 0.5) | 0);
        g.scale(this.viewportZoom, this.viewportZoom);
        if (this.maskOutExtents) {
          this.clipExtents();
        }
        g.imageSmoothingEnabled = false;
        this.level.draw(g);
        g.restore();
        this.debugScreen(g);
      }
      window.requestAnimationFrame(() => this.draw());
    }
  }

  clipExtents() {
    let g = this.context;
    let gw = this.viewportWidth;
    let gh = this.viewportHeight;

    g.beginPath();
    g.rect(-gw * 0.5, -gh * 0.5, gw, gh);
    g.closePath();
    g.clip();
  }

  drawBackground() {
  }

  debugScreen(g) {
    if (this.debugEnabled) {
      this.debugTopLeftText = `Debug Screen\n${this.debugTopLeftText}`;

      g.save();
      g.font = "bold 12px monospace";
      g.shadowColor = "#000000";
      g.shadowBlur = 2;
      g.fillStyle = "#ffffff";

      g.textBaseline = "top";
      g.textAlign = "left";
      let lines = this.debugTopLeftText.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        g.fillText(lines[i], 0, 12 * i);
      }

      g.textAlign = "right";
      lines = this.debugTopRightText.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        g.fillText(lines[i], window.innerWidth - 1, 12 * i);
      }

      g.textBaseline = "bottom";
      lines = this.debugBottomRightText.split("\n");
      let offset = window.innerHeight - 1 - lines.length * 12;
      for (let i = 0; i < lines.length; i += 1) {
        g.fillText(lines[i], window.innerWidth - 1, offset + 12 * i);
      }

      g.textAlign = "left";
      lines = this.debugBottomLeftText.split("\n");
      offset = window.innerHeight - 1 - lines.length * 12;
      for (let i = 0; i < lines.length; i += 1) {
        g.fillText(lines[i], 0, offset + 12 * i);
      }

      g.restore();

      this.debugTopLeftText = "";
      this.debugTopRightText = "";
      this.debugBottomLeftText = "";
      this.debugBottomRightText = "";
    }
  }

  addDebugLine(line) {
    this.addTopLeftDebugLine(line);
  }

  addTopLeftDebugLine(line) {
    if (this.debugEnabled) {
      this.debugTopLeftText += `${line}\n`;
    }
  }

  addTopRightDebugLine(line) {
    if (this.debugEnabled) {
      this.debugTopRightText += `${line}\n`;
    }
  }

  addBottomLeftDebugLine(line) {
    if (this.debugEnabled) {
      this.debugBottomLeftText += `${line}\n`;
    }
  }

  addBottomRightDebugLine(line) {
    if (this.debugEnabled) {
      this.debugBottomRightText += `${line}\n`;
    }
  }

  resize(width, height) {
    let c;

    c = this.canvas;
    c.width = width;
    c.height = height;
  }

  setCamera(x, y) {
    this.cameraX = x;
    this.cameraY = y;
    this.checkCamera();
  }

  keyDown(key) {
    if (!this.keys[key]) {
      this.keys[key] = this.currentTick;
    }

  }

  keyUp(key) {
    this.keys[key] = null;
    if (key === "debug") {
      this.debugEnabled = !this.debugEnabled;
    }
  }

  isPressed(key) {
    return !!this.keys[key];
  }

  checkCamera() {
    let ox = 0;
    let oy = 0;
    let vw = this.viewportWidth * 0.5;
    let vh = this.viewportHeight * 0.5;
    let sl = this.level.solidLayer;
    if (sl) {
      ox = sl.width * sl.tileWidth - vw - 1;
      oy = sl.height * sl.tileHeight - vh - 1;
    }
    if (this.cameraX > ox) {
      this.cameraX = ox;
    }
    if (this.cameraY > oy) {
      this.cameraY = oy;
    }
    if (this.cameraX < vw) {
      this.cameraX = vw;
    }
    if (this.cameraY < vh) {
      this.cameraY = vh;
    }
  }

  playSound(sound) {
    if (sound.ended || !sound.playedAtLeastOnce) {
      sound.play();
      sound.playedAtLeastOnce = true;
    } else {
      sound.currentTime = 0;
    }
  }
}
