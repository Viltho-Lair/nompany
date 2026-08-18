# Fonts embedded in exported documents

Two files, both **Noto**, both under the **SIL Open Font License 1.1**, which
permits embedding in a document — including a commercial one — without the
document inheriting the licence. That permission is the reason these two were
chosen over anything prettier: a font embedded in a PDF is redistributed with
every copy of that PDF, so a face licensed for web display only would make every
exported procedure a licence breach.

| File | Family | Covers |
|---|---|---|
| `DocSans.woff2` | Noto Sans | Latin (basic + supplement) |
| `DocArabic.woff2` | Noto Naskh Arabic | Arabic |

Both are **variable** fonts spanning weights 400–700, which is why there is one
file per family rather than one per weight.

## Why they are embedded rather than linked

The PDF renderer runs Chromium with the network switched off (see
`src/lib/qualityPdf.js`), so a `@font-face` pointing at a URL would silently
fail and Chromium would substitute whatever it had. For Latin that is a
different-looking document. For **Arabic it is a row of boxes**, because the
container has no Arabic face at all — and Arabic is the reason this product
renders through a browser engine in the first place: it is the only PDF pipeline
that does the bidirectional algorithm and glyph shaping correctly.

They are read from disk and inlined as `data:` URIs at render time. Because they
are read with `fs` from a serverless function, `next.config.mjs` names this
folder in `outputFileTracingIncludes` — **without that entry the files are not
deployed and every export loses its fonts.**

## Replacing them

Drop in a different `.woff2` under the same filename. Check the licence permits
embedding first, and keep the coverage: dropping the Arabic face does not
degrade Arabic output, it destroys it.
