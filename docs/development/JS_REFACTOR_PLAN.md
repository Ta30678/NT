# 📋 INDEX.HTML JavaScript 拆分規劃

> **目標**：將 index.html 的 ~9000 行 JavaScript 拆分為模組化結構
> **分析日期**：2025-12-31
> **函數總數**：148 個

---

## ⚠️ 重要警示：Mirror 功能

**Mirror（鏡像對稱）功能是此專案的核心複雜功能，必須特別小心處理！**

### Mirror 相關全域變數 (7 個)

```javascript
let SYMMETRY_PASS_SCORE = 0.7; // 對稱分數及格門檻
let SYMMETRY_TOLERANCE = 0.5; // 幾何容許誤差
let MATCHING_TOLERANCE = 0.8; // 配對容許誤差
let symmetryAxisDirection = "vertical"; // 軸方向
let userSymmetryAxisValue = null; // 用戶自訂對稱軸值
let detectedSymmetryAxis = null; // 自動偵測結果
let showSymmetryAxisLine = true; // 是否顯示軸線
let axisInputMethod = "grid"; // 輸入方式
let isAxisClickModeActive = false; // 點擊模式
let axisPoint1 = null; // 兩點定位
let axisPoint2 = null;
let axisPinClickCount = 0;
```

### Mirror 相關函數 (28 個) - **必須保持在同一模組**

| 函數                                 | 行號  | 依賴                                                |
| ------------------------------------ | ----- | --------------------------------------------------- |
| `detectSymmetryAxis()`               | 7200+ | SYMMETRY_PASS_SCORE, SYMMETRY_TOLERANCE, distance() |
| `detectSymmetryAxisWithDirection()`  | 1869  | 全部對稱變數                                        |
| `autoDetectSymmetryAxis()`           | 1823  | detectSymmetryAxisWithDirection()                   |
| `mirrorPoint()`                      | 7367  | 純函數                                              |
| `isBeamOnSymmetryAxis()`             | 7379  | joints 資料                                         |
| `drawSymmetryAxisLine()`             | 1995  | SVG 繪圖                                            |
| `toggleSymmetryAxisLine()`           | 1283  | showSymmetryAxisLine                                |
| `saveSymmetrySettings()`             | 1229  | localStorage                                        |
| `loadSymmetrySettings()`             | 1243  | localStorage                                        |
| `saveSymmetryAxisSettings()`         | 2049  | localStorage                                        |
| `loadSymmetryAxisSettings()`         | 2067  | localStorage                                        |
| `updateSymmetrySettings()`           | 1201  | UI 輸入框                                           |
| `initSymmetrySettingsWheelSupport()` | 1148  | DOM 事件                                            |
| `openMirrorSettingsModal()`          | 2160  | UI 對話框                                           |
| `closeMirrorSettingsModal()`         | 2192  | UI 對話框                                           |
| `toggleMirrorModeFromModal()`        | 2119  | 切換開關邏輯                                        |
| `updateMirrorStatusText()`           | 2148  | UI 狀態顯示                                         |
| `onAxisDirectionChange()`            | 1309  | 方向切換                                            |
| `toggleCustomAxis()`                 | 1334  | 自訂軸切換                                          |
| `onGridLineSelect()`                 | 1369  | 格線選擇                                            |
| `onAxisInputMethodChange()`          | 1380  | 輸入方式切換                                        |
| `enableAxisClickMode()`              | 1410  | 點擊模式                                            |
| `disableAxisClickMode()`             | 1422  | 點擊模式                                            |
| `handleAxisClick()`                  | 1479  | 點擊處理                                            |
| `handleAxisMouseDown()`              | 1449  | 滑鼠事件                                            |
| `handleAxisMouseUp()`                | 1459  | 滑鼠事件                                            |
| `drawAxisPin()`                      | 1548  | 繪製 PIN                                            |
| `drawAxisLine()`                     | 1618  | 繪製軸線                                            |
| `calculateAxisFromTwoPoints()`       | 1650  | 兩點計算                                            |
| `clearAxisPins()`                    | 1686  | 清除 PIN                                            |
| `updateClickAxisPositionDisplay()`   | 1702  | 顯示座標                                            |
| `clearClickAxisPosition()`           | 1744  | 清除顯示                                            |
| `startAxisClickMode()`               | 1756  | 啟動點擊模式                                        |
| `populateSymmetryAxisGridDropdown()` | 1800  | 填充下拉選單                                        |
| `updateAxisDisplay()`                | 1782  | 更新顯示                                            |
| `svgToEtabsCoord()`                  | 1767  | 座標轉換                                            |
| `isClickInsideSvg()`                 | 1436  | 點擊判斷                                            |

### Mirror 與 processE2k() 的關係

```
processE2k()
    │
    ├── 讀取 mirrorModeToggle.checked
    ├── 讀取 userSymmetryAxisValue（用戶自訂）
    ├── 讀取 detectedSymmetryAxis（自動偵測）
    │
    ├── 如果 mirror 開啟且無預設值：
    │   └── 呼叫 detectSymmetryAxis() 進行即時偵測
    │
    └── 呼叫 generateSecondaryBeamLabels(...)
        └── 使用 globalSymmetryAxisX 進行鏡像配對
```

### 安全拆分策略

**所有 mirror 相關函數必須放在 `js/features/mirror-mode.js` 中！**

1. 全域變數移到 `constants.js` 並 export
2. mirror-mode.js import 這些變數
3. 確保 processE2k() 能正確存取 mirror 相關函數
4. 測試時特別檢查：
   - [ ] 開啟 Mirror 模式
   - [ ] 自動偵測對稱軸
   - [ ] 手動選擇格線作為軸
   - [ ] 兩點點擊定位軸
   - [ ] 對稱分數調整
   - [ ] 軸線顯示/隱藏
   - [ ] 設定儲存與載入

---

## 📊 目前狀態

| 項目            | 數值                  |
| --------------- | --------------------- |
| 總行數          | 9,770 行              |
| HTML 部分       | ~1,000 行 (1-1000)    |
| JavaScript 部分 | ~8,770 行 (1001-9770) |
| 函數數量        | 148 個                |
| 全域變數        | ~50+ 個               |

---

## 🗂️ 拆分方案

### 📁 目錄結構

```
js/
├── main.js                 # 主入口，初始化所有模組
├── config/
│   └── constants.js        # 常數定義、全域變數
├── core/
│   ├── parser.js           # E2K 檔案解析
│   ├── beam-labeler.js     # 梁編號核心邏輯
│   └── grid-system.js      # 格線系統處理
├── features/
│   ├── mirror-mode.js      # 鏡像對稱模式
│   ├── fixed-label.js      # 固定編號功能
│   ├── selection.js        # 圈選功能
│   ├── search-member.js    # 搜尋桿件
│   ├── batch-edit.js       # 批量編輯
│   └── standard-floor.js   # 標準層連動
├── ui/
│   ├── dialogs.js          # 對話框管理
│   ├── svg-renderer.js     # SVG 繪製
│   ├── pan-zoom.js         # 縮放平移
│   └── drag-handlers.js    # 拖曳處理
├── export/
│   ├── excel-export.js     # Excel 匯出
│   └── autocad-export.js   # JSON 匯出
└── utils/
    ├── geometry.js         # 幾何計算
    ├── coord-transform.js  # 座標轉換
    └── storage.js          # localStorage 管理
```

---

## 📝 詳細函數分配

### 1️⃣ `js/config/constants.js` (~100 行)

**用途**：常數定義、全域變數初始化

```javascript
// 常數
INITIAL_BEAM_FONT_SIZE
COORD_SYSTEM_COLORS[]

// 全域變數
panZoomInstance
fullProcessedBeams[]
cachedJoints{}
cachedFrames[]
currentFile
isFullscreen
// ... 其他全域變數
```

---

### 2️⃣ `js/core/parser.js` (~400 行)

**用途**：E2K 檔案解析

| 函數              | 行號 | 說明         |
| ----------------- | ---- | ------------ |
| `parseJoints()`   | ?    | 解析節點座標 |
| `parseFrames()`   | ?    | 解析梁桿件   |
| `parseGrids()`    | ?    | 解析格線     |
| `parseGridName()` | ?    | 解析格線名稱 |

---

### 3️⃣ `js/core/beam-labeler.js` (~1500 行)

**用途**：梁編號核心邏輯

| 函數                                | 說明           |
| ----------------------------------- | -------------- |
| `processE2k()`                      | 主要處理流程   |
| `generateLabelsForStory()`          | 產生樓層標籤   |
| `generateSecondaryBeamLabels()`     | 次要梁編號     |
| `getBeamSerial()`                   | 取得梁編號     |
| `getBeamOrientationInCoordSystem()` | 判斷梁方向     |
| `findBestCoordSystemForBeam()`      | 找最佳座標系統 |
| `applySpecialPrefixRules()`         | 套用特殊前綴   |
| `calculateGridRelation()`           | 計算格線關係   |
| `findBeamsAtSamePosition()`         | 找相同位置的梁 |
| `areBeamsConnected()`               | 判斷梁是否連接 |

---

### 4️⃣ `js/core/grid-system.js` (~300 行)

**用途**：格線系統處理

| 函數                          | 說明               |
| ----------------------------- | ------------------ |
| `showGridConfig()`            | 顯示格線配置       |
| `applyGridConfig()`           | 套用配置           |
| `cancelGridConfig()`          | 取消配置           |
| `toggleGridSystem()`          | 切換格線系統       |
| `getGridsForCoordSystem()`    | 取得座標系統的格線 |
| `applyGridSystemVisibility()` | 套用可見性         |
| `findClosestGrid()`           | 找最近格線         |

---

### 5️⃣ `js/features/mirror-mode.js` (~800 行)

**用途**：鏡像對稱模式

| 函數                                 | 說明                                        |
| ------------------------------------ | ------------------------------------------- |
| `openMirrorSettingsModal()`          | 開啟設定                                    |
| `closeMirrorSettingsModal()`         | 關閉設定                                    |
| `toggleMirrorModeFromModal()`        | 切換鏡像模式                                |
| `updateMirrorStatusText()`           | 更新狀態文字                                |
| `autoDetectSymmetryAxis()`           | 自動偵測對稱軸                              |
| `detectSymmetryAxis()`               | 偵測對稱軸                                  |
| `detectSymmetryAxisWithDirection()`  | 帶方向偵測                                  |
| `drawSymmetryAxisLine()`             | 繪製對稱軸線                                |
| `toggleSymmetryAxisLine()`           | 切換軸線顯示                                |
| `mirrorPoint()`                      | 鏡像點計算                                  |
| `isBeamOnSymmetryAxis()`             | 判斷梁在軸上                                |
| `saveSymmetrySettings()`             | 儲存設定                                    |
| `loadSymmetrySettings()`             | 載入設定                                    |
| `saveSymmetryAxisSettings()`         | 儲存軸設定                                  |
| `loadSymmetryAxisSettings()`         | 載入軸設定                                  |
| `updateSymmetrySettings()`           | 更新設定                                    |
| `initSymmetrySettingsWheelSupport()` | 滾輪支援                                    |
| 軸線點擊相關 (12 個函數)             | handleAxis\*, drawAxisPin, clearAxisPins... |

---

### 6️⃣ `js/features/fixed-label.js` (~200 行)

**用途**：固定編號功能

| 函數                            | 說明         |
| ------------------------------- | ------------ |
| `openFixedLabelModal()`         | 開啟設定     |
| `closeFixedLabelModal()`        | 關閉設定     |
| `toggleFixedLabelMode()`        | 切換模式     |
| `toggleFixedLabelConfig()`      | 切換配置     |
| `addFixedLabelRuleModal()`      | 新增規則     |
| `removeFixedLabelRuleModal()`   | 移除規則     |
| `updateFixedLabelModalList()`   | 更新列表     |
| `updateFixedLabelSummary()`     | 更新摘要     |
| `updateFixedLabelButtonState()` | 更新按鈕狀態 |
| `loadFixedLabelRules()`         | 載入規則     |
| `saveFixedLabelRules()`         | 儲存規則     |

---

### 7️⃣ `js/features/selection.js` (~400 行)

**用途**：圈選功能

| 函數                           | 說明         |
| ------------------------------ | ------------ |
| `initializeSelectionFeature()` | 初始化選取   |
| `onSelectionStart()`           | 開始選取     |
| `onSelectionMove()`            | 選取移動     |
| `onSelectionEnd()`             | 結束選取     |
| `updateSelectionRect()`        | 更新選取框   |
| `selectBeamsInRect()`          | 框內選取梁   |
| `clearAllSelections()`         | 清除所有選取 |
| `clearSelectedBeamLabels()`    | 清除選取標籤 |
| `lineIntersectsRect()`         | 線與矩形相交 |
| `lineIntersectsLine()`         | 線與線相交   |
| `setupSelectWheelListeners()`  | 滾輪監聽     |

---

### 8️⃣ `js/features/search-member.js` (~100 行)

**用途**：搜尋桿件

| 函數                        | 說明       |
| --------------------------- | ---------- |
| `openSearchMemberDialog()`  | 開啟搜尋   |
| `closeSearchMemberDialog()` | 關閉搜尋   |
| `searchMember()`            | 執行搜尋   |
| `locateAndHighlightBeam()`  | 定位並高亮 |

---

### 9️⃣ `js/features/batch-edit.js` (~150 行)

**用途**：批量編輯

| 函數                             | 說明         |
| -------------------------------- | ------------ |
| `openBatchEditDialog()`          | 開啟批量編輯 |
| `closeBatchEditDialog()`         | 關閉批量編輯 |
| `saveBatchEdit()`                | 儲存批量編輯 |
| `updateSequentialBeamLabels()`   | 更新連續編號 |
| `handleAutoIncrement()`          | 處理自動遞增 |
| `attachAutoIncrementListeners()` | 附加監聽器   |

---

### 🔟 `js/features/standard-floor.js` (~300 行)

**用途**：標準層連動

| 函數                                   | 說明           |
| -------------------------------------- | -------------- |
| `createStandardFloorGroups()`          | 建立標準層群組 |
| `getStandardFloorGroupForStory()`      | 取得群組       |
| `generateFloorFingerprint()`           | 產生樓層指紋   |
| `invalidateStandardFloorGroupsCache()` | 清除快取       |

---

### 1️⃣1️⃣ `js/ui/dialogs.js` (~200 行)

**用途**：對話框管理

| 函數                             | 說明             |
| -------------------------------- | ---------------- |
| `openBeamEditDialog()`           | 開啟梁編輯       |
| `closeBeamEditDialog()`          | 關閉梁編輯       |
| `saveBeamEdit()`                 | 儲存梁編輯       |
| `showBeamInfo()`                 | 顯示梁資訊       |
| `toggleGridConfigHelp()`         | 切換說明         |
| `toggleHelpDialog()`             | 切換幫助         |
| `openGridBubbleModal()`          | 開啟 Grid Bubble |
| `closeGridBubbleModal()`         | 關閉 Grid Bubble |
| `toggleGridBubbleControlPanel()` | 切換控制面板     |

---

### 1️⃣2️⃣ `js/ui/svg-renderer.js` (~800 行)

**用途**：SVG 繪製

| 函數                             | 說明               |
| -------------------------------- | ------------------ |
| `displayResults()`               | 顯示結果           |
| `populateStorySelector()`        | 填充樓層選擇器     |
| `handleStoryChange()`            | 處理樓層變更       |
| `updateBeamVisualState()`        | 更新梁視覺狀態     |
| `updateBeamLabelPosition()`      | 更新標籤位置       |
| `updateBubblePosition()`         | 更新 Bubble 位置   |
| `initializeGridBubbleControls()` | 初始化 Bubble 控制 |
| `getBeamLocalBounds()`           | 取得梁邊界         |
| `getBeamLocalCenter()`           | 取得梁中心         |
| `getComponentBounds()`           | 取得組件邊界       |
| `findBuildingComponents()`       | 找建築組件         |
| `findNearestBeam()`              | 找最近的梁         |
| `summarizeFloors()`              | 統計樓層           |
| `summarizeProperties()`          | 統計屬性           |

---

### 1️⃣3️⃣ `js/ui/pan-zoom.js` (~200 行)

**用途**：縮放平移

| 函數                            | 說明           |
| ------------------------------- | -------------- |
| `initializeMiddleMousePan()`    | 初始化中鍵平移 |
| `handleMiddleMouseDown()`       | 中鍵按下       |
| `handleMiddleMouseMove()`       | 中鍵移動       |
| `handleMiddleMouseUp()`         | 中鍵釋放       |
| `toggleFullscreen()`            | 切換全螢幕     |
| `handleFullscreenStoryChange()` | 全螢幕樓層變更 |
| `nextFloor()`                   | 下一層         |
| `previousFloor()`               | 上一層         |
| `onKeyDown()`                   | 鍵盤事件       |

---

### 1️⃣4️⃣ `js/ui/drag-handlers.js` (~400 行)

**用途**：拖曳處理

| 函數                            | 說明               |
| ------------------------------- | ------------------ |
| `initializeBeamLabelDragging()` | 初始化標籤拖曳     |
| `handleBeamLabelMouseDown()`    | 標籤拖曳開始       |
| `handleBeamLabelMouseMove()`    | 標籤拖曳中         |
| `handleBeamLabelMouseUp()`      | 標籤拖曳結束       |
| `initializeBubbleDragging()`    | 初始化 Bubble 拖曳 |
| `handleBubbleMouseDown()`       | Bubble 拖曳開始    |
| `handleBubbleMouseMove()`       | Bubble 拖曳中      |
| `handleBubbleMouseUp()`         | Bubble 拖曳結束    |

---

### 1️⃣5️⃣ `js/export/excel-export.js` (~200 行)

**用途**：Excel 匯出

| 函數              | 說明       |
| ----------------- | ---------- |
| `exportToExcel()` | 匯出 Excel |

---

### 1️⃣6️⃣ `js/export/autocad-export.js` (~300 行)

**用途**：AutoCAD JSON 匯出

| 函數               | 說明             |
| ------------------ | ---------------- |
| `exportToJSON()`   | 匯出 JSON (舊版) |
| `exportToJSONV2()` | 匯出 JSON V2     |

---

### 1️⃣7️⃣ `js/utils/geometry.js` (~100 行)

**用途**：幾何計算

| 函數                    | 說明       |
| ----------------------- | ---------- |
| `distance()`            | 計算距離   |
| `calculateBeamAngle()`  | 計算梁角度 |
| `pointToLineDistance()` | 點到線距離 |
| `isPointOnSegment()`    | 點在線段上 |

---

### 1️⃣8️⃣ `js/utils/coord-transform.js` (~100 行)

**用途**：座標轉換

| 函數                   | 說明              |
| ---------------------- | ----------------- |
| `getSVGCoords()`       | 取得 SVG 座標     |
| `getSVGPoint()`        | 取得 SVG 點       |
| `globalToLocal()`      | 全域轉區域        |
| `getViewportElement()` | 取得視口元素      |
| `svgToEtabsCoord()`    | SVG 轉 ETABS 座標 |

---

### 1️⃣9️⃣ `js/utils/storage.js` (~50 行)

**用途**：localStorage 管理

| 函數               | 說明                  |
| ------------------ | --------------------- |
| (目前散落在各模組) | 可整合 save/load 函數 |

---

### 2️⃣0️⃣ `js/main.js` (~100 行)

**用途**：主入口

```javascript
// 匯入所有模組
import * from './config/constants.js';
import * from './core/parser.js';
// ...

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeSelectionFeature();
    initializeMiddleMousePan();
    initializeBeamLabelDragging();
    initializeBubbleDragging();
    loadSymmetrySettings();
    loadFixedLabelRules();
    // ...
});

// 掛載全域函數給 onclick 使用
window.processE2k = processE2k;
window.exportToExcel = exportToExcel;
// ...
```

---

## ⚠️ 注意事項

### 1. 全域變數依賴

目前有大量全域變數，需要：

- 集中到 `constants.js`
- 或改用 ES6 模組的 export/import

### 2. HTML onclick 事件

目前 HTML 中使用 `onclick="functionName()"` 約 50+ 處，需要：

- 保持函數掛載到 `window` 物件
- 或改用 `addEventListener`

### 3. 函數互相依賴

部分函數有交叉依賴，例如：

- `processE2k()` 依賴幾乎所有模組
- `displayResults()` 依賴繪圖和資料模組

### 4. 測試策略

每拆分一個模組就要測試：

- [ ] E2K 檔案載入
- [ ] 梁編號功能
- [ ] 鏡像模式
- [ ] 圈選功能
- [ ] 匯出功能

---

## 📅 建議執行順序

| 優先順序 | 模組                        | 風險 | 原因           |
| -------- | --------------------------- | ---- | -------------- |
| 1        | `utils/geometry.js`         | 低   | 純函數，無依賴 |
| 2        | `utils/coord-transform.js`  | 低   | 純函數，無依賴 |
| 3        | `config/constants.js`       | 中   | 需處理全域變數 |
| 4        | `core/parser.js`            | 低   | 解析邏輯獨立   |
| 5        | `export/*.js`               | 低   | 匯出邏輯獨立   |
| 6        | `features/search-member.js` | 低   | 功能簡單       |
| 7        | `features/fixed-label.js`   | 低   | 功能獨立       |
| 8        | `ui/pan-zoom.js`            | 中   | 需處理事件     |
| 9        | `ui/drag-handlers.js`       | 中   | 需處理事件     |
| 10       | `features/selection.js`     | 中   | 有依賴關係     |
| 11       | `features/batch-edit.js`    | 中   | 依賴選取       |
| 12       | `features/mirror-mode.js`   | 高   | 邏輯複雜       |
| 13       | `core/grid-system.js`       | 高   | 核心功能       |
| 14       | `core/beam-labeler.js`      | 高   | 核心功能       |
| 15       | `ui/svg-renderer.js`        | 高   | 依賴多         |
| 16       | `main.js`                   | 最後 | 整合所有模組   |

---

## 🔧 預估工作量

| 項目               | 時間           |
| ------------------ | -------------- |
| 低風險模組 (1-7)   | 15-20 分鐘     |
| 中風險模組 (8-11)  | 20-30 分鐘     |
| 高風險模組 (12-16) | 40-60 分鐘     |
| **總計**           | **1.5-2 小時** |

---

**確認此規劃後，我可以開始逐步拆分！**
