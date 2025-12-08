import { WebUI } from "jsr:@webui/deno-webui";

function allEvents(e) {
  console.log(`\nallEvents: window = '${e.window}'`);
  console.log(`allEvents: eventType = '${e.eventType}'`);
  console.log(`allEvents: element = '${e.element}'`);
  switch (e.eventType) {
    case WebUI.EventType.Disconnected:
      console.log(`Window closed.`);
      break;
    case WebUI.EventType.Connected:
      console.log(`Window connected.`);
      break;
    case WebUI.EventType.MouseClick:
      console.log(`Mouse click.`);
      break;
    case WebUI.EventType.Navigation: {
      const url = e.arg.string(0);
      console.log(`Navigation to '${url}'`);
      e.window.navigate(url);
      break;
    }
    case WebUI.EventType.Callback:
      console.log(`Function call.`);
      break;
  }
}

function myBackendFunc(e) {
  const a = e.arg.number(0);
  const b = e.arg.number(1);
  const c = e.arg.number(2);
  console.log(`\nFirst argument: ${a}`);
  console.log(`Second argument: ${b}`);
  console.log(`Third argument: ${c}`);
}

const myWindow = new WebUI();

// 关键修复：用 bind 绑定全局事件（"" 表示全局）
myWindow.bind("", allEvents);  // 全局事件监听（Connected, Disconnected, etc.）

// 绑定自定义函数
myWindow.bind("myBackendFunc", myBackendFunc);
myWindow.bind("exit", () => WebUI.exit());

// Set port for WebUI JS
myWindow.setPort(8081);

// 启动 Gateway（你的逻辑）
const gateway = new Deno.Command("deno", {
  args: ["task", "dev"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

// // 等待 Gateway 启动
await new Promise(r => setTimeout(r, 3000));

// 打开浏览器
await myWindow.showBrowser("http://localhost:8000/web", WebUI.Browser.Chrome);

await WebUI.wait();

gateway.kill("SIGTERM");
await gateway.status;

console.log("Thank you.");