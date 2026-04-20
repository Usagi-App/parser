import type { SourceDataset } from '@/types'

export const sampleData: SourceDataset = {
  generatedAt: null,
  sourceRepo: {
    owner: 'AgentKush',
    repo: 'kotatsu-parsers',
    branch: 'master',
  },
  disclaimer:
    'This is demo data bundled with the UI. Run the generator or GitHub Action to fetch the full live catalog and refresh health checks.',
  summary: {
    total: 3,
    working: 0,
    broken: 0,
    blocked: 0,
    unknown: 3,
  },
  sources: [
    {
      id: 'MANGATOWN',
      key: 'MANGATOWN',
      title: 'MangaTown',
      language: 'en',
      engine: 'PagedMangaParser',
      path: 'src/main/kotlin/org/koitharu/kotatsu/parsers/site/en/MangaTownParser.kt',
      repoUrl:
        'https://github.com/AgentKush/kotatsu-parsers/blob/master/src/main/kotlin/org/koitharu/kotatsu/parsers/site/en/MangaTownParser.kt',
      rawUrl:
        'https://raw.githubusercontent.com/AgentKush/kotatsu-parsers/master/src/main/kotlin/org/koitharu/kotatsu/parsers/site/en/MangaTownParser.kt',
      domains: ['www.mangatown.com'],
      health: {
        status: 'unknown',
        checkedAt: null,
        latencyMs: null,
        httpStatus: null,
        finalUrl: null,
        reason: 'Demo entry only. No live health check has been executed yet.',
      },
    },
    {
      id: 'DESUME',
      key: 'DESUME',
      title: 'Desu',
      language: 'ru',
      engine: 'PagedMangaParser',
      path: 'src/main/kotlin/org/koitharu/kotatsu/parsers/site/ru/DesuMeParser.kt',
      repoUrl:
        'https://github.com/AgentKush/kotatsu-parsers/blob/master/src/main/kotlin/org/koitharu/kotatsu/parsers/site/ru/DesuMeParser.kt',
      rawUrl:
        'https://raw.githubusercontent.com/AgentKush/kotatsu-parsers/master/src/main/kotlin/org/koitharu/kotatsu/parsers/site/ru/DesuMeParser.kt',
      domains: ['x.desu.city', 'desu.city', 'desu.work', 'desu.store', 'desu.win'],
      health: {
        status: 'unknown',
        checkedAt: null,
        latencyMs: null,
        httpStatus: null,
        finalUrl: null,
        reason: 'Demo entry only. No live health check has been executed yet.',
      },
    },
    {
      id: 'OTRUYEN',
      key: 'OTRUYEN',
      title: 'OTruyen',
      language: 'vi',
      engine: 'PagedMangaParser',
      path: 'src/main/kotlin/org/koitharu/kotatsu/parsers/site/vi/OTruyenParser.kt',
      repoUrl:
        'https://github.com/AgentKush/kotatsu-parsers/blob/master/src/main/kotlin/org/koitharu/kotatsu/parsers/site/vi/OTruyenParser.kt',
      rawUrl:
        'https://raw.githubusercontent.com/AgentKush/kotatsu-parsers/master/src/main/kotlin/org/koitharu/kotatsu/parsers/site/vi/OTruyenParser.kt',
      domains: [],
      health: {
        status: 'unknown',
        checkedAt: null,
        latencyMs: null,
        httpStatus: null,
        finalUrl: null,
        reason: 'Demo entry only. This parser file needs the generator to extract live domains.',
      },
    },
  ],
}
