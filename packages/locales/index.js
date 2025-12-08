// locales/index.js
import { watch } from 'vue'
import { createI18n } from 'vue-i18n';
import { localStg } from '/utils/storage.js';
import messages from './locale.js'; // 你的语言包目录

// 创建 i18n 实例（Composition API 模式）
const i18n = createI18n({
    legacy: false,                    // 必须关闭 legacy 模式，才能用 Composition API
    locale: localStg.get('lang') || 'zh-CN',
    fallbackLocale: 'en',
    messages,
    globalInjection: true,            // 全局注入 $t
    silentTranslationWarn: true       // 开发时安静点
});

/**
 * 在 Vue 应用中安装 i18n
 *
 * @param {import('vue').App} app
 */
export function setupI18n(app) {
    app.use(i18n);
}

/**
 * 全局 $t 函数（直接在 setup 或模板中使用）
 * 用法：$t('page.login.title')
 */
export const $t = i18n.global.t;

/**
 * 动态切换语言
 *
 * @param {string} locale - 'zh-CN' | 'en' | 'ja' ...
 */
export function setLocale(locale) {
    if (i18n.global.locale.value === locale) return;

    i18n.global.locale.value = locale;
    localStg.set('lang', locale);

    // 可选：触发一次全局更新（确保所有组件重新渲染）
    document.documentElement.setAttribute('lang', locale);
}

// 可选：监听语言变化，动态更新 <html lang="">
watch(() => i18n.global.locale.value, (newLocale) => {
    document.documentElement.setAttribute('lang', newLocale.split('-')[0]);
});

export default i18n;