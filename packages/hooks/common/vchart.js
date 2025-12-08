import { computed, effectScope, onScopeDispose, ref, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import VChart, { registerLiquidChart } from '@visactor/vchart';
import light from '@visactor/vchart-theme/public/light.json';
import dark from '@visactor/vchart-theme/public/dark.json';
import { useThemeStore } from '/store/theme/index';

// 注册 Liquid 图表（水球图）
registerLiquidChart();

// 注册内置主题
VChart.ThemeManager.registerTheme('light', light);
VChart.ThemeManager.registerTheme('dark', dark);

/**
 * 强大的 VChart Composable
 *
 * @param {Function} specFactory - 返回图表 spec 的工厂函数
 * @param {Object} hooks - 生命周期钩子
 *   - onRender(chart)   图表首次渲染后
 *   - onUpdated(chart)  图表更新后
 *   - onDestroy(chart)  图表销毁前
 */
export function useVChart(specFactory, hooks = {}) {
  const scope = effectScope();
  const themeStore = useThemeStore();
  const darkMode = computed(() => themeStore.darkMode);

  const domRef = ref(null);
  const initialSize = { width: 0, height: 0 };
  const { width, height } = useElementSize(domRef, initialSize);

  let chart = null;
  const spec = specFactory(); // 初始 spec

  const { onRender, onUpdated, onDestroy } = hooks;

  /** 是否可以渲染（容器已挂载且尺寸有效） */
  function canRender() {
    return domRef.value && initialSize.width > 0 && initialSize.height > 0;
  }

  /** 是否已渲染 */
  function isRendered() {
    return Boolean(domRef.value && chart);
  }

  /** 更新 spec（支持回调式修改） */
  async function updateSpec(callback = () => spec) {
    if (!isRendered()) return;

    const newSpec = callback(spec, specFactory);
    Object.assign(spec, newSpec);

    // 强制重新创建图表（VChart 目前 updateSpec 有时不生效）
    await destroy();
    await render();
    await onUpdated?.(chart);
  }

  /** 直接设置新 spec */
  function setSpec(newSpec) {
    if (!chart) return;
    chart.updateSpec(newSpec);
  }

  /** 渲染图表 */
  async function render() {
    if (isRendered() || !canRender()) return;

    // 应用当前主题
    VChart.ThemeManager.setCurrentTheme(darkMode.value ? 'dark' : 'light');

    chart = new VChart(spec, {
      dom: domRef.value,
      mode: darkMode.value ? 'dark' : 'light'
    });

    chart.renderSync();
    await onRender?.(chart);
  }

  /** 销毁图表 */
  async function destroy() {
    if (!chart) return;
    await onDestroy?.(chart);
    chart.release();
    chart = null;
  }

  /** 切换主题（明暗） */
  async function changeTheme() {
    await destroy();
    await render();
    await onUpdated?.(chart);
  }

  /** 根据尺寸重新渲染 */
  async function renderChartBySize(w, h) {
    initialSize.width = w;
    initialSize.height = h;

    if (!canRender()) {
      await destroy();
      return;
    }

    if (isRendered()) {
      // VChart 自带 resize 响应式，通常不需要手动调用
      // chart.resize(w, h);
    }

    await render();
  }

  // ==================== 响应式监听 ====================
  scope.run(() => {
    // 尺寸变化 → 重新渲染
    watch([width, height], ([w, h]) => {
      renderChartBySize(w, h);
    });

    // 主题切换 → 重建图表（确保主题生效）
    watch(darkMode, () => {
      changeTheme();
    });
  });

  // 组件卸载时自动清理
  onScopeDispose(() => {
    destroy();
    scope.stop();
  });

  return {
    domRef,
    updateSpec,
    setSpec,
    render,     // 可手动触发
    destroy     // 可手动销毁
  };
}