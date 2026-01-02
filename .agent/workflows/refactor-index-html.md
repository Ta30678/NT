---
description: 如何將 index.html 依照功能拆分成模組化結構
---

# INDEX.HTML 重構指南

## 專案分析

目前 `index.html` 約 9400 行代碼，包含三大部分：

- **CSS 樣式** (行 21-933)
- **HTML 結構** (行 935-1600)
- **JavaScript 邏輯** (行 1602-9416)

---

## 建議的模組化目錄結構

```
BEAM-NAMINGTOOL-main/
├── index.html              # 主入口文件（精簡版）
├── css/
│   ├── main.css           # 主樣式（全域變數、基礎樣式）
│   ├── components.css     # 組件樣式（按鈕、輸入框、對話框）
│   ├── layout.css         # 佈局樣式（容器、控制區、過濾器）
│   ├── svg-canvas.css     # SVG 繪圖區樣式（梁線、格線、選取框）
│   └── fullscreen.css     # 全螢幕模式樣式
├── js/
│   ├── main.js            # 主程式入口
│   ├── config/
│   │   └── constants.js   # 常數定義（字體大小、容差值等）
│   ├── core/
│   │   ├── parser.js      # E2K 檔案解析器
│   │   ├── beam-labeler.js # 梁編號核心邏輯
│   │   └── grid-system.js  # 格線系統處理
│   ├── features/
│   │   ├── mirror-mode.js      # 鏡像對稱模式
│   │   ├── fixed-label.js      # 固定編號功能
│   │   ├── selection.js        # 圈選功能
│   │   ├── search-member.js    # 搜尋桿件
│   │   ├── batch-edit.js       # 批量編輯
│   │   └── standard-floor.js   # 標準層連動
│   ├── ui/
│   │   ├── dialogs.js          # 對話框管理
│   │   ├── svg-renderer.js     # SVG 繪製
│   │   ├── pan-zoom.js         # 縮放平移
│   │   └── drag-handlers.js    # 拖曳處理
│   ├── export/
│   │   ├── excel-export.js     # Excel 匯出
│   │   └── autocad-export.js   # AutoCAD JSON 匯出
│   └── utils/
│       ├── geometry.js         # 幾何計算工具
│       ├── coord-transform.js  # 座標轉換
│       └── storage.js          # localStorage 管理
└── components/
    └── dialogs/
        ├── beam-edit-dialog.html
        ├── batch-edit-dialog.html
        ├── search-member-dialog.html
        ├── fixed-label-dialog.html
        ├── mirror-settings-dialog.html
        └── grid-bubble-panel.html
```

---

## 拆分步驟

### 步驟 1: 建立目錄結構

```powershell
# 在專案根目錄執行
mkdir css
mkdir js
mkdir js\config
mkdir js\core
mkdir js\features
mkdir js\ui
mkdir js\export
mkdir js\utils
mkdir components
mkdir components\dialogs
```

### 步驟 2: 拆分 CSS 樣式

將 `index.html` 第 21-933 行的 `<style>` 內容拆分：

| 檔案                 | 行範圍  | 內容描述                           |
| -------------------- | ------- | ---------------------------------- |
| `css/main.css`       | 21-120  | CSS 變數、基礎樣式、動畫           |
| `css/components.css` | 121-400 | 控制區、按鈕、輸入框樣式           |
| `css/layout.css`     | 400-620 | 過濾器、輸出區、繪圖區佈局         |
| `css/svg-canvas.css` | 620-740 | SVG 元素樣式（格線、梁線、選取框） |
| `css/fullscreen.css` | 453-610 | 全螢幕模式相關樣式                 |
| `css/dialogs.css`    | 742-933 | 對話框樣式                         |

### 步驟 3: 拆分 JavaScript 模組

將 `index.html` 第 1602-9416 行的 `<script>` 內容按功能拆分：

| 模組                         | 行範圍               | 功能描述                             |
| ---------------------------- | -------------------- | ------------------------------------ |
| `js/config/constants.js`     | 1603-1670            | 常數定義、全域變數初始化             |
| `js/utils/geometry.js`       | 7143-7160            | 幾何計算（距離、點在線段上判斷）     |
| `js/core/parser.js`          | 待確認               | parseJoints, parseFrames, parseGrids |
| `js/core/beam-labeler.js`    | 4391-4775, 6650-7140 | generateLabelsForStory, processE2k   |
| `js/features/mirror-mode.js` | 7157-7731            | 鏡像對稱演算法                       |
| `js/features/selection.js`   | 待確認               | 圈選、選取功能                       |
| `js/ui/svg-renderer.js`      | 待確認               | SVG 繪製相關函數                     |
| `js/ui/drag-handlers.js`     | 3960-4310            | 標籤/Bubble 拖曳處理                 |
| `js/ui/pan-zoom.js`          | 4311-4389            | 中鍵拖動畫布                         |

### 步驟 4: 拆分 HTML 對話框組件

將各對話框 HTML 提取到獨立檔案：

| 組件                 | 行範圍    | 檔案                                             |
| -------------------- | --------- | ------------------------------------------------ |
| 梁編輯對話框         | 1296-1405 | `components/dialogs/beam-edit-dialog.html`       |
| 批量編輯對話框       | 1407-1431 | `components/dialogs/batch-edit-dialog.html`      |
| 搜尋桿件對話框       | 1433-1489 | `components/dialogs/search-member-dialog.html`   |
| 固定編號對話框       | 1491-1528 | `components/dialogs/fixed-label-dialog.html`     |
| 鏡像設定對話框       | 1530-1600 | `components/dialogs/mirror-settings-dialog.html` |
| Grid Bubble 控制面板 | 1206-1233 | `components/dialogs/grid-bubble-panel.html`      |

---

## 執行重構

### 第一階段：CSS 拆分

1. 建立 `css/` 目錄下的所有 CSS 檔案
2. 在 `index.html` 的 `<head>` 中用 `<link>` 引入 CSS 檔案
3. 移除原本的 `<style>` 區塊

```html
<!-- 在 <head> 中加入 -->
<link rel="stylesheet" href="css/main.css" />
<link rel="stylesheet" href="css/components.css" />
<link rel="stylesheet" href="css/layout.css" />
<link rel="stylesheet" href="css/svg-canvas.css" />
<link rel="stylesheet" href="css/fullscreen.css" />
<link rel="stylesheet" href="css/dialogs.css" />
```

### 第二階段：JavaScript 模組化

使用 ES6 模組語法：

```html
<!-- 在 </body> 前加入 -->
<script type="module" src="js/main.js"></script>
```

`js/main.js` 入口檔案範例：

```javascript
// 匯入所有模組
import { CONSTANTS } from "./config/constants.js";
import { parseJoints, parseFrames, parseGrids } from "./core/parser.js";
import { generateLabelsForStory, processE2k } from "./core/beam-labeler.js";
import { initMirrorMode } from "./features/mirror-mode.js";
import { initSelection } from "./features/selection.js";
import { initDialogs } from "./ui/dialogs.js";
import { initSvgRenderer } from "./ui/svg-renderer.js";
import { initPanZoom } from "./ui/pan-zoom.js";
import { exportToExcel } from "./export/excel-export.js";
import { exportToJSONV2 } from "./export/autocad-export.js";

// 初始化應用程式
document.addEventListener("DOMContentLoaded", () => {
  initDialogs();
  initSelection();
  initPanZoom();
  // ... 其他初始化
});

// 將需要全域訪問的函數掛載到 window
window.processE2k = processE2k;
window.exportToExcel = exportToExcel;
window.exportToJSONV2 = exportToJSONV2;
// ... 其他全域函數
```

### 第三階段：HTML 對話框組件化

使用 JavaScript 動態載入 HTML 組件：

```javascript
// js/ui/dialogs.js
async function loadDialogComponent(componentPath, containerId) {
  const response = await fetch(componentPath);
  const html = await response.text();
  document.getElementById(containerId).innerHTML = html;
}

export async function initDialogs() {
  await loadDialogComponent(
    "components/dialogs/beam-edit-dialog.html",
    "dialog-container"
  );
  // ... 載入其他對話框
}
```

---

## 重構優先順序

1. **低風險優先**：先拆分 CSS（不影響功能）
2. **漸進式 JS 拆分**：一次拆一個模組，每次拆分後測試功能
3. **最後處理 HTML**：對話框組件化對功能影響較大，最後處理

---

## 測試檢查清單

每次拆分後，確認以下功能正常：

- [ ] E2K 檔案載入與解析
- [ ] 格線顯示與編輯
- [ ] 梁編號功能
- [ ] 樓層切換
- [ ] 鏡像模式
- [ ] 固定編號設定
- [ ] 圈選與批量編輯
- [ ] 搜尋桿件
- [ ] Excel 匯出
- [ ] AutoCAD JSON 匯出
- [ ] 全螢幕模式
- [ ] SVG 縮放與平移
- [ ] 梁標籤拖曳
- [ ] Grid Bubble 拖曳

---

## 注意事項

1. **保留備份**：重構前先備份整個專案
2. **版本控制**：每完成一個步驟就提交 git commit
3. **瀏覽器快取**：開發時使用 DevTools 禁用快取
4. **ES6 模組**：需要使用本地伺服器（如 `npx http-server`）才能正確載入模組
5. **全域函數**：onclick 事件中呼叫的函數需要掛載到 `window` 物件

---

## 相關指令

```powershell
# 啟動本地開發伺服器
npx -y http-server -c-1

# 備份當前版本
copy index.html index.html.backup
```
