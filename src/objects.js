class FSObject {
  constructor(engine, level) {
    this.engine = engine;
    this.level = level;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.width = 16;
    this.height = 16;
    this.spriteSheet = null;
    this.sprX = 0;
    this.sprY = 0;
    this.anchorX = 0;
    this.anchorY = 0;
  }

  update() {}

  draw(g) {
    if (this.spriteSheet) {
      let w = this.width;
      let h = this.height;
      g.save();
      g.translate(this.x | 0, this.y | 0);
      g.rotate(this.rotation);
      g.drawImage(this.spriteSheet, this.sprX, this.sprY, w, h, -w / 2 - this.anchorX, -h / 2 - this.anchorY, w, h);
      g.restore();
    }
  }
}

export class Sprite extends FSObject {
  constructor(engine, level) {
    super(engine, level);

    this.animations = {};
    this.currentAnim = null;
    this.frame = 0;
    this.spriteOldTick = null;
    this.spriteSheet = null;
  }

  createAnimation(name, x, y, length, delay, callback) {
    this.animations[name] = {x, y, length, delay, callback};
  }

  getAnimation() {
    return this.currentAnim;
  }

  setAnimation(name) {
    if (name !== this.currentAnim) {
      this.currentAnim = name;
      this.frame = 0;
      this.spriteOldTick = null;
    }
  }

  update(tick, delta) {
    if (this.spriteOldTick == null) {
      this.spriteOldTick = tick;
    }
    super.update(tick, delta);
    let anim = this.animations[this.currentAnim];
    if (anim) {
      let otick = this.spriteOldTick;
      if (otick < tick - anim.delay) {
        this.frame += 1;
        this.resetFrame(anim);
        this.spriteOldTick = tick;
      }
      this.sprX = anim.x + this.frame * this.width;
      this.sprY = anim.y;
    }
  }

  resetFrame(anim) {
    if (this.frame >= anim.length) {
      this.frame = 0;
      if (anim.callback) {
        if (typeof anim.callback === "function") {
          anim.callback();
        } else {
          this.setAnimation(anim.callback);
        }
      }
    }
  }

  loadSpriteSheet(imageName) {
    this.spriteSheet = this.level.getImageAsset(imageName);
  }
}

export class FontSprite extends Sprite {
  constructor(engine, level, fontName) {
    super(engine, level);

    this.text = "";
    this.textAlign = "left";
    this.textBaseline = "bottom";

    let fc = level.getFontAsset(fontName);
    this.charWidth = fc.charWidth || 8;
    this.charHeight = fc.charHeight || 8;
    this.charSpacing = fc.charSpacing || 0;

    this.fontConfig = fc;
  }

  draw(g) {
    let cw = this.charWidth;
    let ch = this.charHeight;
    let cs = this.charSpacing + cw;

    let y = this.y - ch;
    if (this.textBaseline === "middle") {
      y += ch / 2;
    } else if (this.textBaseline === "top") {
      y += ch;
    }
    y = y | 0;

    let len = this.text.length;
    let ox = this.x;
    if (this.textAlign === "center") {
      ox -= len * cs / 2 | 0;
    } else if (this.textAlign === "right") {
      ox -= len * cs | 0;
    }

    let ranges = this.fontConfig.ranges;
    for (let i = 0; i < len; i += 1) {
      let c = this.text[i].charCodeAt();

      for (let j = 0, rlen = ranges.length; j < rlen; j += 1) {
        let cf = ranges[j];

        let x = ox + i * cs | 0;

        let sx = 0;
        let sy = 0;

        if (c >= cf[0].charCodeAt() && c <= cf[1].charCodeAt()) {
          sx = (c - cf[0].charCodeAt()) * cw;
          sy = j * ch;
        }

        g.drawImage(this.fontConfig.spriteSheet, sx, sy, cw, ch,
                    x | 0, y | 0, cw, ch);
      }
    }
  }
}

export class SmartFontSprite extends FontSprite {
  constructor(engine, level, fontName) {
    super(engine, level, fontName);

    let fc = this.fontConfig;

    this.charSpacing = fc.charSpacing || 0;
    this.spaceWidth = fc.spaceWidth || 8;

    this.charRanges = fc.ranges;
  }

  draw(g) {
    let ch = this.charHeight;
    let x = this.x;
    let y = this.y - ch;

    let w = 0;
    this._forCharDo((sx, sy, cw) => {
      if (sx >= 0 && sy >= 0) {
        w += cw + this.charSpacing;
      } else {
        w += this.spaceWidth + this.charSpacing;
      }
    });

    if (this.textAlign === "center") {
      x -= w / 2;
    } else if (this.textAlign === "right") {
      x -= w;
    }
    if (this.textBaseline === "middle") {
      y += ch / 2;
    } else if (this.textBaseline === "top") {
      y += ch;
    }

    this._forCharDo((sx, sy, cw) => {
      if (sx >= 0 && sy >= 0) {
        g.drawImage(this.fontConfig.spriteSheet, sx, sy, cw, ch, x | 0, y | 0, cw, ch);
        x += cw + this.charSpacing;
      } else {
        x += this.spaceWidth + this.charSpacing;
      }
    });
  }

  _forCharDo(callback) {
    let ch = this.charHeight;

    for (let i = 0, len = this.text.length; i < len; i += 1) {
      let c = this.text[i].charCodeAt();

      let sx = -1;
      let sy = -1;
      let cw;

      Object.keys(this.charRanges).forEach((key) => {
        let s = key[0].charCodeAt();
        let e = key[2].charCodeAt();
        if (c >= s && c <= e) {
          let o = this.charRanges[key][c - s];

          sx = o.x;
          sy = o.y;
          cw = o.w;
        }
      });

      callback(sx, sy, cw, ch);
    }
  }
}
