# Gadwly

جدولي: موقع بسيط لجدول المحاضرات والسكاشن للمجموعات ١–١٢ في الفرقة الأولى ببرنامج تكنولوجيا علوم البيانات، الترم الأول ٢٠٢٦ / ٢٠٢٧.

الموقع: https://jadwaly-hitu.rare-lime-3085.chatgpt.site/

## الاستخدام

اختار المجموعة، وبعدها اليوم. كل موعد موضح كـ«محاضرة» أو «سكشن»، ومعه المحاضر والقاعة. البحث يشمل مواد المجموعة كلها. يمكن مشاركة رابط المجموعة وطباعة الأسبوع من الكمبيوتر.

## التشغيل محليًا

Requires Node.js 18 or later. No npm dependencies are needed.

```sh
npm run preview
```

Open http://127.0.0.1:5173/ .

```sh
npm test
```

## البيانات والتحقق

- `dist/timetable-2026-2027.pdf`: original university timetable supplied for this project, copied unchanged.
- `dist/timetable.json`: 154 group-specific entries expanded from shared cells. Large shared cells are lectures; smaller cells, including shared two-group practicals, are sections.
- `source-audit.json`: source-cell mapping and PDF checksum.
- Two Thursday times were explicitly clarified by the project owner: Group 1 IT 10:00–11:00 in G106; Group 6 Statistics 11:30–12:30 in G105. These clarifications are documented in the site. They are not a new university announcement.
- Sunday Physics 17:00–18:00 for Groups 1–6 has no room in the PDF; it remains unknown. `OL` is preserved as printed.
- Timetable data is static and does not auto-sync university changes. No claim of ongoing official verification is made.

The transcription script is a reviewed transcription of this specific PDF, not a general PDF parser. To regenerate it with the original source file:

```sh
python scripts/transcribe.py dist/timetable-2026-2027.pdf
npm test
```

## النشر

Serve `dist/` on a static HTTPS host. The included service worker supports previously cached assets offline. Existing URLs use `?group=5#week` for a selected group.

## الخصوصية

No account, grades, private notes, personal APK, analytics scripts or API keys are included. Only the last selected group and theme preference (light/dark/system) are stored locally in the browser. The maker credit and profile links appear in Settings.

## الخط

IBM Plex Sans Arabic is bundled under the SIL Open Font License in `dist/fonts/OFL.txt`.

## Vercel

Import this GitHub repository with **Root Directory** set to the repository root (leave it empty or use `.`). The included `vercel.json` sets the framework to Other, validates with `npm test`, and serves `dist/`. No SPA rewrite is needed because navigation uses query parameters and URL hashes.

If an older deployment shows NOT_FOUND, deploy the latest `main` commit. Do not set the root directory to `dist` when using this root-level configuration.
