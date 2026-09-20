// 二维码识别器 - 内容脚本（按需注入，不常驻）
// 职责：把图片变成 ImageData 交给 jsQR 解码；页面内复制兜底；弹出结果气泡

(() => {
  if (window.__qrReaderInjected) return;
  window.__qrReaderInjected = true;

  const MAX_SIDE = 2400; // 解码前最长边上限，超大图等比缩小，避免卡顿

  // ---------- 图片 -> ImageData ----------

  function drawToImageData(source, w, h) {
    if (!w || !h) return null;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, cw, ch);
    // 跨域且未授权 CORS 的图片会在这里抛 SecurityError
    return ctx.getImageData(0, 0, cw, ch);
  }

  function loadImage(url, cors) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  }

  async function imageDataFromUrl(url) {
    const img = await loadImage(url, false);
    return drawToImageData(img, img.naturalWidth, img.naturalHeight);
  }

  function findImageElement(srcUrl) {
    for (const el of document.querySelectorAll('img')) {
      if ((el.currentSrc || el.src) === srcUrl) return el;
    }
    return null;
  }

  async function imageDataFromElement(srcUrl) {
    const el = findImageElement(srcUrl);
    if (!el) return null;
    const w = el.naturalWidth || el.width;
    const h = el.naturalHeight || el.height;
    try {
      return drawToImageData(el, w, h);
    } catch {
      // 画布被跨域图片污染：以 CORS 方式重新加载同一地址再试一次
      const img = await loadImage(el.currentSrc || el.src, true);
      return drawToImageData(img, img.naturalWidth, img.naturalHeight);
    }
  }

  // ---------- 解码 ----------

  async function handleDecode(msg) {
    let sawPixels = false;
    const attempts = [];
    if (msg.dataUrl) attempts.push(() => imageDataFromUrl(msg.dataUrl));
    attempts.push(() => imageDataFromElement(msg.srcUrl));

    for (const run of attempts) {
      try {
        const d = await run();
        if (!d) continue;
        sawPixels = true;
        const code = window.jsQR(d.data, d.width, d.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) return { ok: true, text: code.data };
      } catch {
        // 换下一种取图方式
      }
    }
    return { ok: false, reason: sawPixels ? 'no_code' : 'read_fail' };
  }

  // ---------- 页面内复制（离屏文档失败时的兜底） ----------

  async function copyInPage(text) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return { ok };
    } catch {
      return { ok: false };
    }
  }

  // ---------- 结果气泡 ----------

  let toastHost = null;
  let toastTimer = 0;

  const isUrl = (t) => /^https?:\/\//i.test(t);

  function showToast(kind, text) {
    if (toastHost) {
      toastHost.remove();
      clearTimeout(toastTimer);
      toastHost = null;
    }

    const host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;top:20px;right:20px;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      .card{font:13px/1.5 -apple-system,"Segoe UI",Roboto,"Microsoft YaHei",sans-serif;color:#e8eaed;
        background:#202124;border:1px solid #3c4043;border-radius:10px;
        box-shadow:0 8px 24px rgba(0,0,0,.35);padding:12px 14px;
        max-width:min(420px,calc(100vw - 48px));box-sizing:border-box;cursor:pointer;}
      .title{font-weight:600;color:#fff;}
      .ok{color:#81c995;}
      .warn{color:#fdd663;}
      .err{color:#f28b82;}
      .content{margin-top:6px;color:#9aa0a6;word-break:break-all;max-height:96px;overflow:auto;cursor:text;}
      a{color:#8ab4f8;text-decoration:none;}
      a:hover{text-decoration:underline;}
      .btn{display:inline-block;margin-top:8px;padding:3px 12px;border:1px solid #5f6368;border-radius:999px;
        color:#8ab4f8;background:transparent;cursor:pointer;font-size:12px;}
      .btn:hover{background:#303134;}
    `;
    root.append(style);

    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('div');
    title.className = 'title';

    if (kind === 'success') {
      const ok = document.createElement('span');
      ok.className = 'ok';
      ok.textContent = '\u2713 ';
      title.append(ok, document.createTextNode(isUrl(text) ? '已复制二维码链接' : '已复制二维码内容'));
    } else if (kind === 'copy-fail') {
      const warn = document.createElement('span');
      warn.className = 'warn';
      warn.textContent = '\u26a0 ';
      title.append(warn, document.createTextNode('识别成功，但复制失败'));
    } else {
      const err = document.createElement('span');
      err.className = 'err';
      err.textContent = '\u26a0 ';
      title.append(err, document.createTextNode(text));
    }
    card.append(title);

    if (kind !== 'error' && text) {
      const content = document.createElement('div');
      content.className = 'content';
      content.textContent = text;
      card.append(content);

      if (kind === 'success' && isUrl(text)) {
        const open = document.createElement('a');
        open.href = text;
        open.target = '_blank';
        open.rel = 'noopener noreferrer';
        open.textContent = '打开链接';
        open.style.display = 'inline-block';
        open.style.marginTop = '8px';
        card.append(document.createElement('br'), open);
      }

      if (kind === 'copy-fail') {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = '重新复制';
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const r = await copyInPage(text);
          if (r.ok) {
            btn.textContent = '已复制 \u2713';
            btn.disabled = true;
          }
        });
        card.append(btn);
      }
    }

    root.append(card);

    const dismiss = () => {
      clearTimeout(toastTimer);
      host.remove();
      if (toastHost === host) toastHost = null;
    };
    card.addEventListener('click', (e) => {
      if (e.target.closest('a,button')) return;
      dismiss();
    });

    document.documentElement.appendChild(host);
    toastHost = host;
    toastTimer = setTimeout(dismiss, kind === 'success' ? 6000 : 8000);
  }

  // ---------- 消息入口 ----------

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg?.type) {
      case 'QR_DECODE':
        handleDecode(msg).then(sendResponse);
        return true; // 异步回复
      case 'QR_COPY_IN_PAGE':
        copyInPage(msg.text).then(sendResponse);
        return true;
      case 'QR_TOAST':
        showToast(msg.kind, msg.text);
        sendResponse({ ok: true });
        return false;
    }
  });
})();
