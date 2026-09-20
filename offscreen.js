// 离屏文档：唯一职责是代替 Service Worker 写剪贴板（SW 没有 DOM，无法用剪贴板 API）
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'QR_OFFSCREEN_COPY') return;
  navigator.clipboard.writeText(msg.text).then(
    () => sendResponse({ ok: true }),
    (err) => sendResponse({ ok: false, error: String(err) })
  );
  return true; // 异步回复
});
