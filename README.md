# Sheet

Sheet is an experimental data grid component for React 17, written in TypeScript in March 2022, for showing large datasets in a spreadsheet-style layout without rendering every row and column. It is built from two layers. `Sheet` (`src/sheet/Sheet.tsx`) is a virtualised cell renderer: it works out which rows and columns fall inside the scrolled viewport, renders only those cells, and supports custom row heights, column widths and cell spanning. `Grid` (`src/sheet/Grid.tsx`) composes several `Sheet` instances into a full table: a header built from nested column groups, a filter row, a row-resize strip, a pinned left section and the scrolling body, all kept in sync on scroll. State is shared through observers from `react-hook-useobserver`, and layout helpers come from `react-hook-components`. The repository is a Create React App project whose `src/App.tsx` demo loads a local `person.json` file into the grid. It is not published as a package and has no tests.

> Experiment from 2022. Not published to npm and not actively maintained.

## Features

- **Nested column groups** for multi-level headers (`GridColumnGroup` with its own `columns`)
- **Cell spanning:** `cellSpanFunction` returns `{rowSpan, colSpan}` for a cell, for example to merge repeated values; it receives `getCellValue(rowIndex, colIndex)` and the viewport bounds
- **Column widths** as fixed pixels or percentages, with the layout calculated to fit
- **Resizable columns and rows** by dragging handles in the header and the row strip
- **Pinned left columns:** `pinnedLeftColumnIndex` keeps columns up to that index fixed while scrolling horizontally
- **Multi-column sorting:** clicking a header cycles ascending, descending and off; sorting is case-insensitive on the displayed value
- **Filter row** under the header: typing and pressing Enter filters rows by case-insensitive substring match, or calls `onFilterChange` so the parent can filter instead
- **Focused row:** `focusedDataItem` and `onFocusedDataItemChange` for a controlled current row
- **Custom rendering:** `dataItemToValue`, `cellComponent`, `cellStyleFunction`, `headerCellComponent` and `filterCellComponent` per column
- **Virtualised rendering:** only the rows and columns inside the viewport are drawn

## Tech stack

React 17 · TypeScript 4.6 · Create React App (react-scripts 4) · react-hook-useobserver · react-hook-components · react-icons

## Getting started

```bash
npm install
npm start        # react-scripts dev server
```

The demo in `src/App.tsx` fetches `./person.json` and reads its `results` array (fields such as `name.title`, `name.first`, `gender`, `cell`, `email`). That file is listed in `.gitignore` and is not in the repository, so place a JSON file with that shape in `public/person.json` before starting. There is no `build` or working `test` script.

## Usage

```tsx
import Grid, {GridColumn, GridColumnGroup} from './sheet/Grid';

const columns: Array<GridColumn | GridColumnGroup> = [
  { title: 'Name', columns: [
    { field: 'first', title: 'First', width: 100 },
    { field: 'last',  title: 'Last',  width: 100 },
  ]},
  { field: 'gender', title: 'Gender', width: '10%' },
];

<Grid
  data={rows}
  columns={columns}
  defaultRowHeight={50}
  pinnedLeftColumnIndex={1}
  focusedDataItem={focused}
  onFocusedDataItemChange={(item) => setFocused(item)}
/>
```

### Grid props

| Prop | Type | Notes |
| --- | --- | --- |
| `data` | `any[]` | Rows |
| `columns` | `Array<GridColumn \| GridColumnGroup>` | Columns and nested groups |
| `pinnedLeftColumnIndex` | `number` | Required; last pinned column index (`-1` for none) |
| `defaultRowHeight` / `defaultColWidth` | `number` | Optional defaults |
| `focusedDataItem` / `onFocusedDataItemChange` | `any` / `(newItem, oldItem) => void` | Controlled focused row |
| `onFilterChange` | `(filter: Map<string, any>) => void` | Replaces the built-in filtering |

See `src/App.tsx` for a fuller example with nested groups, a row-spanning column and a button that swaps the column set.

## Project structure

```text
src/
├── sheet/
│   ├── Sheet.tsx   # virtualised cell renderer (viewport calculation, spans, custom sizes)
│   └── Grid.tsx    # grid built from several Sheets: headers, filter, sort, resize, pinning
├── App.tsx         # demo page
└── index.tsx       # entry point
```
