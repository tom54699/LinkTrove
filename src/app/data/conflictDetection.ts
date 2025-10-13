/**
 * conflictDetection.ts
 *
 * 檢測本地與雲端資料的衝突
 * 用於在 Auto Sync 啟用或手動合併前提示使用者
 */

import type { ExportPayload } from './mergeService';

export interface ConflictInfo {
  /** 是否存在衝突（任何差異） */
  hasConflict: boolean;

  /** 衝突嚴重程度 */
  severity: 'none' | 'minor' | 'major';

  /** 本地資料統計 */
  local: {
    webpages: number;
    categories: number;
    subcategories: number;
    templates: number;
    organizations: number;
  };

  /** 雲端資料統計 */
  remote: {
    webpages: number;
    categories: number;
    subcategories: number;
    templates: number;
    organizations: number;
  };

  /** 差異統計 */
  diff: {
    webpages: number;      // 正數表示本地多，負數表示雲端多
    categories: number;
    subcategories: number;
    templates: number;
    organizations: number;
  };

  /** 總差異百分比（基於網頁數量） */
  percentDiff: number;
}

/**
 * 檢測本地與雲端資料的衝突
 *
 * 衝突嚴重程度判定規則：
 * - none: 無差異
 * - minor: 網頁數差異 ≤10 且百分比 <20%
 * - major: 網頁數差異 >10 或百分比 ≥20%
 */
export function detectConflict(
  local: ExportPayload,
  remote: ExportPayload
): ConflictInfo {
  // 計算各項目數量
  const localCounts = {
    webpages: (local.webpages || []).length,
    categories: (local.categories || []).length,
    subcategories: (local.subcategories || []).length,
    templates: (local.templates || []).length,
    organizations: (local.organizations || []).length,
  };

  const remoteCounts = {
    webpages: (remote.webpages || []).length,
    categories: (remote.categories || []).length,
    subcategories: (remote.subcategories || []).length,
    templates: (remote.templates || []).length,
    organizations: (remote.organizations || []).length,
  };

  // 計算差異
  const diff = {
    webpages: localCounts.webpages - remoteCounts.webpages,
    categories: localCounts.categories - remoteCounts.categories,
    subcategories: localCounts.subcategories - remoteCounts.subcategories,
    templates: localCounts.templates - remoteCounts.templates,
    organizations: localCounts.organizations - remoteCounts.organizations,
  };

  // 判斷是否有任何差異
  const hasConflict = Object.values(diff).some((d) => d !== 0);

  // 計算網頁數量的百分比差異
  const maxWebpages = Math.max(localCounts.webpages, remoteCounts.webpages);
  const percentDiff = maxWebpages > 0
    ? (Math.abs(diff.webpages) / maxWebpages) * 100
    : 0;

  // 判斷嚴重程度（只基於網頁數量差異）
  let severity: ConflictInfo['severity'] = 'none';
  if (hasConflict) {
    const webpageDiff = Math.abs(diff.webpages);
    if (webpageDiff > 0) {
      // 有網頁差異才判斷嚴重程度
      if (webpageDiff > 10 || percentDiff >= 20) {
        severity = 'major';
      } else {
        severity = 'minor';
      }
    }
    // 如果只有其他類型差異（categories, templates 等）但網頁一致，severity 保持 none
  }

  return {
    hasConflict,
    severity,
    local: localCounts,
    remote: remoteCounts,
    diff,
    percentDiff,
  };
}

/**
 * 產生衝突描述文字（繁體中文）
 */
export function formatConflictMessage(info: ConflictInfo): string {
  if (!info.hasConflict) {
    return '本地與雲端資料一致';
  }

  const lines: string[] = [];

  // 網頁差異
  if (info.diff.webpages !== 0) {
    const dir = info.diff.webpages > 0 ? '多' : '少';
    lines.push(`網頁：本地 ${dir} ${Math.abs(info.diff.webpages)} 個`);
  }

  // 分類差異
  if (info.diff.categories !== 0) {
    const dir = info.diff.categories > 0 ? '多' : '少';
    lines.push(`分類：本地 ${dir} ${Math.abs(info.diff.categories)} 個`);
  }

  // 子分類差異
  if (info.diff.subcategories !== 0) {
    const dir = info.diff.subcategories > 0 ? '多' : '少';
    lines.push(`群組：本地 ${dir} ${Math.abs(info.diff.subcategories)} 個`);
  }

  // 模板差異
  if (info.diff.templates !== 0) {
    const dir = info.diff.templates > 0 ? '多' : '少';
    lines.push(`模板：本地 ${dir} ${Math.abs(info.diff.templates)} 個`);
  }

  // 組織差異
  if (info.diff.organizations !== 0) {
    const dir = info.diff.organizations > 0 ? '多' : '少';
    lines.push(`組織：本地 ${dir} ${Math.abs(info.diff.organizations)} 個`);
  }

  return lines.join('\n');
}
