/**
 * BEAM-NAMINGTOOL - 批量編輯功能模組
 *
 * 此模組處理多梁同時編輯功能
 * 支援選取範圍內順號模式
 *
 * [注意] 此模組使用 appState，需要等待完整整合後才能啟用
 */

import { appState } from "../config/constants.js";
import { clearAllSelections, updateBeamVisualState } from "./selection.js";

// ============================================
// 批量編輯對話框函數
// ============================================

/**
 * 開啟批量編輯對話框
 */
export function openBatchEditDialog() {
  if (appState.selectedBeams.size === 0) {
    alert("請先選擇要編輯的梁");
    return;
  }

  if (
    !appState.fullProcessedBeams ||
    appState.fullProcessedBeams.length === 0
  ) {
    console.warn("[WARN] fullProcessedBeams is empty or undefined!");
    alert("系統資料異常（找不到梁資料），請重新整理頁面後再試");
    return;
  }

  document.getElementById("batch-count").textContent =
    appState.selectedBeams.size;
  document.getElementById("batch-new-label").value = "";

  // 檢查選中的梁是否有任一屬於標準層群組
  let hasStandardFloorBeam = false;
  appState.selectedBeams.forEach((beamKey) => {
    const [story] = beamKey.split("|");
    // getStandardFloorGroupForStory 需要從主模組提供
    if (typeof window.getStandardFloorGroupForStory === "function") {
      const group = window.getStandardFloorGroupForStory(story);
      if (group && group.length > 1) {
        hasStandardFloorBeam = true;
      }
    }
  });

  const linkGroup = document.getElementById("batch-link-standard-floor-group");
  const linkCheckbox = document.getElementById("batch-link-standard-floor");

  if (hasStandardFloorBeam && linkGroup) {
    linkGroup.style.display = "block";
    linkCheckbox.checked = true;
  } else if (linkGroup) {
    linkGroup.style.display = "none";
  }

  document.getElementById("batch-edit-dialog").style.display = "block";
  document.getElementById("batch-edit-overlay").style.display = "block";
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    const input = document.getElementById("batch-new-label");
    input.focus();

    input.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        saveBatchEdit();
      } else if (e.key === "Escape") {
        closeBatchEditDialog();
      }
    };
  }, 100);
}

/**
 * 關閉批量編輯對話框
 */
export function closeBatchEditDialog() {
  document.getElementById("batch-edit-dialog").style.display = "none";
  document.getElementById("batch-edit-overlay").style.display = "none";
  document.body.style.overflow = "";
}

/**
 * 保存批量編輯
 */
export function saveBatchEdit() {
  const newLabel = document.getElementById("batch-new-label").value.trim();

  if (!newLabel) {
    alert("請輸入新的編號");
    return;
  }

  const linkCheckbox = document.getElementById("batch-link-standard-floor");
  const linkGroup = document.getElementById("batch-link-standard-floor-group");
  const shouldLinkStandardFloors =
    linkGroup &&
    linkGroup.style.display !== "none" &&
    linkCheckbox &&
    linkCheckbox.checked;

  const selectedStory = document.getElementById("storySelector").value;

  console.log(
    `\n[批量編輯] 開始處理 ${appState.selectedBeams.size} 個選中的梁`,
  );
  console.log(`  新編號: ${newLabel}`);
  console.log(`  當前樓層: ${selectedStory}`);
  console.log(`  連動標準層: ${shouldLinkStandardFloors}`);

  // 檢查是否為選取範圍內順號模式 (新編號以 -數字 結尾且選取多個梁)
  // [修改] 支援任意數字結尾的自動順號 (如 b5-1, b5-10)
  const sequentialMatch = newLabel.match(/^(.+)-(\d+)$/);
  const isSequentialMode = sequentialMatch && appState.selectedBeams.size > 1;

  if (isSequentialMode) {
    // 選取範圍內順號模式
    const baseLabel = sequentialMatch[1];
    const startNumber = parseInt(sequentialMatch[2], 10);

    console.log(
      `\n  🔢 [順號模式] 偵測到數字結尾 (${startNumber})，啟用選取範圍順號`,
    );
    console.log(`    基礎標籤: ${baseLabel}`);
    console.log(`    起始序號: ${startNumber}`);
    console.log(`    選取梁數: ${appState.selectedBeams.size}`);

    applySequentialLabels(
      baseLabel,
      selectedStory,
      shouldLinkStandardFloors,
      startNumber,
    );
  } else {
    // 單一標籤模式
    applySingleLabel(newLabel, selectedStory, shouldLinkStandardFloors);
  }

  closeBatchEditDialog();
  clearAllSelections();

  // 觸發重繪
  if (typeof window.handleStoryChange === "function") {
    window.handleStoryChange();
  }
}

/**
 * 套用順序編號
 * @param {string} baseLabel - 基礎標籤（不含 -1）
 * @param {string} selectedStory - 當前選擇的樓層
 * @param {boolean} shouldLinkStandardFloors - 是否連動標準層
 * @param {number} startNumber - 起始序號 (預設為 1)
 */
function applySequentialLabels(
  baseLabel,
  selectedStory,
  shouldLinkStandardFloors,
  startNumber = 1,
) {
  // 收集所有選中的梁及其座標
  const beamsWithCoords = [];

  appState.selectedBeams.forEach((beamKey) => {
    const [story, name, joint1, joint2] = beamKey.split("|");

    // 1. 找到要編輯的梁對象 (在 fullProcessedBeams 中)
    const beam = appState.fullProcessedBeams.find(
      (b) =>
        b.story === story &&
        b.name === name &&
        b.joint1 === joint1 &&
        b.joint2 === joint2,
    );

    // 2. 找到該梁的座標資訊 (在 fullDrawableBeams 中，因為 fullProcessedBeams 沒有 j1/j2)
    const drawableBeam = appState.fullDrawableBeams.find(
      (b) =>
        b.story === story &&
        b.name === name &&
        b.joint1 === joint1 &&
        b.joint2 === joint2,
    );

    // 確保梁存在且有座標
    if (beam && drawableBeam && drawableBeam.j1 && drawableBeam.j2) {
      const midX = (drawableBeam.j1.x + drawableBeam.j2.x) / 2;
      const midY = (drawableBeam.j1.y + drawableBeam.j2.y) / 2;
      beamsWithCoords.push({
        beam, // 保存 fullProcessedBeams 中的引用以供更新
        beamKey,
        midX,
        midY,
      });
    }
  });

  // 判斷方向並排序
  const xRange =
    Math.max(...beamsWithCoords.map((b) => b.midX)) -
    Math.min(...beamsWithCoords.map((b) => b.midX));
  const yRange =
    Math.max(...beamsWithCoords.map((b) => b.midY)) -
    Math.min(...beamsWithCoords.map((b) => b.midY));

  if (xRange > yRange) {
    // X 方向展開較大，依 X 座標排序（由小到大）
    beamsWithCoords.sort((a, b) => a.midX - b.midX);
  } else {
    // Y 方向展開較大，依 Y 座標排序（由大到小，因 Y 軸向下）
    beamsWithCoords.sort((a, b) => b.midY - a.midY);
  }

  console.log(
    `[順號除錯] 排序方向: ${xRange > yRange ? "X (左->右)" : "Y (上->下)"}`,
  );
  beamsWithCoords.forEach((b, i) =>
    console.log(
      `  [${i}] 原名:${b.beam.name} 座標:(${b.midX.toFixed(1)}, ${b.midY.toFixed(1)})`,
    ),
  );

  // 依序套用標籤
  beamsWithCoords.forEach((item, index) => {
    const newBeamLabel = `${baseLabel}-${startNumber + index}`;
    item.beam.newLabel = newBeamLabel;
    console.log(`  ${item.beam.name} → ${newBeamLabel}`);

    // 連動標準層（如果需要）
    if (shouldLinkStandardFloors) {
      applyToStandardFloors(item.beam, newBeamLabel);
    }
  });
}

/**
 * 套用單一標籤
 * @param {string} newLabel - 新標籤
 * @param {string} selectedStory - 當前選擇的樓層
 * @param {boolean} shouldLinkStandardFloors - 是否連動標準層
 */
function applySingleLabel(newLabel, selectedStory, shouldLinkStandardFloors) {
  appState.selectedBeams.forEach((beamKey) => {
    const [story, name, joint1, joint2] = beamKey.split("|");
    const beam = appState.fullProcessedBeams.find(
      (b) =>
        b.story === story &&
        b.name === name &&
        b.joint1 === joint1 &&
        b.joint2 === joint2,
    );

    if (beam) {
      beam.newLabel = newLabel;
      console.log(`  ${beam.name}@${beam.story} → ${newLabel}`);

      if (shouldLinkStandardFloors) {
        applyToStandardFloors(beam, newLabel);
      }
    }
  });
}

/**
 * 套用到標準層
 * @param {Object} beam - 梁對象
 * @param {string} newLabel - 新標籤
 */
function applyToStandardFloors(beam, newLabel) {
  if (typeof window.getStandardFloorGroupForStory !== "function") return;

  const group = window.getStandardFloorGroupForStory(beam.story);
  if (!group || group.length <= 1) return;

  group.forEach((linkedStory) => {
    if (linkedStory === beam.story) return;

    const linkedBeam = appState.fullProcessedBeams.find(
      (b) => b.story === linkedStory && b.name === beam.name,
    );

    if (linkedBeam) {
      linkedBeam.newLabel = newLabel;
      console.log(`    [連動] ${linkedBeam.name}@${linkedStory} → ${newLabel}`);
    }
  });
}

/**
 * 處理自動遞增（自動順號處理函數）
 * @param {HTMLInputElement} inputElement - 觸發事件的輸入框元素
 */
export function handleAutoIncrement(inputElement) {
  const axis = inputElement.dataset.axis; // 'x' 或 'y'
  const currentIndex = parseInt(inputElement.dataset.index);
  const currentValue = inputElement.value.trim();

  // 如果輸入的是數字，才自動順號
  const parsedNum = parseInt(currentValue, 10);
  if (
    isNaN(parsedNum) ||
    currentValue === "" ||
    currentValue === "-" ||
    currentValue.toLowerCase() === "skip"
  ) {
    return; // 非數字或跳過標記，不自動順號
  }

  // [修正] 獲取當前格線的座標系統
  // 透過 window.gridData 存取（與 index.html 共享）
  const gridData = window.gridData;
  if (!gridData) {
    console.warn("[handleAutoIncrement] gridData not found");
    return;
  }

  const gridsArray = axis === "x" ? gridData.x : gridData.y;
  if (!gridsArray || !gridsArray[currentIndex]) {
    console.warn("[handleAutoIncrement] gridsArray or currentIndex invalid");
    return;
  }

  const currentGrid = gridsArray[currentIndex];
  const currentCoordSystem = currentGrid.coordsystem || "GLOBAL";

  // 自動更新後面的格線編號（只更新同一座標系統內的格線）
  const totalGrids = gridsArray.length;
  let nextValue = parsedNum + 1;

  for (let i = currentIndex + 1; i < totalGrids; i++) {
    const nextGrid = gridsArray[i];
    const nextCoordSystem = nextGrid.coordsystem || "GLOBAL";

    // [新增] 檢查是否為同一座標系統
    if (nextCoordSystem !== currentCoordSystem) {
      // 遇到不同座標系統，停止自動順號
      break;
    }

    const nextInput = document.getElementById(`${axis}-grid-${i}`);
    if (nextInput) {
      const nextInputValue = nextInput.value.trim();
      // 只更新數字類型的輸入框（保留使用者手動設定的非數字值）
      const nextParsedNum = parseInt(nextInputValue, 10);
      if (
        !isNaN(nextParsedNum) &&
        nextInputValue !== "" &&
        nextInputValue !== "-" &&
        nextInputValue.toLowerCase() !== "skip"
      ) {
        nextInput.value = nextValue;
        nextValue++;
      } else {
        // 遇到非數字或跳過標記，停止自動順號
        break;
      }
    }
  }
}

/**
 * 附加自動遞增監聯器（為所有格線輸入框添加事件）
 */
export function attachAutoIncrementListeners() {
  const allInputs = document.querySelectorAll(
    "#x-grid-config input, #y-grid-config input",
  );

  allInputs.forEach((input) => {
    // [修正] 使用 blur 事件而非 change，確保離開輸入框時觸發
    input.addEventListener("blur", function () {
      handleAutoIncrement(this);
    });

    // [新增] 按 Enter 鍵也觸發自動順號
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.blur(); // 觸發 blur 事件
      }
    });
  });
}
