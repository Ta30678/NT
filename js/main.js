/**
 * BEAM-NAMINGTOOL - 主入口模組 (更新版)
 *
 * 此檔案負責：
 * 1. 匯入所有子模組
 * 2. 初始化應用程式
 * 3. 將需要從 HTML 呼叫的函數掛載到 window 物件
 *
 * 使用方式：在 index.html 中加入
 * <script type="module" src="js/main.js"></script>
 */

// ============================================
// 匯入模組
// ============================================

// 常數和狀態
import {
  INITIAL_BEAM_FONT_SIZE,
  ZOOM_DAMPING_FACTOR,
  INITIAL_GRID_FONT_SIZE,
  INITIAL_GRID_BUBBLE_RADIUS,
  INITIAL_BEAM_LABEL_STROKE,
  INITIAL_GRID_BUBBLE_STROKE,
  BASE_OFFSET,
  OFFSET_RATIO,
  TOLERANCE,
  COORD_SYSTEM_COLORS,
  DIRECTION_TOLERANCE,
  appState,
  mirrorState,
  secondaryBeamConfig,
  calculateOffset,
} from "./config/constants.js";

// 幾何計算工具
import {
  distance,
  isPointOnSegment,
  calculateBeamAngle,
  pointToLineDistance,
  lineIntersectsLine,
  lineIntersectsRect,
} from "./utils/geometry.js";

// 座標轉換工具
import {
  getViewportElement,
  getSVGCoords,
  getSVGPoint,
  globalToLocal,
  svgToEtabsCoord as svgToEtabsCoordUtil,
} from "./utils/coord-transform.js";

// E2K 解析器
import {
  parseGrids,
  parseJoints,
  parseFrames,
  findClosestGrid,
  parseGridName,
} from "./core/parser.js";

// 梁編號核心邏輯
import {
  findBestCoordSystemForBeam,
  getGridsForCoordSystem,
  getBeamLocalCenter,
  getBeamLocalBounds,
  getBeamOrientationInCoordSystem,
  generateLabelsForStory,
  findBuildingComponents,
  generateSecondaryBeamLabels,
  applySpecialPrefixRules,
  generateFloorFingerprint,
  createStandardFloorGroups,
  getStandardFloorGroupForStory,
  findBeamsAtSamePosition,
  invalidateStandardFloorGroupsCache,
  updateSequentialBeamLabels,
} from "./core/beam-labeler.js";

// UI 狀態管理
import {
  showInlineStatus,
  hideInlineStatus,
  updateFontSize,
  initFontSizeWheelSupport,
} from "./ui/status.js";

// AutoCAD 匯出
import {
  calculateGridRelation,
  exportToJSON,
  exportToJSONV2,
} from "./export/autocad-export.js";

// Excel 匯出
import { exportToExcel } from "./export/excel-export.js";

// Input Helpers
import {
  setupSelectWheelListeners,
  setupKeyboardListeners,
} from "./ui/input-helpers.js";

// Grid 配置功能
import {
  toggleGridConfigHelp,
  cancelGridConfig,
  COORDSYSTEM_COLORS,
  getCoordSystemColor,
  getCoordSystemOffset,
} from "./features/grid-config.js";

// Fixed Label 功能
import {
  loadFixedLabelRules,
  saveFixedLabelRules,
  toggleFixedLabelConfig,
  toggleFixedLabelMode,
  openFixedLabelModal,
  closeFixedLabelModal,
  updateFixedLabelSummary,
  updateFixedLabelButtonState,
  addFixedLabelRuleModal,
  updateFixedLabelModalList,
  removeFixedLabelRuleModal,
} from "./features/fixed-label.js";

// 選取功能
import {
  initializeSelectionFeature,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
  selectBeamsInRect,
  updateBeamVisualState,
  clearAllSelections,
  clearSelectedBeamLabels,
  onKeyDown,
} from "./features/selection.js";

// 搜尋功能
import {
  openSearchMemberDialog,
  closeSearchMemberDialog,
  searchMember,
  locateAndHighlightBeam,
} from "./features/search-member.js";

// 批量編輯
import {
  openBatchEditDialog,
  closeBatchEditDialog,
  saveBatchEdit,
  handleAutoIncrement,
  attachAutoIncrementListeners,
} from "./features/batch-edit.js";

// Mirror 模式
import {
  initSymmetrySettingsWheelSupport,
  updateSymmetrySettings,
  saveSymmetrySettings,
  loadSymmetrySettings,
  toggleSymmetryAxisLine,
  onAxisDirectionChange,
  toggleCustomAxis,
  onGridLineSelect,
  onAxisInputMethodChange,
  enableAxisClickMode,
  disableAxisClickMode,
  isClickInsideSvg,
  handleAxisMouseDown,
  handleAxisMouseUp,
  handleAxisClick,
  svgToEtabsCoord as svgToEtabsCoordMirror,
  setTransformParams,
  drawAxisPin,
  drawAxisLine,
  calculateAxisFromTwoPoints,
  clearAxisPins,
  updateClickAxisPositionDisplay,
  clearClickAxisPosition,
  startAxisClickMode,
  updateAxisDisplay,
  populateSymmetryAxisGridDropdown,
  drawSymmetryAxisLine,
  saveSymmetryAxisSettings,
  loadSymmetryAxisSettings,
  autoDetectSymmetryAxis,
  detectSymmetryAxisWithDirection,
  detectSymmetryAxis,
  mirrorPoint,
  isBeamOnSymmetryAxis,
  toggleMirrorModeFromModal,
  updateMirrorStatusText,
  openMirrorSettingsModal,
  closeMirrorSettingsModal,
} from "./features/mirror-mode.js";

// ============================================
// 掛載全域函數（給 HTML onclick 使用）
// ============================================

// 常數
window.INITIAL_BEAM_FONT_SIZE = INITIAL_BEAM_FONT_SIZE;
window.ZOOM_DAMPING_FACTOR = ZOOM_DAMPING_FACTOR;
window.INITIAL_GRID_FONT_SIZE = INITIAL_GRID_FONT_SIZE;
window.INITIAL_GRID_BUBBLE_RADIUS = INITIAL_GRID_BUBBLE_RADIUS;
window.INITIAL_BEAM_LABEL_STROKE = INITIAL_BEAM_LABEL_STROKE;
window.INITIAL_GRID_BUBBLE_STROKE = INITIAL_GRID_BUBBLE_STROKE;
window.TOLERANCE = TOLERANCE;
window.COORD_SYSTEM_COLORS = COORD_SYSTEM_COLORS;
window.DIRECTION_TOLERANCE = DIRECTION_TOLERANCE;

// 共享狀態
window.appState = appState;
window.mirrorState = mirrorState;
window.secondaryBeamConfig = secondaryBeamConfig;

// 工具函數
window.calculateOffset = calculateOffset;
window.distance = distance;
window.isPointOnSegment = isPointOnSegment;
window.calculateBeamAngle = calculateBeamAngle;
window.pointToLineDistance = pointToLineDistance;
window.lineIntersectsLine = lineIntersectsLine;
window.lineIntersectsRect = lineIntersectsRect;

// 座標轉換
window.getViewportElement = getViewportElement;
window.getSVGCoords = getSVGCoords;
window.getSVGPoint = getSVGPoint;
window.globalToLocal = globalToLocal;

// E2K 解析器
window.parseGrids = parseGrids;
window.parseJoints = parseJoints;
window.parseFrames = parseFrames;
window.findClosestGrid = findClosestGrid;
window.parseGridName = parseGridName;

// 梁編號核心邏輯
window.findBestCoordSystemForBeam = findBestCoordSystemForBeam;
window.getGridsForCoordSystem = getGridsForCoordSystem;
window.getBeamLocalCenter = getBeamLocalCenter;
window.getBeamLocalBounds = getBeamLocalBounds;
window.getBeamOrientationInCoordSystem = getBeamOrientationInCoordSystem;
window.generateLabelsForStory = generateLabelsForStory;
window.findBuildingComponents = findBuildingComponents;
window.generateSecondaryBeamLabels = generateSecondaryBeamLabels;
window.applySpecialPrefixRules = applySpecialPrefixRules;
window.generateFloorFingerprint = generateFloorFingerprint;
window.createStandardFloorGroups = createStandardFloorGroups;
window.getStandardFloorGroupForStory = getStandardFloorGroupForStory;
window.findBeamsAtSamePosition = findBeamsAtSamePosition;
window.invalidateStandardFloorGroupsCache = invalidateStandardFloorGroupsCache;
window.updateSequentialBeamLabels = updateSequentialBeamLabels;

// UI 狀態管理
window.showInlineStatus = showInlineStatus;
window.hideInlineStatus = hideInlineStatus;
window.updateFontSize = updateFontSize;
window.initFontSizeWheelSupport = initFontSizeWheelSupport;

// Grid 配置功能
window.toggleGridConfigHelp = toggleGridConfigHelp;
window.cancelGridConfig = cancelGridConfig;
window.getCoordSystemColor = getCoordSystemColor;
window.getCoordSystemOffset = getCoordSystemOffset;

// AutoCAD 匯出
window.calculateGridRelation = calculateGridRelation;
window.exportToJSON = exportToJSON;
window.exportToJSONV2 = exportToJSONV2;

// Excel 匯出
window.exportToExcel = exportToExcel;

// Fixed Label 功能
window.loadFixedLabelRules = loadFixedLabelRules;
window.saveFixedLabelRules = saveFixedLabelRules;
window.toggleFixedLabelConfig = toggleFixedLabelConfig;
window.toggleFixedLabelMode = toggleFixedLabelMode;
window.openFixedLabelModal = openFixedLabelModal;
window.closeFixedLabelModal = closeFixedLabelModal;
window.updateFixedLabelSummary = updateFixedLabelSummary;
window.updateFixedLabelButtonState = updateFixedLabelButtonState;
window.addFixedLabelRuleModal = addFixedLabelRuleModal;
window.updateFixedLabelModalList = updateFixedLabelModalList;
window.removeFixedLabelRuleModal = removeFixedLabelRuleModal;

// 選取功能 - 現在 appState 橋接到 window，可以安全掛載
window.initializeSelectionFeature = initializeSelectionFeature;
window.updateBeamVisualState = updateBeamVisualState;
window.clearAllSelections = clearAllSelections;
window.clearSelectedBeamLabels = clearSelectedBeamLabels;

// 搜尋功能
window.openSearchMemberDialog = openSearchMemberDialog;
window.closeSearchMemberDialog = closeSearchMemberDialog;
window.searchMember = searchMember;
window.locateAndHighlightBeam = locateAndHighlightBeam;

// 批量編輯 - 現在 appState 橋接到 window，可以安全掛載
window.openBatchEditDialog = openBatchEditDialog;
window.closeBatchEditDialog = closeBatchEditDialog;
window.saveBatchEdit = saveBatchEdit;
window.handleAutoIncrement = handleAutoIncrement;
window.attachAutoIncrementListeners = attachAutoIncrementListeners;

// Mirror 模式 - 完整掛載
window.initSymmetrySettingsWheelSupport = initSymmetrySettingsWheelSupport;
window.updateSymmetrySettings = updateSymmetrySettings;
window.saveSymmetrySettings = saveSymmetrySettings;
window.loadSymmetrySettings = loadSymmetrySettings;
window.toggleSymmetryAxisLine = toggleSymmetryAxisLine;
window.onAxisDirectionChange = onAxisDirectionChange;
window.toggleCustomAxis = toggleCustomAxis;
window.onGridLineSelect = onGridLineSelect;
window.onAxisInputMethodChange = onAxisInputMethodChange;
window.enableAxisClickMode = enableAxisClickMode;
window.disableAxisClickMode = disableAxisClickMode;
window.isClickInsideSvg = isClickInsideSvg;
window.handleAxisMouseDown = handleAxisMouseDown;
window.handleAxisMouseUp = handleAxisMouseUp;
window.handleAxisClick = handleAxisClick;
window.svgToEtabsCoord = svgToEtabsCoordMirror;
window.setTransformParams = setTransformParams;
window.drawAxisPin = drawAxisPin;
window.drawAxisLine = drawAxisLine;
window.calculateAxisFromTwoPoints = calculateAxisFromTwoPoints;
window.clearAxisPins = clearAxisPins;
window.updateClickAxisPositionDisplay = updateClickAxisPositionDisplay;
window.clearClickAxisPosition = clearClickAxisPosition;
window.startAxisClickMode = startAxisClickMode;
window.updateAxisDisplay = updateAxisDisplay;
window.populateSymmetryAxisGridDropdown = populateSymmetryAxisGridDropdown;
window.drawSymmetryAxisLine = drawSymmetryAxisLine;
window.saveSymmetryAxisSettings = saveSymmetryAxisSettings;
window.loadSymmetryAxisSettings = loadSymmetryAxisSettings;
window.autoDetectSymmetryAxis = autoDetectSymmetryAxis;
window.detectSymmetryAxisWithDirection = detectSymmetryAxisWithDirection;
window.detectSymmetryAxis = detectSymmetryAxis;
window.mirrorPoint = mirrorPoint;
window.isBeamOnSymmetryAxis = isBeamOnSymmetryAxis;
window.toggleMirrorModeFromModal = toggleMirrorModeFromModal;
window.updateMirrorStatusText = updateMirrorStatusText;
window.openMirrorSettingsModal = openMirrorSettingsModal;
window.closeMirrorSettingsModal = closeMirrorSettingsModal;

// ============================================
// 初始化
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("📦 BEAM-NAMINGTOOL 模組化版本載入完成");
  console.log("已載入模組：");
  console.log("  ✓ config/constants.js - 常數和全域狀態");
  console.log("  ✓ utils/geometry.js - 幾何計算工具");
  console.log("  ✓ utils/coord-transform.js - 座標轉換工具");
  console.log("  ✓ core/parser.js - E2K 解析器");
  console.log("  ✓ export/autocad-export.js - AutoCAD 匯出");
  console.log("  ✓ features/fixed-label.js - 固定編號功能");
  console.log("  ✓ features/selection.js - 圈選功能");
  console.log("  ✓ features/search-member.js - 搜尋功能");
  console.log("  ✓ features/batch-edit.js - 批量編輯");
  console.log("  ✓ features/mirror-mode.js - 鏡像對稱模式 ⚠️核心");

  // 注意：以下初始化函數已由 index.html 原始代碼呼叫
  // 避免重複呼叫造成衝突
  // loadSymmetrySettings();
  // loadSymmetryAxisSettings();
  // loadFixedLabelRules();
  // initSymmetrySettingsWheelSupport();

  // 更新狀態顯示（這些只是更新 UI，可以安全呼叫）
  // updateMirrorStatusText();
  // updateFixedLabelSummary();
  // updateFixedLabelButtonState();

  console.log("✅ 模組掛載完成（初始化由 index.html 處理）");

  // 初始化 UI 輔助功能
  setupSelectWheelListeners();
  setupKeyboardListeners();
});

// ============================================
// 匯出（供其他模組使用）
// ============================================

export {
  // 常數
  INITIAL_BEAM_FONT_SIZE,
  ZOOM_DAMPING_FACTOR,
  INITIAL_GRID_FONT_SIZE,
  INITIAL_GRID_BUBBLE_RADIUS,
  INITIAL_BEAM_LABEL_STROKE,
  INITIAL_GRID_BUBBLE_STROKE,
  BASE_OFFSET,
  OFFSET_RATIO,
  TOLERANCE,
  COORD_SYSTEM_COLORS,
  DIRECTION_TOLERANCE,

  // 狀態
  appState,
  mirrorState,
  secondaryBeamConfig,

  // 工具函數
  calculateOffset,
  distance,
  isPointOnSegment,
  calculateBeamAngle,
  pointToLineDistance,
  lineIntersectsLine,
  lineIntersectsRect,
  getViewportElement,
  getSVGCoords,
  getSVGPoint,
  globalToLocal,

  // 解析器
  parseGrids,
  parseJoints,
  parseFrames,
  findClosestGrid,
  parseGridName,

  // 匯出
  calculateGridRelation,
  exportToJSON,
  exportToJSONV2,

  // Mirror
  detectSymmetryAxis,
  mirrorPoint,
  isBeamOnSymmetryAxis,
};
