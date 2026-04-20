import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const outputPath = path.join(rootDir, 'public', 'data', 'sources.json')

const config = {
  owner: process.env.KOTATSU_OWNER ?? 'YakaTeam',
  repo: process.env.KOTATSU_REPO ?? 'kotatsu-parsers',
  branch: process.env.KOTATSU_BRANCH ?? 'master',
  githubToken: process.env.GITHUB_TOKEN ?? '',
  concurrency: Number(process.env.CHECK_CONCURRENCY ?? 12),
  timeoutMs: Number(process.env.CHECK_TIMEOUT_MS ?? 8000),
  includeHealthChecks: (process.env.SKIP_HEALTH_CHECKS ?? 'false') !== 'true',
}

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'kotatsu-source-watch',
  ...(config.githubToken ? { Authorization: `Bearer ${config.githubToken}` } : {}),
}

const httpHeaders = {
  'User-Agent':
    'Mozilla/5.0 (compatible; KotatsuSourceWatch/1.0; +https://github.com/YakaTeam/kotatsu-parsers)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const annotationPattern = /@MangaSourceParser\(([^)]*)\)/m
const classPattern = /class\s+\w+\([^)]*\)\s*:\s*([A-Za-z0-9_]+)/m
const domainBlockPattern = /ConfigKey\.Domain\(([^)]*)\)/gs
const domainLikePattern = /(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})(?:\/|"|'|\s|,|\))/gi

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...githubHeaders,
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Request failed: ${response.status} ${response.statusText} at ${url}\n${body}`)
  }

  return response.json()
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} at ${url}`)
  }
  return response.text()
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length)
  let index = 0

  async function worker() {
    while (true) {
      const current = index
      index += 1
      if (current >= items.length) return
      results[current] = await mapper(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, () => worker())
  await Promise.all(workers)
  return results
}

function parseStrings(fragment) {
  return Array.from(fragment.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g), (match) => match[1])
}

function extractDomains(content) {
  const domains = []

  for (const block of content.matchAll(domainBlockPattern)) {
    const values = parseStrings(block[1])
    domains.push(...values)
  }

  if (domains.length === 0) {
    for (const match of content.matchAll(domainLikePattern)) {
      domains.push(match[1])
    }
  }

  return Array.from(
    new Set(
      domains
        .map((domain) => domain.trim().toLowerCase())
        .filter((domain) => domain.includes('.'))
        .filter((domain) => !domain.endsWith('.kt'))
        .filter((domain) => !domain.includes('org.koitharu')),
    ),
  )
}

function parseParserFile(entry, content) {
  const annotationMatch = content.match(annotationPattern)
  if (!annotationMatch) return null

  const strings = parseStrings(annotationMatch[1])
  const [key, title, language] = strings
  if (!key || !title || !language) return null

  const engine = content.match(classPattern)?.[1] ?? null
  const domains = extractDomains(content)

  return {
    id: key,
    key,
    title,
    language,
    engine,
    path: entry.path,
    repoUrl: `https://github.com/${config.owner}/${config.repo}/blob/${config.branch}/${entry.path}`,
    rawUrl: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${entry.path}`,
    domains,
    health: {
      status: 'unknown',
      checkedAt: null,
      latencyMs: null,
      httpStatus: null,
      finalUrl: null,
      reason: domains.length
        ? 'No health check executed yet.'
        : 'No domain extracted from parser file. Health is unknown.',
    },
  }
}

function buildSummary(sources) {
  return sources.reduce(
    (summary, source) => {
      summary.total += 1
      summary[source.health.status] += 1
      return summary
    },
    { total: 0, working: 0, broken: 0, blocked: 0, unknown: 0 },
  )
}

function classifyHttpStatus(status) {
  if (status >= 200 && status < 400) return 'working'
  if ([401, 403, 429].includes(status)) return 'blocked'
  if ([404, 410].includes(status) || status >= 500) return 'broken'
  return 'unknown'
}

async function healthCheckDomain(domain) {
  const candidates = [`https://${domain}`, `http://${domain}`]
  let lastResult = null

  for (const url of candidates) {
    const startedAt = Date.now()

    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: httpHeaders,
        signal: AbortSignal.timeout(config.timeoutMs),
      })

      const result = {
        status: classifyHttpStatus(response.status),
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        httpStatus: response.status,
        finalUrl: response.url,
        reason:
          response.status >= 200 && response.status < 400
            ? 'Endpoint responded successfully.'
            : `Endpoint responded with HTTP ${response.status}.`,
      }

      if (result.status === 'working') return result
      lastResult = result
    } catch (error) {
      lastResult = {
        status: 'broken',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        httpStatus: null,
        finalUrl: url,
        reason: error instanceof Error ? error.message : 'Unknown network error.',
      }
    }
  }

  return lastResult ?? {
    status: 'unknown',
    checkedAt: new Date().toISOString(),
    latencyMs: null,
    httpStatus: null,
    finalUrl: null,
    reason: 'No network verdict could be produced.',
  }
}

async function main() {
  const treeUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`
  const tree = await fetchJson(treeUrl)

  const parserEntries = tree.tree.filter(
    (entry) =>
      entry.type === 'blob' &&
      entry.path.includes('/parsers/site/') &&
      entry.path.endsWith('.kt') &&
      !entry.path.endsWith('/package-info.kt'),
  )

  const parsed = await mapLimit(parserEntries, config.concurrency, async (entry) => {
    const rawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${entry.path}`
    const content = await fetchText(rawUrl, { headers: httpHeaders })
    return parseParserFile(entry, content)
  })

  const sources = parsed.filter(Boolean)

  if (config.includeHealthChecks) {
    await mapLimit(sources, config.concurrency, async (source) => {
      const domain = source.domains[0]
      if (!domain) {
        source.health.reason = 'No primary domain found in parser file.'
        return source
      }

      source.health = await healthCheckDomain(domain)
      return source
    })
  }

  sources.sort((left, right) => left.title.localeCompare(right.title))

  const dataset = {
    generatedAt: new Date().toISOString(),
    sourceRepo: {
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
    },
    summary: buildSummary(sources),
    sources,
    disclaimer:
      'Health checks are network-level probes, not full parser integration tests. A blocked status usually means anti-bot or rate-limit behavior, not necessarily a dead parser.',
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(dataset, null, 2))

  console.log(`Saved ${sources.length} sources to ${outputPath}`)
  console.log(dataset.summary)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
