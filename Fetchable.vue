<template>
  <div>
    <div v-if="hook.fetch === null" class="w-full flex justify-center">
      <slot name="loading" />
    </div>
    <slot name="error" v-else-if="hook.fetch === false" @click="hook.request">
    </slot>
    <slot v-else />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: ["hook"],
});
</script>
