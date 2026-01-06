/**
 * BEAM-NAMINGTOOL - 鏡像對稱模式模組
 *
 * ⚠️ 重要：此模組是核心功能，拆分時保持原有邏輯完全不變！
 *
 * 此模組包含：
 * - 對稱軸自動偵測
 * - 對稱軸手動設定（格線選擇、兩點點選）
 * - 對稱軸繪製
 * - 對稱參數設定（及格分數、容許誤差）
 */

import { mirrorState, appState } from "../config/constants.js";
import { distance } from "../utils/geometry.js";
import { getViewportElement, getSVGCoords } from "../utils/coord-transform.js";

// ============================================
// 本地狀態變數（用於 click 模式）
// ============================================

let axisClickStartPos = null;
let axisClickStartTime = null;
let savedTransformParams = null;

// ============================================
// 對稱設定初始化和載入
// ============================================

/**
 * 初始化對稱設定滾輪支援
 */
export function initSymmetrySettingsWheelSupport() {
  const passScoreInput = document.getElementById("symmetryPassScore");
  const toleranceInput = document.getElementById("matchingTolerance");

  if (passScoreInput) {
    passScoreInput.addEventListener("wheel", function (e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1; // 改為 1% 為單位
      let newValue = parseInt(this.value) + delta;
      newValue = Math.max(10, Math.min(100, newValue));
      this.value = newValue;
      updateSymmetrySettings();
    });
  }

  if (toleranceInput) {
    toleranceInput.addEventListener("wheel", function (e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.01 : 0.01; // 步長 0.01m
      let newValue = parseFloat(this.value) + delta;
      newValue = Math.max(0.01, Math.min(2.0, newValue));
      this.value = newValue.toFixed(2);
      updateSymmetrySettings();
    });
  }

  const symmetryGridSelect = document.getElementById("symmetryAxisGridSelect");
  if (symmetryGridSelect) {
    symmetryGridSelect.addEventListener("wheel", function (e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(
        0,
        Math.min(this.options.length - 1, this.selectedIndex + delta),
      );
      if (newIndex !== this.selectedIndex) {
        this.selectedIndex = newIndex;
        onGridLineSelect();
      }
    });
  }
}

/**
 * 更新對稱設定
 */
export function updateSymmetrySettings() {
  const passScoreInput = document.getElementById("symmetryPassScore");
  const toleranceInput = document.getElementById("matchingTolerance");

  if (passScoreInput) {
    mirrorState.SYMMETRY_PASS_SCORE = parseInt(passScoreInput.value) / 100;
  }
  if (toleranceInput) {
    mirrorState.MATCHING_TOLERANCE = parseFloat(toleranceInput.value);
  }

  saveSymmetrySettings();
  updateMirrorStatusText();

  console.log(
    `[對稱評分設定] 及格分數: ${(mirrorState.SYMMETRY_PASS_SCORE * 100).toFixed(
      0,
    )}%, 誤差: ${mirrorState.MATCHING_TOLERANCE.toFixed(2)}m`,
  );
}

/**
 * 儲存對稱設定到 localStorage
 */
export function saveSymmetrySettings() {
  try {
    const settings = {
      passScore: mirrorState.SYMMETRY_PASS_SCORE,
      tolerance: mirrorState.MATCHING_TOLERANCE,
    };
    localStorage.setItem("symmetrySettings", JSON.stringify(settings));
  } catch (e) {
    console.error("儲存對稱設定失敗:", e);
  }
}

/**
 * 從 localStorage 載入對稱設定
 */
export function loadSymmetrySettings() {
  try {
    const saved = localStorage.getItem("symmetrySettings");
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.passScore !== undefined) {
        mirrorState.SYMMETRY_PASS_SCORE = settings.passScore;
      }
      if (settings.tolerance !== undefined) {
        mirrorState.MATCHING_TOLERANCE = settings.tolerance;
      }

      const passScoreInput = document.getElementById("symmetryPassScore");
      const toleranceInput = document.getElementById("symmetryTolerance");

      if (passScoreInput) {
        passScoreInput.value = Math.round(
          mirrorState.SYMMETRY_PASS_SCORE * 100,
        );
      }
      if (toleranceInput) {
        toleranceInput.value = mirrorState.MATCHING_TOLERANCE.toFixed(2);
      }

      console.log(
        `✓ 已載入對稱評分設定: 及格分數=${Math.round(
          mirrorState.SYMMETRY_PASS_SCORE * 100,
        )}%, 誤差=${mirrorState.MATCHING_TOLERANCE}m`,
      );
    }
  } catch (e) {
    console.error("載入對稱設定失敗:", e);
  }
}

// ============================================
// 對稱軸設定函數
// ============================================

/**
 * 切換對稱軸線顯示
 */
export function toggleSymmetryAxisLine() {
  mirrorState.showSymmetryAxisLine = !mirrorState.showSymmetryAxisLine;

  const checkbox = document.getElementById("toggle-symmetry-axis");
  const toggleSwitch = checkbox?.parentElement;
  if (checkbox) checkbox.checked = mirrorState.showSymmetryAxisLine;
  if (toggleSwitch) {
    if (mirrorState.showSymmetryAxisLine) {
      toggleSwitch.classList.add("active");
    } else {
      toggleSwitch.classList.remove("active");
    }
  }

  const axisLine = document.getElementById("symmetry-axis-line");
  if (axisLine) {
    axisLine.classList.toggle("hidden", !mirrorState.showSymmetryAxisLine);
  }

  saveSymmetryAxisSettings();
  console.log(`對稱軸線 ${mirrorState.showSymmetryAxisLine ? "顯示" : "隱藏"}`);
}

/**
 * 對稱軸方向變更
 */
export function onAxisDirectionChange() {
  const direction =
    document.querySelector('input[name="axisDirection"]:checked')?.value ||
    "vertical";
  mirrorState.symmetryAxisDirection = direction;

  mirrorState.userSymmetryAxisValue = null;

  autoDetectSymmetryAxis();
  populateSymmetryAxisGridDropdown();

  const select = document.getElementById("symmetryAxisGridSelect");
  if (select) {
    select.value = "";
  }

  saveSymmetryAxisSettings();
}

/**
 * 切換自訂對稱軸
 */
export function toggleCustomAxis() {
  const checkbox = document.getElementById("customAxisToggle");
  const toggleSwitch = document.getElementById("customAxisToggleSwitch");

  checkbox.checked = !checkbox.checked;
  const enabled = checkbox.checked;

  if (enabled) {
    toggleSwitch.classList.add("active");
  } else {
    toggleSwitch.classList.remove("active");
  }

  document.getElementById("customAxisOptions").style.display = enabled
    ? "block"
    : "none";

  if (!enabled) {
    mirrorState.userSymmetryAxisValue = null;
    disableAxisClickMode();
    updateAxisDisplay();
    drawSymmetryAxisLine();
  } else {
    if (mirrorState.axisInputMethod === "click") {
      enableAxisClickMode();
    }
  }
  saveSymmetryAxisSettings();
}

/**
 * Grid Line 下拉選單變更
 */
export function onGridLineSelect() {
  const select = document.getElementById("symmetryAxisGridSelect");
  if (select.value) {
    mirrorState.userSymmetryAxisValue = parseFloat(select.value);
    updateAxisDisplay();
    drawSymmetryAxisLine();
    saveSymmetryAxisSettings();
  }
}

/**
 * 輸入方式變更
 */
export function onAxisInputMethodChange() {
  const selectedMethod = document.querySelector(
    'input[name="axisInputMethod"]:checked',
  );
  if (!selectedMethod) return;

  mirrorState.axisInputMethod = selectedMethod.value;

  const gridMethodDiv = document.getElementById("axisInputGridMethod");
  const clickMethodDiv = document.getElementById("axisInputClickMethod");

  if (mirrorState.axisInputMethod === "grid") {
    gridMethodDiv.style.display = "flex";
    clickMethodDiv.style.display = "none";
    disableAxisClickMode();
  } else {
    gridMethodDiv.style.display = "none";
    clickMethodDiv.style.display = "block";
    enableAxisClickMode();
  }

  saveSymmetryAxisSettings();
}

// ============================================
// 點選模式函數
// ============================================

/**
 * 啟用點選模式
 */
export function enableAxisClickMode() {
  mirrorState.isAxisClickModeActive = true;
  const svg = document.getElementById("drawing-svg");
  if (svg) {
    svg.style.cursor = "crosshair";
  }
  document.addEventListener("mousedown", handleAxisMouseDown, true);
  document.addEventListener("mouseup", handleAxisMouseUp, true);
  console.log("[對稱軸] 點選模式已啟用");
}

/**
 * 停用點選模式
 */
export function disableAxisClickMode() {
  mirrorState.isAxisClickModeActive = false;
  const svg = document.getElementById("drawing-svg");
  if (svg) {
    svg.style.cursor = "";
  }
  document.removeEventListener("mousedown", handleAxisMouseDown, true);
  document.removeEventListener("mouseup", handleAxisMouseUp, true);
  axisClickStartPos = null;
  axisClickStartTime = null;
  console.log("[對稱軸] 點選模式已停用");
}

/**
 * 檢查點擊是否在 SVG 範圍內
 */
export function isClickInsideSvg(event) {
  const svg = document.getElementById("drawing-svg");
  if (!svg) return false;
  const rect = svg.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

/**
 * 處理滑鼠按下
 */
export function handleAxisMouseDown(event) {
  if (!mirrorState.isAxisClickModeActive) return;
  if (event.button !== 0) return;
  if (!isClickInsideSvg(event)) return;

  axisClickStartPos = { x: event.clientX, y: event.clientY };
  axisClickStartTime = Date.now();
}

/**
 * 處理滑鼠放開
 */
export function handleAxisMouseUp(event) {
  if (!mirrorState.isAxisClickModeActive) return;
  if (!axisClickStartPos || !axisClickStartTime) return;
  if (event.button !== 0) return;
  if (!isClickInsideSvg(event)) return;

  const dx = Math.abs(event.clientX - axisClickStartPos.x);
  const dy = Math.abs(event.clientY - axisClickStartPos.y);
  const dt = Date.now() - axisClickStartTime;

  if (dx < 5 && dy < 5 && dt < 300) {
    handleAxisClick(event);
  }

  axisClickStartPos = null;
  axisClickStartTime = null;
}

/**
 * 處理 SVG 點選事件 - 兩點定位模式
 */
export function handleAxisClick(event) {
  if (!mirrorState.isAxisClickModeActive) return;

  const svg = document.getElementById("drawing-svg");
  if (!svg) return;

  const svgRect = svg.getBoundingClientRect();
  let clickX = event.clientX - svgRect.left;
  let clickY = event.clientY - svgRect.top;

  if (appState.panZoomInstance) {
    const pan = appState.panZoomInstance.getPan();
    const zoom = appState.panZoomInstance.getZoom();
    clickX = (clickX - pan.x) / zoom;
    clickY = (clickY - pan.y) / zoom;
  }

  const etabsCoord = svgToEtabsCoord(clickX, clickY);

  if (etabsCoord) {
    mirrorState.axisPinClickCount++;

    if (mirrorState.axisPinClickCount === 1) {
      mirrorState.axisPoint1 = {
        x: etabsCoord.x,
        y: etabsCoord.y,
        svgX: clickX,
        svgY: clickY,
      };
      drawAxisPin(clickX, clickY, 1);
      updateClickAxisPositionDisplay();
      if (typeof window.showInlineStatus === "function") {
        window.showInlineStatus("📍 已設定第一點，請點選第二點", "info");
      }
      console.log(
        `[對稱軸] 點 1: (${etabsCoord.x.toFixed(3)}, ${etabsCoord.y.toFixed(3)})`,
      );
    } else if (mirrorState.axisPinClickCount === 2) {
      mirrorState.axisPoint2 = {
        x: etabsCoord.x,
        y: etabsCoord.y,
        svgX: clickX,
        svgY: clickY,
      };
      drawAxisPin(clickX, clickY, 2);
      drawAxisLine();
      updateClickAxisPositionDisplay();

      calculateAxisFromTwoPoints();
      disableAxisClickMode();

      if (typeof window.showInlineStatus === "function") {
        window.showInlineStatus("✅ 對稱軸已設定完成", "success");
      }
      console.log(
        `[對稱軸] 點 2: (${etabsCoord.x.toFixed(3)}, ${etabsCoord.y.toFixed(3)})`,
      );
    }
  }
}

/**
 * SVG 座標轉換回 ETABS 座標
 */
export function svgToEtabsCoord(svgX, svgY) {
  if (!savedTransformParams) {
    console.warn("[對稱軸] 尚未有座標轉換參數，請確認已載入檔案");
    return null;
  }

  const { scale, offsetX, offsetY, minX, minY, svgHeight } =
    savedTransformParams;
  const etabsX = (svgX - offsetX) / scale + minX;
  const etabsY = (svgHeight - offsetY - svgY) / scale + minY;

  return { x: etabsX, y: etabsY };
}

/**
 * 設定座標轉換參數（供主模組呼叫）
 */
export function setTransformParams(params) {
  savedTransformParams = params;
}

// ============================================
// PIN 繪製函數
// ============================================

/**
 * 繪製 PIN 標記
 */
export function drawAxisPin(svgX, svgY, pinNumber) {
  const svg = document.getElementById("drawing-svg");
  if (!svg) return;

  let viewport = svg.querySelector(".svg-pan-zoom_viewport");
  if (!viewport) viewport = svg;

  const pinGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  pinGroup.setAttribute("id", `axis-pin-${pinNumber}`);
  pinGroup.setAttribute("class", "axis-pin-marker");

  const pinHeight = 30;
  const pinWidth = 20;

  const pin = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = `M ${svgX} ${svgY - pinHeight}
             C ${svgX - pinWidth / 2} ${svgY - pinHeight}
               ${svgX - pinWidth / 2} ${svgY - pinHeight / 2}
               ${svgX} ${svgY}
             C ${svgX + pinWidth / 2} ${svgY - pinHeight / 2}
               ${svgX + pinWidth / 2} ${svgY - pinHeight}
               ${svgX} ${svgY - pinHeight}`;
  pin.setAttribute("d", d);
  pin.setAttribute("fill", "#E53935");
  pin.setAttribute("stroke", "#B71C1C");
  pin.setAttribute("stroke-width", "2");
  pin.style.filter = "drop-shadow(2px 2px 3px rgba(0,0,0,0.4))";

  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  circle.setAttribute("cx", svgX);
  circle.setAttribute("cy", svgY - pinHeight * 0.65);
  circle.setAttribute("r", pinWidth / 4);
  circle.setAttribute("fill", "white");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", svgX);
  text.setAttribute("y", svgY - pinHeight * 0.6);
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("fill", "#E53935");
  text.setAttribute("font-size", "10");
  text.setAttribute("font-weight", "bold");
  text.textContent = pinNumber;

  pinGroup.appendChild(pin);
  pinGroup.appendChild(circle);
  pinGroup.appendChild(text);
  viewport.appendChild(pinGroup);
}

/**
 * 繪製兩點之間的軸線
 */
export function drawAxisLine() {
  if (!mirrorState.axisPoint1 || !mirrorState.axisPoint2) return;

  const svg = document.getElementById("drawing-svg");
  if (!svg) return;

  let viewport = svg.querySelector(".svg-pan-zoom_viewport");
  if (!viewport) viewport = svg;

  const oldLine = document.getElementById("custom-axis-line");
  if (oldLine) oldLine.remove();

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("id", "custom-axis-line");
  line.setAttribute("x1", mirrorState.axisPoint1.svgX);
  line.setAttribute("y1", mirrorState.axisPoint1.svgY);
  line.setAttribute("x2", mirrorState.axisPoint2.svgX);
  line.setAttribute("y2", mirrorState.axisPoint2.svgY);
  line.setAttribute("stroke", "#E53935");
  line.setAttribute("stroke-width", "3");
  line.setAttribute("stroke-dasharray", "10,5");
  line.style.filter = "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))";

  viewport.appendChild(line);
}

/**
 * 從兩點計算對稱軸
 */
export function calculateAxisFromTwoPoints() {
  if (!mirrorState.axisPoint1 || !mirrorState.axisPoint2) return;

  const midX = (mirrorState.axisPoint1.x + mirrorState.axisPoint2.x) / 2;
  const midY = (mirrorState.axisPoint1.y + mirrorState.axisPoint2.y) / 2;

  const dx = Math.abs(mirrorState.axisPoint2.x - mirrorState.axisPoint1.x);
  const dy = Math.abs(mirrorState.axisPoint2.y - mirrorState.axisPoint1.y);

  if (dx > dy) {
    mirrorState.symmetryAxisDirection = "horizontal";
    mirrorState.userSymmetryAxisValue = midY;
  } else {
    mirrorState.symmetryAxisDirection = "vertical";
    mirrorState.userSymmetryAxisValue = midX;
  }

  const directionRadio = document.querySelector(
    `input[name="axisDirection"][value="${mirrorState.symmetryAxisDirection}"]`,
  );
  if (directionRadio) directionRadio.checked = true;

  saveSymmetryAxisSettings();
  console.log(
    `[對稱軸] 計算結果: ${
      mirrorState.symmetryAxisDirection === "vertical" ? "X" : "Y"
    } = ${mirrorState.userSymmetryAxisValue.toFixed(3)}`,
  );
}

/**
 * 清除 PIN 和軸線
 */
export function clearAxisPins() {
  const svg = document.getElementById("drawing-svg");
  if (svg) {
    const pin1 = document.getElementById("axis-pin-1");
    const pin2 = document.getElementById("axis-pin-2");
    const axisLine = document.getElementById("custom-axis-line");
    if (pin1) pin1.remove();
    if (pin2) pin2.remove();
    if (axisLine) axisLine.remove();
  }
  mirrorState.axisPoint1 = null;
  mirrorState.axisPoint2 = null;
  mirrorState.axisPinClickCount = 0;
}

// ============================================
// 顯示更新函數
// ============================================

/**
 * 更新點選位置顯示
 */
export function updateClickAxisPositionDisplay() {
  const posDisplay = document.getElementById("clickAxisPosition");
  const clearBtn = document.getElementById("clearClickAxisBtn");

  if (posDisplay) {
    if (
      mirrorState.axisPoint1 &&
      mirrorState.axisPoint2 &&
      mirrorState.userSymmetryAxisValue !== null
    ) {
      const axisLabel =
        mirrorState.symmetryAxisDirection === "vertical" ? "X" : "Y";
      posDisplay.innerHTML = `
        <div style="font-size: 0.85em;">
          <div>📍 點1: (${mirrorState.axisPoint1.x.toFixed(2)}, ${mirrorState.axisPoint1.y.toFixed(2)})</div>
          <div>📍 點2: (${mirrorState.axisPoint2.x.toFixed(2)}, ${mirrorState.axisPoint2.y.toFixed(2)})</div>
          <div style="color: #2196f3; font-weight: 500; margin-top: 4px;">對稱軸: ${axisLabel} = ${mirrorState.userSymmetryAxisValue.toFixed(3)}</div>
        </div>
      `;
      if (clearBtn) clearBtn.style.display = "inline-block";
    } else if (mirrorState.axisPoint1) {
      posDisplay.innerHTML = `
        <div style="font-size: 0.85em; color: #ff9800;">
          📍 點1: (${mirrorState.axisPoint1.x.toFixed(2)}, ${mirrorState.axisPoint1.y.toFixed(2)})<br>
          等待設定第二點...
        </div>
      `;
      if (clearBtn) clearBtn.style.display = "inline-block";
    } else {
      posDisplay.textContent = "-- 尚未設定 --";
      posDisplay.style.color = "";
      if (clearBtn) clearBtn.style.display = "none";
    }
  }
}

/**
 * 清除點選位置
 */
export function clearClickAxisPosition() {
  mirrorState.userSymmetryAxisValue = null;
  clearAxisPins();
  updateClickAxisPositionDisplay();
  updateAxisDisplay();
  drawSymmetryAxisLine();
  saveSymmetryAxisSettings();
  console.log("[對稱軸] 已清除點選位置");
}

/**
 * 開始點選模式（關閉 Modal 並啟用點選）
 */
export function startAxisClickMode() {
  closeMirrorSettingsModal();
  clearAxisPins();
  enableAxisClickMode();
  if (typeof window.showInlineStatus === "function") {
    window.showInlineStatus("🎯 請在結構平面圖上點選第一個定位點", "info");
  }
}

/**
 * 更新對稱軸顯示
 */
export function updateAxisDisplay() {
  const display = document.getElementById("currentAxisDisplay");
  if (!display) return;

  const axisValue =
    mirrorState.userSymmetryAxisValue ??
    mirrorState.detectedSymmetryAxis?.value;
  const axisLabel =
    mirrorState.symmetryAxisDirection === "vertical" ? "X" : "Y";

  if (axisValue !== null && axisValue !== undefined) {
    const source =
      mirrorState.userSymmetryAxisValue !== null ? "自訂" : "自動偵測";
    display.textContent = `目前對稱軸: ${axisLabel} = ${axisValue.toFixed(2)} (${source})`;
  } else {
    display.textContent = `目前對稱軸: -- (尚未偵測)`;
  }
}

/**
 * 填充 Grid Line 下拉選單
 */
export function populateSymmetryAxisGridDropdown() {
  const select = document.getElementById("symmetryAxisGridSelect");
  if (!select) return;

  select.innerHTML = '<option value="">-- 選擇 --</option>';

  const grids =
    mirrorState.symmetryAxisDirection === "vertical"
      ? appState.gridData?.x
      : appState.gridData?.y;
  const axisLabel =
    mirrorState.symmetryAxisDirection === "vertical" ? "X" : "Y";

  if (grids) {
    grids.forEach((grid) => {
      const option = document.createElement("option");
      option.value = grid.ordinate;
      option.textContent = `${grid.name} (${axisLabel}=${grid.ordinate})`;
      select.appendChild(option);
    });
  }
}

// ============================================
// 對稱軸繪製
// ============================================

/**
 * 繪製對稱軸線
 */
export function drawSymmetryAxisLine() {
  const oldLine = document.getElementById("symmetry-axis-line");
  if (oldLine) oldLine.remove();

  if (!mirrorState.showSymmetryAxisLine) return;

  const axisValue =
    mirrorState.userSymmetryAxisValue ??
    mirrorState.detectedSymmetryAxis?.value;
  if (axisValue === null || axisValue === undefined) return;

  const svg = document.getElementById("drawing-svg");
  if (!svg) return;

  const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number);
  if (!viewBox || viewBox.length < 4) return;

  const [vbX, vbY, vbW, vbH] = viewBox;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("id", "symmetry-axis-line");
  line.setAttribute("class", "symmetry-axis-line");

  const direction =
    mirrorState.userSymmetryAxisValue !== null
      ? mirrorState.symmetryAxisDirection
      : mirrorState.detectedSymmetryAxis?.direction || "vertical";

  if (direction === "vertical") {
    line.setAttribute("x1", axisValue);
    line.setAttribute("y1", vbY);
    line.setAttribute("x2", axisValue);
    line.setAttribute("y2", vbY + vbH);
  } else {
    line.setAttribute("x1", vbX);
    line.setAttribute("y1", axisValue);
    line.setAttribute("x2", vbX + vbW);
    line.setAttribute("y2", axisValue);
  }

  const viewport = document.querySelector("#drawing-svg g");
  if (viewport) {
    viewport.insertBefore(line, viewport.firstChild);
  }
}

// ============================================
// 對稱軸設定儲存載入
// ============================================

/**
 * 儲存對稱軸設定
 */
export function saveSymmetryAxisSettings() {
  try {
    const settings = {
      direction: mirrorState.symmetryAxisDirection,
      userValue: mirrorState.userSymmetryAxisValue,
      showLine: mirrorState.showSymmetryAxisLine,
      inputMethod: mirrorState.axisInputMethod,
    };
    localStorage.setItem("symmetryAxisSettings", JSON.stringify(settings));
  } catch (e) {
    console.error("儲存對稱軸設定失敗:", e);
  }
}

/**
 * 載入對稱軸設定
 */
export function loadSymmetryAxisSettings() {
  try {
    const saved = localStorage.getItem("symmetryAxisSettings");
    if (saved) {
      const settings = JSON.parse(saved);
      mirrorState.symmetryAxisDirection = settings.direction ?? "vertical";
      mirrorState.userSymmetryAxisValue = null; // 不載入自訂值，強制使用自動偵測
      mirrorState.showSymmetryAxisLine = settings.showLine ?? true;

      console.log(
        `✓ 已載入對稱軸設定: 方向=${mirrorState.symmetryAxisDirection}, 顯示=${mirrorState.showSymmetryAxisLine} (僅自動偵測)`,
      );
    }
  } catch (e) {
    console.error("載入對稱軸設定失敗:", e);
  }
}

// ============================================
// 對稱偵測核心函數
// ============================================

/**
 * 自動偵測對稱軸
 */
export function autoDetectSymmetryAxis() {
  if (
    !appState.fullProcessedBeams ||
    appState.fullProcessedBeams.length === 0
  ) {
    console.log("[對稱軸偵測] 沒有梁資料，跳過偵測");
    return;
  }

  const allBeams = appState.fullProcessedBeams.flatMap(
    (floor) => floor.beams || [],
  );

  if (allBeams.length === 0) {
    console.log("[對稱軸偵測] 沒有梁資料，跳過偵測");
    return;
  }

  const axisValue = detectSymmetryAxisWithDirection(
    allBeams,
    appState.previewJoints,
    appState.gridData,
    mirrorState.symmetryAxisDirection,
  );

  if (axisValue !== null) {
    mirrorState.detectedSymmetryAxis = {
      direction: mirrorState.symmetryAxisDirection,
      value: axisValue,
    };
    console.log(
      `[對稱軸偵測] ${
        mirrorState.symmetryAxisDirection === "vertical" ? "X" : "Y"
      } = ${axisValue.toFixed(3)}`,
    );
  } else {
    mirrorState.detectedSymmetryAxis = null;
    console.log("[對稱軸偵測] 未找到明顯對稱結構");
  }

  updateAxisDisplay();
  drawSymmetryAxisLine();
}

/**
 * 偵測對稱軸（支援方向參數）
 */
export function detectSymmetryAxisWithDirection(
  beams,
  joints,
  gridData,
  direction = "vertical",
) {
  if (!beams || beams.length === 0) return null;

  const coords = [];
  beams.forEach((beam) => {
    const j1 = joints[beam.joint1];
    const j2 = joints[beam.joint2];
    if (j1 && j2) {
      if (direction === "vertical") {
        coords.push(j1.x, j2.x);
      } else {
        coords.push(j1.y, j2.y);
      }
    }
  });

  if (coords.length === 0) return null;

  const minCoord = Math.min(...coords);
  const maxCoord = Math.max(...coords);
  const centerCoord = (minCoord + maxCoord) / 2;

  const candidates = [centerCoord];

  const grids = direction === "vertical" ? gridData?.x : gridData?.y;
  if (grids) {
    grids.forEach((grid) => {
      if (grid.ordinate > minCoord && grid.ordinate < maxCoord) {
        candidates.push(grid.ordinate);
      }
    });
  }

  let bestAxis = null;
  let bestScore = 0;

  candidates.forEach((axisCoord) => {
    let matchCount = 0;
    let totalCount = 0;

    beams.forEach((beam) => {
      const j1 = joints[beam.joint1];
      const j2 = joints[beam.joint2];
      if (!j1 || !j2) return;

      const midCoord =
        direction === "vertical" ? (j1.x + j2.x) / 2 : (j1.y + j2.y) / 2;
      const otherCoord =
        direction === "vertical" ? (j1.y + j2.y) / 2 : (j1.x + j2.x) / 2;
      const length = Math.sqrt((j2.x - j1.x) ** 2 + (j2.y - j1.y) ** 2);

      if (Math.abs(midCoord - axisCoord) < mirrorState.SYMMETRY_TOLERANCE)
        return;

      totalCount++;

      const mirroredCoord = 2 * axisCoord - midCoord;
      const hasMatch = beams.some((otherBeam) => {
        if (otherBeam === beam) return false;
        const oj1 = joints[otherBeam.joint1];
        const oj2 = joints[otherBeam.joint2];
        if (!oj1 || !oj2) return false;

        const otherMidCoord =
          direction === "vertical" ? (oj1.x + oj2.x) / 2 : (oj1.y + oj2.y) / 2;
        const otherOtherCoord =
          direction === "vertical" ? (oj1.y + oj2.y) / 2 : (oj1.x + oj2.x) / 2;
        const otherLength = Math.sqrt(
          (oj2.x - oj1.x) ** 2 + (oj2.y - oj1.y) ** 2,
        );

        return (
          Math.abs(otherMidCoord - mirroredCoord) <
            mirrorState.MATCHING_TOLERANCE &&
          Math.abs(otherOtherCoord - otherCoord) <
            mirrorState.MATCHING_TOLERANCE &&
          Math.abs(otherLength - length) < 1.0
        );
      });

      if (hasMatch) matchCount++;
    });

    const score = totalCount > 0 ? matchCount / totalCount : 0;
    if (score > bestScore) {
      bestScore = score;
      bestAxis = axisCoord;
    }
  });

  if (bestScore > mirrorState.SYMMETRY_PASS_SCORE) {
    const SNAP_TOLERANCE = 0.5;
    if (grids) {
      for (const grid of grids) {
        if (Math.abs(bestAxis - grid.ordinate) < SNAP_TOLERANCE) {
          console.log(
            `[對稱軸偵測] 校正: ${bestAxis.toFixed(3)} → Grid ${grid.name} (${grid.ordinate})`,
          );
          bestAxis = grid.ordinate;
          break;
        }
      }
    }
    return bestAxis;
  }

  return null;
}

/**
 * 智能偵測對稱軸 - 基於 Opus 4.1 算法
 * (原 index.html 7236 行的函數，完全保留)
 */
export function detectSymmetryAxis(beams, joints, gridData) {
  if (!beams || beams.length < 10) return null;

  const xCoords = [];
  beams.forEach((beam) => {
    const j1 = joints[beam.joint1];
    const j2 = joints[beam.joint2];
    if (j1 && j2) {
      xCoords.push((j1.x + j2.x) / 2);
    }
  });

  if (xCoords.length === 0) return null;

  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const centerX = (minX + maxX) / 2;

  const candidates = [centerX];

  if (gridData && gridData.x) {
    gridData.x.forEach((grid) => {
      if (grid.ordinate > minX && grid.ordinate < maxX) {
        candidates.push(grid.ordinate);
      }
    });
  }

  let bestAxis = null;
  let bestScore = 0;

  candidates.forEach((axisX) => {
    let matchCount = 0;
    let totalCount = 0;

    beams.forEach((beam) => {
      const j1 = joints[beam.joint1];
      const j2 = joints[beam.joint2];
      if (!j1 || !j2) return;

      const midX = (j1.x + j2.x) / 2;
      const midY = (j1.y + j2.y) / 2;
      const length = distance(j1, j2);

      if (Math.abs(midX - axisX) < mirrorState.SYMMETRY_TOLERANCE) return;

      totalCount++;

      const mirroredX = 2 * axisX - midX;
      const hasMatch = beams.some((otherBeam) => {
        if (otherBeam === beam) return false;
        const oj1 = joints[otherBeam.joint1];
        const oj2 = joints[otherBeam.joint2];
        if (!oj1 || !oj2) return false;

        const otherMidX = (oj1.x + oj2.x) / 2;
        const otherMidY = (oj1.y + oj2.y) / 2;
        const otherLength = distance(oj1, oj2);

        return (
          Math.abs(otherMidX - mirroredX) < mirrorState.MATCHING_TOLERANCE &&
          Math.abs(otherMidY - midY) < mirrorState.MATCHING_TOLERANCE &&
          Math.abs(otherLength - length) < 1.0
        );
      });

      if (hasMatch) matchCount++;
    });

    const score = totalCount > 0 ? matchCount / totalCount : 0;
    if (score > bestScore) {
      bestScore = score;
      bestAxis = axisX;
    }
  });

  if (bestScore > mirrorState.SYMMETRY_PASS_SCORE) {
    console.log(
      `[智能偵測] 找到對稱軸 X=${bestAxis.toFixed(3)}, 對稱分數: ${(
        bestScore * 100
      ).toFixed(1)}%`,
    );
    return bestAxis;
  }

  console.log(
    `[智能偵測] 未找到明顯對稱結構 (最高分數: ${(bestScore * 100).toFixed(
      1,
    )}%)`,
  );
  return null;
}

/**
 * 鏡像反射一個點
 */
export function mirrorPoint(point, axisX) {
  return { x: 2 * axisX - point.x, y: point.y };
}

/**
 * 判斷梁是否在對稱軸上或跨越對稱軸
 */
export function isBeamOnSymmetryAxis(beam, joints, axisX, tolerance) {
  const p1 = joints[beam.joint1];
  const p2 = joints[beam.joint2];
  if (!p1 || !p2) return false;

  const midX = (p1.x + p2.x) / 2;

  if (Math.abs(midX - axisX) < tolerance) {
    return true;
  }

  const p1DistFromAxis = p1.x - axisX;
  const p2DistFromAxis = p2.x - axisX;

  if (
    Math.abs(p1DistFromAxis) > tolerance &&
    Math.abs(p2DistFromAxis) > tolerance &&
    p1DistFromAxis * p2DistFromAxis < 0
  ) {
    return true;
  }

  if (
    Math.abs(p1DistFromAxis) < tolerance ||
    Math.abs(p2DistFromAxis) < tolerance
  ) {
    return true;
  }

  return false;
}

// ============================================
// Modal 對話框函數
// ============================================

/**
 * 切換 Mirror 模式
 */
export function toggleMirrorModeFromModal() {
  const modalCheckbox = document.getElementById("mirrorModeToggleInModal");
  const mainCheckbox = document.getElementById("mirrorModeToggle");
  const statusInModal = document.getElementById("mirrorModeStatusInModal");
  const settingsSection = document.getElementById("mirrorSettingsSection");

  mainCheckbox.checked = modalCheckbox.checked;

  if (modalCheckbox.checked) {
    statusInModal.textContent = "開啟";
    statusInModal.style.color = "#f97316";
    settingsSection.style.display = "block";
  } else {
    statusInModal.textContent = "關閉";
    statusInModal.style.color = "var(--theme-text-secondary)";
    settingsSection.style.display = "none";
  }

  updateMirrorStatusText();
}

/**
 * 更新 Mirror 狀態文字
 */
export function updateMirrorStatusText() {
  const statusText = document.getElementById("mirrorStatusText");
  if (!statusText) return;

  if (document.getElementById("mirrorModeToggle")?.checked) {
    statusText.innerHTML = `已啟用：及格 ${Math.round(
      mirrorState.SYMMETRY_PASS_SCORE * 100,
    )}% | 誤差 ${mirrorState.MATCHING_TOLERANCE.toFixed(2)}m`;
  } else {
    statusText.textContent = "未啟用";
  }
}

/**
 * 開啟 Mirror 設定對話框
 */
export function openMirrorSettingsModal() {
  const mainCheckbox = document.getElementById("mirrorModeToggle");
  const modalCheckbox = document.getElementById("mirrorModeToggleInModal");
  const statusInModal = document.getElementById("mirrorModeStatusInModal");
  const settingsSection = document.getElementById("mirrorSettingsSection");

  if (modalCheckbox) modalCheckbox.checked = mainCheckbox?.checked || false;
  if (mainCheckbox?.checked) {
    if (statusInModal) {
      statusInModal.textContent = "開啟";
      statusInModal.style.color = "#f97316";
    }
    if (settingsSection) settingsSection.style.display = "block";
  } else {
    if (statusInModal) {
      statusInModal.textContent = "關閉";
      statusInModal.style.color = "var(--theme-text-secondary)";
    }
    if (settingsSection) settingsSection.style.display = "none";
  }

  document.getElementById("mirror-settings-dialog").style.display = "block";
  document.getElementById("mirror-settings-overlay").style.display = "block";
  document.body.style.overflow = "hidden";
}

/**
 * 關閉 Mirror 設定對話框
 */
export function closeMirrorSettingsModal() {
  document.getElementById("mirror-settings-dialog").style.display = "none";
  document.getElementById("mirror-settings-overlay").style.display = "none";
  updateMirrorStatusText();
  document.body.style.overflow = "";
}
