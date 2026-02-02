/**
 * 瀏覽器偵測工具模組
 * 提供跨瀏覽器相容性判斷函數
 */

/**
 * 偵測是否在 Microsoft Edge 瀏覽器中執行
 *
 * Edge 瀏覽器的 User-Agent 包含 "Edg/" 字串（注意不是 "Edge"）
 * 例如：Mozilla/5.0 ... Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0
 *
 * @returns {boolean} 若為 Edge 瀏覽器則返回 true，否則返回 false
 *
 * @example
 * ```typescript
 * if (isEdgeBrowser()) {
 *   console.log('Running in Microsoft Edge');
 * }
 * ```
 */
export function isEdgeBrowser(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Edg/');
}
