# AI Standards

Standards for using AI without giving up judgment, accountability, or the human part of working with other people.

The published site is [cbmasri.github.io/ai-standards](https://cbmasri.github.io/ai-standards/).

The source is [`standards.md`](standards.md).

## Build

```bash
npm ci
npm run build
```

The static site is written to `build/`. Set `BASE_PATH` when the site is served from a subpath. The GitHub Pages workflow sets this from the Pages base path.
