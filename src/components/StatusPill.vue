<script setup lang="ts">
import { titleCaseStatus } from '@/lib/format'
import type { SourceStatus } from '@/types'

defineProps<{
  status: SourceStatus
}>()
</script>

<template>
  <span class="status-pill" :data-status="status">
    {{ titleCaseStatus(status) }}
  </span>
</template>
