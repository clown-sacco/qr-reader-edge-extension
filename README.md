# 二维码识别器（Edge / Chrome 扩展）

右键网页中的任意图片，即可识别图片里的二维码，并把二维码内容（通常是链接）**自动复制到剪贴板**。

纯本地解码（jsQR），不上传任何数据。

## 功能

- 右键 `<img>` 图片 → 菜单「识别图中二维码」→ 解码成功后自动复制，页面右上角弹出提示
- 识别结果是链接时，提示框里可直接点「打开链接」
- 支持跨域图片、`blob:`/`data:` 图片、`srcset` 高清图；超大图自动等比缩小后解码
- 二维码内容不是链接时（纯文本、名片等）也会原样复制
- 兼容 Edge 和 Chrome（Manifest V3，需 Chromium 109+）

## 安装（Edge）

1. 打开 Edge，地址栏输入 `edge://extensions`
2. 打开左下角（或左侧栏）的「**开发人员模式**」开关
3. 点击「**加载解压缩的扩展**」，选择本文件夹（`qr-reader-edge-extension`）
4. 安装完成即可使用，无需重启

Chrome 安装方式相同（`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序）。

也可以直接使用打包好的 `qr-reader-edge-extension.zip`（解压后按上述步骤加载）。

## 使用

1. 在网页里看到含二维码的图片
2. 在图片上**点击右键** → 点击「**识别图中二维码**」
3. 页面右上角弹出「✓ 已复制二维码链接」，直接 `Ctrl/Cmd + V` 粘贴使用

## 工作原理

```
右键菜单点击 (background.js)
  ├─ scripting.executeScript 把 lib/jsQR.js + content.js 注入图片所在帧
  ├─ 后台 fetch 图片 URL → dataURL（扩展 host 权限可绕过页面 CORS）
  ├─ content.js: 图片 → canvas → ImageData → jsQR 解码
  │    （fetch 失败时回退：按 srcUrl 找页面 <img> 元素直接绘制，
  │      画布被跨域污染时再以 CORS 方式重载一次）
  ├─ offscreen.html/offscreen.js: 把结果写入剪贴板
  │    （MV3 Service Worker 无 DOM，复制失败再回退页面内复制）
  └─ content.js: 页面右上角弹出结果气泡
```

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `contextMenus` | 注册右键菜单项 |
| `scripting` + `activeTab` | 点击菜单时向当前页面临时注入解码脚本（不常驻） |
| `host_permissions: <all_urls>` | 从后台读取任意站点图片的字节数据（绕过网页跨域限制），仅在点击菜单后使用 |
| `offscreen` + `clipboardWrite` | 把识别结果写入剪贴板 |

扩展不做任何网络上传，图片解码全部在本机浏览器内完成。

## 常见问题

- **点了菜单没反应**：浏览器内置页面（`edge://`、扩展商店、PDF 查看器等）不允许注入脚本，属正常限制。
- **提示「无法读取该图片」**：图片站点有严格防盗链，或需要登录且扩展未能带凭证读取。可先把图片保存到本地再扫码。
- **提示「未识别到二维码」**：图片中确实没有二维码，或二维码太小 / 太模糊 / 被遮挡。
- **复制失败**：极少数环境限制下会出现，气泡里会带「重新复制」按钮。

## 开发

```bash
# 重新生成图标（纯 Node，无依赖）
node tools/make-icons.js

# 运行解码验证测试（需先在 test/ 下 npm install）
cd test && npm install && node decode-test.js
```

目录结构：

```
qr-reader-edge-extension/
├── manifest.json      # MV3 清单
├── background.js      # Service Worker：菜单、抓图、编排复制
├── content.js         # 按需注入：解码 + 页面内复制兜底 + 结果气泡
├── offscreen.html/js  # 离屏文档：写剪贴板
├── lib/jsQR.js        # 二维码解码库（Apache-2.0，见 LICENSE-jsQR.txt）
├── icons/             # 扩展图标
├── tools/             # 图标生成脚本
└── test/              # 解码验证测试
```

## 许可

- 本扩展代码：MIT
- [jsQR](https://github.com/cozmo/jsQR)（`lib/jsQR.js`）：Apache-2.0，许可证见 `LICENSE-jsQR.txt`
