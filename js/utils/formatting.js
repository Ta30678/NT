/**
 * 格式化工具函數
 */

/**
 * 將樓層列表格式化為範圍字串 (例如 "2F~5F, 7F")
 * @param {Array<string>} floors - 樓層名稱陣列
 * @param {Object} storyOrder - 樓層順序對應表 {ShowName: OrderIndex}
 * @returns {string} 格式化後的字串
 */
export function summarizeFloors(floors, storyOrder) {
  if (!floors || floors.length === 0) return "";
  if (floors.length === 1) return floors[0];

  const sortedFloors = [...floors].sort(
    (a, b) => storyOrder[a] - storyOrder[b]
  );
  const ranges = [];
  let rangeStart = sortedFloors[0];

  for (let i = 1; i < sortedFloors.length; i++) {
    const currentStoryOrder = storyOrder[sortedFloors[i]];
    const prevStoryOrder = storyOrder[sortedFloors[i - 1]];

    if (currentStoryOrder !== prevStoryOrder + 1) {
      if (rangeStart === sortedFloors[i - 1]) {
        ranges.push(rangeStart);
      } else {
        ranges.push(`${rangeStart}~${sortedFloors[i - 1]}`);
      }
      rangeStart = sortedFloors[i];
    }
  }

  if (rangeStart === sortedFloors[sortedFloors.length - 1]) {
    ranges.push(rangeStart);
  } else {
    ranges.push(`${rangeStart}~${sortedFloors[sortedFloors.length - 1]}`);
  }
  return ranges.join(", ");
}
