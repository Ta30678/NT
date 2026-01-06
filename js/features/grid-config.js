/**
 * BEAM-NAMINGTOOL - Grid 配置功能模組
 *
 * 此模組負責：
 * - 顯示格線編號說明
 * - 格線配置介面（需配合 index.html 中的全域變數使用）
 */

// ============================================
// 格線編號說明
// ============================================

/**
 * 顯示/隱藏格線編號說明提示框
 */
export function toggleGridConfigHelp() {
  // 檢查是否已有提示框
  const existingHelp = document.getElementById("grid-config-help-popup");
  const existingOverlay = document.getElementById("grid-config-help-overlay");

  if (existingHelp) {
    existingHelp.remove();
    if (existingOverlay) existingOverlay.remove();
    return;
  }

  // 創建提示框
  const helpPopup = document.createElement("div");
  helpPopup.id = "grid-config-help-popup";
  helpPopup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10003;
    background: var(--theme-surface);
    border: 1px solid var(--theme-border);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 450px;
  `;
  helpPopup.innerHTML = `
    <h3 style="margin-top: 0; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 1.2em;">💡</span> 格線編號說明
    </h3>
    <div style="color: var(--theme-text-secondary); font-size: 0.95em; line-height: 1.6;">
      <p style="margin-bottom: 10px;">
        • 輸入<b>數字</b>後，系統會自動幫後面的格線<b>順號</b><br>
        <span style="color: var(--theme-text-secondary); font-size: 0.9em; margin-left: 12px;">
          例如：設定 A=1，系統自動設定 B=2, C=3...
        </span>
      </p>
      <p style="margin-bottom: 10px;">
        • 輸入 <code style="background: var(--theme-bg); padding: 2px 6px; border-radius: 3px;">-</code> /
        <code style="background: var(--theme-bg); padding: 2px 6px; border-radius: 3px;">skip</code> / 留空<br>
        <span style="color: var(--theme-text-secondary); font-size: 0.9em; margin-left: 12px;">
          來跳過不編號的格線
        </span>
      </p>
      <p style="margin-bottom: 0;">
        • 您隨時可以手動修改任何格線的編號
      </p>
    </div>
    <div style="text-align: right; margin-top: 15px;">
      <button onclick="document.getElementById('grid-config-help-popup').remove(); document.getElementById('grid-config-help-overlay').remove();"
              class="btn-export" style="padding: 8px 20px;">
        知道了
      </button>
    </div>
  `;

  // 創建遮罩
  const overlay = document.createElement("div");
  overlay.id = "grid-config-help-overlay";
  overlay.className = "dialog-overlay";
  overlay.style.display = "block";
  overlay.onclick = function () {
    helpPopup.remove();
    overlay.remove();
  };

  document.body.appendChild(overlay);
  document.body.appendChild(helpPopup);
}

// ============================================
// 格線配置介面輔助函數
// ============================================

/**
 * 取消格線配置（隱藏配置面板）
 */
export function cancelGridConfig() {
  const panel = document.getElementById("grid-config-panel");
  if (panel) {
    panel.style.display = "none";
  }
}

/**
 * Grid Line 系統顏色配置
 */
export const COORDSYSTEM_COLORS = {
  GLOBAL: "#4A90E2", // 藍色 - GLOBAL 系統
  O2: "#E24A4A", // 紅色
  A2: "#50C878", // 綠色
  A3: "#F39C12", // 橙色
  DEFAULT: "#9B59B6", // 紫色 - 其他系統
};

/**
 * 獲取座標系統的顏色
 * @param {string} coordsystem - 座標系統名稱
 * @returns {string} 顏色代碼
 */
export function getCoordSystemColor(coordsystem) {
  return COORDSYSTEM_COLORS[coordsystem] || COORDSYSTEM_COLORS.DEFAULT;
}

/**
 * 計算座標系統的偏移距離
 * @param {string} coordsystem - 座標系統名稱
 * @param {number} basePadding - 基礎內距
 * @returns {number} 偏移距離
 */
export function getCoordSystemOffset(coordsystem, basePadding = 30) {
  const systemOrder = ["GLOBAL", "O2", "A2", "A3"];
  const index = systemOrder.indexOf(coordsystem);

  if (index === -1) {
    // 未知系統，使用最大偏移
    return basePadding + systemOrder.length * 30;
  }

  return basePadding + index * 30;
}
