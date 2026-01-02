# 🔧 BEAM-NAMINGTOOL 開發工具

此目錄包含開發和除錯用的輔助工具腳本。

---

## 📁 工具清單

| 檔案                   | 說明                             |
| ---------------------- | -------------------------------- |
| `analysis.js`          | 分析工具 - 用於分析 E2K 檔案結構 |
| `replace_strings.js`   | 字串替換工具 - 批量替換文字      |
| `rewrite_block.js`     | 區塊重寫工具 - 程式碼區塊處理    |
| `sketch.js`            | 草圖工具 - 輔助繪圖功能          |
| `selection_debug.html` | 選取除錯頁面 - 測試選取功能      |

---

## 🚀 使用方式

### selection_debug.html

直接在瀏覽器開啟即可測試選取功能：

```powershell
start selection_debug.html
```

### 其他 JS 工具

可以在 Node.js 環境或瀏覽器 Console 中執行：

```powershell
node analysis.js
```

---

## ⚠️ 注意事項

這些工具是開發時期的輔助腳本，並非主要應用程式的一部分。
如需修改主程式，請編輯 `index.html` 和相關的 CSS/JS 模組。
