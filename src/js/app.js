export let canvas, ctx;
export let fps = 0;
let lastCalledTime;
let fpsArr = [];

let frame = 0;

let tiles = [];

let scaleFactor = 8;

let sizeWidth = Math.floor(window.innerWidth / scaleFactor);
let sizeHeight = Math.floor(window.innerHeight / scaleFactor);

let imgData;
let pixels;

let fpsEl, selEl, dbgEl;

let baseTile = { type: 'air', updated: false, rand: 0 };

let mousePos = {x: 0, y: 0};
let mouseDrawInterval;
let mouseDown = false;

let faucetPos = {x: 0, y: 0};
let faucetOn = false;

let types = ['water', 'oil', 'lava', 'sand', 'glass', 'stone', 'wall', 'air'];
let mouseSelected = 0;

let densityLookup = {
  'sand': 500,
  'glass': 800,
  'wall': 9999,
  'stone': 700,

  'air': 1,

  'water': 50,
  'oil': 30,
  'lava': 100
};

let staticLookup = {
  'water': false,
  'oil': false,
  'lava': false,

  'sand': false,
  'stone': false,
  'glass': false,

  'air': true,
  'wall': true
};

let liquidLookup = {
  'water': true,
  'oil': true,
  'lava': true,

  'sand': false,
  'stone': false,
  'wall': false,
  'glass': false,

  'air': false
};

let reactions = [
  {reactants: ['water', 'lava'], product: 'stone'},
  {reactants: ['sand', 'lava'], product: 'glass'},
  {reactants: ['oil', 'lava'], product: 'air'}
];

function initTiles() {
  tiles = Array.from(Array(sizeWidth), () => Array.apply(undefined, Array(sizeHeight)).map((x) => Object. assign({}, baseTile)));

  tiles = tiles.map((x) => x.map((t) => { t.rand = Math.random(); return t; }));

  // border
  for (let x = 0; x < sizeWidth; x++) {
    tiles[x][0].type = 'wall';
    tiles[x][sizeHeight - 1].type = 'wall';
  }

  for (let y = 0; y < sizeHeight; y++) {
    tiles[0][y].type = 'wall';
    tiles[sizeWidth - 1][y].type = 'wall';
  }
}

function mouseDownHandler(e) {
  mousePos = {x: e.clientX, y: e.clientY};

  mouseDraw();

  mouseDrawInterval = setInterval(mouseDraw, 1);

  mouseDown = true;
}

function mouseMoveHandler(e) {
  mousePos = {x: e.clientX, y: e.clientY};

  if (mouseDown) mouseDraw();
}

function mouseUpHandler(e) {
  clearInterval(mouseDrawInterval);

  mouseDown = false;
}

window.onload = function() {
  canvas = document.createElement('canvas');
  canvas.width = sizeWidth;
  canvas.height = sizeHeight;
  canvas.id = 'sandbox';

  canvas.style.width = '100%';
  canvas.style.height = '100%';

  document.body.prepend(canvas);

  ctx = canvas.getContext('2d');

  imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pixels = imgData.data;

  fpsEl = document.getElementById('fps');
  selEl = document.getElementById('sel');
  dbgEl = document.getElementById('dbg');

  dbgEl.innerText = `${sizeWidth}x${sizeHeight} - ${sizeWidth * sizeHeight}`;

  initTiles();

  update();

  document.onmousedown = function(e) { mouseDownHandler(e); };
  document.onmousemove = function(e) { mouseMoveHandler(e); };
  document.onmouseup = function(e) { mouseUpHandler(e); };

  document.ontouchstart = function(e) { mouseDownHandler(e.touches[0]); };
  document.ontouchmove = function(e) { mouseMoveHandler(e.touches[0]); };
  document.ontouchend = function(e) { mouseUpHandler(e.touches[0]); };

  document.oncontextmenu = function(e) {
    e.preventDefault();
    return false;
  }

  document.onkeypress = function(e) {
    if (e.key === ' ') {
      faucetPos = mousePos;
      faucetOn = !faucetOn;
    }
  };
};

function mouseDraw(pos = mousePos) {
  let actualPosX = Math.floor(pos.x / scaleFactor);
  let actualPosY = Math.floor(pos.y / scaleFactor);

  tiles[actualPosX][actualPosY].type = types[mouseSelected];
}

function renderText(x, y, size, color, text, align) {
  ctx.font = `${size}px Roboto`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'center';

  ctx.fillText(text, x, y);
}

function moveTile(originalTile, newTile) {
  let originalType = originalTile.type.slice();
  originalTile.type = newTile.type;
  newTile.type = originalType;

  newTile.updated = true;
}

export function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (faucetOn) {
    mouseDraw(faucetPos);
  }

  for (let x = 0; x < sizeWidth; x++) {
    for (let y = 0; y < sizeHeight; y++) {
      let t = tiles[x][y];

      let c = {r: 0, g: 0, b: 0, a: 0};

      let aboveTile = tiles[x][y - 1] || {type: 'nonExistant', updated: false};
      let belowTile = tiles[x][y + 1] || {type: 'nonExistant', updated: false};

      let sameLeftTile = x <= 0 ? {type: 'nonExistant', updated: false} : tiles[x - 1][y];
      let sameRightTile = x >= sizeWidth - 1 ? {type: 'nonExistant', updated: false} : tiles[x + 1][y];

      if (!staticLookup[t.type]) {
        let bottom = y === sizeHeight - 1;

        if (!bottom && !t.updated) {
          if (densityLookup[belowTile.type] < densityLookup[t.type]) {
            moveTile(t, belowTile);
          } else {
            let belowLeftTile = x <= 0 ? {type: 'nonExistant', updated: false} : tiles[x - 1][y + 1];
            let belowRightTile = x >= sizeWidth - 1 ? {type: 'nonExistant', updated: false} : tiles[x + 1][y + 1];

            let belowLeftAvaliable = densityLookup[belowLeftTile.type] < densityLookup[t.type];
            let belowRightAvaliable = densityLookup[belowRightTile.type] < densityLookup[t.type];

            if (belowLeftAvaliable && belowRightAvaliable) {
              if (Math.random() >= 0.5) {
                moveTile(t, belowRightTile);
              } else {
                moveTile(t, belowLeftTile);
              }
            } else {
              if (belowLeftAvaliable) {
                moveTile(t, belowLeftTile);
              }

              if (belowRightAvaliable) {
                moveTile(t, belowRightTile);
              }
            }

            if (!belowLeftAvaliable && !belowLeftAvaliable && liquidLookup[t.type] && Math.random() > 0.5) {
              let sameLeftAvaliable = densityLookup[sameLeftTile.type] < densityLookup[t.type];
              let sameRightAvaliable = densityLookup[sameRightTile.type] < densityLookup[t.type];

              if (sameLeftAvaliable && sameRightAvaliable) {
                if (Math.random() >= 0.5) {
                  moveTile(t, sameRightTile);
                } else {
                  moveTile(t, sameLeftTile);
                }
              } else {
                if (sameLeftAvaliable) {
                  moveTile(t, sameLeftTile);
                }

                if (sameRightAvaliable) {
                  moveTile(t, sameRightTile);
                }
              }
            }
          }
        }
      }

      reactions.forEach((r) => {
        if (!r.reactants.includes(t.type)) return;

        [aboveTile, belowTile, sameLeftTile, sameRightTile].forEach((neighbouringTile) => {
          if (neighbouringTile.type === t.type) return;

          if (r.reactants.includes(neighbouringTile.type)) {
            let product = r.product.slice();

            t.type = product;
            neighbouringTile.type = product;
          }
        });
      });

      if (t.type === 'sand') {
        c = {r: 250 - (t.rand * 40), g: 201 - (t.rand * 30), b: 55, a: 255};
      }

      if (t.type === 'water') {
        c = {r: 60 - (t.rand * 40), g: 190 - (t.rand * 20), b: 230, a: 150};
      }

      if (t.type === 'oil') {
        c = {r: 100 - (t.rand * 20), g: 100 - (t.rand * 20), b: 100 - (t.rand * 20), a: 150};
      }

      if (t.type === 'wall') {
        c = {r: 120 - (t.rand * 45), g: 120 - (t.rand * 40), b: 120 - (t.rand * 35), a: 255};
      }

      if (t.type === 'lava') {
        c = {r: 230, g: 125 - (t.rand * 20), b: 10 + (t.rand * 30), a: 150};
      }

      if (t.type === 'stone') {
        c = {r: 200 - (t.rand * 40), g: 200 - (t.rand * 40), b: 200 - (t.rand * 40), a: 255};
      }

      if (t.type === 'glass') {
        c = {r: 250 - (t.rand * 20), g: 250 - (t.rand * 20), b: 250 - (t.rand * 20), a: 230};
      }
      /*if (densityLookup[belowTile.type] < densityLookup[t.type]) {
        moveTile(t, belowTile);
      }*/

      let off = (x + (y * sizeWidth)) * 4;
      pixels[off] = c.r; //t.updated ? 255 : 0;
      pixels[off + 1] = c.g;
      pixels[off + 2] = c.b;
      pixels[off + 3] = c.a;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  tiles.map((x) => x.map((t) => t.updated = false));

  if (!lastCalledTime) {
    lastCalledTime = performance.now();
    fps = 0;
  } else {
    let delta = (performance.now() - lastCalledTime) / 1000;
    fps = Math.round(1 / delta);

    lastCalledTime = performance.now();

    if (fpsArr.length >= 1000) {
      fpsArr.pop();
    }

    fpsArr.unshift(fps);
  }

  fpsEl.innerText = Math.round(fpsArr.reduce((p, c) => p + c, 0) / fpsArr.length)

  frame++;

  requestAnimationFrame(update);
}