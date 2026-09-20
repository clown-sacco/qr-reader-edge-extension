# 隐私政策 / Privacy Policy

**扩展名称**：二维码识别器（QR Code Reader）
**适用版本**：v1.1.0 及更高
**生效日期**：2026-09-20

## 我们收集哪些信息

**不收集任何信息。**

本扩展不收集、不存储、不上传、不分享任何用户个人数据，包括但不限于：浏览记录、身份信息、位置信息、图片内容、识别结果。

## 数据处理方式

- 二维码识别（解码）**完全在本机浏览器内**完成：图片被读取到内存中的画布（canvas），由本地解码库 [jsQR](https://github.com/cozmo/jsQR) 解析，识别结果仅显示在当前页面的弹窗中
- 扩展**不发起任何面向第三方的网络请求**。唯一的网络请求是：当你右键点击图片并选择「识别图中二维码」时，浏览器扩展自身直接向你正在浏览的那个网站请求该图片文件（用于解码），该请求与你正常浏览图片的行为一致
- 复制到剪贴板的操作由你在弹窗中点击「复制」按钮主动触发

## 权限用途

| 权限 | 用途 |
| --- | --- |
| 右键菜单（contextMenus） | 注册「识别图中二维码」菜单项 |
| 脚本注入（scripting + activeTab） | 点击菜单时向当前页面临时注入解码脚本，非常驻 |
| 读取所有网站数据（host_permissions） | 仅在点击菜单后，用于读取你右键选中的那张图片以完成本地解码；不读取其他内容 |

## 数据留存

无。识别结果不落盘、不同步、不记录，关闭弹窗即消失。

## 政策变更

如未来版本数据实践发生变化，将在 [CHANGELOG.md](../CHANGELOG.md) 与本页面同步更新。

## 联系方式

通过 [GitHub Issues](https://github.com/clown-sacco/qr-reader-edge-extension/issues) 联系开发者。

---

# Privacy Policy (English)

**Extension**: QR Code Reader — **Version**: v1.1.0+ — **Effective**: 2026-09-20

This extension collects **no data whatsoever**. QR decoding happens entirely inside your browser using the local [jsQR](https://github.com/cozmo/jsQR) library. The only network request made is fetching the exact image you right-clicked (from the site you are already browsing) at the moment you choose to decode it. Results are shown in an on-page popup and are never stored, synced, or logged. Contact via [GitHub Issues](https://github.com/clown-sacco/qr-reader-edge-extension/issues).
