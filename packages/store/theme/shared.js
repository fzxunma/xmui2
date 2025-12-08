// theme/shared.js
import { defu } from 'defu';
import { addColorAlpha, getColorPalette, getPaletteColorByNumber, getRgb } from '/color/index.js';
import { DARK_CLASS } from '/config/constants/app.js';
import { toggleHtmlClass } from '/utils/common.js';
import { localStg } from '/utils/storage.js';
import { overrideThemeSettings, themeSettings } from '/config/theme/index.js';
import { themeVars } from '/config/theme/vars.js';

/** 初始化主题配置 */
export function initThemeSettings() {
  const isProd = false;

  // 开发环境直接用内存中的配置，方便调试
  if (!isProd) return themeSettings;

  // 生产环境优先读取 localStorage 缓存
  const localSettings = localStg.get('themeSettings');

  let settings = defu(localSettings, themeSettings);

  // 版本强制覆盖逻辑（发布新版本时强制更新默认配置）
  const isOverride = localStg.get('overrideThemeFlag') === BUILD_TIME;

  if (!isOverride) {
    settings = defu(overrideThemeSettings, settings);
    localStg.set('overrideThemeFlag', BUILD_TIME);
  }

  return settings;
}

/**
 * 根据主题色 + tokens 生成最终的 CSS 变量对象
 */
export function createThemeToken(colors, tokens, recommended = false) {
  const paletteColors = createThemePaletteColors(colors, recommended);

  const { light, dark } = tokens || themeSettings.tokens;

  const themeTokens = {
    colors: {
      ...paletteColors,
      nprogress: paletteColors.primary,
      ...light.colors
    },
    boxShadow: {
      ...light.boxShadow
    }
  };

  const darkThemeTokens = {
    colors: {
      ...themeTokens.colors,
      ...dark?.colors
    },
    boxShadow: {
      ...themeTokens.boxShadow,
      ...dark?.boxShadow
    }
  };

  return { themeTokens, darkThemeTokens };
}

/** 生成各主题色的完整调色板（primary-100 ~ primary-1000） */
function createThemePaletteColors(colors, recommended = false) {
  const colorKeys = Object.keys(colors);
  const palette = {};

  colorKeys.forEach(key => {
    const colorMap = getColorPalette(colors[key], recommended);

    // 主色（500）
    palette[key] = colorMap.get(500);

    // 100~1000 全量
    colorMap.forEach((hex, number) => {
      palette[`${key}-${number}`] = hex;
    });
  });

  return palette;
}

/** 把 token 对象转成真正的 CSS 变量字符串 */
function getCssVarByTokens(tokens) {
  const styles = [];

  function removeVarPrefix(value) {
    return value.replace('var(', '').replace(')', '');
  }

  function removeRgbPrefix(value) {
    return value.replace('rgb(', '').replace(')', '');
  }

  for (const [categoryKey, categoryValues] of Object.entries(themeVars)) {
    for (const [tokenKey, tokenValue] of Object.entries(categoryValues)) {
      let cssVarKey = removeVarPrefix(tokenValue);
      let cssValue = tokens[categoryKey][tokenKey];

      if (categoryKey === 'colors') {
        cssVarKey = removeRgbPrefix(cssVarKey);
        const { r, g, b } = getRgb(cssValue);
        cssValue = `${r} ${g} ${b}`;
      }

      styles.push(`${cssVarKey}: ${cssValue}`);
    }
  }

  return styles.join(';');
}

/** 把亮色 + 暗色 CSS 变量注入到 :root 和 .dark */
export function addThemeVarsToGlobal(tokens, darkTokens) {
  const lightCss = getCssVarByTokens(tokens);
  const darkCss = getCssVarByTokens(darkTokens);

  const css = `
    :root {
      ${lightCss}
    }
  `;

  const darkCssStr = `
    html.${DARK_CLASS} {
      ${darkCss}
    }
  `;

  const styleId = 'theme-vars';
  let style = document.querySelector(`#${styleId}`);

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = css + darkCssStr;
}

/** 切换 HTML 的 dark 类名 */
export function toggleCssDarkMode(darkMode = false) {
  const { add, remove } = toggleHtmlClass(DARK_CLASS);
  if (darkMode) add();
  else remove();
}

/** 灰度 + 色弱模式（滤镜） */
export function toggleAuxiliaryColorModes(grayscaleMode = false, colourWeakness = false) {
  const filters = [];
  if (grayscaleMode) filters.push('grayscale(100%)');
  if (colourWeakness) filters.push('invert(80%)');

  document.documentElement.style.filter = filters.join(' ');
}

/** 生成 NaiveUI 需要的主题覆盖对象 */
function getNaiveThemeColors(colors, recommended = false) {
  const colorActions = [
    { scene: '', handler: color => color },
    { scene: 'Suppl', handler: color => color },
    { scene: 'Hover', handler: color => getPaletteColorByNumber(color, 500, recommended) },
    { scene: 'Pressed', handler: color => getPaletteColorByNumber(color, 700, recommended) },
    { scene: 'Active', handler: color => addColorAlpha(color, 0.1) }
  ];

  const themeColors = {};

  Object.entries(colors).forEach(([colorType, colorValue]) => {
    colorActions.forEach(action => {
      const key = `${colorType}Color${action.scene}`;
      themeColors[key] = action.handler(colorValue);
    });
  });

  return themeColors;
}

/** 返回完整的 NaiveUI GlobalThemeOverrides */
export function getNaiveTheme(colors, settings) {
  const { primary: colorLoading } = colors;

  const theme = {
    common: {
      ...getNaiveThemeColors(colors, settings.recommendColor),
      borderRadius: `${settings.themeRadius}px`
    },
    LoadingBar: {
      colorLoading
    },
    Tag: {
      borderRadius: `${settings.themeRadius}px`
    }
  };

  return theme;
}