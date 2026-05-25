# Paint Mapper

A small static UI for searching miniature paints and finding comparable colours across other paint brands.

The first version uses extracted data from the DakkaDakka paint range compatibility chart and runs without a build step.

## Run locally

From this folder, start any static file server. For example:

```powershell
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/app/
```

If Python is not on your PATH, any local static server will work as long as it serves this repository root.

## Project structure

- `app/` contains the browser UI.
- `data/paint-compatibility.json` is the UI-ready paint dataset.
- `data/README.md` documents the extracted data shape and source.
- `tools/extract_dakkadakka_paints.py` regenerates the dataset from the source page.

## Current UI

- Search by paint, brand, note, or hex value.
- Filter by owned brand.
- Toggle visible equivalent brands.
- View swatches, hex values, matching paints, and readable paint tags such as `discontinued` or `approximate`.
