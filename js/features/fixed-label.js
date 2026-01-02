/**
 * BEAM-NAMINGTOOL - 固定編號功能模組
 * 
 * 此模組處理固定編號（例如：樓梯梁 sb25×50 → g1）
 * 讓特定尺寸的梁使用固定的編號
 */

import { appState } from '../config/constants.js';

// ============================================
// 本地狀態（與 appState.fixedLabelRules 同步）
// ============================================

/**
 * 從 localStorage 載入固定編號規則
 */
export function loadFixedLabelRules() {
  try {
    const saved = localStorage.getItem("fixedLabelRules");
    if (saved) {
      appState.fixedLabelRules = JSON.parse(saved);
      updateFixedLabelList();
      console.log("✓ 已載入固定編號規則:", appState.fixedLabelRules);
    }
  } catch (e) {
    console.error("載入固定編號規則失敗:", e);
  }
}

/**
 * 儲存固定編號規則到 localStorage
 */
export function saveFixedLabelRules() {
  try {
    localStorage.setItem(
      "fixedLabelRules",
      JSON.stringify(appState.fixedLabelRules)
    );
    console.log("✓ 已儲存固定編號規則");
  } catch (e) {
    console.error("儲存固定編號規則失敗:", e);
  }
}

/**
 * 切換固定編號配置（更新摘要）
 */
export function toggleFixedLabelConfig() {
  updateFixedLabelSummary();
}

/**
 * 切換固定編號模式（開啟設定對話框）
 */
export function toggleFixedLabelMode() {
  openFixedLabelModal();
}

/**
 * 開啟固定編號設定對話框
 */
export function openFixedLabelModal() {
  document.getElementById("fixed-label-dialog").style.display = "block";
  document.getElementById("fixed-label-overlay").style.display = "block";
  updateFixedLabelModalList();
  // 防止背景滾動
  document.body.style.overflow = "hidden";
}

/**
 * 關閉固定編號設定對話框
 */
export function closeFixedLabelModal() {
  document.getElementById("fixed-label-dialog").style.display = "none";
  document.getElementById("fixed-label-overlay").style.display = "none";
  updateFixedLabelSummary();
  updateFixedLabelButtonState();
  // 恢復背景滾動
  document.body.style.overflow = "";
}

/**
 * 更新固定編號摘要顯示
 */
export function updateFixedLabelSummary() {
  const summaryDiv = document.getElementById("fixedLabelSummary");
  if (!summaryDiv) return;
  
  if (appState.fixedLabelRules.length === 0) {
    summaryDiv.innerHTML =
      '<span style="color: var(--theme-text-secondary);">尚未設定任何規則</span>';
  } else {
    const summary = appState.fixedLabelRules
      .map((r) => `${r.section} → ${r.label}`)
      .join(", ");
    summaryDiv.innerHTML = `<span style="color: var(--theme-accent);">已設定 ${appState.fixedLabelRules.length} 條規則：</span> ${summary}`;
  }
}

/**
 * 更新固定編號按鈕狀態
 */
export function updateFixedLabelButtonState() {
  const checkbox = document.getElementById("fixedLabelToggle");
  if (!checkbox) return;

  if (appState.fixedLabelRules.length > 0) {
    // 有規則時：啟用功能
    checkbox.checked = true;
  } else {
    // 沒有規則時：停用功能
    checkbox.checked = false;
  }
}

/**
 * 新增固定編號規則（Modal 版本）
 */
export function addFixedLabelRuleModal() {
  const sectionInput = document.getElementById("fixedSectionModal");
  const labelInput = document.getElementById("fixedLabelModal");

  const section = sectionInput.value.trim().toLowerCase(); // 統一轉小寫儲存
  const label = labelInput.value.trim().toLowerCase(); // 統一轉小寫儲存

  if (!section || !label) {
    alert("請填寫梁斷面和固定編號");
    return;
  }

  // 檢查編號格式（至少要有一個字母和數字）
  if (!/^[a-z]+\d+/.test(label)) {
    alert("固定編號格式錯誤，請填寫完整編號（例如：g1, b1, ga1）");
    return;
  }

  // 檢查是否已存在
  if (appState.fixedLabelRules.some((r) => r.section === section)) {
    alert(`斷面 "${section}" 已設定過固定編號`);
    return;
  }

  appState.fixedLabelRules.push({ section, label });

  // 儲存到 localStorage
  saveFixedLabelRules();

  // 清空輸入框
  sectionInput.value = "";
  labelInput.value = "";

  // 更新顯示列表
  updateFixedLabelModalList();
  updateFixedLabelSummary();
  updateFixedLabelButtonState();
}

/**
 * 更新固定編號規則列表（Modal 版本）
 */
export function updateFixedLabelModalList() {
  const listDiv = document.getElementById("fixed-label-modal-list");
  if (!listDiv) return;

  if (appState.fixedLabelRules.length === 0) {
    listDiv.innerHTML =
      '<p style="color: var(--theme-text-secondary); font-size: 0.9em; text-align: center;">尚未新增任何規則</p>';
    return;
  }

  listDiv.innerHTML = appState.fixedLabelRules
    .map(
      (rule, index) => `
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px; padding: 10px; background: var(--theme-bg); border-radius: 6px;">
        <span style="flex: 1; color: var(--theme-text);">${rule.section}</span>
        <span style="color: var(--theme-text-secondary);">→</span>
        <span style="width: 120px; color: var(--theme-accent); font-weight: 500;">${rule.label}</span>
        <button onclick="removeFixedLabelRuleModal(${index})" class="btn-export" style="padding: 6px 12px; font-size: 0.85em;">刪除</button>
      </div>
    `
    )
    .join("");
}

/**
 * 移除固定編號規則
 * @param {number} index - 規則索引
 */
export function removeFixedLabelRuleModal(index) {
  appState.fixedLabelRules.splice(index, 1);
  saveFixedLabelRules(); // 儲存變更
  updateFixedLabelModalList();
  updateFixedLabelSummary();
  updateFixedLabelButtonState();
}

/**
 * 更新固定編號列表（舊版兼容）
 */
export function updateFixedLabelList() {
  // 兼容舊版呼叫
  updateFixedLabelModalList();
  updateFixedLabelSummary();
  updateFixedLabelButtonState();
}
