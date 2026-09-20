# 二维码识别器 · QR Code Reader

[![Release](https://img.shields.io/badge/release-v1.1.0-blue)](https://github.com/clown-sacco/qr-reader-edge-extension/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Edge%20%7C%20Chrome-lightgrey)](https://developer.microsoft.com/en-us/microsoft-edge/extensions-chromium/)
[![Manifest](https://img.shields.io/badge/Manifest-V3-orange)](manifest.json)

**English**: [README.en.md](README.en.md)

右键网页中的任意图片，即可识别图片里的二维码，结果弹窗展示在页面右上角，可一键复制或打开。**纯本地解码，不上传任何数据。**

![结果气泡样式](docs/images/toast-styles.png)

## 目录

- [功能特性](#功能特性)
- [适用场景](#适用场景)
- [安装](#安装)
- [使用方法](#使用方法)
- [工作原理](#工作原理)
- [权限与隐私](#权限与隐私)
- [常见问题](#常见问题)
- [路线图](#路线图)
- [开发](#开发)
- [许可证](#许可证)

## 功能特性

- ✅ **右键即用**：在任意 `<img>` 图片上右键 → 「识别图中二维码」，无需任何额外操作
- ✅ **弹窗展示**：识别结果以「弹跳下落」动画弹出在页面右上角，5 秒无操作自动关闭
- ✅ **一键复制 / 打开**：弹窗内提供「复制」按钮和「打开链接」（内容为 URL 时），操作后弹窗自动关闭
- ✅ **识别范围广**：支持跨域图片、`blob:`/`data:` 内联图片、`srcset` 高清图、反色二维码；超大图自动等比缩小后解码
- ✅ **非链接内容**：二维码里是纯文本、名片（vCard）、WiFi 信息等同样识别展示，可复制
- ✅ **隐私安全**：解码由 [jsQR](https://github.com/cozmo/jsQR) 在本机浏览器内完成，零网络请求、零数据收集
- ✅ **轻量干净**：无常驻内容脚本（点击菜单时才注入）、无后台轮询、无第三方依赖打包

## 适用场景

- 网页里出现**二维码截图**（微信群聊截图、活动海报、公众号文章配图），想用电脑直接扫
- 网站**登录/支付二维码**显示在小窗口里，不便用手机扫
- 图片里的链接是二维码形式，懒得掏手机 → 右键识别直接打开
- 需要把图片里的二维码内容**提取成文字**存档

## 安装

### 方式一：下载 Release 包（推荐）

1. 前往 [Releases 页面](https://github.com/clown-sacco/qr-reader-edge-extension/releases) 下载最新 `qr-reader-edge-extension.zip`
2. 解压得到 `qr-reader-edge-extension` 文件夹（放在不会误删的位置）

### 方式二：克隆仓库

```bash
git clone https://github.com/clown-sacco/qr-reader-edge-extension.git
```

### 加载到浏览器（Edge / Chrome 通用）

1. 打开 `edge://extensions`（Chrome 为 `chrome://extensions`）
2. 打开「**开发人员模式** / 开发者模式」开关
3. 点击「**加载解压缩的扩展** / 加载已解压的扩展程序」，选择上述文件夹
4. 安装完成，无需重启

> Edge Add-ons 商店上架申请中，上架后可直接商店安装。

## 使用方法

1. 在网页里看到含二维码的图片
2. 在图片上**点击右键** → 点击「**识别图中二维码**」
3. 页面右上角弹出「✓ 识别到二维码链接」：
   - 点「**复制**」→ 内容进入剪贴板，`Ctrl/Cmd + V` 粘贴使用
   - 点「**打开链接**」→ 新标签页打开（内容为链接时出现）
   - 点弹窗任意空白处或等 5 秒 → 自动关闭

## 工作原理

```
右键菜单点击 (background.js)
  ├─ scripting.executeScript 把 lib/jsQR.js + content.js 注入图片所在帧
  ├─ 后台 fetch 图片 URL → dataURL（扩展 host 权限可绕过页面 CORS）
  ├─ content.js: 图片 → canvas → ImageData → jsQR 解码
  │    （fetch 失败时回退：按 srcUrl 找页面 <img> 元素直接绘制，
  │      画布被跨域污染时再以 CORS 方式重载一次）
  └─ content.js: 结果气泡弹出（复制/打开由用户手动完成）
```

架构细节、消息协议、如何修改动画/发布新版本见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## 权限与隐私

| 权限 | 用途 |
| --- | --- |
| `contextMenus` | 注册右键菜单项 |
| `scripting` + `activeTab` | 点击菜单时向当前页面临时注入解码脚本（不常驻） |
| `host_permissions: <all_urls>` | 从后台读取任意站点图片的字节数据（绕过网页跨域限制），仅在点击菜单后使用 |

扩展不收集、不上传、不存储任何用户数据，详见[隐私政策](docs/privacy.md)。

## 常见问题

**点了菜单没反应？**
浏览器内置页面（`edge://`、扩展商店页面、PDF 查看器等）不允许注入脚本，属浏览器安全限制。

**提示「无法读取该图片」？**
图片站点有严格防盗链，或需要登录且扩展未能带凭证读取。可先把图片保存到本地，用其他方式扫码。

**提示「未识别到二维码」？**
图片中确实没有二维码，或二维码太小、太模糊、被遮挡、对比度太低。

**可以识别条形码吗？**
目前仅支持二维码（QR Code），条形码识别在路线图中。

**更新代码后如何生效？**
`edge://extensions` 中点击该扩展卡片上的「重新加载」按钮。

## 路线图

- [ ] Edge Add-ons / Chrome Web Store 商店上架
- [ ] 多张图片批量识别（页面内全部二维码）
- [ ] 条形码支持（EAN/Code128 等常见格式）
- [ ] 识别历史记录

## 开发

```bash
# 重新生成图标（纯 Node，无依赖）
node tools/make-icons.js

# 运行解码验证测试（需先在 test/ 下 npm install）
cd test && npm install && node decode-test.js

# 浏览器打开结果气泡动画预览（四种动画对比）
open test/toast-preview.html
```

目录结构与开发指南见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)，版本历史见 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

- 本扩展代码：[MIT](LICENSE)
- [jsQR](https://github.com/cozmo/jsQR)（`lib/jsQR.js`）：Apache-2.0，许可证见 [LICENSE-jsQR.txt](LICENSE-jsQR.txt)

---

**Keywords / 关键词**：二维码识别 · 二维码解码 · 扫码 · 右键识别 · QR code reader · QR code scanner · decode QR from image · context menu QR · Edge extension · Chrome extension · browser extension · Manifest V3 · jsQR · offline QR decoder · 二维码 提取 · 图片 二维码 链接
