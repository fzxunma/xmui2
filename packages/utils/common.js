// utils/common.js
import { $t } from '/locales/index.js';

/**
 * 把对象转成 { value, label } 形式的选项数组
 *
 * @example
 *   const record = {
 *     key1: '标签1',
 *     key2: '标签2'
 *   };
 *   const options = transformRecordToOption(record);
 *   // → [{ value: 'key1', label: '标签1' }, { value: 'key2', label: '标签2' }]
 *
 * @param record 键值对对象
 */
export function transformRecordToOption(record) {
  return Object.entries(record).map(([value, label]) => ({
    value,
    label
  }));
}

/**
 * 给选项数组自动加上国际化翻译
 *
 * @param options 选项数组（label 为 i18n key）
 */
export function translateOptions(options) {
  return options.map(option => ({
    ...option,
    label: $t(option.label)
  }));
}

/**
 * 切换 html 元素的 class（常用于 dark 类）
 *
 * @param className 要切换的类名
 * @returns { add, remove } 方法
 */
export function toggleHtmlClass(className) {
  function add() {
    document.documentElement.classList.add(className);
  }

  function remove() {
    document.documentElement.classList.remove(className);
  }

  return { add, remove };
}