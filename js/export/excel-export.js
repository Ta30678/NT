/**
 * BEAM-NAMINGTOOL - Excel 匯出模組
 */

import { appState } from '../config/constants.js';
import { createStandardFloorGroups } from '../core/beam-labeler.js';
import { summarizeFloors } from '../utils/formatting.js';

/**
 * 匯出 Excel 報表
 */
export function exportToExcel() {
  const fullProcessedBeams = appState.fullProcessedBeams;
  const storyOrderInfo = appState.storyOrderInfo;

  if (fullProcessedBeams.length === 0) {
    alert("沒有可匯出的資料。");
    return;
  }

  const standardFloorGroups = createStandardFloorGroups();
  const preppedData = [];

  for (const group of standardFloorGroups) {
    const beamsInGroup = fullProcessedBeams.filter((b) =>
      group.includes(b.story)
    );

    if (group.length === 1) {
      beamsInGroup.forEach((beam) => {
        preppedData.push({
          floor: beam.story,
          etabsLabel: beam.name,
          newLabel: beam.newLabel,
          isFixedLabel: beam.isFixedLabel, // [新增] 保留固定編號標記
          isSecondaryBeam: beam.isSecondaryBeam, // [新增] 保留小梁標記
        });
      });
    } else {
      // [修復] 不要用 newLabel 合併，因為不同的 ETABS 梁可能有相同編號
      // 改為：收集同一組樓層中每個梁的資料，樓層欄位顯示樓層範圍
      const floorString = summarizeFloors(group, storyOrderInfo);

      // 用 ETABS 編號 + 新編號 作為唯一識別
      const uniqueBeamsInGroup = new Map();
      beamsInGroup.forEach((beam) => {
        const key = `${beam.name}|${beam.newLabel}`;
        if (!uniqueBeamsInGroup.has(key)) {
          uniqueBeamsInGroup.set(key, {
            name: beam.name,
            newLabel: beam.newLabel,
            isFixedLabel: beam.isFixedLabel,
            isSecondaryBeam: beam.isSecondaryBeam,
          });
        }
      });

      uniqueBeamsInGroup.forEach((uniqueBeam) => {
        preppedData.push({
          floor: floorString,
          etabsLabel: uniqueBeam.name,
          newLabel: uniqueBeam.newLabel,
          isFixedLabel: uniqueBeam.isFixedLabel,
          isSecondaryBeam: uniqueBeam.isSecondaryBeam,
        });
      });
    }
  }

  const mainBeamsData = [];
  const secondaryBeamsData = [];

  preppedData.forEach((item) => {
    // [修復] 判斷大小梁：優先使用已設置的 isSecondaryBeam 標記
    let isSecondaryBeam = false;

    if (item.isSecondaryBeam !== undefined) {
      // 如果已經有 isSecondaryBeam 標記（從 beam 對象繼承），直接使用
      isSecondaryBeam = item.isSecondaryBeam;
    } else {
      // 如果沒有標記，從 fullProcessedBeams 中找到對應的梁，使用其 prop 判斷
      const correspondingBeam = fullProcessedBeams.find(
        (b) => b.name === item.etabsLabel && b.newLabel === item.newLabel
      );

      if (correspondingBeam && correspondingBeam.prop) {
        // 使用 frame section 判斷：包含 SB 或 FSB 的是小梁（支援 4sb、3.5sb 等格式）
        isSecondaryBeam = /(\d+\.?\d*\s*)?(SB|FSB)/i.test(
          correspondingBeam.prop
        );
      } else {
        // 如果找不到對應梁或沒有 prop，使用編號作為最後的備選判斷
        // 小梁：b 開頭（小寫）
        isSecondaryBeam =
          item.newLabel && item.newLabel.charAt(0) === "b";
      }
    }

    if (isSecondaryBeam) {
      secondaryBeamsData.push({
        ETABS編號: item.etabsLabel,
        編號: item.newLabel,
        樓層: item.floor,
      });
    } else {
      mainBeamsData.push({
        ETABS編號: item.etabsLabel,
        編號: item.newLabel,
        樓層: item.floor,
      });
    }
  });

  // Check if XLSX is available
  if (typeof window.XLSX === 'undefined') {
    alert("Excel 上傳插件尚未載入，請稍後再試。");
    return;
  }

  const workbook = window.XLSX.utils.book_new();

  const mainWs = window.XLSX.utils.json_to_sheet(mainBeamsData);
  window.XLSX.utils.book_append_sheet(workbook, mainWs, "大梁");

  const secondaryWs = window.XLSX.utils.json_to_sheet(secondaryBeamsData);
  window.XLSX.utils.book_append_sheet(workbook, secondaryWs, "小梁");

  window.XLSX.writeFile(workbook, "ETABS_梁編號_分頁.xlsx");
}
