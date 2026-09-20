// 解码逻辑验证：用扩展实际携带的 lib/jsQR.js 解码真实二维码 PNG
// 覆盖：普通解码、反色图片（inversionAttempts: attemptBoth）、超大图等比缩小路径
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PNG } = require('pngjs');

const jsQR = require('../lib/jsQR.js');

// 与 content.js 中一致的解码调用
function decode(imageData) {
  return jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
}

// 与 content.js 中一致的等比缩小逻辑（MAX_SIDE=64 强制触发缩放分支）
function drawToImageData(png, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(png.width, png.height));
  const cw = Math.max(1, Math.round(png.width * scale));
  const ch = Math.max(1, Math.round(png.height * scale));
  // 最近邻缩放
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const sy = Math.min(png.height - 1, Math.floor(((y + 0.5) / ch) * png.height));
    for (let x = 0; x < cw; x++) {
      const sx = Math.min(png.width - 1, Math.floor(((x + 0.5) / cw) * png.width));
      const so = (sy * png.width + sx) * 4;
      const o = (y * cw + x) * 4;
      out[o] = png.data[so];
      out[o + 1] = png.data[so + 1];
      out[o + 2] = png.data[so + 2];
      out[o + 3] = png.data[so + 3];
    }
  }
  return { data: new Uint8ClampedArray(out), width: cw, height: ch };
}

function loadPng(name) {
  return PNG.sync.read(fs.readFileSync(path.join(__dirname, 'fixtures', name)));
}

function invert(png) {
  const p = new PNG({ width: png.width, height: png.height });
  png.data.copy(p.data);
  for (let i = 0; i < p.data.length; i += 4) {
    p.data[i] = 255 - p.data[i];
    p.data[i + 1] = 255 - p.data[i + 1];
    p.data[i + 2] = 255 - p.data[i + 2];
  }
  return p;
}

let failed = 0;
function check(name, actual, expected) {
  const pass = actual === expected;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : `  (期望: ${expected}, 实际: ${actual})`}`);
}

const urlPng = loadPng('qr-url.png');
const textPng = loadPng('qr-text.png');
const URL_EXPECTED = 'https://example.com/qr-demo-12345';
const TEXT_EXPECTED = 'HELLO-QR-TEST-中文测试';

// 1. 常规解码（URL 内容）
check('URL 二维码', decode(urlPng)?.data ?? null, URL_EXPECTED);

// 2. 常规解码（含中文的文本内容）
check('文本二维码(中文)', decode(textPng)?.data ?? null, TEXT_EXPECTED);

// 3. 反色二维码（白底黑码 -> 黑底白码）
check('反色二维码', decode(invert(urlPng))?.data ?? null, URL_EXPECTED);

// 4. 缩放路径：强制走 content.js 的等比缩小分支
check('缩小后解码', decode(drawToImageData(urlPng, 64))?.data ?? null, URL_EXPECTED);

// 5. lib 文件在浏览器环境的挂载方式检查（UMD 应挂 window.jsQR）
const libSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'jsQR.js'), 'utf8');
check('UMD 全局导出 window.jsQR', /root\[.jsQR.\]\s*=\s*factory\(\)/.test(libSource) ? 'yes' : 'no', 'yes');

console.log(failed === 0 ? '\n全部通过 ✓' : `\n${failed} 项失败 ✗`);
process.exit(failed === 0 ? 0 : 1);
