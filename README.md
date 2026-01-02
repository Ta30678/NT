# ETABS 梁編號自動標註工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一套完整的結構梁編號解決方案，從 ETABS 模型到 AutoCAD 圖面自動標註。

## 🎯 功能特色

- ✅ **自動編號**: 讀取 ETABS E2K 檔案，自動產生梁編號
- ✅ **視覺化預覽**: 網頁即時預覽編號結果
- ✅ **匯出功能**: Excel 對照表 + JSON 座標檔
- ✅ **AutoCAD 自動標註**: C# 外掛讀取 JSON，自動在圖面標註
- ✅ **智慧偵測**: 自動識別軸線位置

## 📸 截圖

> 請自行新增截圖到 `screenshots/` 資料夾

## 🚀 快速開始

### 方式一: 使用 HTML 編號工具

1. 用瀏覽器開啟 [index.html](index.html)
2. 上傳你的 E2K 檔案
3. 執行編號
4. 匯出 Excel 或 JSON

### 方式二: AutoCAD 自動標註 (進階)

詳見 [AutoCAD 外掛使用教學](AutoCAD_Labeling/快速入門.md)

## 📚 文件

- [文檔中心](docs/README.md) - 所有文檔導覽
- [系統說明](docs/guides/系統說明.md) - 整體架構與技術細節
- [功能說明](docs/features/) - 各功能詳細文檔
- [開發工具](tools/README.md) - 開發輔助工具說明
- [Claude Skills](claude%20skills/README.md) - AI 輔助開發技能庫

## 🛠️ 系統需求

### HTML 編號工具

- 現代瀏覽器 (Chrome, Firefox, Edge)
- 無需安裝

### AutoCAD 外掛

- AutoCAD 2024 (64-bit)
- .NET 8.0 SDK
- Windows 10/11

## 📦 專案結構

```
BEAM-NAMINGTOOL-main/
├── 📄 index.html              # 主應用程式
├── 📄 README.md               # 專案說明
├── 📄 LICENSE                 # 授權條款
├── 📄 .gitignore              # Git 忽略規則
├── 📄 AssemblyInfo.cs         # 組件資訊
│
├── 📂 css/                    # CSS 樣式（已模組化）
│   ├── main.css              # 主要樣式、CSS 變數
│   ├── components.css        # 組件樣式
│   ├── layout.css            # 佈局樣式
│   ├── svg-canvas.css        # SVG 繪圖樣式
│   ├── fullscreen.css        # 全螢幕模式
│   └── dialogs.css           # 對話框樣式
│
├── 📂 docs/                   # 📚 文檔中心
│   ├── README.md             # 文檔導覽
│   ├── 📂 development/       # 開發相關
│   │   ├── DEBUG_GUIDE.md
│   │   └── PR_DESCRIPTION.md
│   ├── 📂 features/          # 功能說明
│   │   ├── AUTOCAD_STYLE_SELECTION.md
│   │   ├── CANVAS_SELECTION_UPDATE.md
│   │   ├── DEBUGGING_SELECTION.md
│   │   ├── SELECTION_FEATURE.md
│   │   ├── SVG_RELATIVE_SELECTION.md
│   │   └── 圈选功能使用说明.md
│   └── 📂 guides/            # 使用指南
│       └── 系統說明.md
│
├── 📂 tools/                  # 🔧 開發工具
│   ├── README.md             # 工具說明
│   ├── analysis.js
│   ├── replace_strings.js
│   ├── rewrite_block.js
│   ├── sketch.js
│   └── selection_debug.html
│
├── 📂 claude skills/          # 🤖 AI 開發技能庫
│   ├── CLAUDE.md             # Claude 整合說明
│   ├── README.md
│   ├── 📂 skills/            # 技能定義（277 個）
│   ├── 📂 template/          # 技能模板
│   └── 📂 spec/              # 規格說明
│
├── 📂 js/                     # JavaScript 模組（待拆分）
├── 📂 components/             # HTML 組件（待拆分）
└── 📂 .agent/workflows/       # ⚙️ 自動化 Workflow
    └── refactor-index-html.md
```

## 🎓 使用教學

### Step 1: 產生編號

1. 開啟 `index.html`
2. 點選「選擇 E2K 檔案」
3. 調整編號參數
4. 點選「執行編號」

### Step 2: 匯出資料

- **Excel**: 適合人工查閱
- **JSON**: 給 AutoCAD 外掛使用

### Step 3: AutoCAD 標註 (可選)

```bash
# 編譯外掛
cd AutoCAD_Labeling
dotnet build -c Release

# 在 AutoCAD 中執行
NETLOAD → 選擇 BeamLabeler.dll
LABELBEAMS → 選擇 JSON 檔案
```

詳細步驟請參考 [快速入門指南](AutoCAD_Labeling/快速入門.md)

## 🔧 編譯 AutoCAD 外掛

### 前置需求

```bash
# 安裝 .NET SDK
winget install Microsoft.DotNet.SDK.8

# 或從官網下載
https://dotnet.microsoft.com/download/dotnet/8.0
```

### 編譯步驟

```bash
cd AutoCAD_Labeling
dotnet restore
dotnet build -c Release
```

編譯完成後，DLL 位於:

```
AutoCAD_Labeling/bin/Release/net8.0/BeamLabeler.dll
```

## 💡 常見問題

### Q: AutoCAD 找不到 DLL 參考？

編輯 `AutoCAD_Labeling/BeamLabeler.csproj`，調整 AutoCAD 安裝路徑:

```xml
<HintPath>C:\Program Files\Autodesk\AutoCAD 2024\acdbmgd.dll</HintPath>
```

### Q: 標註位置不正確？

檢查:

1. 基準點是否選擇正確
2. 座標縮放比例 (預設 1000 = 1m → 1000mm)
3. ETABS 和 AutoCAD 的座標系統是否一致

### Q: 文字太大或太小？

調整標註時的文字高度參數，或使用 AutoCAD 的 `SCALETEXT` 命令。

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

### 開發路線圖

- [ ] 批次標註多個樓層
- [ ] 支援柱編號
- [ ] 自動避讓重疊文字
- [ ] Revit 整合
- [ ] Web 版 AutoCAD 支援

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE)

## 🙏 致謝

- ETABS E2K 格式解析
- AutoCAD .NET API
- P5.js 視覺化
- SheetJS (XLSX 匯出)

## 📞 聯絡資訊

如有問題或建議，歡迎開 Issue 討論！

---

**最後更新**: 2025-12-31
**版本**: 2.0.0 (模組化重構)
