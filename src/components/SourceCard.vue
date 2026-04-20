<script setup lang="ts">
import { toLatencyLabel } from '@/lib/format'
import type { SourceItem } from '@/types'
import StatusPill from './StatusPill.vue'

defineProps<{
  source: SourceItem
}>()
</script>

<template>
  <article class="source-card">
    <div class="source-card__top">
      <div>
        <div class="source-card__eyebrow">{{ source.key }}</div>
        <h3>{{ source.title }}</h3>
      </div>
      <StatusPill :status="source.health.status" />
    </div>

    <div class="source-card__meta">
      <span>{{ source.language.toUpperCase() }}</span>
      <span>{{ source.engine ?? 'Custom engine' }}</span>
      <span>{{ source.domains.length }} domain<span v-if="source.domains.length !== 1">s</span></span>
    </div>

    <p class="source-card__path">{{ source.path }}</p>

    <dl class="source-card__stats">
      <div>
        <dt>Latency</dt>
        <dd>{{ toLatencyLabel(source.health.latencyMs) }}</dd>
      </div>
      <div>
        <dt>HTTP</dt>
        <dd>{{ source.health.httpStatus ?? '—' }}</dd>
      </div>
      <div>
        <dt>Checked</dt>
        <dd>{{ source.health.checkedAt ? 'Live' : 'Pending' }}</dd>
      </div>
    </dl>

    <div class="domain-list">
      <span v-for="domain in source.domains.slice(0, 4)" :key="domain" class="domain-chip">
        {{ domain }}
      </span>
      <span v-if="source.domains.length > 4" class="domain-chip domain-chip--more">
        +{{ source.domains.length - 4 }} more
      </span>
      <span v-if="!source.domains.length" class="domain-chip domain-chip--more">
        No domain extracted yet
      </span>
    </div>

    <p v-if="source.health.reason" class="source-card__reason">
      {{ source.health.reason }}
    </p>

    <div class="source-card__actions">
      <a :href="source.repoUrl" target="_blank" rel="noreferrer">Open parser</a>
      <a :href="source.rawUrl" target="_blank" rel="noreferrer">Raw file</a>
    </div>
  </article>
</template>
