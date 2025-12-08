// theme/vars.js

/** 生成完整的调色板 CSS 变量映射（primary-50 ~ primary-950） */
function createColorPaletteVars() {
  const colors = ['primary', 'info', 'success', 'warning', 'error'];
  const numbers = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  const palette = {};

  colors.forEach(color => {
    // 主色：--primary-color → rgb(var(--primary-color))
    palette[color] = `rgb(var(--${color}-color))`;

    // 各阶梯色：--primary-500-color → rgb(var(--primary-500-color))
    numbers.forEach(num => {
      palette[`${color}-${num}`] = `rgb(var(--${color}-${num}-color))`;
    });
  });

  return palette;
}

// 预生成一次，避免每次 import 都重新计算
const colorPaletteVars = createColorPaletteVars();

/** 全局主题 CSS 变量映射表（最终会注入到 :root） */
export const themeVars = {
  colors: {
    // 所有调色板变量（primary, primary-500, info-200 ...）
    ...colorPaletteVars,

    // 其他业务色
    nprogress: 'rgb(var(--nprogress-color))',
    container: 'rgb(var(--container-bg-color))',
    layout: 'rgb(var(--layout-bg-color))',
    inverted: 'rgb(var(--inverted-bg-color))',
    'base-text': 'rgb(var(--base-text-color))'
  },
  boxShadow: {
    header: 'var(--header-box-shadow)',
    sider: 'var(--sider-box-shadow)',
    tab: 'var(--tab-box-shadow)'
  }
};