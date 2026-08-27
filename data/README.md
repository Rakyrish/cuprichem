# Catalogue data — how to supply real products

Fill in the CSVs here with **verified** Cuprichem data, then run:

```bash
npm run import:catalog     # writes src/data/taxonomy.ts
npm run typecheck && npm run build
```

The importer never invents anything — blank cells stay empty, and a product with
no specs simply shows a "pending" panel. Products marked `verified=false` or
`status` other than `published` are reachable but **noindex + kept out of the
sitemap** (safe for drafts).

## Files

- **`catalog.csv`** (required) — one row per product. Copy `catalog.template.csv`
  to `catalog.csv` and replace the example rows.
- **`categories.csv`** (optional) — summaries/intros for categories. Any category
  named in `catalog.csv` is created automatically; this file only adds nicer copy.
- **`industries.csv`** (optional) — summaries for industries referenced by products.
  Without a summary an industry stays `verified=false` (noindex) until you add one.

Multi-value cells use `;` (semicolon). Cells containing a comma must be wrapped in
`"double quotes"`.

## `catalog.csv` columns

| column | required | notes |
|---|---|---|
| `name` | ✅ | Product name, e.g. `Sodium Hypochlorite` |
| `slug` | | URL slug; auto-derived from name if blank |
| `category` | ✅ | Category name; links/creates the category |
| `synonyms` | | `;`-separated common names |
| `short_description` | | 1–2 sentences; used on cards + meta description |
| `description` | | Longer body (optional) |
| `cas_number` | | e.g. `7681-52-9` |
| `formula` | | e.g. `NaClO` |
| `molecular_weight` | | e.g. `74.44` |
| `grade` | | e.g. `Technical`, `Food`, `Laboratory` |
| `purity` | | e.g. `12-15%` |
| `appearance` | | e.g. `Pale yellow liquid` |
| `packaging` | | `;`-separated, e.g. `25 L jerrican;200 L drum` |
| `applications` | | `;`-separated real uses |
| `industries` | | `;`-separated industry names |
| `related` | | `;`-separated product slugs; auto-filled within the category if blank |
| `status` | | `draft` \| `review` \| `published` (default `published`) |
| `verified` | | `true`/`false` (default `true`) — `false` ⇒ noindex |

## Don't have a spreadsheet?

Just paste the product list in chat (name + category is enough to start; specs can
follow) and it can be turned into `catalog.csv` for you.
