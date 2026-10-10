# Dimed Stats

Courtside volleyball stat tracking by Dimed. Installable web app (PWA) built with plain
HTML, CSS, and JavaScript. No build step, no dependencies, works offline.

## Run it locally

Run from the repo root (where `index.html` is):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Put it on your players' and coaches' phones

The app is a folder of static files, so any static host works (Netlify, Vercel, GitHub Pages,
Cloudflare Pages, your own site). It must be served over HTTPS for install and offline mode.

1. Upload the contents of the repo root (`index.html` and the files next to it).
2. Open the URL on the phone or iPad.
3. iPhone/iPad: Share, then Add to Home Screen. Android/Chrome: tap Install app.

After the first load it works with no signal. Stats are saved on the device.
Use More, then Save backup, to move data between devices.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell |
| `styles.css` | Dimed look and layout (dark theme, blue accent) |
| `app.js` | All app logic: scoring, rotation, ratings, hit landings, stats, export |
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
- Sets end on their own at 25, win by 2 (the deciding set at 15). A sheet shows the result and the
  next set starts, with the serve going to the team that received first last set. Set the match to
  best of 3 or 5 under More, or turn automatic set endings off and use Next set yourself.
- The match ends when a team wins enough sets; the scoreboard shows FINAL and stops logging.
- Undo works across a set or match ending: it takes back the winning point and reopens that set.
- Subs: on the Game screen, tap In on a bench player and pick the zone they take, or Out on a court
  player and pick who replaces them. Stats stay with each player; the bench shows the subs this set.
- Every set starts with an empty court. Fill it from the bench with In, on the Court tab, or with
  Same lineup as set N, which reuses the previous set's starting six.

## Tracking where hits land

The Game screen has a "Where did it land?" court (our side on the left, theirs on the right).

- Tap the court where the ball lands, then log the play. The spot attaches to the next hit-type play
  (kill, attack, attack error, serve, ace, serve error, block kill, transition hit or kill).
- Or log the play first, then tap the court within 20 seconds to add the spot to that play.
- Taps outside the lines count as out. Zones 1–6 are numbered from each team's own side.
- Dots are green for points, red for errors, and blue for in play.
- Digs, sets, passes, and other actions never take a spot. A pending spot waits for the next hit.
- Their player's hits are never stored, so a pending spot is dropped on their play.
- Stats, then Hit map, shows every landing with filters for set, player, and result. Dots shows each
  spot, and Zones shows counts and percentages per zone.
- Turn it off under More, then Track where hits land.

## Excel export

Totals, one sheet per set, Scores, Landings (zone counts per player), and a full Play log
(every play with its quality rating, landing zone, and Land X / Land Y in meters:
X runs 0–18 from our baseline to theirs, Y runs 0–9 down from the top sideline).
