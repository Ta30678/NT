/**
 * BEAM-NAMINGTOOL - 幾何計算工具
 * 包含：距離計算、角度計算、點到線距離等純數學函數
 *
 * 注意：這些函數是純函數，不依賴任何全域變數
 */

/**
 * 計算兩點之間的距離
 * @param {Object} p1 - 第一個點 {x, y}
 * @param {Object} p2 - 第二個點 {x, y}
 * @returns {number} 兩點之間的距離
 */
export function distance(p1, p2) {
  if (!p1 || !p2) return Infinity;
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * 判斷點是否在線段上
 * @param {Object} point - 要檢查的點 {x, y}
 * @param {Object} segP1 - 線段起點 {x, y}
 * @param {Object} segP2 - 線段終點 {x, y}
 * @param {number} tolerance - 容許誤差
 * @returns {boolean} 點是否在線段上
 */
export function isPointOnSegment(point, segP1, segP2, tolerance) {
  if (!point || !segP1 || !segP2) return false;
  const segLength = distance(segP1, segP2);
  if (segLength < tolerance) {
    return distance(point, segP1) < tolerance;
  }
  const distSum = distance(point, segP1) + distance(point, segP2);
  return Math.abs(distSum - segLength) < tolerance;
}

/**
 * 計算梁的角度（度數）
 * @param {Object} j1 - 梁的第一個節點 {x, y}
 * @param {Object} j2 - 梁的第二個節點 {x, y}
 * @returns {number} 角度（0-360度，從 X 軸正向逆時針計算）
 */
export function calculateBeamAngle(j1, j2) {
  const dx = j2.x - j1.x;
  const dy = j2.y - j1.y;
  // 返回角度（0-360度，從 X 軸正向逆時針計算）
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * 計算點到線段的距離
 * @param {number} px - 點的 X 座標
 * @param {number} py - 點的 Y 座標
 * @param {number} x1 - 線段起點 X
 * @param {number} y1 - 線段起點 Y
 * @param {number} x2 - 線段終點 X
 * @param {number} y2 - 線段終點 Y
 * @returns {number} 點到線段的最短距離
 */
export function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 判斷兩條線段是否相交
 * @param {number} x1 - 線段1起點X
 * @param {number} y1 - 線段1起點Y
 * @param {number} x2 - 線段1終點X
 * @param {number} y2 - 線段1終點Y
 * @param {number} x3 - 線段2起點X
 * @param {number} y3 - 線段2起點Y
 * @param {number} x4 - 線段2終點X
 * @param {number} y4 - 線段2終點Y
 * @returns {boolean} 是否相交
 */
export function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-10) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * 判斷線段是否與矩形相交
 * @param {number} x1 - 線段起點X
 * @param {number} y1 - 線段起點Y
 * @param {number} x2 - 線段終點X
 * @param {number} y2 - 線段終點Y
 * @param {number} rx - 矩形左上角X
 * @param {number} ry - 矩形左上角Y
 * @param {number} rw - 矩形寬度
 * @param {number} rh - 矩形高度
 * @returns {boolean} 是否相交
 */
export function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  // 檢查線段端點是否在矩形內
  const left = Math.min(rx, rx + rw);
  const right = Math.max(rx, rx + rw);
  const top = Math.min(ry, ry + rh);
  const bottom = Math.max(ry, ry + rh);

  // 端點在矩形內
  if (
    (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
    (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)
  ) {
    return true;
  }

  // 檢查線段是否與矩形四邊相交
  return (
    lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
    lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, right, bottom, left, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, left, bottom, left, top)
  );
}
