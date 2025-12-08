// constants/theme.js 或 constants/app.js
import { transformRecordToOption } from '/utils/common';

/** 全局菜单占位 ID */
export const GLOBAL_HEADER_MENU_ID = '__GLOBAL_HEADER_MENU__';
export const GLOBAL_SIDER_MENU_ID = '__GLOBAL_SIDER_MENU__';

/** 主题模式选项（用于下拉框） */
export const themeSchemaRecord = {
  light: 'theme.appearance.themeSchema.light',
  dark: 'theme.appearance.themeSchema.dark',
  auto: 'theme.appearance.themeSchema.auto'
};

export const themeSchemaOptions = transformRecordToOption(themeSchemaRecord);

/** 登录模块选项 */
export const loginModuleRecord = {
  'pwd-login': 'page.login.pwdLogin.title',
  'code-login': 'page.login.codeLogin.title',
  register: 'page.login.register.title',
  'reset-pwd': 'page.login.resetPwd.title',
  'bind-wechat': 'page.login.bindWeChat.title'
};

/** 布局模式 */
export const themeLayoutModeRecord = {
  vertical: 'theme.layout.layoutMode.vertical',
  'vertical-mix': 'theme.layout.layoutMode.vertical-mix',
  'vertical-hybrid-header-first': 'theme.layout.layoutMode.vertical-hybrid-header-first',
  horizontal: 'theme.layout.layoutMode.horizontal',
  'top-hybrid-sidebar-first': 'theme.layout.layoutMode.top-hybrid-sidebar-first',
  'top-hybrid-header-first': 'theme.layout.layoutMode.top-hybrid-header-first'
};

export const themeLayoutModeOptions = transformRecordToOption(themeLayoutModeRecord);

/** 内容区滚动模式 */
export const themeScrollModeRecord = {
  wrapper: 'theme.layout.content.scrollMode.wrapper',
  content: 'theme.layout.content.scrollMode.content'
};

export const themeScrollModeOptions = transformRecordToOption(themeScrollModeRecord);

/** 多标签页风格 */
export const themeTabModeRecord = {
  chrome: 'theme.layout.tab.mode.chrome',
  button: 'theme.layout.tab.mode.button',
  slider: 'theme.layout.tab.mode.slider'
};

export const themeTabModeOptions = transformRecordToOption(themeTabModeRecord);

/** 页面切换动画 */
export const themePageAnimationModeRecord = {
  'fade-slide': 'theme.layout.content.page.mode.fade-slide',
  fade: 'theme.layout.content.page.mode.fade',
  'fade-bottom': 'theme.layout.content.page.mode.fade-bottom',
  'fade-scale': 'theme.layout.content.page.mode.fade-scale',
  'zoom-fade': 'theme.layout.content.page.mode.zoom-fade',
  'zoom-out': 'theme.layout.content.page.mode.zoom-out',
  none: 'theme.layout.content.page.mode.none'
};

export const themePageAnimationModeOptions = transformRecordToOption(themePageAnimationModeRecord);

/** 暗色模式 class */
export const DARK_CLASS = 'dark';

/** 水印时间格式选项（直接可用在 Select 组件） */
export const watermarkTimeFormatOptions = [
  { label: 'YYYY-MM-DD HH:mm', value: 'YYYY-MM-DD HH:mm' },
  { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
  { label: 'YYYY/MM/DD HH:mm', value: 'YYYY/MM/DD HH:mm' },
  { label: 'YYYY/MM/DD HH:mm:ss', value: 'YYYY/MM/DD HH:mm:ss' },
  { label: 'HH:mm', value: 'HH:mm' },
  { label: 'HH:mm:ss', value: 'HH:mm:ss' },
  { label: 'MM-DD HH:mm', value: 'MM-DD HH:mm' }
];