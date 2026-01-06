/**
 * BEAM-NAMINGTOOL - 梁編號核心邏輯模組
 *
 * 此檔案負責：
 * 1. 大梁編號生成 (generateLabelsForStory)
 * 2. 小梁編號生成 (generateSecondaryBeamLabels)
 * 3. 建築群組識別 (findBuildingComponents)
 * 4. 特殊前綴處理 (applySpecialPrefixRules)
 * 5. 標準層群組管理
 */

import {
  distance,
  isPointOnSegment,
  calculateBeamAngle,
} from "../utils/geometry.js";
import { globalToLocal } from "../utils/coord-transform.js";
import { findClosestGrid, parseGridName } from "./parser.js";
import { mirrorPoint, isBeamOnSymmetryAxis } from "../features/mirror-mode.js";
import {
  TOLERANCE,
  DIRECTION_TOLERANCE,
  mirrorState,
  secondaryBeamConfig,
} from "../config/constants.js";

// ============================================
// 座標系統輔助函數
// ============================================

/**
 * 基於梁端點座標判斷所屬的 Grid Line 系統
 * 容差值 0.01m，檢查端點是否落在某座標系統的格線上
 */
export function findBestCoordSystemForBeam(beam, grids) {
  if (!grids.coordSystems || Object.keys(grids.coordSystems).length === 0) {
    return "GLOBAL";
  }

  const POSITION_TOLERANCE = 0.01; // 位置容差（米）
  const beamEndpoints = [beam.j1, beam.j2];
  const coordSystemScores = {};

  // 初始化所有座標系統的分數
  Object.keys(grids.coordSystems).forEach((csName) => {
    coordSystemScores[csName] = 0;
  });

  // 對每個端點，檢查它在各座標系統中的對齊情況
  beamEndpoints.forEach((endpoint) => {
    if (!endpoint) return;

    for (const [csName, csInfo] of Object.entries(grids.coordSystems)) {
      // 轉換端點到該座標系統的局部座標
      const localCoord = globalToLocal(endpoint.x, endpoint.y, csInfo);

      // 檢查該端點是否對齊該座標系統的 X 軸格線（垂直線）
      const alignedWithGridX = grids.x
        .filter((g) => (g.coordsystem || "GLOBAL") === csName)
        .some(
          (g) => Math.abs(localCoord.localX - g.ordinate) < POSITION_TOLERANCE,
        );

      // 檢查該端點是否對齊該座標系統的 Y 軸格線（水平線）
      const alignedWithGridY = grids.y
        .filter((g) => (g.coordsystem || "GLOBAL") === csName)
        .some(
          (g) => Math.abs(localCoord.localY - g.ordinate) < POSITION_TOLERANCE,
        );

      // 如果端點在此座標系統的格線上，增加該系統的分數
      if (alignedWithGridX) coordSystemScores[csName]++;
      if (alignedWithGridY) coordSystemScores[csName]++;
    }
  });

  // 返回分數最高的座標系統（優先選擇非 GLOBAL）
  let bestCoordSystem = "GLOBAL";
  let maxScore = 0;

  for (const [csName, score] of Object.entries(coordSystemScores)) {
    // 分數更高，或分數相同但非 GLOBAL（優先非 GLOBAL）
    if (
      score > maxScore ||
      (score === maxScore && score > 0 && csName !== "GLOBAL")
    ) {
      maxScore = score;
      bestCoordSystem = csName;
    }
  }

  // 如果沒有找到匹配的座標系統，回退到 GLOBAL
  if (maxScore === 0) {
    bestCoordSystem = "GLOBAL";
  }

  return bestCoordSystem;
}

/**
 * 獲取指定 COORDSYSTEM 的 Grid Lines
 */
export function getGridsForCoordSystem(grids, coordsystem) {
  return {
    x: grids.x.filter((g) => (g.coordsystem || "GLOBAL") === coordsystem),
    y: grids.y.filter((g) => (g.coordsystem || "GLOBAL") === coordsystem),
  };
}

/**
 * 取得梁中心點在特定座標系統中的局部座標
 */
export function getBeamLocalCenter(beam, coordSystemName, grids) {
  const csInfo = grids.coordSystems
    ? grids.coordSystems[coordSystemName]
    : null;
  if (!csInfo || coordSystemName === "GLOBAL") {
    // GLOBAL 系統不需轉換
    return { localX: beam.centerX, localY: beam.centerY };
  }
  return globalToLocal(beam.centerX, beam.centerY, csInfo);
}

/**
 * 取得梁端點在特定座標系統中的局部座標
 */
export function getBeamLocalBounds(beam, coordSystemName, grids) {
  const csInfo = grids.coordSystems
    ? grids.coordSystems[coordSystemName]
    : null;
  if (!csInfo || coordSystemName === "GLOBAL") {
    // GLOBAL 系統不需轉換
    return {
      minX: beam.minX,
      maxX: beam.maxX,
      minY: beam.minY,
      maxY: beam.maxY,
    };
  }
  const local1 = globalToLocal(beam.j1.x, beam.j1.y, csInfo);
  const local2 = globalToLocal(beam.j2.x, beam.j2.y, csInfo);
  return {
    minX: Math.min(local1.localX, local2.localX),
    maxX: Math.max(local1.localX, local2.localX),
    minY: Math.min(local1.localY, local2.localY),
    maxY: Math.max(local1.localY, local2.localY),
  };
}

/**
 * 檢查梁是否對齊某個座標系統的軸向（水平或垂直）
 */
export function getBeamOrientationInCoordSystem(beam, coordSystemName, grids) {
  const ANGLE_TOLERANCE = 2; // 角度容差（度）
  const beamAngle = calculateBeamAngle(beam.j1, beam.j2);

  // 獲取座標系統的旋轉角度
  let csAngle = 0;
  if (coordSystemName !== "GLOBAL" && grids.coordSystems[coordSystemName]) {
    csAngle = grids.coordSystems[coordSystemName].angle || 0;
  }

  // 計算梁與座標系統 X 軸（水平）和 Y 軸（垂直）的角度差
  const angleFromXAxis = Math.min(
    Math.abs(beamAngle - csAngle),
    Math.abs(beamAngle - (csAngle + 360)),
    360 - Math.abs(beamAngle - csAngle),
    Math.abs(beamAngle - (csAngle + 180)), // 考慮反向
  );

  const angleFromYAxis = Math.min(
    Math.abs(beamAngle - (csAngle + 90)),
    Math.abs(beamAngle - (csAngle + 270)),
    360 - Math.abs(beamAngle - (csAngle + 90)),
  );

  // 判斷是水平、垂直還是斜向
  if (angleFromXAxis <= ANGLE_TOLERANCE) {
    return {
      isHorizontal: true,
      isVertical: false,
      isDiagonal: false,
      coordSystem: coordSystemName,
    };
  } else if (angleFromYAxis <= ANGLE_TOLERANCE) {
    return {
      isHorizontal: false,
      isVertical: true,
      isDiagonal: false,
      coordSystem: coordSystemName,
    };
  } else {
    return {
      isHorizontal: false,
      isVertical: false,
      isDiagonal: true,
      coordSystem: coordSystemName,
    };
  }
}

// ============================================
// 大梁編號生成
// ============================================

/**
 * 為單個樓層的大梁生成編號
 */
export function generateLabelsForStory(
  beamsInStory,
  joints,
  grids,
  reservedSerials = new Set(),
) {
  const labelComponentMap = new Map();

  // 獲取用戶格線配置（從 window 獲取）
  const userGridConfig = window.userGridConfig;

  /**
   * 計算梁的序號
   */
  function getBeamSerial(
    segment,
    gridsSubset,
    isHorizontal,
    coordSystemName = "GLOBAL",
    fullGrids = null,
  ) {
    const ON_GRID_TOLERANCE = 0.1;

    // 將梁的座標轉換到局部座標系統
    let localBounds;
    if (
      coordSystemName &&
      coordSystemName !== "GLOBAL" &&
      fullGrids &&
      segment.j1 &&
      segment.j2
    ) {
      localBounds = getBeamLocalBounds(segment, coordSystemName, fullGrids);
    } else {
      localBounds = {
        minX: segment.minX,
        maxX: segment.maxX,
        minY: segment.minY,
        maxY: segment.maxY,
      };
    }

    // 優先使用使用者配置，只對 Primary 格線轉換為數字
    const getSerialValue = (gridNameToFind, gridArray) => {
      // 找到對應的格線物件
      const gridObj = gridArray.find((g) => g.name === gridNameToFind);
      if (!gridObj) return NaN;

      // 優先使用使用者自訂配置
      if (userGridConfig) {
        const axisKey = gridArray === gridsSubset.x ? "x" : "y";
        const userConfig = userGridConfig[axisKey]?.find(
          (c) => c.name === gridNameToFind,
        );
        if (userConfig && userConfig.serialValue !== undefined) {
          // 如果 serialValue 是 null，表示要跳過這個格線
          if (userConfig.serialValue === null) {
            return NaN;
          }
          return userConfig.serialValue;
        }
      }

      // 如果是 Secondary 格線，直接返回格線名稱
      if (gridObj.lineType && gridObj.lineType.toUpperCase() === "SECONDARY") {
        return gridNameToFind;
      }

      // Primary 格線：使用原有邏輯
      const parsedNum = parseInt(gridNameToFind, 10);
      if (!isNaN(parsedNum) && String(parsedNum) === gridNameToFind) {
        return parsedNum;
      } else {
        const index = gridArray.findIndex((g) => g.name === gridNameToFind);
        return index !== -1 ? index + 1 : NaN;
      }
    };

    if (isHorizontal) {
      const endGrid = findClosestGrid(localBounds.maxX, gridsSubset.x);
      if (!endGrid) return NaN;

      if (Math.abs(localBounds.maxX - endGrid.ordinate) < ON_GRID_TOLERANCE) {
        const serial = getSerialValue(endGrid.name, gridsSubset.x);
        return typeof serial === "number" ? serial - 1 : serial;
      }
      const startGrid = findClosestGrid(localBounds.minX, gridsSubset.x);
      if (!startGrid) return NaN;
      return getSerialValue(startGrid.name, gridsSubset.x);
    } else {
      const endGrid = findClosestGrid(localBounds.maxY, gridsSubset.y);
      if (!endGrid) return NaN;

      if (Math.abs(localBounds.maxY - endGrid.ordinate) < ON_GRID_TOLERANCE) {
        const serial = getSerialValue(endGrid.name, gridsSubset.y);
        return typeof serial === "number" ? serial - 1 : serial;
      }
      const startGrid = findClosestGrid(localBounds.minY, gridsSubset.y);
      if (!startGrid) return NaN;
      return getSerialValue(startGrid.name, gridsSubset.y);
    }
  }

  const beamsWithCoords = beamsInStory
    .map((b) => {
      const j1 = joints[b.joint1],
        j2 = joints[b.joint2];
      if (!j1 || !j2) return null;

      // 首先基於端點座標判斷梁所屬的座標系統
      const beamData = {
        j1,
        j2,
        name: b.name,
        joint1: b.joint1,
        joint2: b.joint2,
      };

      const bestCoordSystem = findBestCoordSystemForBeam(beamData, grids);
      const orientation = getBeamOrientationInCoordSystem(
        beamData,
        bestCoordSystem,
        grids,
      );

      return {
        ...b,
        j1,
        j2,
        minX: Math.min(j1.x, j2.x),
        maxX: Math.max(j1.x, j2.x),
        minY: Math.min(j1.y, j2.y),
        maxY: Math.max(j1.y, j2.y),
        centerX: (j1.x + j2.x) / 2,
        centerY: (j1.y + j2.y) / 2,
        isHorizontal: orientation.isHorizontal,
        isVertical: orientation.isVertical,
        isDiagonal: orientation.isDiagonal,
        coordSystem: bestCoordSystem,
      };
    })
    .filter(Boolean);

  const processedBeams = new Set();

  beamsWithCoords.forEach((beam) => {
    const beamKey = `${beam.name}|${beam.joint1}|${beam.joint2}`;
    if (processedBeams.has(beamKey)) return;

    processedBeams.add(beamKey);

    let serial;
    let primaryGridName;
    let subGridMarker = "";

    if (beam.isVertical) {
      // 使用座標系統特定的格線
      const coordSystemGrids = getGridsForCoordSystem(grids, beam.coordSystem);
      const relevantGrids =
        coordSystemGrids.x.length > 0 ? coordSystemGrids.x : grids.x;

      // 將梁座標轉換到該座標系統的局部座標進行比對
      const localCenter = getBeamLocalCenter(beam, beam.coordSystem, grids);

      let onGridLine = relevantGrids.find(
        (g) => Math.abs(localCenter.localX - g.ordinate) < TOLERANCE,
      );

      if (onGridLine) {
        primaryGridName = parseGridName(onGridLine.name).original;
        subGridMarker = "";
      } else {
        const closestGrid = findClosestGrid(localCenter.localX, relevantGrids);
        if (closestGrid) {
          primaryGridName = parseGridName(closestGrid.name).original;

          // 在同一座標系統內尋找同類型的梁來決定 subGridMarker
          const sameSystemBeams = beamsWithCoords.filter(
            (b) => b.isVertical && b.coordSystem === beam.coordSystem,
          );

          const sortedGrids = relevantGrids
            .slice()
            .sort((a, b) => a.ordinate - b.ordinate);
          const closestIndex = sortedGrids.findIndex(
            (g) => g.name === closestGrid.name,
          );

          let gridBelow = null;
          let gridAbove = null;

          if (closestIndex > 0) {
            gridBelow = sortedGrids[closestIndex - 1];
          }
          if (closestIndex >= 0 && closestIndex + 1 < sortedGrids.length) {
            gridAbove = sortedGrids[closestIndex + 1];
          }

          if (!gridBelow && !gridAbove) {
            gridBelow = closestGrid;
          } else if (!gridBelow) {
            gridBelow = closestGrid;
          } else if (!gridAbove) {
            gridAbove = closestGrid;
          }

          if (gridBelow && gridAbove && gridBelow.name !== gridAbove.name) {
            const uniqueXCoords = [
              ...new Set(
                sameSystemBeams
                  .filter((b) => {
                    const bLocal = getBeamLocalCenter(b, b.coordSystem, grids);
                    return (
                      bLocal.localX > gridBelow.ordinate &&
                      bLocal.localX < gridAbove.ordinate
                    );
                  })
                  .map((b) => {
                    const bLocal = getBeamLocalCenter(b, b.coordSystem, grids);
                    return bLocal.localX.toFixed(2);
                  }),
              ),
            ].sort((a, b) => parseFloat(a) - parseFloat(b));

            const rank = uniqueXCoords.indexOf(localCenter.localX.toFixed(2));
            if (rank !== -1) {
              subGridMarker = String.fromCharCode(97 + rank);
            }
          }
        } else {
          return;
        }
      }
      serial = getBeamSerial(
        beam,
        coordSystemGrids,
        false,
        beam.coordSystem,
        grids,
      );
    } else if (beam.isHorizontal) {
      // 水平梁處理邏輯（與垂直梁類似）
      const coordSystemGrids = getGridsForCoordSystem(grids, beam.coordSystem);
      const relevantGrids =
        coordSystemGrids.y.length > 0 ? coordSystemGrids.y : grids.y;
      const localCenter = getBeamLocalCenter(beam, beam.coordSystem, grids);

      let onGridLine = relevantGrids.find(
        (g) => Math.abs(localCenter.localY - g.ordinate) < TOLERANCE,
      );

      if (onGridLine) {
        primaryGridName = parseGridName(onGridLine.name).original;
        subGridMarker = "";
      } else {
        const closestGrid = findClosestGrid(localCenter.localY, relevantGrids);
        if (closestGrid) {
          primaryGridName = parseGridName(closestGrid.name).original;

          const sameSystemBeams = beamsWithCoords.filter(
            (b) => b.isHorizontal && b.coordSystem === beam.coordSystem,
          );

          const sortedGrids = relevantGrids
            .slice()
            .sort((a, b) => a.ordinate - b.ordinate);
          const closestIndex = sortedGrids.findIndex(
            (g) => g.name === closestGrid.name,
          );

          let gridBelow = null;
          let gridAbove = null;

          if (closestIndex > 0) {
            gridBelow = sortedGrids[closestIndex - 1];
          }
          if (closestIndex >= 0 && closestIndex + 1 < sortedGrids.length) {
            gridAbove = sortedGrids[closestIndex + 1];
          }

          if (!gridBelow && !gridAbove) {
            gridBelow = closestGrid;
          } else if (!gridBelow) {
            gridBelow = closestGrid;
          } else if (!gridAbove) {
            gridAbove = closestGrid;
          }

          if (gridBelow && gridAbove && gridBelow.name !== gridAbove.name) {
            const uniqueYCoords = [
              ...new Set(
                sameSystemBeams
                  .filter((b) => {
                    const bLocal = getBeamLocalCenter(b, b.coordSystem, grids);
                    return (
                      bLocal.localY > gridBelow.ordinate &&
                      bLocal.localY < gridAbove.ordinate
                    );
                  })
                  .map((b) => {
                    const bLocal = getBeamLocalCenter(b, b.coordSystem, grids);
                    return bLocal.localY.toFixed(2);
                  }),
              ),
            ].sort((a, b) => parseFloat(a) - parseFloat(b));

            const rank = uniqueYCoords.indexOf(localCenter.localY.toFixed(2));
            if (rank !== -1) {
              subGridMarker = String.fromCharCode(97 + rank);
            }
          }
        } else {
          return;
        }
      }
      serial = getBeamSerial(
        beam,
        coordSystemGrids,
        true,
        beam.coordSystem,
        grids,
      );
    } else if (beam.isDiagonal) {
      // 斜向大梁的編號邏輯
      const bestCoordSystem = beam.coordSystem || "GLOBAL";

      if (bestCoordSystem !== "GLOBAL") {
        const coordSystemGrids = getGridsForCoordSystem(grids, bestCoordSystem);

        if (coordSystemGrids.x.length > 0 || coordSystemGrids.y.length > 0) {
          const csAngle = grids.coordSystems[bestCoordSystem].angle || 0;
          const beamAngle = calculateBeamAngle(beam.j1, beam.j2);

          const normalizeAngle = (angle) => {
            let normalized = angle % 360;
            if (normalized < 0) normalized += 360;
            return normalized;
          };

          const getAngleDiff = (angle1, angle2) => {
            const diff = Math.abs(
              normalizeAngle(angle1) - normalizeAngle(angle2),
            );
            return Math.min(diff, 360 - diff);
          };

          const angleDiffX = Math.min(
            getAngleDiff(beamAngle, csAngle),
            getAngleDiff(beamAngle, csAngle + 180),
          );
          const angleDiffY = Math.min(
            getAngleDiff(beamAngle, csAngle + 90),
            getAngleDiff(beamAngle, csAngle + 270),
          );

          const isAlongX = angleDiffX < angleDiffY;
          const localCenter = getBeamLocalCenter(beam, bestCoordSystem, grids);
          let onGridLine = null;
          let gridBelow = null;
          let gridAbove = null;

          if (isAlongX) {
            onGridLine = coordSystemGrids.y.find(
              (g) => Math.abs(localCenter.localY - g.ordinate) < TOLERANCE,
            );
            if (!onGridLine) {
              gridBelow = coordSystemGrids.y
                .slice()
                .reverse()
                .find((g) => g.ordinate < localCenter.localY);
              gridAbove = coordSystemGrids.y.find(
                (g) => g.ordinate > localCenter.localY,
              );
            }
          } else {
            onGridLine = coordSystemGrids.x.find(
              (g) => Math.abs(localCenter.localX - g.ordinate) < TOLERANCE,
            );
            if (!onGridLine) {
              gridBelow = coordSystemGrids.x
                .slice()
                .reverse()
                .find((g) => g.ordinate < localCenter.localX);
              gridAbove = coordSystemGrids.x.find(
                (g) => g.ordinate > localCenter.localX,
              );
            }
          }

          if (onGridLine) {
            primaryGridName = parseGridName(onGridLine.name).original;
            subGridMarker = "";
          } else if (gridBelow || gridAbove) {
            const referenceGrid = gridBelow || gridAbove;
            primaryGridName = parseGridName(referenceGrid.name).original;

            if (gridBelow && gridAbove) {
              const relevantBeams = beamsWithCoords.filter((b) => {
                if (!b.isDiagonal) return false;
                const bCs = b.coordSystem || "GLOBAL";
                if (bCs !== bestCoordSystem) return false;
                const bLocal = getBeamLocalCenter(b, bCs, grids);
                if (isAlongX) {
                  return (
                    bLocal.localY > gridBelow.ordinate &&
                    bLocal.localY < gridAbove.ordinate
                  );
                } else {
                  return (
                    bLocal.localX > gridBelow.ordinate &&
                    bLocal.localX < gridAbove.ordinate
                  );
                }
              });

              const uniqueCoords = [
                ...new Set(
                  relevantBeams.map((b) => {
                    const bLocal = getBeamLocalCenter(
                      b,
                      b.coordSystem || "GLOBAL",
                      grids,
                    );
                    return isAlongX
                      ? bLocal.localY.toFixed(2)
                      : bLocal.localX.toFixed(2);
                  }),
                ),
              ].sort((a, b) => parseFloat(a) - parseFloat(b));

              const targetCoord = isAlongX
                ? localCenter.localY.toFixed(2)
                : localCenter.localX.toFixed(2);
              const rank = uniqueCoords.indexOf(targetCoord);

              if (rank !== -1) {
                subGridMarker = String.fromCharCode(97 + rank);
              }
            }
          }

          if (primaryGridName) {
            serial = getBeamSerial(
              beam,
              coordSystemGrids,
              isAlongX,
              bestCoordSystem,
              grids,
            );

            console.log(
              `[斜向梁編號] ${beam.name} 使用 ${bestCoordSystem} 系統 (rz=${csAngle}°)，方向=${
                isAlongX ? "X軸" : "Y軸"
              }，格線=${primaryGridName}${subGridMarker}，序號=${serial}`,
            );

            labelComponentMap.set(beamKey, {
              isDiagonal: true,
              isAlongX,
              primaryGridName,
              subGridMarker,
              serial,
              coordSystem: bestCoordSystem,
            });

            return;
          }
        }
      }

      // 如果沒有找到合適的 COORDSYSTEM 或編號失敗，跳過
      return;
    }

    // 支援字串型序號 (Secondary 格線)
    if (
      serial !== undefined &&
      serial !== -1 &&
      (typeof serial === "string" || !isNaN(serial))
    ) {
      labelComponentMap.set(beamKey, {
        isVertical: beam.isVertical,
        primaryGridName,
        subGridMarker,
        serial: serial,
      });
    }
  });

  return labelComponentMap;
}

// ============================================
// 小梁編號生成
// ============================================

/**
 * 計算一組梁的精確邊界和形心
 */
function getComponentBounds(component, joints) {
  if (!component || component.length === 0) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const uniquePoints = new Set();
  component.forEach((beam) => {
    const p1 = joints[beam.joint1];
    const p2 = joints[beam.joint2];
    if (p1) uniquePoints.add(p1);
    if (p2) uniquePoints.add(p2);
  });
  if (uniquePoints.size === 0) return null;
  uniquePoints.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  return { minX, maxX, minY, maxY };
}

/**
 * 識別建築群組（連通的梁區塊）
 */
export function findBuildingComponents(
  allBeamsOnStory,
  joints,
  useMirrorMode = false,
  globalSymmetryAxisX = null,
) {
  if (!allBeamsOnStory || allBeamsOnStory.length === 0) return [];

  const GEOMETRIC_TOLERANCE = 0.01;
  const components = [];
  const processedBeams = new Set();

  const beamsWithCoords = allBeamsOnStory
    .map((b) => ({
      ...b,
      p1: joints[b.joint1],
      p2: joints[b.joint2],
    }))
    .filter((b) => b.p1 && b.p2);

  function areBeamsConnected(beamA, beamB) {
    if (distance(beamA.p1, beamB.p1) < GEOMETRIC_TOLERANCE) return true;
    if (distance(beamA.p1, beamB.p2) < GEOMETRIC_TOLERANCE) return true;
    if (distance(beamA.p2, beamB.p1) < GEOMETRIC_TOLERANCE) return true;
    if (distance(beamA.p2, beamB.p2) < GEOMETRIC_TOLERANCE) return true;
    if (isPointOnSegment(beamA.p1, beamB.p1, beamB.p2, GEOMETRIC_TOLERANCE))
      return true;
    if (isPointOnSegment(beamA.p2, beamB.p1, beamB.p2, GEOMETRIC_TOLERANCE))
      return true;
    if (isPointOnSegment(beamB.p1, beamA.p1, beamA.p2, GEOMETRIC_TOLERANCE))
      return true;
    if (isPointOnSegment(beamB.p2, beamA.p1, beamA.p2, GEOMETRIC_TOLERANCE))
      return true;
    return false;
  }

  for (const startBeam of beamsWithCoords) {
    if (processedBeams.has(startBeam.name)) {
      continue;
    }

    const currentComponent = [];
    const q = [startBeam];
    processedBeams.add(startBeam.name);

    while (q.length > 0) {
      const currentBeam = q.shift();
      currentComponent.push(currentBeam);

      for (const otherBeam of beamsWithCoords) {
        if (processedBeams.has(otherBeam.name)) {
          continue;
        }
        if (areBeamsConnected(currentBeam, otherBeam)) {
          processedBeams.add(otherBeam.name);
          q.push(otherBeam);
        }
      }
    }

    if (currentComponent.length > 0) {
      components.push(currentComponent);
    }
  }

  // 鏡像模式下，按對稱軸重新分組
  if (useMirrorMode && beamsWithCoords.length > 0) {
    const SYMMETRY_TOLERANCE = mirrorState.symmetryTolerance || 0.5;
    console.log(
      `\n[分群模式] 鏡像模式啟用，按對稱軸重新分組 (原始 components: ${components.length})`,
    );

    const allBeamsFlattened = components.flat();

    let symmetryAxisX = globalSymmetryAxisX;
    if (symmetryAxisX === null) {
      const allXCoords = [];
      allBeamsFlattened.forEach((b) => {
        allXCoords.push(b.p1.x, b.p2.x);
      });
      const minX = Math.min(...allXCoords);
      const maxX = Math.max(...allXCoords);
      symmetryAxisX = (minX + maxX) / 2;
      console.log(
        `[分群模式] 使用當前樓層計算對稱軸 X ≈ ${symmetryAxisX.toFixed(3)}`,
      );
    } else {
      console.log(
        `[分群模式] 使用全域對稱軸 X = ${symmetryAxisX.toFixed(3)} ✓`,
      );
    }

    const leftBeams = [];
    const centerBeams = [];
    const rightBeams = [];

    allBeamsFlattened.forEach((beam) => {
      const midX = (beam.p1.x + beam.p2.x) / 2;
      const distFromAxis = Math.abs(midX - symmetryAxisX);

      if (distFromAxis < SYMMETRY_TOLERANCE) {
        centerBeams.push(beam);
      } else if (midX < symmetryAxisX) {
        leftBeams.push(beam);
      } else {
        rightBeams.push(beam);
      }
    });

    console.log(
      `[分群結果] 左側: ${leftBeams.length}, 中央: ${centerBeams.length}, 右側: ${rightBeams.length}`,
    );

    const newComponents = [];
    if (leftBeams.length > 0 || centerBeams.length > 0) {
      newComponents.push([...leftBeams, ...centerBeams]);
    }
    if (rightBeams.length > 0) {
      newComponents.push(rightBeams);
    }

    console.log(
      `[分群模式] 重新分組完成，產生 ${newComponents.length} 個 component`,
    );
    return newComponents;
  }

  console.log(`[分群結果] 找到 ${components.length} 個建築 component`);
  return components;
}

/**
 * 小梁編號核心函式
 */
export function generateSecondaryBeamLabels(
  secondaryBeamsToNumber,
  mainBeamsInStory,
  joints,
  prefix,
  globalSymmetryAxisX = null,
  reservedSerials = new Set(),
  grids = { x: [], y: [], coordSystems: {} },
) {
  const allLabels = new Map();
  const mirrorModeToggle = document.getElementById("mirrorModeToggle");
  const useMirrorMode = mirrorModeToggle ? mirrorModeToggle.checked : false;

  const SYMMETRY_TOLERANCE = mirrorState.symmetryTolerance || 0.5;
  const MATCHING_TOLERANCE = mirrorState.matchingTolerance || 0.8;

  const coreNumberingEngine = (
    beamsToNumber,
    startCounter = 1,
    verticalStartOverride = null,
  ) => {
    const labels = new Map();
    let counter = startCounter;
    const beamsWithData = beamsToNumber
      .map((b) => {
        const j1_coords = joints[b.joint1],
          j2_coords = joints[b.joint2];
        if (!j1_coords || !j2_coords) return null;

        const beamData = {
          j1: j1_coords,
          j2: j2_coords,
          name: b.name,
          joint1: b.joint1,
          joint2: b.joint2,
        };
        const bestCoordSystem = findBestCoordSystemForBeam(beamData, grids);
        const orientation = getBeamOrientationInCoordSystem(
          beamData,
          bestCoordSystem,
          grids,
        );

        let startJointName = b.joint1,
          endJointName = b.joint2;
        if (orientation.isHorizontal && j1_coords.x > j2_coords.x) {
          [startJointName, endJointName] = [b.joint2, b.joint1];
        }
        if (orientation.isVertical && j1_coords.y > j2_coords.y) {
          [startJointName, endJointName] = [b.joint2, b.joint1];
        }
        return {
          ...b,
          startJointName,
          endJointName,
          isHorizontal: orientation.isHorizontal,
          isVertical: orientation.isVertical,
          isDiagonal: orientation.isDiagonal,
          coordSystem: bestCoordSystem,
        };
      })
      .filter(Boolean);

    const processed = new Set();
    const beamGroups = [
      beamsWithData
        .filter((b) => b.isHorizontal)
        .sort(
          (a, b) =>
            joints[a.startJointName].y - joints[b.startJointName].y ||
            joints[a.startJointName].x - joints[b.startJointName].x,
        ),
      beamsWithData
        .filter((b) => b.isVertical)
        .sort(
          (a, b) =>
            joints[a.startJointName].x - joints[b.startJointName].x ||
            joints[a.startJointName].y - joints[b.startJointName].y,
        ),
    ];

    // 斜向小梁標記為未編號
    const diagonalBeams = beamsWithData.filter((b) => b.isDiagonal);
    diagonalBeams.forEach((beam) => {
      const beamKey = `${beam.name}|${beam.joint1}|${beam.joint2}`;
      console.log(`[跳過小梁] ${beam.name} 無法對齊任何座標系統的軸向`);
      labels.set(beamKey, {
        newLabel: `${prefix.toUpperCase()}未編號`,
        isDiagonal: true,
      });
    });

    let isVerticalRun = false;
    beamGroups.forEach((group) => {
      if (isVerticalRun && counter > 1) {
        // 如果有指定垂直小梁起始編號，優先使用
        if (verticalStartOverride !== null) {
          counter = verticalStartOverride;
          // 重置為 null，避免後續 component 再次使用
          verticalStartOverride = null;
        } else {
          // 使用預設的無條件進位規則
          const lastNum = counter - 1;
          counter =
            lastNum % 10 === 0 ? lastNum + 1 : Math.ceil(lastNum / 10) * 10 + 1;
        }
      }
      for (const startBeam of group) {
        const startKey = `${startBeam.name}|${startBeam.joint1}|${startBeam.joint2}`;
        if (processed.has(startKey)) continue;
        let chain = [startBeam];
        processed.add(startKey);
        let currentLink = startBeam;
        while (true) {
          const nextLink = group.find((b) => {
            const nextKey = `${b.name}|${b.joint1}|${b.joint2}`;
            return (
              !processed.has(nextKey) &&
              b.startJointName === currentLink.endJointName
            );
          });
          if (nextLink) {
            chain.push(nextLink);
            processed.add(
              `${nextLink.name}|${nextLink.joint1}|${nextLink.joint2}`,
            );
            currentLink = nextLink;
          } else {
            break;
          }
        }

        // 跳過預留的序號
        while (reservedSerials.has(`${prefix.toLowerCase()}:${counter}`)) {
          counter++;
        }

        if (chain.length > 1) {
          chain.forEach((beam, index) => {
            labels.set(`${beam.name}|${beam.joint1}|${beam.joint2}`, {
              newLabel: `${prefix}${counter}-${index + 1}`,
            });
          });
        } else {
          labels.set(`${chain[0].name}|${chain[0].joint1}|${chain[0].joint2}`, {
            newLabel: `${prefix}${counter}`,
          });
        }
        counter++;
      }
      isVerticalRun = true;
    });
    return { labels, nextCounter: counter };
  };

  const allBeamsOnStory = [...secondaryBeamsToNumber, ...mainBeamsInStory];
  const componentsRaw = findBuildingComponents(
    allBeamsOnStory,
    joints,
    useMirrorMode,
    globalSymmetryAxisX,
  )
    .map((comp) =>
      comp.filter((b) =>
        secondaryBeamsToNumber.some((sb) => sb.name === b.name),
      ),
    )
    .filter((comp) => comp.length > 0);

  if (componentsRaw.length === 0) return allLabels;

  const components = componentsRaw
    .map((comp) => ({
      component: comp,
      bounds: getComponentBounds(comp, joints),
    }))
    .sort((a, b) => a.bounds.minX - b.bounds.minX);

  if (!useMirrorMode || components.length < 2) {
    // 決定水平和垂直小梁的起始編號
    const horizontalStart = secondaryBeamConfig.useCustomStart
      ? secondaryBeamConfig.horizontalStart
      : 1;
    const verticalStart = secondaryBeamConfig.useCustomStart
      ? secondaryBeamConfig.verticalStart
      : null;

    console.log(
      `[小梁編號設定] 客製化: ${secondaryBeamConfig.useCustomStart}, 水平起始: ${horizontalStart}, 垂直起始: ${verticalStart || "無條件進位"}`,
    );

    let globalCounter = horizontalStart;
    for (const comp of components) {
      const { labels, nextCounter } = coreNumberingEngine(
        comp.component,
        globalCounter,
        verticalStart,
      );
      labels.forEach((value, key) => allLabels.set(key, value));
      globalCounter = nextCounter;
    }
  } else {
    // 鏡像對稱模式
    const master = components[0];
    const slave = components[1];

    let axisX = globalSymmetryAxisX;
    if (axisX === null) {
      axisX = (master.bounds.maxX + slave.bounds.minX) / 2;
    }

    const currentFloor = secondaryBeamsToNumber[0]?.story || "未知樓層";
    console.log(`=============================================`);
    console.log(
      `[鏡像模式 - ${currentFloor}] 使用對稱軸 X = ${axisX.toFixed(3)}`,
    );
    console.log(`=============================================`);

    // 識別對稱軸上的梁
    const beamsOnAxis = [];
    const masterBeamsNotOnAxis = [];
    const slaveBeamsToMirror = [];

    master.component.forEach((beam) => {
      if (isBeamOnSymmetryAxis(beam, joints, axisX, SYMMETRY_TOLERANCE)) {
        beamsOnAxis.push(beam);
      } else {
        masterBeamsNotOnAxis.push(beam);
      }
    });

    slave.component.forEach((beam) => {
      if (isBeamOnSymmetryAxis(beam, joints, axisX, SYMMETRY_TOLERANCE)) {
        beamsOnAxis.push(beam);
      } else {
        slaveBeamsToMirror.push(beam);
      }
    });

    const masterWithAxisBeams = [...masterBeamsNotOnAxis, ...beamsOnAxis];

    // 鏡像模式也要支援客製化起始編號
    const horizontalStartMirror = secondaryBeamConfig.useCustomStart
      ? secondaryBeamConfig.horizontalStart
      : 1;
    const verticalStartMirror = secondaryBeamConfig.useCustomStart
      ? secondaryBeamConfig.verticalStart
      : null;

    const { labels: masterLabels, nextCounter } = coreNumberingEngine(
      masterWithAxisBeams,
      horizontalStartMirror,
      verticalStartMirror,
    );
    masterLabels.forEach((value, key) => allLabels.set(key, value));

    // 鏡像配對
    const matchedSlaves = new Set();
    const masterBeamsToMirror = master.component.filter(
      (beam) => !isBeamOnSymmetryAxis(beam, joints, axisX, SYMMETRY_TOLERANCE),
    );

    masterBeamsToMirror.forEach((masterBeam) => {
      const masterKey = `${masterBeam.name}|${masterBeam.joint1}|${masterBeam.joint2}`;
      const labelInfo = masterLabels.get(masterKey);
      if (!labelInfo) return;

      const master_p1 = joints[masterBeam.joint1];
      const master_p2 = joints[masterBeam.joint2];
      const masterMidpoint = {
        x: (master_p1.x + master_p2.x) / 2,
        y: (master_p1.y + master_p2.y) / 2,
      };
      const masterLength = distance(master_p1, master_p2);
      const masterIsHorizontal =
        Math.abs(master_p1.y - master_p2.y) < DIRECTION_TOLERANCE;
      const masterIsVertical =
        Math.abs(master_p1.x - master_p2.x) < DIRECTION_TOLERANCE;
      const mirroredMidpoint = mirrorPoint(masterMidpoint, axisX);

      let bestMatch = null;
      let bestScore = Infinity;

      slaveBeamsToMirror.forEach((slaveBeam) => {
        const slaveKey = `${slaveBeam.name}|${slaveBeam.joint1}|${slaveBeam.joint2}`;
        if (matchedSlaves.has(slaveKey)) return;

        const slave_p1 = joints[slaveBeam.joint1];
        const slave_p2 = joints[slaveBeam.joint2];
        if (!slave_p1 || !slave_p2) return;

        const slaveIsHorizontal =
          Math.abs(slave_p1.y - slave_p2.y) < DIRECTION_TOLERANCE;
        const slaveIsVertical =
          Math.abs(slave_p1.x - slave_p2.x) < DIRECTION_TOLERANCE;

        if (
          masterIsHorizontal !== slaveIsHorizontal ||
          masterIsVertical !== slaveIsVertical
        ) {
          return;
        }

        const slaveMidpoint = {
          x: (slave_p1.x + slave_p2.x) / 2,
          y: (slave_p1.y + slave_p2.y) / 2,
        };
        const slaveLength = distance(slave_p1, slave_p2);

        const midDist = distance(slaveMidpoint, mirroredMidpoint);
        const lenDiff = Math.abs(slaveLength - masterLength);
        const yDiff = Math.abs(slaveMidpoint.y - masterMidpoint.y);
        const score = midDist + lenDiff * 0.5;

        const lenTolerance = Math.max(masterLength * 0.15, 0.5);
        if (
          yDiff < MATCHING_TOLERANCE &&
          midDist < MATCHING_TOLERANCE * 2 &&
          lenDiff < lenTolerance &&
          score < bestScore
        ) {
          bestMatch = slaveBeam;
          bestScore = score;
        }
      });

      if (bestMatch) {
        const slaveKey = `${bestMatch.name}|${bestMatch.joint1}|${bestMatch.joint2}`;
        console.log(
          `[配對成功] ${labelInfo.newLabel}: ${masterBeam.name} ↔ ${bestMatch.name}`,
        );
        allLabels.set(slaveKey, { newLabel: labelInfo.newLabel });
        matchedSlaves.add(slaveKey);
      }
    });

    // 處理未配對的 slave 梁
    const unmatchedSlaveBeams = slaveBeamsToMirror.filter((beam) => {
      const key = `${beam.name}|${beam.joint1}|${beam.joint2}`;
      return !allLabels.has(key);
    });

    let orphanCounter = nextCounter;

    if (unmatchedSlaveBeams.length > 0) {
      console.log(`\n[未配對 Slave 梁] 共 ${unmatchedSlaveBeams.length} 根`);
      const { labels: unmatchedLabels, nextCounter: updatedCounter } =
        coreNumberingEngine(unmatchedSlaveBeams, orphanCounter);
      unmatchedLabels.forEach((value, key) => allLabels.set(key, value));
      orphanCounter = updatedCounter;
    }

    // 處理額外的 component
    if (components.length > 2) {
      for (let i = 2; i < components.length; i++) {
        const { labels, nextCounter: updatedCounter } = coreNumberingEngine(
          components[i].component,
          orphanCounter,
        );
        labels.forEach((value, key) => allLabels.set(key, value));
        orphanCounter = updatedCounter;
      }
    }

    console.log(
      `\n[鏡像模式完成 - ${currentFloor}] 總共編號 ${allLabels.size} 根小梁`,
    );
    console.log(`=============================================\n`);
  }

  return allLabels;
}

// ============================================
// 特殊前綴處理
// ============================================

/**
 * 處理 WB/FWB 等特殊梁的編號前綴
 */
export function applySpecialPrefixRules(allBeams) {
  const processPrefix = (prefix) => {
    const targetBeams = allBeams.filter(
      (b) => b.prop && b.prop.toUpperCase().startsWith(prefix),
    );
    if (targetBeams.length === 0) return null;
    const uniqueProps = [...new Set(targetBeams.map((b) => b.prop))];
    const propRanks = uniqueProps
      .map((prop) => {
        const match = prop.match(/(\d+)[xX](\d+)/);
        if (match) {
          return {
            propName: prop,
            area: parseInt(match[1], 10) * parseInt(match[2], 10),
          };
        }
        return { propName: prop, area: Infinity };
      })
      .sort((a, b) => a.area - b.area);
    const propToLabelMap = new Map();
    propRanks.forEach((propInfo, index) => {
      propToLabelMap.set(propInfo.propName, `${prefix}${index + 1}`);
    });
    return propToLabelMap;
  };

  const wbLabelMap = processPrefix("WB");
  const fwbLabelMap = processPrefix("FWB");

  return allBeams.map((beam) => {
    if (wbLabelMap && wbLabelMap.has(beam.prop)) {
      return { ...beam, newLabel: wbLabelMap.get(beam.prop) };
    }
    if (fwbLabelMap && fwbLabelMap.has(beam.prop)) {
      return { ...beam, newLabel: fwbLabelMap.get(beam.prop) };
    }
    return beam;
  });
}

// ============================================
// 標準層群組管理
// ============================================

let standardFloorGroupsCache = null;

/**
 * 生成樓層指紋（用於識別相同結構的樓層）
 */
export function generateFloorFingerprint(story, allBeams, precision = 2) {
  const beamsOnStory = allBeams.filter((b) => b.story === story);
  if (beamsOnStory.length === 0) {
    return "";
  }

  const beamSignatures = beamsOnStory
    .map((beam) => {
      if (!beam.j1 || !beam.j2) return "";
      const x1 = beam.j1.x.toFixed(precision);
      const y1 = beam.j1.y.toFixed(precision);
      const x2 = beam.j2.x.toFixed(precision);
      const y2 = beam.j2.y.toFixed(precision);
      const point1Str = `${x1},${y1}`;
      const point2Str = `${x2},${y2}`;
      return point1Str < point2Str
        ? `${point1Str}|${point2Str}`
        : `${point2Str}|${point1Str}`;
    })
    .filter(Boolean);

  return beamSignatures.sort().join(";");
}

/**
 * 建立標準層群組
 */
export function createStandardFloorGroups() {
  const availableStories = window.availableStories || [];
  const storyOrderInfo = window.storyOrderInfo || {};
  const fullDrawableBeams = window.fullDrawableBeams || [];

  if (availableStories.length === 0) return [];

  const sortedStories = [...availableStories].sort(
    (a, b) => storyOrderInfo[a] - storyOrderInfo[b],
  );

  const fingerprints = sortedStories.map((story) => ({
    story,
    fingerprint: generateFloorFingerprint(story, fullDrawableBeams, 2),
  }));

  if (fingerprints.length === 0) return [];

  const groups = [];
  let currentGroup = [fingerprints[0].story];

  for (let i = 1; i < fingerprints.length; i++) {
    if (
      fingerprints[i].fingerprint === fingerprints[i - 1].fingerprint &&
      fingerprints[i].fingerprint !== ""
    ) {
      currentGroup.push(fingerprints[i].story);
    } else {
      groups.push(currentGroup);
      currentGroup = [fingerprints[i].story];
    }
  }
  groups.push(currentGroup);

  return groups;
}

/**
 * 取得某樓層所屬的標準層群組
 */
export function getStandardFloorGroupForStory(story) {
  if (!standardFloorGroupsCache) {
    standardFloorGroupsCache = createStandardFloorGroups();
  }
  return (
    standardFloorGroupsCache.find((group) => group.includes(story)) || null
  );
}

/**
 * 找出所有標準層中相同位置的梁
 */
export function findBeamsAtSamePosition(beam, floors) {
  const results = [];
  const fullDrawableBeams = window.fullDrawableBeams || [];
  const fullProcessedBeams = window.fullProcessedBeams || [];

  const currentDrawableBeam = fullDrawableBeams.find(
    (b) => b.story === beam.story && b.name === beam.name,
  );

  if (
    !currentDrawableBeam ||
    !currentDrawableBeam.j1 ||
    !currentDrawableBeam.j2
  ) {
    console.log("[連動標準層] 找不到當前梁的座標資訊", beam.story, beam.name);
    return results;
  }

  const j1 = currentDrawableBeam.j1;
  const j2 = currentDrawableBeam.j2;

  floors.forEach((floorName) => {
    if (floorName === beam.story) return;

    const matchingDrawableBeam = fullDrawableBeams.find(
      (b) =>
        b.story === floorName &&
        b.j1 &&
        b.j2 &&
        b.j1.x === j1.x &&
        b.j1.y === j1.y &&
        b.j2.x === j2.x &&
        b.j2.y === j2.y,
    );

    if (matchingDrawableBeam) {
      const matchingProcessedBeam = fullProcessedBeams.find(
        (b) => b.story === floorName && b.name === matchingDrawableBeam.name,
      );

      if (matchingProcessedBeam) {
        results.push(matchingProcessedBeam);
      }
    }
  });

  return results;
}

/**
 * 清除標準層群組快取
 */
export function invalidateStandardFloorGroupsCache() {
  standardFloorGroupsCache = null;
}

/**
 * 更新連續小梁編號
 */
export function updateSequentialBeamLabels(oldLabel, newLabel, story) {
  console.log(`\n[連續小梁更新] 開始執行`);
  console.log(`  舊編號: ${oldLabel}`);
  console.log(`  新編號: ${newLabel}`);
  console.log(`  樓層: ${story}`);

  const oldMatch = oldLabel.match(/^(.+?)(\d+)-(\d+)$/);
  const newMatch = newLabel.match(/^(.+?)(\d+)-(\d+)$/);

  if (!oldMatch || !newMatch) {
    console.log(`  ❌ 編號格式不符合連續格式，跳過更新`);
    return;
  }

  const [, oldPrefix, oldNumber, oldSerial] = oldMatch;
  const [, newPrefix, newNumber, newSerial] = newMatch;

  const oldBaseLabel = `${oldPrefix}${oldNumber}`;
  const newBaseLabel = `${newPrefix}${newNumber}`;

  if (oldBaseLabel === newBaseLabel) {
    console.log(`  ❌ 基礎標籤相同，無需更新`);
    return;
  }

  const currentSerial = parseInt(oldSerial);
  const newStartSerial = parseInt(newSerial);
  let updatedCount = 0;
  const fullProcessedBeams = window.fullProcessedBeams || [];

  fullProcessedBeams.forEach((beam) => {
    if (beam.story !== story) return;

    const beamMatch = beam.newLabel.match(/^(.+?)(\d+)-(\d+)$/);
    if (!beamMatch) return;

    const [, beamPrefix, beamNumber, beamSerial] = beamMatch;
    const beamBaseLabel = `${beamPrefix}${beamNumber}`;
    const beamSerialNum = parseInt(beamSerial);

    if (beamBaseLabel === oldBaseLabel && beamSerialNum > currentSerial) {
      const newSerialNum = beamSerialNum - currentSerial + newStartSerial;
      beam.newLabel = `${newBaseLabel}-${newSerialNum}`;
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    console.log(`\n  ✅ [連續小梁更新] 共更新了 ${updatedCount} 根小梁\n`);
  } else {
    console.log(`\n  ⚠️ [連續小梁更新] 沒有找到需要更新的小梁\n`);
  }
}
