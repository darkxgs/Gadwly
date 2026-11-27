# Gadwly

جدولي: موقع بسيط لجدول المحاضرات والسكاشن للمجموعات ١–٧ في الفرقة الأولى ببرنامج تكنولوجيا علوم البيانات، الترم الأول ٢٠٢٦ / ٢٠٢٧.

الموقع: https://gadwlys.vercel.app/

## الاستخدام

اختار المجموعة، وبعدها اليوم. كل موعد موضح كـ«محاضرة» أو «سكشن»، ومعه المحاضر والقاعة. البحث يشمل مواد المجموعة كلها. يمكن مشاركة رابط المجموعة وطباعة الأسبوع من الكمبيوتر.

## How the site is built

Every page is pre-rendered HTML, so a group's whole week is in the first response: it shows on slow connections, on old browsers and with JavaScript turned off.

- `scripts/build.mjs` generates `dist/`: `/` (group picker), `/group/1/` … `/group/7/`, `/source/`, `404.html`, `sitemap.xml` and `robots.txt`. It bundles the CSS and JS into content-hashed files in `/assets/` and fills in the service worker.
- `src/schedule-model.js` is shared by the build, the browser bundle and the tests.
- `src/app.js` only adds extras on top of the HTML: today's view, the next class, search, share, print and the theme setting. A small inline script picks today's day and the saved theme before first paint. Browser code stays within ES2017 so older phones can run it (a test checks this).
- `src/sw.js` keeps visited pages for offline use and falls back to the saved copy if the network takes more than 3 seconds.
- `site/` holds static files copied as-is (PDF, icons, logos, WOFF2 fonts, manifest). `site/portal.js` only redirects phones still running the old app.
- Old links like `/?group=5#week` redirect to `/group/5/#week` (in `vercel.json`, with a fallback in the inline script).

`dist/` is generated; do not edit it.

## التشغيل محليًا

Requires Node.js 18 or later. No npm dependencies are needed.

```sh
npm run preview
```

Open http://127.0.0.1:5173/ .

```sh
npm test
```

`npm test` builds the site and then checks the data, every generated page and every local link.

## البيانات والتحقق

- `site/timetable-2026-2027.pdf`: the university's "last update 3" timetable (one page, first year), received 2026-11-27 and copied unchanged. It splits the year into 7 groups instead of the previous 12.
- `data/timetable.json`: 100 group-specific entries expanded from shared cells. Cells spanning three or more groups in one room are lectures; smaller cells, and Eng. Shimaa's Thursday IT cells printed in two rooms (`G204|G206`), are sections.
- `source-audit.json`: source-cell mapping and PDF checksum.
- Groups 4 and 7 have an extra Tuesday IT section (14:00–15:00, G202) besides Thursday's. Both are kept as printed and shown with a warning.
- Two Tuesday Digital Transformation cells (Group 6, Group 7) are drawn across two hour rows; they are placed in the hour where their text sits (10:00 and 11:00) and carry a note.
- `OL` (Thursday 16:00 IT lecture) is preserved as printed.
- Old links to groups 8–12 redirect to the home page with a notice to pick a group again (`vercel.json`).
- Timetable data is static and does not auto-sync university changes. No claim of ongoing official verification is made.

The transcription script is a reviewed transcription of this specific PDF, not a general PDF parser. To regenerate it with the original source file:

```sh
python scripts/transcribe.py site/timetable-2026-2027.pdf
npm test
```

## الخصوصية

No account, grades, private notes, personal APK or API keys are included. Vercel Web Analytics (cookieless, aggregate page views) is loaded from `/_vercel/insights/script.js` on Vercel deployments; it 404s harmlessly in local preview. Only the last selected group and theme preference (light by default; dark or system can be chosen in Settings) are stored locally in the browser. The maker credit and profile links appear in Settings.

## الخط

IBM Plex Sans Arabic is bundled as WOFF2 (converted losslessly from the original TTF) under the SIL Open Font License in `site/fonts/OFL.txt`. Fonts are served with a one-year immutable cache, so give a changed font file a new name.

## Vercel

Import this GitHub repository with **Root Directory** set to the repository root (leave it empty or use `.`). `vercel.json` sets the framework to Other, runs `npm test` (build plus tests) and serves `dist/`.

## Logo

The calendar/check identity is provided as self-contained SVG outlines, with transparent PNG exports in `site/jadwaly-logo-dark.*` and `site/jadwaly-logo-light.*`. The header changes between the two variants with the theme. The compact mark is also used for the favicon and install icons. Typeface: IBM Plex Sans Arabic (OFL).
