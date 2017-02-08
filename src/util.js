export class Loader {
  loadFile(fileName) {
    let xhr;

    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = (evt) => this.onxhr(evt);
    xhr.open("GET", fileName);
    xhr.send();
  }

  onxhr(evt) {
    let xhr;

    xhr = evt.target;
    if (xhr.readyState === 4 && xhr.status < 400) {
      this.onLoaded(xhr.response);
    }
  }
}

export class FontBuilder {
  constructor(level, config) {
    this.level = level;
    this.config = config;
  }

  build() {
    let cfg = this.config;

    return {
      charSpacing: cfg.charSpacing,
      charWidth: cfg.charWidth,
      charHeight: cfg.charHeight,
      spriteSheet: this.level.getImageAsset(this.config.image),
      ranges: this.config.ranges
    };
  }
}

export class SmartFontBuilder extends FontBuilder {
  constructor(level, config) {
    super(level, config);
  }

  build() {
    let cfg = this.config;
    let sheet = this.level.getImageAsset(cfg.image);
    let sheetImageData = this.getImageData(sheet);

    return {
      charSpacing: cfg.charSpacing,
      charHeight: cfg.charHeight,
      spaceWidth: cfg.spaceWidth,
      spriteSheet: sheet,
      spriteSheetImageData: sheetImageData,
      ranges: this.extractFontRanges(cfg, sheetImageData)
    };
  }

  getImageData(sheet) {
    let cvs = document.createElement("canvas");
    let ctx = cvs.getContext("2d");

    cvs.width = sheet.width;
    cvs.height = sheet.height;

    ctx.drawImage(sheet, 0, 0);

    return ctx.getImageData(0, 0, sheet.width, sheet.height);
  }

  extractFontRanges(cfg, sheetImageData) {
    let chars = {};

    this.spaceWidth = cfg.spaceWidth || this.spaceWidth;
    this.charHeight = cfg.charHeight || this.charHeight;
    this.charSpacing = cfg.charSpacing || this.charSpacing;

    for (let i = 0, len = cfg.ranges.length; i < len; i += 1) {
      let range = cfg.ranges[i];

      chars[range] = this.extractFontRange(sheetImageData, range, i, len);
    }

    return chars;
  }

  extractFontRange(id, range, index) {
    let crange = [];
    let ch = this.charHeight;

    let x = 0;
    for (let i = range[0].charCodeAt(); i <= range[1].charCodeAt(); i += 1) {
      let c = {
        c: String.fromCharCode(i),
        x,
        y: index * ch
      };
      let empty = false;
      while (!empty) {
        empty = this.isLineEmpty(id, x, index * ch);
        x += 1;
      }
      c.w = x - 1 - c.x;
      while (empty) {
        empty = this.isLineEmpty(id, x, index * ch);
        x += 1;
      }
      x -= 1;
      crange.push(c);
    }

    return crange;
  }

  isLineEmpty(id, x, y) {
    let empty = true;
    for (let j = 0; j < this.charHeight; j += 1) {
      if (!this.isEmptyAt(id, x, y + j)) {
        empty = false;
      }
    }

    return empty;
  }

  isEmptyAt(id, x, y) {
    return id.data[(y * id.width + x) * 4 + 3] === 0;
  }
}
