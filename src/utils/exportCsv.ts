export type CsvColumn<T> = {
  title: string;
  value: (record: T) => unknown;
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value) ?? String(value);

  let text = String(value);
  if (typeof value === 'string') {
    let firstSignificantIndex = 0;
    while (firstSignificantIndex < text.length) {
      const character = text[firstSignificantIndex];
      if (
        /\s/.test(character) ||
        text.charCodeAt(firstSignificantIndex) <= 0x1f
      ) {
        firstSignificantIndex += 1;
        continue;
      }
      break;
    }
    if ('=+-@'.includes(text[firstSignificantIndex] || '')) {
      text = `'${text}`;
    }
  }
  return text;
}

function quoteCell(value: unknown): string {
  return `"${formatCell(value).replace(/"/g, '""')}"`;
}

export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
) {
  const lines = [
    columns.map((column) => quoteCell(column.title)).join(','),
    ...rows.map((row) =>
      columns.map((column) => quoteCell(column.value(row))).join(','),
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
