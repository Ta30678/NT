/**
 * UI 輸入輔助工具
 */

/**
 * 設定下拉選單的滾輪支援
 * 允許使用者在 storySelector 和 beamTypeSelector 上使用滾輪切換選項
 */
export function setupSelectWheelListeners() {
  const selectors = document.querySelectorAll(
    "#storySelector, #beamTypeSelector"
  );

  selectors.forEach((select) => {
    select.addEventListener("wheel", (event) => {
      if (select.options.length === 0 || select.disabled) {
        return;
      }
      event.preventDefault();
      const currentIndex = select.selectedIndex;
      let newIndex = currentIndex;
      if (event.deltaY < 0) {
        newIndex = Math.max(0, currentIndex - 1);
      } else {
        newIndex = Math.min(select.options.length - 1, currentIndex + 1);
      }
      if (newIndex !== currentIndex) {
        select.selectedIndex = newIndex;
        select.dispatchEvent(new Event("change"));
      }
    });
  });
}

/**
 * 設定鍵盤事件監聽
 */
export function setupKeyboardListeners() {
  const editNewLabel = document.getElementById("edit-new-label");
  if (editNewLabel) {
    editNewLabel.addEventListener("keydown", function (event) {
      // 檢查按下的鍵是否為 Enter (event.key 或 event.keyCode)
      if (event.key === "Enter" || event.keyCode === 13) {
        // 防止預設行為 (例如表單提交)
        event.preventDefault();
        // 呼叫儲存函式 (假設 saveBeamEdit 為全域函數)
        if (typeof window.saveBeamEdit === "function") {
          window.saveBeamEdit();
        }
      }
    });
  }
}

