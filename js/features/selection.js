/**
 * BEAM-NAMINGTOOL - 圈選功能模組
 * 
 * 此模組實現 AutoCAD 風格的圈選功能
 * - 左到右：完全框選模式（Window）
 * - 右到左：碰到即選模式（Crossing）
 */

import { appState } from '../config/constants.js';
import { lineIntersectsLine, lineIntersectsRect } from '../utils/geometry.js';
import { getSVGCoords, getViewportElement } from '../utils/coord-transform.js';

// ============================================
// 本地狀態
// ============================================

// 用於 requestAnimationFrame 節流
let selectionAnimationFrameId = null;
let pendingSelectionEvent = null;

// ============================================
// 核心選取函數
// ============================================

/**
 * 初始化圈選功能
 */
export function initializeSelectionFeature() {
  appState.svgElement = document.getElementById("drawing-svg");

  if (!appState.svgElement) {
    console.warn("[WARN] SVG element not found yet, will retry...");
    setTimeout(initializeSelectionFeature, 500);
    return;
  }

  // 綁定事件監聽器
  appState.svgElement.addEventListener("mousedown", onSelectionStart);
  appState.svgElement.addEventListener("mousemove", onSelectionMove);
  appState.svgElement.addEventListener("mouseup", onSelectionEnd);

  // 鍵盤事件
  document.addEventListener("keydown", onKeyDown);

  console.log("✓ 圈選功能已初始化 (SVG 內部座標系統)");
}

/**
 * 開始圈選
 * @param {MouseEvent} evt - 滑鼠事件
 */
export function onSelectionStart(evt) {
  // 如果正在設定對稱軸，不要啟動選取功能
  if (appState.isAxisClickModeActive) {
    return;
  }

  // 如果點擊的是 BUBBLE 相關元素，不要啟動選取功能
  const target = evt.target;
  const targetClass = target.getAttribute("class") || "";
  if (
    targetClass.includes("grid-bubble") ||
    targetClass.includes("grid-bubble-hitarea") ||
    targetClass.includes("grid-bubble-text") ||
    targetClass.includes("grid-bubble-connector")
  ) {
    return;
  }

  // 如果點擊的是梁或標籤，處理單選
  if (evt.target.tagName === "line" || evt.target.tagName === "text") {
    if (
      evt.target.tagName === "text" &&
      evt.target.classList.contains("beam-label")
    ) {
      return; // 標籤可以被拖動
    }

    const beamName = evt.target.dataset.beamName;
    const beamStory = evt.target.dataset.beamStory;
    const beamJoint1 = evt.target.dataset.beamJoint1;
    const beamJoint2 = evt.target.dataset.beamJoint2;
    if (!beamName || !beamStory) return;

    const beamKey = `${beamStory}|${beamName}|${beamJoint1}|${beamJoint2}`;

    // Shift+Click：取消選擇該梁
    if (evt.shiftKey) {
      if (appState.selectedBeams.has(beamKey)) {
        appState.selectedBeams.delete(beamKey);
        updateBeamVisualState(beamKey, false);
      }
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    // 普通點擊：累加選擇
    if (!appState.selectedBeams.has(beamKey)) {
      appState.selectedBeams.add(beamKey);
      updateBeamVisualState(beamKey, true);
    }
    evt.preventDefault();
    evt.stopPropagation();
    return;
  }

  // 點擊空白處：準備開始框選
  if (evt.button !== 0) return; // 只處理左鍵

  // 禁用 pan 功能 - 不需要，因為 panEnabled 預設為 false
  // if (appState.panZoomInstance) {
  //   appState.panZoomInstance.disablePan();
  // }

  appState.isSelecting = true;
  appState.selectionStart = getSVGCoords(evt, appState.svgElement);

  // 設置 AutoCAD 風格十字線游標
  appState.svgElement.classList.add("autocad-crosshair");

  // 清理舊的選擇框
  const oldRects = appState.svgElement.querySelectorAll(
    ".selection-rect, .selection-rect-crossing"
  );
  oldRects.forEach((rect) => rect.remove());

  // 創建選擇框
  appState.selectionRect = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect"
  );
  appState.selectionRect.setAttribute("x", appState.selectionStart.x);
  appState.selectionRect.setAttribute("y", appState.selectionStart.y);
  appState.selectionRect.setAttribute("width", 0);
  appState.selectionRect.setAttribute("height", 0);
  appState.selectionRect.setAttribute("class", "selection-rect");
  appState.selectionRect.setAttribute("pointer-events", "none");

  const viewport = getViewportElement(appState.svgElement);
  viewport.appendChild(appState.selectionRect);

  evt.preventDefault();
  evt.stopPropagation();
}

/**
 * 拖動圈選
 * @param {MouseEvent} evt - 滑鼠事件
 */
export function onSelectionMove(evt) {
  if (!appState.isSelecting || !appState.selectionRect) return;

  pendingSelectionEvent = evt;
  if (!selectionAnimationFrameId) {
    selectionAnimationFrameId = requestAnimationFrame(updateSelectionRect);
  }
}

/**
 * 更新選擇框
 */
export function updateSelectionRect() {
  selectionAnimationFrameId = null;
  if (!appState.isSelecting || !appState.selectionRect || !pendingSelectionEvent) return;

  const currentPoint = getSVGCoords(pendingSelectionEvent, appState.svgElement);
  const width = currentPoint.x - appState.selectionStart.x;
  const height = currentPoint.y - appState.selectionStart.y;

  const isCrossingMode = width < 0;

  appState.selectionRect.setAttribute(
    "class",
    isCrossingMode ? "selection-rect-crossing" : "selection-rect"
  );

  const x = Math.min(appState.selectionStart.x, currentPoint.x);
  const y = Math.min(appState.selectionStart.y, currentPoint.y);
  const w = Math.abs(width);
  const h = Math.abs(height);

  appState.selectionRect.setAttribute("x", x);
  appState.selectionRect.setAttribute("y", y);
  appState.selectionRect.setAttribute("width", w);
  appState.selectionRect.setAttribute("height", h);

  pendingSelectionEvent = null;
}

/**
 * 結束圈選
 * @param {MouseEvent} evt - 滑鼠事件
 */
export function onSelectionEnd(evt) {
  if (!appState.isSelecting) return;

  appState.isSelecting = false;

  if (appState.svgElement) {
    appState.svgElement.classList.remove("autocad-crosshair");
  }

  // 恢復 pan 功能 - 不需要，因為 panEnabled 保持 false，由中鍵手動處理
  // if (appState.panZoomInstance) {
  //   appState.panZoomInstance.enablePan();
  // }

  const endPoint = getSVGCoords(evt, appState.svgElement);
  const width = endPoint.x - appState.selectionStart.x;
  const height = endPoint.y - appState.selectionStart.y;

  const isCrossingMode = width < 0;

  const minX = Math.min(appState.selectionStart.x, endPoint.x);
  const maxX = Math.max(appState.selectionStart.x, endPoint.x);
  const minY = Math.min(appState.selectionStart.y, endPoint.y);
  const maxY = Math.max(appState.selectionStart.y, endPoint.y);

  const MIN_SELECTION_SIZE = 10;
  if (
    Math.abs(width) > MIN_SELECTION_SIZE ||
    Math.abs(height) > MIN_SELECTION_SIZE
  ) {
    selectBeamsInRect(minX, minY, maxX, maxY, isCrossingMode);
  }

  if (appState.selectionRect) {
    appState.selectionRect.remove();
    appState.selectionRect = null;
  }
}

/**
 * 在矩形內選擇梁
 */
export function selectBeamsInRect(minX, minY, maxX, maxY, isCrossingMode) {
  const beamLines = appState.svgElement.querySelectorAll(
    ".labeled-beam-line, .secondary-beam-line, .special-beam-line, .wall-beam-line"
  );

  let selectedCount = 0;

  beamLines.forEach((line) => {
    const x1 = parseFloat(line.getAttribute("x1"));
    const y1 = parseFloat(line.getAttribute("y1"));
    const x2 = parseFloat(line.getAttribute("x2"));
    const y2 = parseFloat(line.getAttribute("y2"));
    const beamName = line.dataset.beamName;
    const beamStory = line.dataset.beamStory;
    const beamJoint1 = line.dataset.beamJoint1;
    const beamJoint2 = line.dataset.beamJoint2;

    if (!beamName || !beamStory) return;

    const beamKey = `${beamStory}|${beamName}|${beamJoint1}|${beamJoint2}`;

    // 跳過 WB/FWB 梁
    if (line.classList.contains("wall-beam-line")) return;

    let isInside = false;

    if (isCrossingMode) {
      isInside = lineIntersectsRect(x1, y1, x2, y2, minX, minY, maxX - minX, maxY - minY);
    } else {
      isInside =
        x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY &&
        x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY;
    }

    if (isInside) {
      appState.selectedBeams.add(beamKey);
      updateBeamVisualState(beamKey, true);
      selectedCount++;
    }
  });

  console.log(`選中 ${selectedCount} 個梁`);
}

/**
 * 更新梁的視覺狀態
 */
export function updateBeamVisualState(beamKey, isSelected) {
  const [story, name, joint1, joint2] = beamKey.split("|");

  const allElements = appState.svgElement.querySelectorAll(
    `[data-beam-name="${name}"]`
  );
  
  allElements.forEach((element) => {
    if (
      element.dataset.beamStory === story &&
      element.dataset.beamJoint1 === joint1 &&
      element.dataset.beamJoint2 === joint2
    ) {
      if (isSelected) {
        element.classList.add("beam-selected");
      } else {
        element.classList.remove("beam-selected");
      }
    }
  });
}

/**
 * 清除所有選擇
 */
export function clearAllSelections() {
  appState.selectedBeams.forEach((beamKey) => {
    updateBeamVisualState(beamKey, false);
  });
  appState.selectedBeams.clear();
  console.log("已清除所有選擇");
}

/**
 * 清除選中梁的編號
 */
export function clearSelectedBeamLabels() {
  // 此函數需要配合 beam-labeler 模組使用
  console.log("清除選中梁的自訂編號");
  // 實際邏輯會在整合時補充
}

/**
 * 鍵盤事件處理
 */
export function onKeyDown(evt) {
  // 如果焦點在輸入框內，不處理快捷鍵
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    return;
  }

  // Ctrl+F 或 Cmd+F：開啟搜尋對話框
  if ((evt.ctrlKey || evt.metaKey) && evt.key === "f") {
    evt.preventDefault();
    if (typeof window.openSearchMemberDialog === "function") {
      window.openSearchMemberDialog();
    }
    return;
  }

  // Enter 或 Space：有選中梁時開啟批量編輯對話框
  if ((evt.key === "Enter" || evt.key === " ") && appState.selectedBeams.size > 0) {
    // 如果批量編輯對話框已經打開，不要重複觸發
    const batchEditDialog = document.getElementById("batch-edit-dialog");
    if (batchEditDialog && batchEditDialog.style.display === "block") {
      return;
    }
    evt.preventDefault(); // 防止空白鍵滾動頁面
    if (typeof window.openBatchEditDialog === "function") {
      window.openBatchEditDialog();
    }
    return;
  }

  // Escape：關閉各種彈窗或取消選取
  if (evt.key === "Escape") {
    // 1. 如果 MIRROR 設定對話框打開，先關閉它
    const mirrorDialog = document.getElementById("mirror-settings-dialog");
    if (mirrorDialog && mirrorDialog.style.display === "block") {
      if (typeof window.closeMirrorSettingsModal === "function") {
        window.closeMirrorSettingsModal();
      }
      return;
    }

    // 2. 如果梁編輯對話框打開，關閉它
    const beamEditDialog = document.getElementById("beam-edit-dialog");
    if (beamEditDialog && beamEditDialog.style.display === "block") {
      if (typeof window.closeBeamEditDialog === "function") {
        window.closeBeamEditDialog();
      }
      return;
    }

    // 3. 如果批量編輯對話框打開，關閉它
    const batchEditDialog = document.getElementById("batch-edit-dialog");
    if (batchEditDialog && batchEditDialog.style.display === "block") {
      if (typeof window.closeBatchEditDialog === "function") {
        window.closeBatchEditDialog();
      }
      return;
    }

    // 4. 如果搜尋對話框打開，關閉它
    const searchDialog = document.getElementById("search-member-dialog");
    if (searchDialog && searchDialog.style.display === "block") {
      if (typeof window.closeSearchMemberDialog === "function") {
        window.closeSearchMemberDialog();
      }
      return;
    }

    // 5. 如果固定編號對話框打開，關閉它
    const fixedLabelDialog = document.getElementById("fixed-label-dialog");
    if (fixedLabelDialog && fixedLabelDialog.style.display === "block") {
      if (typeof window.closeFixedLabelModal === "function") {
        window.closeFixedLabelModal();
      }
      return;
    }

    // 6. 如果格線編號對話框打開，關閉它
    const gridBubbleModal = document.getElementById("grid-bubble-modal");
    if (gridBubbleModal && gridBubbleModal.style.display === "block") {
      if (typeof window.closeGridBubbleModal === "function") {
        window.closeGridBubbleModal();
      }
      return;
    }

    // 7. 如果資訊欄（tooltip）打開，關閉它
    const tooltip = document.getElementById("beam-info-tooltip");
    if (tooltip) {
      tooltip.remove();
      return;
    }

    // 8. 如果有選取的梁，取消選取
    if (appState.selectedBeams.size > 0) {
      clearAllSelections();
      return;
    }
  }

  // Delete：刪除選中梁的編號
  if (evt.key === "Delete" && appState.selectedBeams.size > 0) {
    if (confirm(`確定要清除 ${appState.selectedBeams.size} 個梁的自訂編號嗎？`)) {
      clearSelectedBeamLabels();
    }
  }
}
