/**
 * BEAM-NAMINGTOOL - 座標轉換工具
 * 包含：SVG 座標轉換、全域/區域座標轉換
 * 
 * 注意：這些函數依賴 svgElement 全域變數，在使用時需確保已初始化
 */

/**
 * 獲取 svg-pan-zoom 的 viewport 元素（包含所有內容的 <g> 元素）
 * @param {SVGElement} svgElement - SVG 根元素
 * @returns {Element} viewport 元素
 */
export function getViewportElement(svgElement) {
  // svg-pan-zoom 會將所有內容包裝在一個 <g> 元素中
  // 通常是第一個 <g> 元素
  const viewport = svgElement.querySelector("g");
  return viewport || svgElement; // 如果找不到，fallback 到 SVG 根元素
}

/**
 * 获取 SVG 內部座標（相對於 viewport，與梁在同一座標系統）
 * @param {Event} evt - 滑鼠事件
 * @param {SVGElement} svgElement - SVG 根元素
 * @returns {Object} SVG 座標 {x, y}
 */
export function getSVGCoords(evt, svgElement) {
  const svg = svgElement;
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;

  // 獲取 viewport 元素
  const viewport = getViewportElement(svgElement);

  // 如果有 viewport（svg-pan-zoom 創建的 <g>），使用其 CTM
  // 否則使用 SVG 的 CTM
  const ctm = viewport.getScreenCTM
    ? viewport.getScreenCTM()
    : svg.getScreenCTM();

  // 轉換到 viewport 座標系統
  const svgPt = pt.matrixTransform(ctm.inverse());
  return {
    x: svgPt.x,
    y: svgPt.y,
  };
}

/**
 * 輔助函數：獲取 SVG 座標系中的滑鼠位置（考慮 svg-pan-zoom 的縮放和平移）
 * @param {SVGElement} svg - SVG 根元素
 * @param {Event} e - 滑鼠事件
 * @returns {SVGPoint|null} SVG 座標點
 */
export function getSVGPoint(svg, e) {
  try {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    // [修正] 使用 viewport 的 CTM，而不是 SVG 根元素的 CTM
    // svg-pan-zoom 會將所有內容包裝在一個 <g> 元素（viewport）中
    // 使用 viewport 的 CTM 才能正確處理縮放後的座標轉換
    const viewport = svg.querySelector("g");
    const ctm = viewport ? viewport.getScreenCTM() : svg.getScreenCTM();
    if (!ctm) {
      console.warn("[WARN] SVG CTM not available yet");
      return null;
    }
    const svgPt = pt.matrixTransform(ctm.inverse());
    return svgPt;
  } catch (error) {
    console.error("[ERROR] getSVGPoint failed:", error);
    return null;
  }
}

/**
 * 全局座標轉換為局部座標（反向轉換）
 * @param {number} globalX - 全域 X 座標
 * @param {number} globalY - 全域 Y 座標
 * @param {Object} coordSystem - 座標系統 {angle, ux, uy}
 * @returns {Object} 區域座標 {localX, localY}
 */
export function globalToLocal(globalX, globalY, coordSystem) {
  const angleRad = ((coordSystem.angle || 0) * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // 先平移（減去原點偏移）
  const translatedX = globalX - (coordSystem.ux || 0);
  const translatedY = globalY - (coordSystem.uy || 0);

  // 再旋轉（逆向旋轉，使用逆矩陣）
  const localX = translatedX * cosA + translatedY * sinA;
  const localY = -translatedX * sinA + translatedY * cosA;

  return { localX, localY };
}

/**
 * SVG 座標轉換為 ETABS 座標
 * 注意：需要 cachedJoints 資料來計算座標範圍
 * @param {number} svgX - SVG X 座標
 * @param {number} svgY - SVG Y 座標
 * @param {Object} cachedJoints - 節點座標快取
 * @returns {Object} ETABS 座標 {x, y}
 */
export function svgToEtabsCoord(svgX, svgY, cachedJoints) {
  // 這個函數需要知道 SVG 座標系統和 ETABS 座標系統的對應關係
  // 通常 SVG 的 Y 軸是向下的，ETABS 的 Y 軸是向上的
  // 需要根據繪圖時的座標轉換來反推

  // 從 cachedJoints 計算座標範圍
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const joint of Object.values(cachedJoints || {})) {
    if (joint.x < minX) minX = joint.x;
    if (joint.x > maxX) maxX = joint.x;
    if (joint.y < minY) minY = joint.y;
    if (joint.y > maxY) maxY = joint.y;
  }

  // 如果沒有資料，返回原始座標
  if (minX === Infinity) {
    return { x: svgX, y: -svgY };
  }

  // SVG 的 Y 軸反轉
  const etabsX = svgX;
  const etabsY = -svgY;

  return { x: etabsX, y: etabsY };
}
