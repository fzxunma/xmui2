<script setup>
import { useCounterStore } from "../store/counter.js"
const counter = useCounterStore();
</script>
<template>
  <div @click="counter.increment" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Count撒旦杀杀杀dd发vue is:
    {{ counter.count }}</div>
  <n-button type="error" @click="counter.increment">ddClick Me</n-button>
</template>
