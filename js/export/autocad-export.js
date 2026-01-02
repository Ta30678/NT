/**
 * BEAM-NAMINGTOOL - AutoCAD 匯出工具
 * 包含：JSON 格式匯出和 CSV 格式匯出
 * 
 * 依賴：fullProcessedBeams, previewJoints, gridData 全域變數
 */

/**
 * 計算梁與軸線的相對位置關係
 * @param {Object} beam - 梁對象
 * @param {Object} joints - 節點座標對象
 * @param {Object} grids - 格線資料
 * @returns {Object|null} 格線關係資料
 */
export function calculateGridRelation(beam, joints, grids) {
  const j1 = joints[beam.joint1];
  const j2 = joints[beam.joint2];
  if (!j1 || !j2) return null;

  const tolerance = 0.1; // 容許誤差 0.1 公尺

  // 判斷梁的方向
  const deltaX = Math.abs(j2.x - j1.x);
  const deltaY = Math.abs(j2.y - j1.y);
  const isHorizontal = deltaX > deltaY;

  if (isHorizontal) {
    // 水平梁：沿著某條 Y 軸線，在兩條 X 軸線之間
    // 找到最接近的 Y 軸線
    const avgY = (j1.y + j2.y) / 2;
    const closestYGrid = grids.y.reduce((prev, curr) => {
      return Math.abs(curr.ordinate - avgY) <
        Math.abs(prev.ordinate - avgY)
        ? curr
        : prev;
    });

    // 找到梁跨越的 X 軸線
    const minX = Math.min(j1.x, j2.x);
    const maxX = Math.max(j1.x, j2.x);
    const betweenX = grids.x
      .filter(
        (g) =>
          g.ordinate >= minX - tolerance && g.ordinate <= maxX + tolerance
      )
      .sort((a, b) => a.ordinate - b.ordinate);

    if (betweenX.length >= 2) {
      return {
        alongGrid: closestYGrid.name,
        between: [betweenX[0].name, betweenX[betweenX.length - 1].name],
        direction: "horizontal",
        offsetFromStart: Math.abs(avgY - closestYGrid.ordinate),
        length: deltaX,
      };
    }
  } else {
    // 垂直梁：沿著某條 X 軸線，在兩條 Y 軸線之間
    const avgX = (j1.x + j2.x) / 2;
    const closestXGrid = grids.x.reduce((prev, curr) => {
      return Math.abs(curr.ordinate - avgX) <
        Math.abs(prev.ordinate - avgX)
        ? curr
        : prev;
    });

    const minY = Math.min(j1.y, j2.y);
    const maxY = Math.max(j1.y, j2.y);
    const betweenY = grids.y
      .filter(
        (g) =>
          g.ordinate >= minY - tolerance && g.ordinate <= maxY + tolerance
      )
      .sort((a, b) => a.ordinate - b.ordinate);

    if (betweenY.length >= 2) {
      return {
        alongGrid: closestXGrid.name,
        between: [betweenY[0].name, betweenY[betweenY.length - 1].name],
        direction: "vertical",
        offsetFromStart: Math.abs(avgX - closestXGrid.ordinate),
        length: deltaY,
      };
    }
  }

  return null;
}

/**
 * 匯出 JSON 格式（AutoCAD 用）
 * @param {Array} beams - 已處理的梁陣列
 * @param {Object} joints - 節點座標
 */
export function exportToJSON(beams, joints) {
  if (beams.length === 0) {
    alert("沒有可匯出的資料。");
    return;
  }
  if (!joints) {
    alert("無法取得座標資訊，請確認已載入 E2K 檔案。");
    return;
  }

  const outputData = {
    project: "ETABS梁編號專案",
    exportDate: new Date().toISOString(),
    floors: [],
  };

  // 依樓層分組
  const floorGroups = new Map();
  beams.forEach((beam) => {
    if (!floorGroups.has(beam.story)) {
      floorGroups.set(beam.story, []);
    }
    floorGroups.get(beam.story).push(beam);
  });

  // 為每個樓層生成資料
  floorGroups.forEach((beamsInFloor, floorName) => {
    const floorData = {
      floorName: floorName,
      beams: [],
    };

    beamsInFloor.forEach((beam) => {
      const j1 = joints[beam.joint1];
      const j2 = joints[beam.joint2];

      if (!j1 || !j2) return;

      floorData.beams.push({
        etabsId: beam.name,
        newLabel: beam.newLabel,
        startPoint: {
          id: beam.joint1,
          x: j1.x,
          y: j1.y,
        },
        endPoint: {
          id: beam.joint2,
          x: j2.x,
          y: j2.y,
        },
        midPoint: {
          x: (j1.x + j2.x) / 2,
          y: (j1.y + j2.y) / 2,
        },
        length: Math.sqrt(
          Math.pow(j2.x - j1.x, 2) + Math.pow(j2.y - j1.y, 2)
        ),
        section: beam.prop || "",
        isMainBeam:
          !beam.newLabel.toLowerCase().startsWith("b") &&
          !beam.newLabel.toLowerCase().startsWith("fb"),
      });
    });

    outputData.floors.push(floorData);
  });

  // 下載 JSON 檔案
  const jsonStr = JSON.stringify(outputData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ETABS_梁座標資料_AutoCAD.json";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * V2 版本：基於軸線相對位置的 CSV 匯出
 * @param {Array} beams - 已處理的梁陣列
 * @param {Object} joints - 節點座標
 * @param {Object} grids - 格線資料
 */
export function exportToJSONV2(beams, joints, grids) {
  if (beams.length === 0) {
    alert("沒有可匯出的資料。");
    return;
  }
  if (!joints || !grids) {
    alert("無法取得座標或軸線資訊，請確認已載入 E2K 檔案。");
    return;
  }

  // 準備 CSV 資料
  const csvRows = [];

  // CSV 標題行
  csvRows.push(
    [
      "樓層",
      "ETABS編號",
      "新編號",
      "沿軸線",
      "起始軸線",
      "結束軸線",
      "方向",
      "偏移量",
      "長度",
      "斷面",
      "是否為大梁",
    ].join(",")
  );

  // 依樓層分組
  const floorGroups = new Map();
  beams.forEach((beam) => {
    if (!floorGroups.has(beam.story)) {
      floorGroups.set(beam.story, []);
    }
    floorGroups.get(beam.story).push(beam);
  });

  // 為每個樓層生成資料
  floorGroups.forEach((beamsInFloor, floorName) => {
    beamsInFloor.forEach((beam) => {
      const gridRelation = calculateGridRelation(
        beam,
        joints,
        grids
      );

      if (gridRelation) {
        // 判斷是否為大梁
        let isMainBeam = true;
        if (beam.isFixedLabel) {
          // 如果是固定編號梁，使用 isSecondaryBeam 標記
          isMainBeam = !beam.isSecondaryBeam;
        } else {
          // 大梁：G, B, FB, FG, FWB, WB 開頭（大寫）
          // 小梁：b 開頭（小寫）
          // 只要第一個字母是小寫 b，就是小梁；其他都是大梁
          isMainBeam = beam.newLabel.charAt(0) !== "b";
        }

        // 將資料加入 CSV 行
        csvRows.push(
          [
            floorName,
            beam.name,
            beam.newLabel,
            gridRelation.alongGrid,
            gridRelation.between[0],
            gridRelation.between[1],
            gridRelation.direction === "horizontal" ? "水平" : "垂直",
            gridRelation.offsetFromStart.toFixed(3),
            gridRelation.length.toFixed(3),
            beam.prop || "",
            isMainBeam ? "是" : "否",
          ].join(",")
        );
      }
    });
  });

  // 下載 CSV 檔案
  const csvContent = csvRows.join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ETABS_梁編號_AutoCAD.csv";
  link.click();
  URL.revokeObjectURL(url);
}
