/**
 * BEAM-NAMINGTOOL - UI 狀態管理模組
 *
 * 此模組負責：
 * - 顯示/隱藏內嵌狀態訊息
 * - 字體大小控制
 */

// ============================================
// 狀態訊息顯示
// ============================================

/**
 * 顯示內嵌狀態訊息
 * @param {string} message - 要顯示的訊息
 * @param {string} type - 訊息類型 ('success' | 'error' | 'info')
 */
export function showInlineStatus(message, type = "success") {
  const statusInline = document.getElementById("status-inline");
  if (!statusInline) return;

  statusInline.innerHTML = `<p>${message}</p>`;
  statusInline.style.display = "block";
}

/**
 * 隱藏內嵌狀態訊息
 */
export function hideInlineStatus() {
  const statusInline = document.getElementById("status-inline");
  if (statusInline) {
    statusInline.style.display = "none";
    statusInline.innerHTML = "";
  }
}

// ============================================
// 字體大小控制
// ============================================

/**
 * 更新梁標籤字體大小
 * @param {Function} handleStoryChange - 用於重新繪製的函數（可選）
 */
export function updateFontSize(handleStoryChange = null) {
  const fontSizeInput = document.getElementById("fontSizeInput");
  if (!fontSizeInput) return;

  const newFontSize = parseInt(fontSizeInput.value) || 14;

  // 更新全域變數
  window.currentFontSize = newFontSize;

  console.log("字體大小已更新為:", newFontSize);

  // 重新繪製圖表以應用新的字體大小
  // 優先使用傳入的函數，否則使用全域的 handleStoryChange
  const redrawFn = handleStoryChange || window.handleStoryChange;
  if (typeof redrawFn === "function") {
    redrawFn();
  }
}

/**
 * 初始化字體大小滾輪支援
 */
export function initFontSizeWheelSupport() {
  const fontSizeInput = document.getElementById("fontSizeInput");
  if (!fontSizeInput) return;

  fontSizeInput.addEventListener("wheel", function (e) {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -1 : 1;
    let newValue = parseInt(this.value) + delta;

    // 限制範圍
    newValue = Math.max(1, Math.min(72, newValue));

    this.value = newValue;
    updateFontSize();
  });
}
