import { createApp } from "vue";
import { createPinia } from 'pinia'
import XmRounterPage from "./pages/XmRounterPage.js";
import router from "./router/index.js";
import naive from "naive-ui";
import umodoc from "umodoc";
class XmAppWeb {
  static async loadApp() {
    const pinia = createPinia()
    const App = createApp(XmRounterPage);
    App.use(pinia)
    for (const compName in naive) {
      const component = naive[compName];
      if (component && component.name) {
        App.component(component.name, component);
      }
    }

    App.use(umodoc.useUmoEditor,{});
    App.use(naive);
    App.use(router);
    App.mount("#app");
  }
}

try {
  await XmAppWeb.loadApp();
} catch (error) {
  console.error("Failed to load app:", error);
}
