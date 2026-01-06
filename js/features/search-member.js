/**
 * BEAM-NAMINGTOOL - 搜尋桿件功能模組
 *
 * 提供按 ETABS 編號搜尋並定位梁的功能
 */

import { appState } from "../config/constants.js";
import { clearAllSelections, updateBeamVisualState } from "./selection.js";

// ============================================
// 搜尋對話框函數
// ============================================

/**
 * 開啟搜尋對話框
 */
export function openSearchMemberDialog() {
  const dialog = document.getElementById("search-member-dialog");
  const overlay = document.getElementById("search-member-overlay");
  const input = document.getElementById("search-member-input");
  const resultsDiv = document.getElementById("search-results");

  dialog.style.display = "block";
  overlay.style.display = "block";
  document.body.style.overflow = "hidden";

  resultsDiv.innerHTML =
    '<div style="color: var(--theme-text-secondary); text-align: center;">輸入 ETABS 編號並點擊搜尋</div>';
  input.value = "";
  input.focus();
}

/**
 * 關閉搜尋對話框
 */
export function closeSearchMemberDialog() {
  document.getElementById("search-member-dialog").style.display = "none";
  document.getElementById("search-member-overlay").style.display = "none";
  document.body.style.overflow = "";
}

/**
 * 搜尋桿件
 */
export function searchMember() {
  const searchTerm = document
    .getElementById("search-member-input")
    .value.trim()
    .toUpperCase();
  const resultsDiv = document.getElementById("search-results");

  if (!searchTerm) {
    resultsDiv.innerHTML =
      '<div style="color: var(--theme-warning); text-align: center;">⚠️ 請輸入搜尋關鍵字</div>';
    return;
  }

  if (
    !appState.fullProcessedBeams ||
    appState.fullProcessedBeams.length === 0
  ) {
    resultsDiv.innerHTML =
      '<div style="color: var(--theme-warning); text-align: center;">⚠️ 請先上傳 E2K 檔案並執行編號</div>';
    return;
  }

  const matchedBeams = appState.fullProcessedBeams.filter(
    (beam) => beam.name && beam.name.toUpperCase().includes(searchTerm),
  );

  if (matchedBeams.length === 0) {
    resultsDiv.innerHTML = `<div style="color: var(--theme-warning); text-align: center;">❌ 找不到符合 "${searchTerm}" 的桿件</div>`;
    return;
  }

  let resultsHTML = `<div style="margin-bottom: 10px; color: var(--theme-accent); font-weight: bold;">✅ 找到 ${matchedBeams.length} 個符合的桿件：</div>`;

  matchedBeams.forEach((beam) => {
    const beamInfo = `
      <div style="
        padding: 12px;
        margin-bottom: 8px;
        background: var(--theme-surface);
        border: 1px solid var(--theme-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      "
      onmouseover="this.style.background='var(--theme-hover)'; this.style.borderColor='var(--theme-accent)';"
      onmouseout="this.style.background='var(--theme-surface)'; this.style.borderColor='var(--theme-border)';"
      onclick="locateAndHighlightBeam('${beam.name}')">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--theme-accent); font-size: 1.1em;">${beam.name}</strong>
            <span style="color: var(--theme-text-secondary); margin-left: 10px;">→ ${beam.newLabel || "未編號"}</span>
          </div>
          <button class="btn-process" style="padding: 5px 15px; font-size: 0.85em;" onclick="event.stopPropagation(); locateAndHighlightBeam('${beam.name}')">
            定位
          </button>
        </div>
        <div style="font-size: 0.85em; color: var(--theme-text-secondary); margin-top: 5px;">
          📍 樓層: ${beam.story || "N/A"} | 斷面: ${beam.prop || "N/A"}
        </div>
        ${
          beam.j1 && beam.j2
            ? `
        <div style="font-size: 0.8em; color: var(--theme-text-secondary); margin-top: 3px;">
          座標: (${beam.j1.x.toFixed(2)}, ${beam.j1.y.toFixed(2)}) → (${beam.j2.x.toFixed(2)}, ${beam.j2.y.toFixed(2)})
        </div>
        `
            : ""
        }
      </div>
    `;
    resultsHTML += beamInfo;
  });

  resultsDiv.innerHTML = resultsHTML;
}

/**
 * 定位並高亮顯示梁
 * @param {string} beamName - 梁的 ETABS 名稱
 */
export function locateAndHighlightBeam(beamName) {
  const svgElement = document.getElementById("drawing-svg");
  if (!svgElement) {
    alert("❌ 找不到平面圖");
    return;
  }

  const beam = appState.fullProcessedBeams.find((b) => b.name === beamName);
  if (!beam) {
    alert(`❌ 找不到桿件 ${beamName}`);
    return;
  }

  // 如果桿件有樓層資訊，自動切換到該樓層
  if (beam.story) {
    const storySelector = document.getElementById("storySelector");
    const currentStory = storySelector.value;

    if (currentStory !== beam.story) {
      storySelector.value = beam.story;
      // 觸發樓層變更事件（需要配合 handleStoryChange 函數）
      if (typeof window.handleStoryChange === "function") {
        window.handleStoryChange();
      }
    }
  }

  // 等待 DOM 更新後執行高亮
  setTimeout(() => {
    const beamElements = svgElement.querySelectorAll(
      `[data-beam-name="${beamName}"]`,
    );

    if (beamElements.length === 0) {
      alert(`❌ 找不到桿件 ${beamName} 的視覺元素`);
      return;
    }

    clearAllSelections();

    const beamKey = `${beam.story}|${beam.name}|${beam.joint1}|${beam.joint2}`;
    appState.selectedBeams.add(beamKey);
    updateBeamVisualState(beamKey, true);

    // 如果有 pan-zoom 實例，移動視圖到梁的位置
    if (beam && beam.j1 && beam.j2 && appState.panZoomInstance) {
      const centerX = (beam.j1.x + beam.j2.x) / 2;
      const centerY = (beam.j1.y + beam.j2.y) / 2;

      // 需要座標轉換函數（transformX, transformY）
      // 這些會在整合時由主模組提供
      console.log(`定位到梁 ${beamName}，中心座標: (${centerX}, ${centerY})`);
    }
  }, 100);
}
