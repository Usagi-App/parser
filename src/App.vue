<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MetricCard from '@/components/MetricCard.vue'
import SourceCard from '@/components/SourceCard.vue'

import { formatDate, formatNumber } from '@/lib/format'
import { sampleData } from '@/sample-data'
import type { SourceDataset, SourceItem, SourceStatus } from '@/types'

const dataset = ref<SourceDataset>(sampleData)
const loading = ref(true)
const error = ref<string | null>(null)

const rawQuery = ref('')
const query = ref('')

const status = ref<'all' | SourceStatus>('all')
const language = ref('all')
const contentType = ref('all')
const nsfw = ref<'all' | 'safe' | 'nsfw'>('all')
const sort = ref<'title' | 'language' | 'status' | 'domains'>('status')
const view = ref<'grid' | 'list'>('grid')

const page = ref(1)
const perPage = ref(50)
const perPageOptions = [25, 50, 100, 200]

const drawerOpen = ref(false)
const parallaxY = ref(0)

const navItems = [
  { href: '#top', label: 'Home' },
  { href: '#catalog', label: 'Catalog' },
  { href: '#filters', label: 'Filters' },
  { href: '#distribution', label: 'Overview' },
  { href: '#safety', label: 'Notice' },
]

const skeletonMetricCount = [1, 2, 3, 4]
const skeletonCardCount = [1, 2, 3, 4, 5, 6]

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  ru: 'Russian',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  tr: 'Turkish',
  vi: 'Vietnamese',
  id: 'Indonesian',
  th: 'Thai',
  ar: 'Arabic',
  pl: 'Polish',
  uk: 'Ukrainian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  be: 'Belarusian',
  cs: 'Czech',
  multi: 'Multiple',
}

const statusOrder: Record<SourceStatus, number> = {
  working: 0,
  blocked: 1,
  unknown: 2,
  broken: 3,
}

let searchDebounce: number | undefined
let frameId: number | null = null

watch(rawQuery, (value) => {
  window.clearTimeout(searchDebounce)
  searchDebounce = window.setTimeout(() => {
    query.value = value.trim().toLowerCase()
  }, 120)
})

watch([query, status, language, contentType, nsfw, sort, perPage], () => {
  page.value = 1
})

watch(drawerOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

function setView(next: 'grid' | 'list') {
  view.value = next
}

function openDrawer() {
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDrawer()
  }
}

function handleScroll() {
  if (frameId !== null) return

  frameId = window.requestAnimationFrame(() => {
    parallaxY.value = Math.min(window.scrollY, 240)
    frameId = null
  })
}

function getLanguageLabel(source: SourceItem): string {
  return source.languageName || LANGUAGE_NAMES[source.language] || source.language.toUpperCase()
}

function buildSearchText(source: SourceItem): string {
  return [
    source.title,
    source.key,
    source.language,
    getLanguageLabel(source),
    source.engine ?? '',
    source.contentType ?? '',
    source.path,
    source.brokenReason ?? '',
    ...(source.domains ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

function withSearchText(source: SourceItem): SourceItem {
  return {
    ...source,
    languageName: getLanguageLabel(source),
    searchText: source.searchText || buildSearchText(source),
  }
}

function normalizeDataset(next: SourceDataset): SourceDataset {
  return {
    ...next,
    generatedBy: next.generatedBy ?? 'Static bundle',
    byLocale: next.byLocale ?? {},
    byType: next.byType ?? {},
    duplicatesSkipped: next.duplicatesSkipped ?? [],
    summary: {
      ...next.summary,
      nsfw:
        next.summary.nsfw ??
        next.sources.reduce((count, source) => count + (source.nsfw ? 1 : 0), 0),
    },
    sources: next.sources.map(withSearchText),
  }
}

const parallaxStyle = computed(() => ({
  transform: `translate3d(0, ${Math.round(parallaxY.value * 0.18)}px, 0)`,
}))

const languages = computed(() => {
  const values = new Map<string, string>()

  for (const source of dataset.value.sources) {
    if (!source.language) continue
    values.set(source.language, getLanguageLabel(source))
  }

  return [
    { value: 'all', label: 'All languages' },
    ...Array.from(values.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
  ]
})

const contentTypes = computed(() => {
  const values = new Set(dataset.value.sources.map((source) => source.contentType ?? 'MANGA'))
  return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))]
})

const topLocales = computed(() => {
  return Object.entries(dataset.value.byLocale ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
})

const topTypes = computed(() => {
  return Object.entries(dataset.value.byType ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
})

const filteredSources = computed<SourceItem[]>(() => {
  const filtered = dataset.value.sources.filter((source) => {
    const matchesStatus = status.value === 'all' || source.health.status === status.value
    const matchesLanguage = language.value === 'all' || source.language === language.value
    const sourceType = source.contentType ?? 'MANGA'
    const matchesType = contentType.value === 'all' || sourceType === contentType.value

    const matchesNsfw =
      nsfw.value === 'all' ||
      (nsfw.value === 'nsfw' && !!source.nsfw) ||
      (nsfw.value === 'safe' && !source.nsfw)

    const matchesQuery = !query.value || (source.searchText?.includes(query.value) ?? false)

    return matchesStatus && matchesLanguage && matchesType && matchesNsfw && matchesQuery
  })

  return filtered.sort((left, right) => {
    switch (sort.value) {
      case 'title':
        return left.title.localeCompare(right.title)
      case 'language':
        return getLanguageLabel(left).localeCompare(getLanguageLabel(right)) || left.title.localeCompare(right.title)
      case 'domains':
        return (right.domains?.length ?? 0) - (left.domains?.length ?? 0) || left.title.localeCompare(right.title)
      case 'status':
      default:
        return statusOrder[left.health.status] - statusOrder[right.health.status] || left.title.localeCompare(right.title)
    }
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSources.value.length / perPage.value)))

const paginatedSources = computed<SourceItem[]>(() => {
  const start = (page.value - 1) * perPage.value
  return filteredSources.value.slice(start, start + perPage.value)
})

const canGoPrev = computed(() => page.value > 1)
const canGoNext = computed(() => page.value < totalPages.value)

watch(totalPages, (nextTotal) => {
  if (page.value > nextTotal) {
    page.value = nextTotal
  }
})

const qualityScore = computed(() => {
  const total = dataset.value.summary.total || dataset.value.sources.length
  if (!total) return 0
  return Math.round((dataset.value.summary.working / total) * 100)
})

const brokenShare = computed(() => {
  const total = dataset.value.summary.total || dataset.value.sources.length
  if (!total) return 0
  return Math.round((dataset.value.summary.broken / total) * 100)
})

function applyStatus(next: 'all' | SourceStatus) {
  status.value = next
}

function resetFilters() {
  rawQuery.value = ''
  query.value = ''
  status.value = 'all'
  language.value = 'all'
  contentType.value = 'all'
  nsfw.value = 'all'
  sort.value = 'status'
  view.value = 'grid'
  page.value = 1
  perPage.value = 50
}

function goToPage(next: number) {
  page.value = Math.min(Math.max(1, next), totalPages.value)
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeydown)
  handleScroll()

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/sources.json`, {
      cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`Dataset request failed with ${response.status}`)
    }

    const liveData = (await response.json()) as SourceDataset
    dataset.value = normalizeDataset(liveData.sources.length > 0 ? liveData : sampleData)
  } catch (reason) {
    dataset.value = normalizeDataset(sampleData)
    error.value = reason instanceof Error ? reason.message : 'Unknown data loading error'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(searchDebounce)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
  if (frameId !== null) {
    window.cancelAnimationFrame(frameId)
  }
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="shell">
    <header class="topbar" id="top">
      <div class="topbar__brand">
        <span class="topbar__brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 6.5C4 5.4 4.9 4.5 6 4.5H18C19.1 4.5 20 5.4 20 6.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V6.5Z" />
            <path d="M8 4.5V19.5" />
            <path d="M11 8.5H16" />
            <path d="M11 12H16" />
          </svg>
        </span>

        <div>
          <p class="topbar__eyebrow">Parser source catalog</p>
          <strong>Directory only</strong>
        </div>
      </div>

      <nav class="topbar__nav" aria-label="Primary">
        <a v-for="item in navItems" :key="item.href" :href="item.href">{{ item.label }}</a>
      </nav>

      <div class="topbar__actions">
        <a
          class="button button--ghost"
          href="https://github.com/Usagi-App/Parser"
          target="_blank"
          rel="noreferrer noopener"
        >
          Repo
        </a>

        <button
          class="icon-button topbar__menu"
          type="button"
          aria-label="Open navigation drawer"
          @click="openDrawer"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7H20" />
            <path d="M4 12H20" />
            <path d="M4 17H14" />
          </svg>
        </button>
      </div>
    </header>

    <transition name="fade">
      <div v-if="drawerOpen" class="drawer">
        <button class="drawer__overlay" type="button" aria-label="Close drawer" @click="closeDrawer"></button>

        <aside class="drawer__panel">
          <div class="drawer__head">
            <strong>Navigate</strong>

            <button class="icon-button" type="button" aria-label="Close drawer" @click="closeDrawer">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 6L18 18" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </div>

          <nav class="drawer__nav">
            <a
              v-for="item in navItems"
              :key="item.href"
              :href="item.href"
              @click="closeDrawer"
            >
              {{ item.label }}
            </a>
          </nav>

          <a
            class="button button--ghost button--block"
            href="https://github.com/Usagi-App/Parser"
            target="_blank"
            rel="noreferrer noopener"
          >
            Open repository
          </a>
        </aside>
      </div>
    </transition>

    <section class="hero card">
      <div class="hero__copy">
        <p class="hero__eyebrow">Vue / Vite catalog</p>
        <h1 class="hero__title">Clean parser directory with fast search and lighter rendering</h1>

        <p class="hero__text">
          Browse parser entries, domains, languages, and health state without reader logic,
          proxying, or hosted source content.
        </p>

        <div class="hero__actions">
          <a class="button button--primary" href="#catalog">Browse catalog</a>
          <a class="button button--ghost" href="#filters">Open filters</a>
        </div>

        <div class="hero__warning hero__warning--danger" id="safety">
          <strong>Catalog only</strong>
          <p>
            This website lists source metadata for reference and discovery.
            No reader application is provided here, and no source content is hosted,
            cached, or proxied by this website.
          </p>
        </div>
      </div>

      <aside class="hero__art">
        <div class="hero__art-layer" :style="parallaxStyle">
          <div class="hero__glass hero__glass--main">
            <span class="hero__glass-label">Generated</span>
            <strong>{{ formatDate(dataset.generatedAt) }}</strong>
          </div>

          <div class="hero__glass hero__glass--accent">
            <span class="hero__glass-label">Healthy share</span>
            <strong>{{ qualityScore }}%</strong>
          </div>

          <div class="hero__glass hero__glass--soft">
            <span class="hero__glass-label">Broken share</span>
            <strong>{{ brokenShare }}%</strong>
          </div>
        </div>

        <ul class="hero__facts">
          <li>
            <span>Upstream</span>
            <strong>{{ dataset.sourceRepo.owner }}/{{ dataset.sourceRepo.repo }}</strong>
          </li>

          <li>
            <span>Builder</span>
            <a
              v-if="dataset.generatedBy === 'scripts/build_catalog.py'"
              class="meta-link"
              href="https://github.com/Usagi-App/Parser/blob/main/scripts/build_catalog.py"
              target="_blank"
              rel="noreferrer noopener"
            >
              scripts/build_catalog
            </a>
            <strong v-else>{{ dataset.generatedBy ?? 'Static bundle' }}</strong>
          </li>

          <li>
            <span>Entries</span>
            <strong>{{ formatNumber(dataset.summary.total || dataset.sources.length) }}</strong>
          </li>
        </ul>
      </aside>
    </section>

    <section class="metrics-grid" id="distribution">
      <MetricCard
        label="Total sources"
        :value="formatNumber(dataset.summary.total || dataset.sources.length)"
        hint="Unique parser entries extracted from upstream source files"
      />

      <MetricCard
        label="Available"
        :value="formatNumber(dataset.summary.working)"
        hint="Not marked broken upstream"
      />

      <MetricCard
        label="Broken"
        :value="formatNumber(dataset.summary.broken)"
        hint="Explicitly flagged as broken upstream"
      />

      <MetricCard
        label="NSFW"
        :value="formatNumber(dataset.summary.nsfw ?? 0)"
        hint="Entries tagged as adult / explicit"
      />
    </section>

    <section class="info-banner card">
      <div>
        <p>{{ dataset.disclaimer }}</p>

        <p v-if="dataset.duplicatesSkipped?.length" class="info-banner__meta">
          Duplicate parser keys skipped: {{ dataset.duplicatesSkipped.join(', ') }}
        </p>
      </div>

      <p v-if="error" class="info-banner__error">Live dataset failed to load: {{ error }}</p>
    </section>

    <div class="layout">
      <aside class="sidebar card" id="filters">
        <div class="sidebar__section">
          <div class="sidebar__section-head">
            <p class="sidebar__eyebrow">Filters</p>
            <h2>Find a source fast</h2>
          </div>

          <label class="field field--search">
            <span>Search</span>
            <input
              v-model="rawQuery"
              type="search"
              placeholder="Title, language, domain, path, reason…"
              enterkeyhint="search"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            />
          </label>
        </div>

        <div class="sidebar__section">
          <div class="sidebar__label">Status</div>

          <div class="sidebar__chips">
            <button :class="['chip-button', { 'is-active': status === 'all' }]" @click="applyStatus('all')">All</button>
            <button :class="['chip-button', { 'is-active': status === 'working' }]" @click="applyStatus('working')">Working</button>
            <button :class="['chip-button', { 'is-active': status === 'broken' }]" @click="applyStatus('broken')">Broken</button>
            <button :class="['chip-button', { 'is-active': status === 'blocked' }]" @click="applyStatus('blocked')">Blocked</button>
            <button :class="['chip-button', { 'is-active': status === 'unknown' }]" @click="applyStatus('unknown')">Unknown</button>
          </div>
        </div>

        <div class="sidebar__section sidebar__section--stacked">
          <label class="field">
            <span>Language</span>
            <select v-model="language">
              <option v-for="option in languages" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Content type</span>
            <select v-model="contentType">
              <option v-for="option in contentTypes" :key="option" :value="option">
                {{ option === 'all' ? 'All content types' : option }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Content safety</span>
            <select v-model="nsfw">
              <option value="all">All entries</option>
              <option value="safe">Safe only</option>
              <option value="nsfw">NSFW only</option>
            </select>
          </label>

          <label class="field">
            <span>Sort</span>
            <select v-model="sort">
              <option value="status">Status</option>
              <option value="title">Title A–Z</option>
              <option value="language">Language</option>
              <option value="domains">Domain count</option>
            </select>
          </label>
        </div>

        <div class="sidebar__section sidebar__section--centered">
          <div class="sidebar__label">Top locales</div>
          <div class="sidebar__chips">
            <span v-for="[code, count] in topLocales" :key="code" class="sidebar-chip">
              {{ code.toUpperCase() }} · {{ formatNumber(count) }}
            </span>
          </div>
        </div>

        <div class="sidebar__section sidebar__section--centered">
          <div class="sidebar__label">Top content types</div>
          <div class="sidebar__chips">
            <span v-for="[type, count] in topTypes" :key="type" class="sidebar-chip">
              {{ type }} · {{ formatNumber(count) }}
            </span>
          </div>
        </div>

        <div class="sidebar__section sidebar__warning">
          <strong>Third-party websites</strong>
          <p>Opening a website button leaves this catalog and visits a third-party domain.</p>
        </div>

        <div class="sidebar__section sidebar__actions">
          <button class="button button--ghost button--block" @click="resetFilters">Reset filters</button>
        </div>
      </aside>

      <main class="catalog" id="catalog">
        <section class="catalog-toolbar card">
          <div>
            <p class="catalog-toolbar__eyebrow">Catalog</p>
            <h2>Browse source entries</h2>
          </div>

          <div class="catalog-toolbar__controls">
            <div class="segmented">
              <button
                :class="['segmented__item', { 'is-active': view === 'grid' }]"
                @click="setView('grid')"
              >
                Grid
              </button>

              <button
                :class="['segmented__item', { 'is-active': view === 'list' }]"
                @click="setView('list')"
              >
                List
              </button>
            </div>

            <label class="field field--inline catalog-toolbar__per-page">
              <span>Per page</span>
              <select v-model.number="perPage">
                <option v-for="option in perPageOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>

            <p class="controls__count">
              Showing {{ formatNumber(paginatedSources.length) }} of
              {{ formatNumber(filteredSources.length) }} source<span v-if="filteredSources.length !== 1">s</span>
            </p>
          </div>

          <div class="pagination">
            <button
              class="button button--ghost button--small"
              :disabled="!canGoPrev"
              @click="goToPage(page - 1)"
            >
              Prev
            </button>

            <span class="pagination__status">
              Page {{ formatNumber(page) }} / {{ formatNumber(totalPages) }}
            </span>

            <button
              class="button button--ghost button--small"
              :disabled="!canGoNext"
              @click="goToPage(page + 1)"
            >
              Next
            </button>
          </div>
        </section>

        <section v-if="loading" class="loading-shell">
          <div class="metrics-grid">
            <article v-for="item in skeletonMetricCount" :key="item" class="metric-card card skeleton-block"></article>
          </div>

          <div class="catalog-toolbar card skeleton-toolbar"></div>

          <div class="sources sources--grid">
            <article v-for="item in skeletonCardCount" :key="item" class="source-card skeleton-card">
              <div class="skeleton-line skeleton-line--lg"></div>
              <div class="skeleton-line skeleton-line--md"></div>
              <div class="skeleton-chips">
                <span class="skeleton-pill"></span>
                <span class="skeleton-pill"></span>
                <span class="skeleton-pill"></span>
              </div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line skeleton-line--sm"></div>
              <div class="skeleton-actions">
                <span class="skeleton-pill skeleton-pill--btn"></span>
                <span class="skeleton-pill skeleton-pill--btn"></span>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="paginatedSources.length === 0" class="empty-state card">
          <h2>No sources matched your filters.</h2>
          <p>Reset the filters or broaden the search to repopulate the catalog.</p>
        </section>

        <section
          v-else
          :class="[
            'sources',
            `sources--${view}`
          ]"
        >
          <SourceCard
            v-for="source in paginatedSources"
            :key="source.id"
            :source="source"
            :compact="view === 'list'"
          />
        </section>
      </main>
    </div>
  </div>
</template>
