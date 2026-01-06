/**
 * History Manager for Undo/Redo functionality
 * 管理應用程式的狀態歷史紀錄
 */
export class HistoryManager {
  constructor(limit = 20) {
    this.undoStack = [];
    this.redoStack = [];
    this.limit = limit;
  }

  /**
   * 獲取當前應用程式的狀態快照
   * @param {Object} appState - 應用程式狀態物件 (來自 constants.js)
   * @param {Object} globalConfigs - 全域設定 (secondaryBeamConfig, userGridConfig)
   * @returns {string} JSON 序列化的狀態字串
   */
  createSnapshot(appState, globalConfigs) {
    return JSON.stringify({
      fullProcessedBeams: appState.fullProcessedBeams,
      secondaryBeamConfig: globalConfigs.secondaryBeamConfig,
      userGridConfig: globalConfigs.userGridConfig,
      fixedLabelRules: globalConfigs.fixedLabelRules,
      // 可以根據需要添加更多狀態
      timestamp: Date.now(),
    });
  }

  /**
   * 儲存當前狀態到歷史紀錄
   * @param {Object} appState - 當前應用程式狀態
   * @param {Object} globalConfigs - 當前全域設定
   */
  pushState(appState, globalConfigs) {
    const snapshot = this.createSnapshot(appState, globalConfigs);

    // 如果新狀態與上一個狀態相同，則忽略（避免重複）
    if (
      this.undoStack.length > 0 &&
      this.undoStack[this.undoStack.length - 1] === snapshot
    ) {
      return;
    }

    this.undoStack.push(snapshot);

    // 限制堆疊大小
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }

    // 每次推入新狀態時，清空重做堆疊
    this.redoStack = [];

    // console.log(`[History] State pushed. Undo stack: ${this.undoStack.length}`);
  }

  /**
   * 執行復原
   * @returns {Object|null} 復原後的狀態物件 (解析後的 JSON)，如果無法復原返回 null
   */
  undo(currentStateSnapshot) {
    if (this.undoStack.length === 0) return null;

    // 將當前狀態推入 redo 堆疊
    if (currentStateSnapshot) {
      this.redoStack.push(currentStateSnapshot);
    }

    const prevStateJSON = this.undoStack.pop();
    return JSON.parse(prevStateJSON);
  }

  /**
   * 執行重做
   * @returns {Object|null} 重做後的狀態物件，如果無法重做返回 null
   */
  redo(currentStateSnapshot) {
    if (this.redoStack.length === 0) return null;

    // 將當前狀態推入 undo 堆疊
    if (currentStateSnapshot) {
      this.undoStack.push(currentStateSnapshot);
    }

    const nextStateJSON = this.redoStack.pop();
    return JSON.parse(nextStateJSON);
  }

  /**
   * 檢查是否可以復原
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * 檢查是否可以重做
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * 清除所有歷史紀錄
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
