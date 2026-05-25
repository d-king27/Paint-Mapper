# Paint Mapper

A React/Vite UI for searching miniature paints and finding comparable colours across other paint brands.

The first version uses extracted data from the DakkaDakka paint range compatibility chart.

## Run locally

Requires Node.js and npm.

Install dependencies:

```powershell
npm install
```

Start the dev server:

```powershell
npm run dev
```

Then open the local URL Vite prints, usually:

```text
http://localhost:5173/
```

## Project structure

- `src/` contains the React UI.
- `data/paint-compatibility.json` is the generated local paint dataset and is ignored by Git for now.
- `data/README.md` documents the extracted data shape and source.
- `tools/extract_dakkadakka_paints.py` regenerates the dataset from the source page.

To regenerate the local data file:

```powershell
python tools/extract_dakkadakka_paints.py
```

## Current UI

- Search by paint, brand, note, or hex value.
- Filter by owned brand.
- Toggle visible equivalent brands.
- View swatches, hex values, matching paints, and readable paint tags such as `discontinued` or `approximate`.
