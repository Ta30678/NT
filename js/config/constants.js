/**
 * BEAM-NAMINGTOOL - 常數和全域變數定義
 *
 * 此模組包含所有全域使用的常數和狀態變數
 * 拆分時保持原有邏輯不變
 */

// ============================================
// 常數定義
// ============================================

// AutoCAD 模式縮放的初始尺寸常數
export const INITIAL_BEAM_FONT_SIZE = 6; // 放大300% (6 * 3)
export const ZOOM_DAMPING_FACTOR = 0.6; // 縮放阻尼係數 (0-1)，越小字體變化越不敏感
export const INITIAL_GRID_FONT_SIZE = 7; // 再縮小30%（10 * 0.7）
export const INITIAL_GRID_BUBBLE_RADIUS = 18; // 加大 Bubble
export const INITIAL_BEAM_LABEL_STROKE = 1.5;
export const INITIAL_GRID_BUBBLE_STROKE = 1;

// 梁標籤與梁中點之間的基準距離 (單位：SVG座標)
export const BASE_OFFSET = 2; // 基礎固定偏移距離
export const OFFSET_RATIO = 0.25; // 字體大小的偏移比例

// 容許誤差
export const TOLERANCE = 0.1;

// 座標系統顏色
export const COORD_SYSTEM_COLORS = [
  "#1e90ff", // DodgerBlue
  "#ff6b6b", // Light Red
  "#4ecdc4", // Teal
  "#ffd93d", // Yellow
  "#6bcb77", // Green
  "#9d65c9", // Purple
  "#f6a400", // Orange
  "#00b4d8", // Cyan
];

// 用於判斷梁的方向（水平/垂直）
export const DIRECTION_TOLERANCE = 0.01;

// ============================================
// 全域狀態變數（用於模組間共享）
// ============================================

// 應用程式狀態
// [重構] 使用 getter/setter 橋接 window 變數
// 這樣模組可以直接存取 index.html 中定義的變數
export const appState = {
  // svg-pan-zoom 實例
  panZoomInstance: null,

  // 預覽模式
  previewFileContent: null,
  previewJoints: null,
  userGridConfig: null,

  // 梁編輯
  currentEditingBeam: null,

  // 固定編號規則 - 已移至 defineProperties 以橋接 window
  // fixedLabelRules: [],

  // 字體大小
  currentFontSize: 14,

  // 標準層群組快取
  standardFloorGroupsCache: null,
};

// 使用 getter/setter 橋接 window 上的引用類型變數
// 這樣可以確保模組和 index.html 共享同一份資料
Object.defineProperties(appState, {
  fullProcessedBeams: {
    get: () => window.fullProcessedBeams || [],
    set: (v) => {
      window.fullProcessedBeams = v;
    },
  },
  fullDrawableBeams: {
    get: () => window.fullDrawableBeams || [],
    set: (v) => {
      window.fullDrawableBeams = v;
    },
  },
  availableStories: {
    get: () => window.availableStories || [],
    set: (v) => {
      window.availableStories = v;
    },
  },
  gridData: {
    get: () => window.gridData || {},
    set: (v) => {
      window.gridData = v;
    },
  },
  storyOrderInfo: {
    get: () => window.storyOrderInfo || {},
    set: (v) => {
      window.storyOrderInfo = v;
    },
  },
  selectedBeams: {
    get: () => window.selectedBeams || new Set(),
    set: (v) => {
      window.selectedBeams = v;
    },
  },
  svgElement: {
    get: () => window.svgElement || null,
    set: (v) => {
      window.svgElement = v;
    },
  },
  isSelecting: {
    get: () => window.isSelecting || false,
    set: (v) => {
      window.isSelecting = v;
    },
  },
  selectionStart: {
    get: () => window.selectionStart || null,
    set: (v) => {
      window.selectionStart = v;
    },
  },
  selectionRect: {
    get: () => window.selectionRect || null,
    set: (v) => {
      window.selectionRect = v;
    },
  },
  fixedLabelRules: {
    get: () => window.fixedLabelRules || [],
    set: (v) => {
      window.fixedLabelRules = v;
    },
  },
});

// ============================================
// 對稱（Mirror）功能專用變數
// 注意：這些變數與 Mirror 功能緊密相關，必須保持完整
// ============================================

export const mirrorState = {};

Object.defineProperties(mirrorState, {
  SYMMETRY_PASS_SCORE: {
    get: () =>
      typeof window.SYMMETRY_PASS_SCORE !== "undefined"
        ? window.SYMMETRY_PASS_SCORE
        : 0.7,
    set: (v) => {
      window.SYMMETRY_PASS_SCORE = v;
    },
  },
  SYMMETRY_TOLERANCE: {
    get: () =>
      typeof window.SYMMETRY_TOLERANCE !== "undefined"
        ? window.SYMMETRY_TOLERANCE
        : 0.5,
    set: (v) => {
      window.SYMMETRY_TOLERANCE = v;
    },
  },
  MATCHING_TOLERANCE: {
    get: () =>
      typeof window.MATCHING_TOLERANCE !== "undefined"
        ? window.MATCHING_TOLERANCE
        : 0.8,
    set: (v) => {
      window.MATCHING_TOLERANCE = v;
    },
  },
  symmetryAxisDirection: {
    get: () =>
      typeof window.symmetryAxisDirection !== "undefined"
        ? window.symmetryAxisDirection
        : "vertical",
    set: (v) => {
      window.symmetryAxisDirection = v;
    },
  },
  userSymmetryAxisValue: {
    get: () => window.userSymmetryAxisValue || null,
    set: (v) => {
      window.userSymmetryAxisValue = v;
    },
  },
  detectedSymmetryAxis: {
    get: () => window.detectedSymmetryAxis || null,
    set: (v) => {
      window.detectedSymmetryAxis = v;
    },
  },
  showSymmetryAxisLine: {
    get: () =>
      typeof window.showSymmetryAxisLine !== "undefined"
        ? window.showSymmetryAxisLine
        : true,
    set: (v) => {
      window.showSymmetryAxisLine = v;
    },
  },
  axisInputMethod: {
    get: () => window.axisInputMethod || "grid",
    set: (v) => {
      window.axisInputMethod = v;
    },
  },
  isAxisClickModeActive: {
    get: () => window.isAxisClickModeActive || false,
    set: (v) => {
      window.isAxisClickModeActive = v;
    },
  },
  axisPoint1: {
    get: () => window.axisPoint1 || null,
    set: (v) => {
      window.axisPoint1 = v;
    },
  },
  axisPoint2: {
    get: () => window.axisPoint2 || null,
    set: (v) => {
      window.axisPoint2 = v;
    },
  },
  axisPinClickCount: {
    get: () => window.axisPinClickCount || 0,
    set: (v) => {
      window.axisPinClickCount = v;
    },
  },
});

// ============================================
// 小梁編號起始設定
// ============================================

export const secondaryBeamConfig = {};

Object.defineProperties(secondaryBeamConfig, {
  // 是否啟用客製化起始編號
  useCustomStart: {
    get: () =>
      typeof window.secondaryBeamUseCustomStart !== "undefined"
        ? window.secondaryBeamUseCustomStart
        : false,
    set: (v) => {
      window.secondaryBeamUseCustomStart = v;
    },
  },
  // 水平小梁起始編號（預設 1，即 b1）
  horizontalStart: {
    get: () =>
      typeof window.secondaryBeamHorizontalStart !== "undefined"
        ? window.secondaryBeamHorizontalStart
        : 1,
    set: (v) => {
      window.secondaryBeamHorizontalStart = v;
    },
  },
  // 垂直小梁起始編號（預設 null，表示使用無條件進位規則）
  verticalStart: {
    get: () =>
      typeof window.secondaryBeamVerticalStart !== "undefined"
        ? window.secondaryBeamVerticalStart
        : null,
    set: (v) => {
      window.secondaryBeamVerticalStart = v;
    },
  },
});

// ============================================
// 工具函數
// ============================================

/**
 * 動態計算標籤偏移距離
 * @param {number} fontSize - 字體大小
 * @returns {number} 計算後的偏移距離
 */
export function calculateOffset(fontSize) {
  // 偏移距離 = 固定基礎值 + 字體大小的比例
  // 例如：fontSize=14 時，offset = 2 + 14*0.25 = 5.5
  //      fontSize=8 時，offset = 2 + 8*0.25 = 4
  //      fontSize=20 時，offset = 2 + 20*0.25 = 7
  return BASE_OFFSET + fontSize * OFFSET_RATIO;
}
