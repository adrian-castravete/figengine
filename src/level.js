import {Loader, FontBuilder, SmartFontBuilder} from './util';

let _loadingSprite = null;

function _getLoadingSprite() {
  if (!_loadingSprite) {
    let ls = new Image();
    ls.src = "assets/images/progress.gif";
    _loadingSprite = ls;
  }

  return _loadingSprite;
}

export class Layer {
  constructor(engine, tileWidth, tileHeight) {
    this.engine = engine;
    this.tiles = [];
    this.backScreen = null;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.width = 0;
    this.height = 0;
    this.isBackground = true;
    this.isSolid = false;
    this.tilesets = [];
    this.everythingLoaded = false;
  }

  buildBackground() {
    let backScreen = document.createElement("canvas");
    backScreen.width = this.tileWidth * this.width;
    backScreen.height = this.tileHeight * this.height;

    let g = backScreen.getContext("2d");
    for (let j = 0; j < this.tiles.length; j += 1) {
      for (let i = 0; i < this.tiles[j].length; i += 1) {
        let tile = this.tiles[j][i];
        if (tile && tile.img) {
          g.drawImage(tile.img, tile.sx, tile.sy, tile.w, tile.h,
                      i * this.tileWidth, j * this.tileHeight, tile.w, tile.h);
          // g.strokeStyle = "#000000";
          // g.strokeRect(i * this.tileWidth + 0.5, j * this.tileHeight + 0.5, 16, 16);
        }
      }
    }

    this.backScreen = backScreen;
  }

  draw(g) {
    if (!this.everythingLoaded) {
      let dorebuild = true;
      for (let i = 0; i < this.tilesets.length; i += 1) {
        if (!this.tilesets[i].loaded) {
          dorebuild = false;
        }
      }
      if (dorebuild) {
        this.buildBackground();
        this.everythingLoaded = true;
      }
    }
    let e = this.engine;
    let gw = e.viewportWidth;
    let gh = e.viewportHeight;
    let ox = e.cameraX - gw * 0.5 | 0;
    let oy = e.cameraY - gh * 0.5 | 0;
    g.drawImage(this.backScreen, ox, oy, gw, gh, ox, oy, gw, gh);
  }

  getAt(x, y) {
    let cx = x / this.tileWidth | 0;
    let cy = y / this.tileHeight | 0;

    if (cx >= 0 && cy >= 0 &&
        cy < this.tiles.length && cx < this.tiles[cy].length) {
      return this.tiles[cy][cx];
    }

    return null;
  }
}

export class Level extends Loader {
  constructor(engine, fileName) {
    super();

    this.engine = engine;
    this.objects = [];
    this.layers = [];
    this.solidLayer = null;

    this.assets = {};
    this.isLoading = false;
    this.loadingProgress = 0;
    this.loadingCallback = null;
    this.levelFileName = fileName;
  }

  resetLevelData() {
    this.objects = [];
    this.layers = [];
  }

  update(tick, delta) {
    if (this.isLoading) {
      this.updateLoading(tick, delta);
    } else {
      this.updateNormal(tick, delta);
    }
  }

  updateLoading() {
    let done = 0;
    let total = 0;
    let images = this.assets.images || {};
    let fonts = this.assets.fonts || {};

    Object.keys(images).forEach((key) => {
      total += 1;
      if (images[key].loaded) {
        done += 1;
      }
    });

    Object.keys(fonts).forEach((key) => {
      total += 1;
      if (fonts[key].loaded) {
        done += 1;
      }
    });

    this.loadingProgress = done / total * 100 | 0;

    if (done === total) {
      this.isLoading = false;
      if (this.loadingCallback) {
        this.loadingCallback();
      }
    }
  }

  updateNormal(tick, delta) {
    let cx = this.engine.cameraX;
    let cy = this.engine.cameraY;
    let hw = this.engine.viewportWidth * 0.618;
    let hh = this.engine.viewportHeight * 0.618;

    for (let i = 0, len = this.objects.length; i < len; i += 1) {
      let obj = this.objects[i];

      if (obj) {
        obj.update(tick, delta);
      }
    }
  }

  draw(g) {
    if (this.isLoading) {
      this.drawLoading(g);
    } else {
      this.drawNormal(g);
    }
  }

  drawLoading(g) {
    let s = _getLoadingSprite();
    let w = this.engine.viewportWidth;
    let cw = (w - 64) / 8 | 0;
    let p = this.loadingProgress;

    g.drawImage(s, 0, 16, 32, 8, -16, -8, 32, 8);

    let sy = 0;
    if (p === 0) {
      sy = 8;
    }
    g.drawImage(s, 0, sy, 8, 8, -cw * 4, 0, 8, 8);

    sy = 0;
    if (p < 100) {
      sy = 8;
    }
    g.drawImage(s, 16, sy, 8, 8, cw * 4, 0, 8, 8);

    for (let st = -(cw - 2) * 4, i = st, end = (cw - 2) * 4; i <= end; i += 8) {
      sy = 0;
      if (p < (i - st) / (end - st) * 100) {
        sy = 8;
      }
      g.drawImage(s, 8, sy, 8, 8, i, 0, 8, 8);
    }
  }

  drawNormal(g) {
    let e = this.engine;
    let gw = e.viewportWidth;
    let gh = e.viewportHeight;
    let cx = e.cameraX - gw * 0.5 | 0;
    let cy = e.cameraY - gh * 0.5 | 0;

    g.save();
    g.translate(-this.engine.cameraX | 0, -this.engine.cameraY | 0);
    for (let i = 0, len = this.layers.length; i < len; i += 1) {
      let layer = this.layers[i];
      if (layer.isBackground) {
        layer.draw(g);
      }
    }

    for (let i = 0, len = this.objects.length; i < len; i += 1) {
      let obj = this.objects[i];
      if (obj.x >= cx - obj.width && obj.y >= cy - obj.height &&
          obj.x < cx + gw && obj.y < cy + gh) {
        obj.draw(g);
      }
    }

    for (let i = 0, len = this.layers.length; i < len; i += 1) {
      let layer = this.layers[i];
      if (!layer.isBackground) {
        layer.draw(g);
      }
    }
    g.restore();
  }

  onLoaded(data) {
    data = JSON.parse(data);
    this.resetLevelData();
    this.loadLevelData(data);
  }

  createObject() {  /* objData */
  }

  loadLevelData() {  /* levelData */
  }

  addObject(obj) {
    this.objects.push(obj);
  }

  removeObject(obj) {
    let index;

    index = this.objects.indexOf(obj);

    if (index >= 0) {
      this.objects.splice(index, 1);
    }
  }

  loadAssets(aCfg, callback) {
    this.isLoading = true;
    this.loadingProgress = 0;
    this.loadingCallback = callback;
    if (aCfg.images) {
      this._loadImageAssets(aCfg.images, aCfg.imageCallback);
    }
    if (aCfg.fonts) {
      this._loadFontAssets(aCfg.fonts);
    }
    if (aCfg.sounds) {
      this._loadSoundAssets(aCfg.sounds);
    }
  }

  getImageAsset(assetName) {
    let images = this.assets.images;

    if (!images) {
      return null;
    }

    return images[assetName].resource;
  }

  getFontAsset(assetName) {
    let fonts = this.assets.fonts;

    if (!fonts) {
      return null;
    }

    return fonts[assetName].resource;
  }

  getSoundAsset(assetName) {
    let sounds = this.assets.sounds;

    if (!sounds) {
      return null;
    }

    return sounds[assetName].resource;
  }

  loadFile(fileName) {
    super.loadFile(fileName || this.levelFileName);
  }

  _loadImageAssets(assetConfig, assetCallback) {
    let images = {};
    let cbh = (key, callback) => {
      return (evt) => {
        this.assets.images[key].loaded = true;
        if (callback) {
          callback(key, evt);
        }
      };
    };

    Object.keys(assetConfig).forEach((key) => {
      let fileName = assetConfig[key];
      let img = new Image();
      img.onload = cbh(key, assetCallback);
      img.src = fileName;
      images[key] = {
        resource: img,
        loaded: false
      };
    });

    this.assets.images = images;
  }

  _loadFontAssets(assetConfig) {
    let fonts = {};

    Object.keys(assetConfig).forEach((key) => {
      let cfg = assetConfig[key];
      let fCls = FontBuilder;
      if (cfg.type === "smart") {
        fCls = SmartFontBuilder;
      }

      let builder = new fCls(this, cfg);
      fonts[key] = {
        resource: builder.build(),
        loaded: true
      };
    });

    this.assets.fonts = fonts;
  }

  _loadSoundAssets(assetConfig, assetCallback) {
    let sounds = {};
    let cbh = (key, callback) => {
      return (evt) => {
        this.assets.sounds[key].loaded = true;
        if (callback) {
          callback(key, evt);
        }
      };
    };

    Object.keys(assetConfig).forEach((key) => {
      let fileName = assetConfig[key];
      let snd = new Audio();
      snd.onload = cbh(key, assetCallback);
      snd.src = fileName;
      sounds[key] = {
        resource: snd,
        loaded: false
      };
    });

    this.assets.sounds = sounds;
  }
}
