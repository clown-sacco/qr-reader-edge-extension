// 二维码识别器 - 后台 Service Worker
// 流程：右键菜单点击 -> 注入解码脚本 -> 后台抓取图片 -> 内容脚本用 jsQR 解码
//       -> 内容脚本弹出结果气泡（展示内容，手动复制/打开）

const MENU_ID = 'qr-reader-decode';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: '识别图中二维码',
      contexts: ['image'],
    });
  });
});

// 浏览器重启后菜单通常会保留，这里兜底重建一次（已存在时报错，忽略即可）
chrome.runtime.onStartup.addListener(() => {
  chrome.contextMenus.create(
    { id: MENU_ID, title: '识别图中二维码', contexts: ['image'] },
    () => void chrome.runtime.lastError
  );
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleMenuClick(info, tab).catch((err) => console.error('[QR] 处理失败:', err));
});

async function handleMenuClick(info, tab) {
  if (info.menuItemId !== MENU_ID) return;
  const tabId = tab?.id;
  const srcUrl = info.srcUrl;
  if (!tabId || !srcUrl) return;

  // 1) 把解码脚本注入图片所在的帧
  try {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [info.frameId] },
      files: ['lib/jsQR.js', 'content.js'],
    });
  } catch (err) {
    console.warn('[QR] 无法注入脚本（可能是浏览器受限页面）:', err);
    return;
  }

  // 2) 后台直接抓取图片字节。扩展持有 host 权限，可绕过页面的 CORS 限制；
  //    blob: 等页面私有 URL 会失败，交由内容脚本走元素路径兜底。
  const dataUrl = await fetchAsDataUrl(srcUrl).catch(() => null);

  // 3) 内容脚本解码
  let result = null;
  try {
    result = await chrome.tabs.sendMessage(
      tabId,
      { type: 'QR_DECODE', srcUrl, dataUrl },
      { frameId: info.frameId }
    );
  } catch (err) {
    console.warn('[QR] 内容脚本无响应:', err);
  }

  // 4) 弹出结果气泡（复制由用户在气泡里手动完成）
  if (result?.ok) {
    await sendToast(tabId, info.frameId, { kind: 'success', text: result.text });
  } else {
    const text =
      result?.reason === 'read_fail'
        ? '无法读取该图片（可能受防盗链或跨域限制）'
        : '未在图片中识别到二维码';
    await sendToast(tabId, info.frameId, { kind: 'error', text });
  }
}

async function sendToast(tabId, frameId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'QR_TOAST', ...payload }, { frameId });
  } catch {}
}

async function fetchAsDataUrl(url) {
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const blob = await resp.blob();
  if (blob.size > 25 * 1024 * 1024) throw new Error('image too large');
  const buf = new Uint8Array(await blob.arrayBuffer());
  // Service Worker 里避免依赖 FileReader，手动拼 base64
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK));
  }
  const mime = blob.type || 'image/png';
  return `data:${mime};base64,${btoa(binary)}`;
}
