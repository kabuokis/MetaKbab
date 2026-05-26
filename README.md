# MetaKbab

> Strip the metadata. Keep the photo.

**MetaKbab** is a free, open-source photo metadata remover that runs entirely in your browser. Your photos never leave your device — not even for a millisecond.

**Live site:** [meta.kbab.lt](https://meta.kbab.lt)

---

## Features

- **Strip all** — completely remove every EXIF/metadata tag
- **Randomize** — replace metadata with convincing fake values (GPS, device, date)
- **Custom override** — set your own fake metadata manually
- **Strip GPS only** — remove just location data, keep everything else
- **Bulk upload** — process dozens of photos at once
- **Download as ZIP** — get all cleaned photos in one file
- **Auto dark/light theme** — follows your OS, with manual toggle
- **No install, no signup, no server** — just open the page

## How it works

Photos are loaded into browser memory using the [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API). Each image is re-drawn onto an HTML5 `<canvas>` element and exported as a fresh image file — completely free of the original metadata. The output is downloaded directly to your device.

**No data is ever transmitted anywhere.** You can verify this yourself — the source is right here, and the site works offline.

## Tech stack

| Layer | Tech |
|---|---|
| Language | Vanilla HTML + CSS + JavaScript |
| Metadata strip | HTML5 Canvas API |
| ZIP packaging | [JSZip](https://stuk.github.io/jszip/) (CDN) |
| Hosting | Cloudflare Pages |
| Source | GitHub |

No build step. No npm. No framework. Just files.

## Project structure

```
/
├── index.html      # App shell & markup
├── style.css       # All styles, dark/light themes
├── script.js       # All logic — file handling, processing, ZIP
├── favicon.svg     # Site icon
├── README.md       # You are here
└── LICENSE         # MIT
```

## Run locally

No build step needed:

```bash
git clone https://github.com/kabuokis/MetaKbab.git
cd MetaKbab
# Open index.html in your browser — that's it
```

Or serve with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Deploy to Cloudflare Pages

1. Fork this repo
2. Go to [Cloudflare Pages](https://pages.cloudflare.com)
3. Connect your GitHub repo
4. Build command: *(leave empty)*
5. Output directory: `/` (root)
6. Done — auto-deploys on every push

## Contributing

PRs welcome. Ideas for future features:

- [ ] Preview detected metadata before stripping
- [ ] Selective tag whitelist (keep specific fields)
- [ ] True EXIF write support for randomize/custom modes
- [ ] Drag to reorder photo queue
- [ ] Dark/light theme animation

## License

[MIT](LICENSE) — free to use, fork, modify, and distribute.

---

Made with 🥙 and a healthy distrust of metadata.
