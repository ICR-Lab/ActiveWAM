# ActiveWAM

**Evidence-Aware Active Vision for World-Action Models**

[Project website](https://icr-lab.github.io/ActiveWAM/) · arXiv: coming soon · Model code: coming soon · RoboTwin-AV repository: coming soon

This repository currently hosts the ActiveWAM project website. Training and evaluation code will be released here later.

## Explore the project

- Real-robot, RoboTwin-AV and TAVIS demonstration videos.
- 24 source sequences and 162 selected head-camera keyframes, with source-aligned pan/tilt visualizations where telemetry is available.
- Method overview and interactive history-appearance studies.
- Manuscript-reported benchmark comparisons and evaluation protocols.
- Included manuscript and supplementary PDF snapshots.

The gallery contains source demonstrations, distinct from scored evaluation rollouts. Appearance-design previews and model-produced prototypes are labeled separately on the website. The currently included PDFs are dated September 14, 2026; the website figures and result tables follow the newer manuscript source.

## Local preview

Requires Node.js 18 or later. No package installation or build is needed.

```bash
node tools/serve.mjs
```

Open <http://127.0.0.1:18106/>. To choose another port: `node tools/serve.mjs 18107`.

## Update the paper and repository links

Edit [`public/site-config.js`](public/site-config.js):

```js
window.ACTIVEWAM_LINKS = {
  arxiv: {url: null, status: 'Coming soon'},
  code: {url: 'https://github.com/ICR-Lab/ActiveWAM', status: 'Coming soon'},
  robotwin: {url: null, status: 'Coming soon'}
};
```

Replace `null` with the actual HTTPS URL when ready, and change `status` to an appropriate release label, for example `Read paper` or `View code`. Unavailable links remain visible without navigating to a placeholder URL. Keep the static fallback entries in `public/index.html` consistent if supporting visitors with JavaScript disabled.

## Website source

| Path | Purpose |
|---|---|
| `public/index.html` | Page content and sections |
| `public/site-config.js` | arXiv, model-code and benchmark-repository links |
| `public/styles.css` | Visual design and responsive layouts |
| `public/app.js` | Gallery, method, inversion and results interactions |
| `public/data.js` | Packaged task metadata and manuscript table values |
| `public/assets/` | Local images, videos, gimbal SVGs, PDFs and fonts |
| `tools/serve.mjs` | Local preview server with video byte-range support |
| `tools/validate.mjs` | Asset and data checks |
| `.github/workflows/deploy-pages.yml` | Automated GitHub Pages deployment |

All runtime assets are bundled locally, with relative paths for project-site hosting. Large videos are loaded on demand. The full website is approximately 199 MB.

## Validation

```bash
node --check public/app.js
node --check public/site-config.js
node tools/validate.mjs
```

With the local server running, include its URL to check HTTP responses and video byte ranges:

```bash
node tools/validate.mjs http://127.0.0.1:18106
```

## Deployment

GitHub Pages uses the **GitHub Actions** source. Pushing website changes to `main` validates the site, uploads only `public/`, and deploys it to:

**<https://icr-lab.github.io/ActiveWAM/>**

The workflow can also be run manually using **Actions → Deploy project homepage → Run workflow**. No application server, external API key or frontend build is required.

## Acknowledgements

The presentation is inspired by the [DreamZero](https://dreamzero0.github.io/), [Cosmos Policy](https://research.nvidia.com/labs/cosmos-lab/cosmos-policy/) and [EasyWAM](https://openmoss.github.io/EasyWAM/) project pages. The website implementation and research media are specific to ActiveWAM. Manrope is distributed under the SIL Open Font License included in `public/assets/fonts/OFL.txt`.
