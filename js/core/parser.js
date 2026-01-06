/**
 * BEAM-NAMINGTOOL - E2K 檔案解析器
 * 包含：節點解析、梁桿件解析、格線解析
 *
 * 這些是從 ETABS 匯出的 E2K 格式檔案的解析函數
 */

/**
 * 解析格線定義
 * @param {string} content - E2K 檔案內容
 * @returns {Object} 格線資料 {x: [], y: [], coordSystems: {}}
 */
export function parseGrids(content) {
  const grids = {
    x: [],
    y: [],
    coordSystems: {}, // 儲存所有 COORDSYSTEM 信息
  };

  // 解析 COORDSYSTEM 定義（支持 UX, UY 位置和 ANGLE/RZ 旋轉角度）
  const coordSystemRegex =
    /COORDSYSTEM\s+"([^"]+)"\s+TYPE\s+"([^"]+)"([^\n]*)/gi;
  let csMatch;
  while ((csMatch = coordSystemRegex.exec(content)) !== null) {
    const [fullMatch, name, type, params] = csMatch;

    // 解析 UX, UY 座標
    const uxMatch = params.match(/UX\s+([-\d\.E]+)/i);
    const uyMatch = params.match(/UY\s+([-\d\.E]+)/i);

    // 解析旋轉角度 (支持 ANGLE 或 RZ)
    const angleMatch = params.match(/(?:ANGLE|RZ)\s+([-\d\.E]+)/i);

    grids.coordSystems[name] = {
      name,
      type,
      ux: uxMatch ? parseFloat(uxMatch[1]) : 0, // X 座標偏移
      uy: uyMatch ? parseFloat(uyMatch[1]) : 0, // Y 座標偏移
      angle: angleMatch ? parseFloat(angleMatch[1]) : 0, // 旋轉角度（度）
    };
    console.log(
      `[COORDSYSTEM] ${name}: type=${type}, ux=${grids.coordSystems[name].ux}, uy=${grids.coordSystems[name].uy}, angle=${grids.coordSystems[name].angle}°`,
    );
  }

  const gridTableSection = content.match(
    /TABLE:\s+"GRID DEFINITIONS - LINES"([\s\S]*?)(?=TABLE:|$)/,
  );
  if (gridTableSection) {
    let currentGrid = {};
    const lines = gridTableSection[1].trim().split("\n");
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine === "") {
        if (
          currentGrid.name &&
          currentGrid.type &&
          currentGrid.ordinate !== undefined
        ) {
          if (currentGrid.type.toUpperCase() === "X") grids.x.push(currentGrid);
          else if (currentGrid.type.toUpperCase() === "Y")
            grids.y.push(currentGrid);
        }
        currentGrid = {};
      } else {
        const match = trimmedLine.match(/(\S+)\s*=\s*"?([^"]*)"?/);
        if (match) {
          const [, key, value] = match;
          if (key === "GridID") currentGrid.name = value;
          if (key === "GridType") currentGrid.type = value;
          if (key === "Ordinate") currentGrid.ordinate = parseFloat(value);
          if (key === "BubbleLoc") currentGrid.bubbleLoc = value;
          // 解析格線類型 (Primary/Secondary)
          if (key === "LineType") currentGrid.lineType = value;
        }
      }
    });
    if (currentGrid.name) {
      if (currentGrid.type.toUpperCase() === "X") grids.x.push(currentGrid);
      else if (currentGrid.type.toUpperCase() === "Y")
        grids.y.push(currentGrid);
    }
  }
  if (grids.x.length === 0 && grids.y.length === 0) {
    const gridDollarSection = content.match(/\$ GRIDS([\s\S]*?)(?=\$|$)/);
    if (gridDollarSection) {
      const lines = gridDollarSection[1].trim().split("\n");
      lines.forEach((line) => {
        // 解析格式: GRID "COORDSYSTEM"  LABEL "name"  DIR "X/Y"  COORD value  [BUBBLELOC "DEFAULT/SWITCHED"]
        const match = line.match(
          /GRID\s+"([^"]+)"\s+LABEL\s+"([^"]+)"\s+DIR\s+"(X|Y)"\s+COORD\s+([-\d\.E]+)/i,
        );
        if (match) {
          const [, coordsystem, name, type, ordinate] = match;

          // 解析 BUBBLELOC
          const bubbleLocMatch = line.match(/BUBBLELOC\s+"([^"]+)"/i);
          const bubbleLoc = bubbleLocMatch ? bubbleLocMatch[1] : "DEFAULT";

          const gridInfo = {
            name,
            type,
            ordinate: parseFloat(ordinate),
            coordsystem, // 保存 COORDSYSTEM 信息
            bubbleLoc, // 保存 BUBBLELOC 信息
          };
          if (type.toUpperCase() === "X") grids.x.push(gridInfo);
          else if (type.toUpperCase() === "Y") grids.y.push(gridInfo);
        }
      });
    }
  }
  if (grids.x.length === 0 && grids.y.length === 0) {
    throw new Error("Could not find grid definitions.");
  }

  // 去重並排序：先按 COORDSYSTEM 分組，再按 ordinate 排序
  const sortByCoordSystemAndOrdinate = (gridArray) => {
    // 去重
    const uniqueGrids = [
      ...new Map(gridArray.map((item) => [item.name, item])).values(),
    ];

    // 先按 coordsystem 分組排序，再按 ordinate 排序
    return uniqueGrids.sort((a, b) => {
      const sysA = a.coordsystem || "GLOBAL";
      const sysB = b.coordsystem || "GLOBAL";

      // GLOBAL 系統優先
      if (sysA === "GLOBAL" && sysB !== "GLOBAL") return -1;
      if (sysA !== "GLOBAL" && sysB === "GLOBAL") return 1;

      // 同系統內按字母排序
      if (sysA !== sysB) {
        return sysA.localeCompare(sysB);
      }

      // 同系統內按坐標排序
      return a.ordinate - b.ordinate;
    });
  };

  grids.x = sortByCoordSystemAndOrdinate(grids.x);
  grids.y = sortByCoordSystemAndOrdinate(grids.y);
  return grids;
}

/**
 * 解析節點座標
 * @param {string} content - E2K 檔案內容
 * @returns {Object} 節點座標 {jointName: {x, y}}
 */
export function parseJoints(content) {
  const joints = {};
  const sciNotationRegex = /"([^"]+)"\s+([-\d\.E]+)\s+([-\d\.E]+)/;
  const pointRegex = /^POINT\s+"([^"]+)"\s+([-\d\.E]+)\s+([-\d\.E]+)/;
  const nameRegex =
    /NAME\s*=\s*(\S+)\s*X\s*=\s*([-\d\.E]+)\s*Y\s*=\s*([-\d\.E]+)/;

  const jointTableSection = content.match(
    /TABLE:\s+"JOINT COORDINATES"([\s\S]*?)(?=TABLE:|$)/,
  );
  if (jointTableSection) {
    const lines = jointTableSection[1].trim().split("\n");
    lines.forEach((line) => {
      if (line.trim().startsWith("JOINT")) return;
      const match = line.trim().match(sciNotationRegex);
      if (match) {
        joints[match[1]] = {
          x: parseFloat(match[2]),
          y: parseFloat(match[3]),
        };
      }
    });
  }
  if (Object.keys(joints).length === 0) {
    const lines = content.split("\n");
    lines.forEach((line) => {
      const match = line.trim().match(pointRegex);
      if (match) {
        joints[match[1]] = {
          x: parseFloat(match[2]),
          y: parseFloat(match[3]),
        };
      }
    });
  }
  if (Object.keys(joints).length === 0) {
    const jointDollarSection = content.match(/\$ JOINTS([\s\S]*?)(?=\$|$)/s);
    if (jointDollarSection) {
      const lines = jointDollarSection[1].trim().split("\n");
      lines.forEach((line) => {
        const match = line.match(nameRegex);
        if (match) {
          joints[match[1]] = {
            x: parseFloat(match[2]),
            y: parseFloat(match[3]),
          };
        }
      });
    }
  }
  if (Object.keys(joints).length === 0) {
    throw new Error("Could not find joint coordinate definitions.");
  }
  return joints;
}

/**
 * 解析梁桿件
 * @param {string} content - E2K 檔案內容
 * @param {string} story - 樓層名稱
 * @returns {Array} 梁桿件陣列
 */
export function parseFrames(content, story) {
  const frames = [];
  const isBeamProp = (propName) => {
    if (!propName) return false;
    const p = propName.toUpperCase();
    const isNumericBeam = /^\d+(\.\d+)?B/.test(p);
    return (
      isNumericBeam ||
      p.startsWith("B") ||
      p.startsWith("G") ||
      p.startsWith("SB") ||
      p.startsWith("WB") ||
      p.startsWith("FB") ||
      p.startsWith("FGB") ||
      p.startsWith("FSB") ||
      p.startsWith("FWB")
    );
  };

  const frameTableSection = content.match(
    /TABLE:\s+"CONNECTIVITY - FRAME"([\s\S]*?)(?=TABLE:|$)/,
  );
  const frameAssignSection = content.match(
    /TABLE:\s+"FRAME ASSIGNS - SECTION"([\s\S]*?)(?=TABLE:|$)/,
  );
  if (frameTableSection && frameAssignSection) {
    const connectivityLines = frameTableSection[1].trim().split("\n");
    const assignLines = frameAssignSection[1].trim().split("\n");
    const frameProperties = new Map();
    assignLines.forEach((line) => {
      const match = line.trim().match(/^"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);
      if (match && match[2] === story) {
        frameProperties.set(match[1], match[3]);
      }
    });
    connectivityLines.forEach((line) => {
      const match = line.trim().match(/^"([^"]+)"\s+"([^"]+)"\s+"([^"]+)"/);
      if (match) {
        const [, name, joint1, joint2] = match;
        const propName = frameProperties.get(name);
        if (isBeamProp(propName)) {
          frames.push({
            name,
            prop: propName,
            joint1,
            joint2,
            story,
          });
        }
      }
    });
  }
  if (frames.length === 0) {
    const lineConnectivitySection = content.match(
      /\$ LINE CONNECTIVITIES([\s\S]*?)(?=\$|$)/i,
    );
    const lineAssignsSection = content.match(
      /\$ LINE ASSIGNS([\s\S]*?)(?=\$|$)/i,
    );
    if (lineConnectivitySection && lineAssignsSection) {
      const connectLines = lineConnectivitySection[1].trim().split("\n");
      const assignLines = lineAssignsSection[1].trim().split("\n");
      const beamAssigns = new Map();
      assignLines.forEach((line) => {
        const assignMatch = line.match(
          new RegExp(
            `LINEASSIGN\\s+"([^"]+)"\\s+"${story}"\\s+SECTION\\s+"([^"]+)"`,
            "i",
          ),
        );
        if (assignMatch) {
          const [, name, propName] = assignMatch;
          if (isBeamProp(propName)) {
            beamAssigns.set(name, propName);
          }
        }
      });
      connectLines.forEach((line) => {
        const connMatch = line.match(
          /LINE\s+"([^"]+)"\s+BEAM\s+"([^"]+)"\s+"([^"]+)"/i,
        );
        if (connMatch) {
          const [, name, joint1, joint2] = connMatch;
          if (beamAssigns.has(name)) {
            frames.push({
              name,
              prop: beamAssigns.get(name),
              joint1,
              joint2,
              story,
            });
          }
        }
      });
    }
  }
  return frames;
}

/**
 * 找到最接近的格線
 * @param {number} coordinate - 座標值
 * @param {Array} grids - 格線陣列
 * @returns {Object|null} 最接近的格線
 */
export function findClosestGrid(coordinate, grids) {
  if (!grids || grids.length === 0) return null;
  return grids.reduce((closest, current) => {
    const closestDiff = Math.abs(coordinate - closest.ordinate);
    const currentDiff = Math.abs(coordinate - current.ordinate);
    return currentDiff < closestDiff ? current : closest;
  });
}

/**
 * 解析格線名稱，提取前綴和數字
 * @param {string} gridName - 格線名稱（可能包含 X/Y 前綴，如 "X6", "Y10", "A2" 等）
 * @returns {Object} {prefix, num, original}
 *   - prefix: 字母前綴（不含 X/Y）
 *   - num: 數字部分
 *   - original: 去除 X/Y 前綴後的名稱
 */
export function parseGridName(gridName) {
  if (!gridName) return { prefix: "", num: 0, original: "" };

  // 去除開頭的 X 或 Y 前綴（如果存在）
  let cleanName = gridName;
  if (/^[XY]/i.test(gridName)) {
    cleanName = gridName.substring(1);
  }

  // 解析去除前綴後的名稱
  const match = cleanName.match(/^([A-Za-z]*)(\d+)?/);
  if (match) {
    return {
      prefix: match[1] || "",
      num: match[2] ? parseInt(match[2]) : 0,
      original: cleanName,
    };
  }
  return { prefix: cleanName, num: 0, original: cleanName };
}
