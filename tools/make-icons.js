// 生成扩展图标（16/32/48/128），无第三方依赖：手工编码 PNG（zlib + CRC32）
// 图案：白色圆角卡片上画一个风格化二维码（三个定位角 + 伪随机数据点）
// 用法: node tools/make-icons.js

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---------- PNG 编码 ----------

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 二维码风格图案（N x N 模块） ----------

const N = 21;

function buildModuleMap() {
  const black = new Set();
  const finderOrigins = [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ];

  const finderZone = (x, y) => {
    for (const [ox, oy] of finderOrigins) {
      const dx = x - ox;
      const dy = y - oy;
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return 'white'; // 分隔环
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        return ring === 3 || ring <= 1 ? 'black' : 'white';
      }
    }
    return null;
  };

  const timing = (x, y) => {
    if (y === 6 && x >= 8 && x <= N - 9) return x % 2 === 0 ? 'black' : 'white';
    if (x === 6 && y >= 8 && y <= N - 9) return y % 2 === 0 ? 'black' : 'white';
    return null;
  };

  // 固定种子的伪随机数据点，保证每次生成结果一致
  // 注意用 32 位安全的 xorshift：朴素 LCG 的乘法会超出 Number 安全整数范围，
  // 低位精度丢失后序列退化为行条纹
  let seed = 2463534242 >>> 0;
  const rnd = () => {
    seed ^= (seed << 13) >>> 0;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= (seed << 5) >>> 0;
    seed >>>= 0;
    return seed / 4294967296;
  };

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const c = finderZone(x, y) ?? timing(x, y) ?? (rnd() < 0.45 ? 'black' : 'white');
      if (c === 'black') black.add(y * N + x);
    }
  }
  return black;
}

// ---------- 渲染 ----------

// 超采样绘制（4x），再盒式降采样抗锯齿
function renderSupersampled(SS) {
  const modules = buildModuleMap();
  const pad = SS * 0.09;
  const cell = (SS - 2 * pad) / N;
  const r = SS * 0.16; // 圆角半径
  const img = Buffer.alloc(SS * SS * 4);

  for (let py = 0; py < SS; py++) {
    for (let px = 0; px < SS; px++) {
      const cx = Math.min(Math.max(px + 0.5, r), SS - r);
      const cy = Math.min(Math.max(py + 0.5, r), SS - r);
      const inside = (px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2 <= r * r + 0.6;

      let R = 0,
        G = 0,
        B = 0,
        A = 0;
      if (inside) {
        A = 255;
        const mx = Math.floor((px - pad) / cell);
        const my = Math.floor((py - pad) / cell);
        const isBlack = mx >= 0 && mx < N && my >= 0 && my < N && modules.has(my * N + mx);
        if (isBlack) {
          R = 17;
          G = 24;
          B = 39; // #111827
        } else {
          R = G = B = 255;
        }
      }
      const o = (py * SS + px) * 4;
      img[o] = R;
      img[o + 1] = G;
      img[o + 2] = B;
      img[o + 3] = A;
    }
  }
  return img;
}

// 按 alpha 加权做盒式降采样，避免透明边缘出现黑晕
function downsample(src, SS, S) {
  const f = SS / S;
  const out = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * SS + (x * f + dx)) * 4;
          const al = src[o + 3];
          r += src[o] * al;
          g += src[o + 1] * al;
          b += src[o + 2] * al;
          a += al;
        }
      }
      const n = f * f;
      const o2 = (y * S + x) * 4;
      if (a > 0) {
        out[o2] = Math.round(r / a);
        out[o2 + 1] = Math.round(g / a);
        out[o2 + 2] = Math.round(b / a);
      }
      out[o2 + 3] = Math.round(a / n);
    }
  }
  return out;
}

// ---------- 主流程 ----------

const SS = 512; // 128 * 4
const supersampled = renderSupersampled(SS);
const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const rgba = downsample(supersampled, SS, size);
  const png = encodePNG(size, size, rgba);
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
