# Sheet

An experimental data grid component for React, written in TypeScript. It shows large datasets in a spreadsheet-style layout.

## Features

- **Nested column groups** for multi-level headers
- **Cell spanning**: `cellSpanFunction` lets a cell span several rows or columns, for example to merge repeated values
- Fixed or percentage column widths, with the layout calculated to fit
- Frozen left columns while scrolling
- Column sorting and arrow key navigation
- Virtualised rendering: only the rows and columns inside the viewport are drawn

## Usage

```tsx
<Grid
  data={rows}
  columns={[
    { title: 'Name', columns: [
      { field: 'first', title: 'First', width: 100 },
      { field: 'last',  title: 'Last',  width: 100 },
    ]},
    { field: 'gender', title: 'Gender', width: '10%' },
  ]}
/>
```

See `src/App.tsx` for a fuller example.

## Development

```bash
npm install
npm start
```
