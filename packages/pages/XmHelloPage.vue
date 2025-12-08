<template>
  <div style="padding: 40px; font-family: system-ui;">
    <h1>测试 XmCount 组件</h1>
    <XmCount />
    <XmCount />
    <XmCount />
  </div>
  <div @click="increment" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Count is:{{ count.test
    }}</div>
  <n-button type="error" @click="increment">Click Me</n-button>
</template>
<script setup>
import { ref } from 'vue';
import XmCount from "/components/XmCount.vue"
const count = ref({ test: 0 });
const increment = () => {
  count.value.test++;
};
defineOptions({
  components: {
    XmCount   // ← 这一行加上就活了！
  }
});
console.log(XmCount)
</script>
