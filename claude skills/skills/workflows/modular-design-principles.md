---
description: 通用模組化設計原則與錯誤處理指南（適用於所有程式語言）
---

# 模組化設計原則

在設計任何程式專案時，遵循以下原則能讓程式碼更易維護、測試與擴展。
此指南適用於所有程式語言：**Python、JavaScript/TypeScript、C、C++、HTML/CSS、Java、Go** 等。

---

## 一、高內聚 (High Cohesion)

**一個模組/檔案應該只專注做好一件事情。**

### ❌ 壞的設計

一個檔案裡面同時包含「讀取資料」、「計算邏輯」、「發送通知」、「介面顯示」的功能。

### ✅ 好的設計

將功能拆分到不同的模組/檔案中：

| 語言           | 資料讀取         | 核心邏輯            | 輸出/匯出         | 介面                        |
| -------------- | ---------------- | ------------------- | ----------------- | --------------------------- |
| **Python**     | `importers.py`   | `calculator.py`     | `exporters.py`    | `gui.py`                    |
| **JavaScript** | `dataLoader.js`  | `calculator.js`     | `exporter.js`     | `ui.js`                     |
| **C/C++**      | `file_io.c/.cpp` | `calculator.c/.cpp` | `exporter.c/.cpp` | `ui.c/.cpp`                 |
| **HTML/CSS**   | `data.js`        | `logic.js`          | -                 | `index.html` + `styles.css` |

---

## 二、低耦合 (Low Coupling)

**模組之間應該盡量減少依賴。**

### 核心原則

- 計算/邏輯模組 **不應該** 直接處理輸入/輸出（如 print、alert、console.log）
- 邏輯模組只負責 **回傳數據**，由呼叫者決定如何顯示

### 各語言範例

#### Python

```python
# ❌ 壞的設計 - 計算模組直接輸出
def calculate():
    result = 42
    print("計算完成")  # 耦合了終端機輸出
    return result

# ✅ 好的設計 - 只回傳數據
def calculate():
    return 42

# 由 main.py 或 gui.py 決定輸出方式
result = calculate()
print(f"計算完成: {result}")  # CLI
# 或 messagebox.showinfo("結果", result)  # GUI
```

#### JavaScript / TypeScript

```javascript
// ❌ 壞的設計 - 邏輯模組直接操作 DOM
function calculate() {
  const result = 42;
  document.getElementById("output").innerText = result; // 耦合了特定 DOM
  return result;
}

// ✅ 好的設計 - 只回傳數據
function calculate() {
  return 42;
}

// 由 UI 層決定輸出方式
const result = calculate();
document.getElementById("output").innerText = result; // Web
// 或 console.log(result);  // Node.js
```

#### C / C++

```c
// ❌ 壞的設計 - 計算函式直接輸出
int calculate() {
    int result = 42;
    printf("計算完成\n");  // 耦合了 stdout
    return result;
}

// ✅ 好的設計 - 只回傳數據
int calculate() {
    return 42;
}

// 由 main.c 決定輸出方式
int result = calculate();
printf("計算完成: %d\n", result);
```

---

# 錯誤處理原則 (Error Handling)

程式在執行時難免會遇到錯誤。良好的錯誤處理能讓程式不會直接「閃退」，而是優雅地告訴使用者發生了什麼事。

---

## 一、捕捉特定的錯誤

**不要捕捉所有錯誤，這樣會把程式碼的 Bug 也隱藏起來。**

### Python

```python
# ❌ 不推薦 - 吃掉所有錯誤
try:
    df = pd.read_csv(path)
except:
    print("出錯了")

# ✅ 推薦 - 捕捉特定錯誤
try:
    df = pd.read_csv(path)
except FileNotFoundError:
    print("找不到檔案，請確認路徑。")
except pd.errors.EmptyDataError:
    print("檔案是空的。")
except Exception as e:
    print(f"發生未預期的錯誤: {e}")
```

### JavaScript / TypeScript

```javascript
// ❌ 不推薦 - 吃掉所有錯誤
try {
  const data = JSON.parse(rawData);
} catch {
  console.log("出錯了");
}

// ✅ 推薦 - 區分錯誤類型
try {
  const data = JSON.parse(rawData);
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error("JSON 格式錯誤");
  } else if (error instanceof TypeError) {
    console.error("資料類型錯誤");
  } else {
    console.error(`未預期的錯誤: ${error.message}`);
  }
}
```

### C++

```cpp
// ❌ 不推薦 - 捕捉所有例外
try {
    readFile(path);
} catch (...) {
    std::cout << "出錯了" << std::endl;
}

// ✅ 推薦 - 捕捉特定例外
try {
    readFile(path);
} catch (const std::ios_base::failure& e) {
    std::cerr << "檔案讀取失敗: " << e.what() << std::endl;
} catch (const std::invalid_argument& e) {
    std::cerr << "參數錯誤: " << e.what() << std::endl;
} catch (const std::exception& e) {
    std::cerr << "未預期的錯誤: " << e.what() << std::endl;
}
```

### C (使用回傳值)

```c
// C 語言沒有例外機制，使用回傳值表示錯誤

// ✅ 推薦 - 使用錯誤碼
typedef enum {
    SUCCESS = 0,
    ERR_FILE_NOT_FOUND = -1,
    ERR_INVALID_FORMAT = -2,
    ERR_OUT_OF_MEMORY = -3
} ErrorCode;

ErrorCode read_file(const char* path, Data* out_data) {
    FILE* fp = fopen(path, "r");
    if (fp == NULL) {
        return ERR_FILE_NOT_FOUND;
    }
    // ... 讀取邏輯
    return SUCCESS;
}

// 呼叫端檢查錯誤
ErrorCode err = read_file("data.txt", &data);
if (err == ERR_FILE_NOT_FOUND) {
    printf("找不到檔案\n");
} else if (err != SUCCESS) {
    printf("發生錯誤，錯誤碼: %d\n", err);
}
```

---

## 二、在對的地方處理錯誤

### 分層原則

| 層級                               | 職責         | 錯誤處理方式                        |
| ---------------------------------- | ------------ | ----------------------------------- |
| **底層模組**（資料讀取、計算邏輯） | 處理資料     | **往上拋出**錯誤，或回傳錯誤碼/null |
| **介面層**（GUI、CLI、Web UI）     | 與使用者互動 | **捕捉**錯誤，顯示友善的錯誤訊息    |

### Python 範例

```python
# src/importers.py (底層) - 拋出錯誤
def load_data(path):
    if not path.endswith('.csv'):
        raise ValueError("只支援 CSV 格式")
    return pd.read_csv(path)

# src/gui.py (介面層) - 捕捉錯誤
def on_button_click():
    try:
        data = importers.load_data(user_input_path)
    except ValueError as err:
        messagebox.showerror("錯誤", str(err))
    except FileNotFoundError:
        messagebox.showerror("錯誤", "找不到指定的檔案")
```

### JavaScript 範例

```javascript
// src/dataLoader.js (底層) - 拋出錯誤
export function loadData(url) {
  if (!url.startsWith("http")) {
    throw new Error("URL 格式不正確");
  }
  return fetch(url).then((res) => res.json());
}

// src/ui.js (介面層) - 捕捉錯誤
async function onButtonClick() {
  try {
    const data = await loadData(userInputUrl);
    renderData(data);
  } catch (error) {
    alert(`錯誤: ${error.message}`);
  }
}
```

---

# 建議的檔案架構

根據專案類型，選擇適當的架構：

## Python 專案

```
my-project/
├── main.py               # 程式入口
├── requirements.txt      # 相依套件清單
├── README.md             # 專案說明
├── data/                 # 範例資料
│   └── sample_data.csv
├── src/
│   ├── __init__.py
│   ├── calculator.py     # 核心邏輯
│   ├── importers.py      # 輸入處理
│   ├── exporters.py      # 輸出處理
│   └── gui.py            # 視窗介面
└── tests/                # 測試檔案
    └── test_calculator.py
```

## Web 專案 (HTML/CSS/JS)

```
my-web-app/
├── index.html            # 主頁面
├── README.md             # 專案說明
├── css/
│   ├── reset.css         # CSS Reset
│   └── styles.css        # 主要樣式
├── js/
│   ├── main.js           # 程式入口
│   ├── calculator.js     # 核心邏輯
│   ├── dataLoader.js     # 資料讀取
│   ├── exporter.js       # 輸出匯出
│   └── ui.js             # UI 操作
└── assets/               # 靜態資源
    └── images/
```

## C/C++ 專案

```
my-c-project/
├── Makefile              # 或 CMakeLists.txt
├── README.md             # 專案說明
├── include/              # 標頭檔
│   ├── calculator.h
│   ├── file_io.h
│   └── types.h
├── src/                  # 原始碼
│   ├── main.c
│   ├── calculator.c
│   ├── file_io.c
│   └── exporter.c
├── data/                 # 範例資料
│   └── sample_data.txt
└── tests/                # 測試
    └── test_calculator.c
```

## Node.js / TypeScript 專案

```
my-node-app/
├── package.json          # 專案設定與相依套件
├── tsconfig.json         # TypeScript 設定（如適用）
├── README.md             # 專案說明
├── src/
│   ├── index.ts          # 程式入口
│   ├── calculator.ts     # 核心邏輯
│   ├── dataLoader.ts     # 資料讀取
│   └── exporter.ts       # 輸出處理
└── tests/
    └── calculator.test.ts
```

---

# 模組職責說明

| 模組類型                                     | 職責                   | 注意事項               |
| -------------------------------------------- | ---------------------- | ---------------------- |
| **入口點** (`main.*`)                        | 啟動程式、初始化各模組 | 保持簡潔，只做初始化   |
| **核心邏輯** (`calculator.*`)                | 數據處理、演算法       | **禁止**直接輸出/讀檔  |
| **資料讀取** (`importers.*`, `dataLoader.*`) | 讀取各種格式的輸入     | 驗證格式、拋出明確錯誤 |
| **資料輸出** (`exporters.*`)                 | 輸出結果到各種格式     | 考慮不同平台的相容性   |
| **介面** (`gui.*`, `ui.*`)                   | 使用者互動、顯示訊息   | 捕捉錯誤、顯示友善訊息 |
| **工具/共用** (`utils.*`, `helpers.*`)       | 跨模組共用的小工具     | 避免變成「垃圾桶」     |

---

# 最佳實踐檢查清單

在開發任何專案時，請確認：

## 架構設計

- [ ] 每個模組/檔案只負責一件事（高內聚）
- [ ] 邏輯模組不直接處理 I/O（低耦合）
- [ ] 有清楚的目錄結構
- [ ] 有 README 說明專案用途與使用方式

## 錯誤處理

- [ ] 使用特定的錯誤類型/錯誤碼
- [ ] 底層模組拋出/回傳錯誤
- [ ] 介面層捕捉錯誤並顯示友善訊息
- [ ] 不會隱藏程式碼的 Bug

## 程式碼品質

- [ ] 有列出相依套件（requirements.txt / package.json / Makefile）
- [ ] 有適當的註解說明複雜邏輯
- [ ] 變數/函式命名有意義
- [ ] 有測試檔案驗證核心功能

---

# 語言特定注意事項

## Python

- 使用 `raise` 拋出例外
- 使用 `try/except` 捕捉例外
- 建議使用 Type Hints 增加可讀性

## JavaScript / TypeScript

- 使用 `throw new Error()` 拋出錯誤
- 使用 `try/catch` 捕捉錯誤
- 非同步程式碼使用 `async/await` 配合 `try/catch`

## C++

- 使用 `throw` 拋出例外
- 使用 `try/catch` 捕捉例外
- 考慮使用 RAII 管理資源

## C

- 沒有例外機制，使用回傳值（錯誤碼）
- 使用 `enum` 定義錯誤類型
- 呼叫端必須檢查回傳值

## HTML/CSS

- 保持結構（HTML）與樣式（CSS）分離
- 使用語意化標籤（`<header>`, `<main>`, `<footer>`）
- CSS 使用有意義的 class 名稱
