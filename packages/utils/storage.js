// utils/storage.js
import { useStorage } from '@vueuse/core';

// 模拟 localStorage 的 Deno 安全封装
const safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[Storage] 写入失败:', e.message);
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // 忽略
    }
  }
};

// 前缀（从环境变量或默认空）
const storagePrefix = 'xm';

/**
 * 模拟 @sa/utils 的 createStorage，基于 useStorage
 * @param {string} type - 'local' 或 'session'
 */
function createStorage(type) {
  const storage = type === 'local' ? safeStorage : sessionStorage;

  return {
    get(key) {
      const fullKey = storagePrefix ? `${storagePrefix}_${key}` : key;
      const value = storage.getItem(fullKey);
      try {
        return value ? JSON.parse(value) : null;
      } catch {
        return value; // 如果不是 JSON，就返回原始字符串
      }
    },
    set(key, value) {
      const fullKey = storagePrefix ? `${storagePrefix}_${key}` : key;
      storage.setItem(fullKey, JSON.stringify(value));
    },
    remove(key) {
      const fullKey = storagePrefix ? `${storagePrefix}_${key}` : key;
      storage.removeItem(fullKey);
    }
  };
}

// 导出 localStg 和 sessionStg
export const localStg = createStorage('local');
export const sessionStg = createStorage('session');

// 可选：localforage 兼容（如果你的项目没用，删掉这部分）
export function createLocalforage() {
  return localStg; // 直接复用 localStg，保持接口一致
}