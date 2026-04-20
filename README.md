# made by [InvalidDavid](https://github.com/InvalidDavid)

# Parser Source Catalog

A Vue/Vite catalog for browsing parser sources, extracted domains, and generated source metadata.

## Purpose

This website serves only as an informational catalog of parser sources.

It does not function as a reader application and does not host, cache, proxy, or distribute source content itself.

## What it does

- Pulls parser files from `YakaTeam/kotatsu-parsers`
- Extracts source metadata from `@MangaSourceParser(...)`
- Extracts domains from `ConfigKey.Domain(...)` blocks when present
- Detects whether entries are marked broken in upstream parser metadata
- Writes a static dataset to `public/data/sources.json` during the GitHub Actions build
- Deploys the built site to GitHub Pages

## Important note

This project is designed to refresh itself on GitHub every 24 hours.

You do **not** need a local server for updates after deployment.

## GitHub setup

1. Create a new GitHub repository.
2. Upload or push all project files to the `main` branch.
3. In your repository, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Commit the workflow file at `.github/workflows/pages.yml`.
6. Open the **Actions** tab and run **Build and deploy catalog** once with **Run workflow**.
7. After the first successful run, GitHub Pages will publish your site.

## Local development

```bash
npm install
npm run generate:data
npm run dev
