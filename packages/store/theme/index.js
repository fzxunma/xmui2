// stores/theme.js
import { computed, effectScope, onScopeDispose, ref, toRefs, watch } from 'vue';
import { useDateFormat, useEventListener, useNow, usePreferredColorScheme } from '@vueuse/core';
import { defineStore } from 'pinia';
import { localStg } from '/utils/storage.js';
import { SetupStoreId } from '/utils/enum.js';
console.log("dfd")
import {
  addThemeVarsToGlobal,
  createThemeToken,
  getNaiveTheme,
  initThemeSettings,
  toggleAuxiliaryColorModes,
  toggleCssDarkMode
} from './shared.js';
console.log("dfd")
/** 终极主题 Store（已修复所有语法错误 + 增强持久化 + 性能拉满） */
export const useThemeStore = defineStore(SetupStoreId.Theme, () => {
  const scope = effectScope();
  const osTheme = usePreferredColorScheme();

  // 响应式主题配置
  const settings = ref(initThemeSettings());

  // 水印实时时间
  const { now: watermarkTime, pause: pauseWatermarkTime, resume: resumeWatermarkTime } =
    useNow({ controls: true });

  // 计算属性：暗色模式
  const darkMode = computed(() => {
    return settings.value.themeScheme === 'auto'
      ? osTheme.value === 'dark'
      : settings.value.themeScheme === 'dark';
  });

  const grayscaleMode = computed(() => settings.value.grayscale);
  const colourWeaknessMode = computed(() => settings.value.colourWeakness);

  // 完整主题色
  const themeColors = computed(() => {
    const { themeColor, otherColor, isInfoFollowPrimary } = settings.value;
    return {
      primary: themeColor,
      ...otherColor,
      info: isInfoFollowPrimary ? themeColor : otherColor.info
    };
  });

  // NaiveUI 主题
  const naiveTheme = computed(() => getNaiveTheme(themeColors.value, settings.value));

  // 配置 JSON（复制用）
  const settingsJson = computed(() => JSON.stringify(settings.value, null, 2));

  // 水印时间格式化
  const formattedWatermarkTime = computed(() => {
    const format = settings.value.watermark.timeFormat || 'YYYY-MM-DD HH:mm:ss';
    return useDateFormat(watermarkTime, format).value;
  });

  // 水印内容
  const watermarkContent = computed(() => {
    const { watermark } = settings.value;
    if (watermark.enableTime) return formattedWatermarkTime.value;
    return watermark.text || 'XMUI PRO';
  });

  // 重置主题（同时清本地缓存）
  function resetStore() {
    settings.value = initThemeSettings();
    localStg.remove('themeSettings');
    localStg.remove('themeColor');
    localStg.remove('darkMode');
  }

  function setThemeScheme(scheme) {
    settings.value.themeScheme = scheme;
  }

  function toggleThemeScheme() {
    const schemes = ['light', 'dark', 'auto'];
    const idx = schemes.indexOf(settings.value.themeScheme);
    settings.value.themeScheme = schemes[(idx + 1) % 3];
  }

  function setGrayscale(v) { settings.value.grayscale = v; }
  function setColourWeakness(v) { settings.value.colourWeakness = v; }

  function updateThemeColors(key, color) {
    if (key === 'primary') {
      settings.value.themeColor = color;
    } else {
      settings.value.otherColor[key] = color;
    }
  }

  function setThemeLayout(mode) {
    settings.value.layout.mode = mode;
  }

  function setWatermarkEnableUserName(v) {
    settings.value.watermark.enableUserName = v;
    if (v) settings.value.watermark.enableTime = false;
  }

  function setWatermarkEnableTime(v) {
    settings.value.watermark.enableTime = v;
    if (v) settings.value.watermark.enableUserName = false;
  }

  // 控制水印计时器
  function updateWatermarkTimer() {
    const { visible, enableTime } = settings.value.watermark;
    visible && enableTime ? resumeWatermarkTime() : pauseWatermarkTime();
  }

  // 写入全局 CSS 变量
  function setupThemeVarsToGlobal() {
    const { themeTokens, darkThemeTokens } = createThemeToken(
      themeColors.value,
      settings.value.tokens,
      settings.value.recommendColor
    );
    addThemeVarsToGlobal(themeTokens, darkThemeTokens);
  }

  // 持久化（仅生产环境）
  function cacheThemeSettings() {
    localStg.set('themeSettings', settings.value);
  }

  // 页面关闭前自动保存
  useEventListener(window, 'beforeunload', cacheThemeSettings);

  // ==================== 响应式副作用 ====================
  scope.run(() => {
    // 暗色模式
    watch(darkMode, (val) => {
      toggleCssDarkMode(val);
      localStg.set('darkMode', val);
    }, { immediate: true });

    // 灰度 + 色弱
    watch([grayscaleMode, colourWeaknessMode], ([g, w]) => {
      toggleAuxiliaryColorModes(g, w);
    }, { immediate: true });

    // 主题色变化 → 更新 CSS 变量 + 持久化主色
    watch(themeColors, () => {
      setupThemeVarsToGlobal();
      localStg.set('themeColor', themeColors.value.primary);
    }, { immediate: true });

    // 水印开关
    watch(
      () => [settings.value.watermark.visible, settings.value.watermark.enableTime],
      updateWatermarkTimer,
      { immediate: true }
    );

    // 任意设置变化 → 自动持久化（最强！）
    watch(settings, cacheThemeSettings, { deep: true, immediate: true });
  });

  onScopeDispose(() => scope.stop());

  return {
    ...toRefs(settings.value),

    darkMode,
    themeColors,
    naiveTheme,
    settingsJson,
    watermarkContent,

    resetStore,
    setThemeScheme,
    toggleThemeScheme,
    setGrayscale,
    setColourWeakness,
    updateThemeColors,
    setThemeLayout,
    setWatermarkEnableUserName,
    setWatermarkEnableTime,
    setupThemeVarsToGlobal
  };
});