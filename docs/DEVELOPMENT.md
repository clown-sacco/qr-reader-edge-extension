# 开发指南

面向想修改、扩展或发布本项目的人。

## 架构总览

```
┌─────────────────────────── 浏览器 ───────────────────────────┐
│                                                              │
│  background.js (Service Worker)                              │
│    │ 1. contextMenus 注册「识别图中二维码」（image 上下文）      │
│    │ 2. 点击菜单 → scripting.executeScript 注入                │
│    │      lib/jsQR.js + content.js 到图片所在 frame            │
│    │ 3. fetch(info.srcUrl) → dataURL（host 权限绕过 CORS）     │
│    │ 4. tabs.sendMessage(QR_DECODE) ──→ content.js            │
│    │ 5. 收到结果后 sendMessage(QR_TOAST) ──→ content.js        │
│    ▼                                                         │
│  content.js（按需注入，非常驻）                                 │
│    │ dataURL → Image → canvas → ImageData → jsQR 解码          │
│    │ 失败回退：按 srcUrl 找 <img> 元素直接绘制（blob: 图片       │
│    │   只有这条路）；画布被跨域污染时以 CORS 方式重载再试          │
│    ▼                                                         │
│  结果气泡（Shadow DOM，右上角，drop 动画，5 秒自动关闭）          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 目录结构

```
qr-reader-edge-extension/
├── manifest.json        # MV3 清单（版本号在此维护）
├── background.js        # Service Worker：菜单、抓图、编排
├── content.js           # 解码 + 结果气泡（复制/打开）
├── lib/jsQR.js          # 二维码解码库（Apache-2.0，勿改动）
├── icons/               # 扩展图标（tools/make-icons.js 生成）
├── tools/make-icons.js  # 图标生成脚本（纯 Node，无依赖）
├── test/                # 解码测试 + 气泡动画预览页
├── docs/                # 本文档、隐私政策、README 图片
├── README.md            # 中文说明
├── README.en.md         # 英文说明
└── CHANGELOG.md         # 更新日志
```

## 消息协议

background ↔ content 之间共两条消息（均带 `frameId` 定向到图片所在帧）：

| 方向 | type | 载荷 | 说明 |
| --- | --- | --- | --- |
| bg → content | `QR_DECODE` | `{ srcUrl, dataUrl? }` | 请求解码；`dataUrl` 为后台抓取结果，可能为 null |
| content → bg（响应） | — | `{ ok: true, text }` 或 `{ ok: false, reason: 'no_code' \| 'read_fail' }` | 解码结果 |
| bg → content | `QR_TOAST` | `{ kind: 'success' \| 'error', text }` | 弹出结果气泡 |

## 常见修改

**切换气泡动画**：`content.js` 顶部 `const ANIM = 'drop'`，可选 `'slide' | 'fade-up' | 'drop' | 'pop'`，效果可在 `test/toast-preview.html` 预览。

**修改悬浮时长**：`content.js` 中 `setTimeout(dismiss, 5000)`。

**修改解码尺寸上限**：`content.js` 顶部 `MAX_SIDE`（默认 2400，越大越慢但小码更准）。

**图标**：`node tools/make-icons.js` 重新生成（改 `buildModuleMap` 里的伪随机种子会得到不同的数据点图案）。

## 测试

```bash
cd test
npm install            # 仅安装 pngjs（解码测试用）
node decode-test.js    # 覆盖：URL / 中文文本 / 反色 / 缩放路径 / UMD 导出
```

测试夹具（`test/fixtures/*.png`）由 <https://api.qrserver.com/> 生成，可按需重新生成。

## 发布新版本

1. 修改 `manifest.json` 的 `version`（语义化版本）
2. 在 `CHANGELOG.md` 顶部追加条目
3. 全量校验：`node --check background.js content.js`、`node test/decode-test.js`
4. 提交并推送
5. 打 Release 包并发布：

```bash
cd ..
zip -r qr-reader-edge-extension.zip qr-reader-edge-extension -x "qr-reader-edge-extension/test/node_modules/*"
gh release create vX.Y.Z qr-reader-edge-extension.zip --title "vX.Y.Z - ..." --notes "..."
```

## 上架 Edge Add-ons 商店的打包要求

商店要求的 zip 与 Release zip **不同**：

- `manifest.json` 必须位于 **zip 根目录**（Release zip 外层有文件夹，是方便解压后直接加载）
- 只应包含运行所需文件：`manifest.json`、`background.js`、`content.js`、`lib/`、`icons/`；剔除 `test/`、`tools/`、`docs/`、`.git*`
- 需在 Partner Center 提供隐私政策 URL（本项目用 GitHub Pages 托管 `docs/privacy.md`）

```bash
# 商店包示例
zip qr-store.zip manifest.json background.js content.js lib icons
```
