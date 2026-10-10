# Dimed Stats

Courtside volleyball stat tracking by Dimed. Installable web app (PWA) built with plain
HTML, CSS, and JavaScript. No build step, no dependencies, works offline.

## Run it locally

```bash
cd dimed-stats
python3 -m http.server 8000
# open http://localhost:8000
```

## Put it on your players' and coaches' phones

The app is a folder of static files, so any static host works (Netlify, Vercel, GitHub Pages,
Cloudflare Pages, your own site). It must be served over HTTPS for install and offline mode.

1. Upload the whole `dimed-stats` folder.
2. Open the URL on the phone or iPad.
3. iPhone/iPad: Share, then Add to Home Screen. Android/Chrome: tap Install app.

After the first load it works with no signal. Stats are saved on the device.
Use More, then Save backup, to move data between devices.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell |
| `styles.css` | Dimed look and layout |
| `app.js` | All app logic: scoring, rotation, ratings, stats, export |
| `xlsx.js` | Small built-in Excel (.xlsx) writer |
| `sw.js` | Service worker for offline use (bump `CACHE` when you change files) |
| `manifest.webmanifest`, `icons/` | Install metadata and app icons |

## How scoring works

- Kill, ace, block kill, and transition kill score a point for your team.
- Attack, serve, and reception errors and net/foot faults score a point for the other team.
- Block assist is credit only (log the point with Block kill).
- Their player: tap it, then tap an action. Their points and errors move the score,
  and nothing about their player is stored in the stats or the Excel export.
- Auto-rotate turns the court clockwise when you win a point while they were serving.
- Undo reverses the last play, including the score, serve, and any auto-rotation.

## Excel export

Totals, one sheet per set, Scores, and a full Play log (every play with its quality rating).
