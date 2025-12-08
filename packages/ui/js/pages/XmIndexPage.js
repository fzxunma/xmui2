import { ref } from "vue";
// import XmCount from "../components/XmCount.vue";
export default {
  name: "XmIndexPage",
  setup() {
    const message = ref("Hello vue!");
    const b2Data = ref(null);
    const users = ref(null);

    async function fetchB2() {
      try {
        const response = await fetch("/b3");
        if (response.ok) {
          b2Data.value = await response.json();
        }
      } catch (error) {
        console.error("Fetch /b2 error:", error);
      }
    }
    const count = ref(0);
    const increment = () => {
      count.value++;
    };
    fetchB2();
    const meeting = ref({
      name: "示例会议",
      date: "2025-08-01",
      location: "在线",
      notes1: "# 会议议程1\n- 开场",
      notes2: "# 会议议程2\n- 产品演示",
    });
    return { message, b2Data, users, meeting, count, increment };
  },
  template: `
      <div class="p-4">
        <div @click="increment" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Count撒旦杀杀杀dd发vue is:
    {{ count }}</div>
      <RouterLink to="/pages/hello">Go to Hello</RouterLink><br/>
         <RouterLink to="/pages/XmHelloPage3.js">Go to Hello3</RouterLink><br/>
           <RouterLink to="/pagesv3/XmHelloPage.vue">Go to Hello vue</RouterLink><br/>
            <RouterLink to="/pages/hello">Go to Hello</RouterLink>
      <RouterLink to="/pagesv3/formCreate">Go to FormCreate</RouterLink>
        <h1>{{ message }}</h1>
          <n-button type="primary" @click="increment">Click Me</n-button>
               <XmCount  />
        <p v-if="b2Data">B2 Message: {{ b2Data.message }}</p>
        <p v-else>Loading B2...</p>
        <div v-if="users">
          <h2>User List</h2>
          <ul>
            <li v-for="user in users" :key="user.id">
              {{ user.data.username }} ({{ user.data.email }})
            </li>
          </ul>
        </div>
        <p v-else>Loading users...</p>
              </div>
    `,
};
