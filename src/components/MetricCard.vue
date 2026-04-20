<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint: string
}>()
</script>

<template>
  <article class="metric-card">
    <p class="metric-label">{{ label }}</p>
    <strong class="metric-value">{{ value }}</strong>
    <p class="metric-hint">{{ hint }}</p>
  </article>
</template>
