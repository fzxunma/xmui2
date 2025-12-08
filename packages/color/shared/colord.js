// utils/color.js
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names/index.js';
import mixPlugin from 'colord/plugins/mix/index.js';
import labPlugin from 'colord/plugins/lab/index.js';

// 激活所有常用插件（颜色名、混合、Lab 色域）
extend([namesPlugin, mixPlugin, labPlugin]);

/**
 * 判断是否为合法颜色（支持 hex、rgb、hsl、颜色名等）
 */
export function isValidColor(color) {
  return colord(color).isValid();
}

/**
 * 任意颜色 → HEX
 */
export function getHex(color) {
  return colord(color).toHex();
}

/**
 * 任意颜色 → RGB 对象
 */
export function getRgb(color) {
  return colord(color).toRgb();
}

/**
 * 任意颜色 → HSL 对象
 */
export function getHsl(color) {
  return colord(color).toHsl();
}

/**
 * 任意颜色 → HSV 对象
 */
export function getHsv(color) {
  return colord(color).toHsv();
}

/**
 * 计算两颜色色差（DeltaE，Lab 色域）
 */
export function getDeltaE(color1, color2) {
  return colord(color1).delta(color2);
}

/**
 * HSL 对象 → HEX
 */
export function transformHslToHex(hsl) {
  return colord(hsl).toHex();
}

/**
 * 添加透明度（返回带透明度的 HEX）
 *
 * @param {string} color - 任意颜色
 * @param {number} alpha - 透明度 0~1
 */
export function addColorAlpha(color, alpha) {
  return colord(color).alpha(alpha).toHex();
}

/**
 * 颜色混合
 *
 * @param {string} firstColor - 颜色1
 * @param {string} secondColor - 颜色2
 * @param {number} ratio - 第二种颜色占比 0~1
 */
export function mixColor(firstColor, secondColor, ratio = 0.5) {
  return colord(firstColor).mix(secondColor, ratio).toHex();
}

/**
 * 把「带透明度的颜色 + 背景色」合并成纯色（常用于 NaiveUI 主题）
 * 比如 #409eff 透明度 0.1 + 白色背景 → 类似 #e6f7ff 的纯色
 *
 * @param {string} color - 前景色
 * @param {number} alpha - 透明度 0~1
 * @param {string} bgColor - 背景色，默认白色
 */
export function transformColorWithOpacity(color, alpha, bgColor = '#ffffff') {
  const rgbaColor = colord(color).alpha(alpha).toRgb();
  const bg = colord(bgColor).toRgb();

  const r = Math.round(bg.r + (rgbaColor.r - bg.r) * alpha);
  const g = Math.round(bg.g + (rgbaColor.g - bg.g) * alpha);
  const b = Math.round(bg.b + (rgbaColor.b - bg.b) * alpha);

  return colord({ r, g, b }).toHex();
}

/**
 * 是否为纯白
 */
export function isWhiteColor(color) {
  return colord(color).isEqual('#ffffff');
}

/**
 * 是否为纯黑
 */
export function isBlackColor(color) {
  return colord(color).isEqual('#000000');
}

/**
 * 颜色变亮（常用于 hover）
 */
export function lighten(color, amount = 0.1) {
  return colord(color).lighten(amount).toHex();
}

/**
 * 颜色变暗（常用于 pressed）
 */
export function darken(color, amount = 0.1) {
  return colord(color).darken(amount).toHex();
}

/**
 * 导出原始 colord，方便高级用法
 */
export { colord };