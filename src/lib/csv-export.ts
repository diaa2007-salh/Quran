function escapeCsvValue(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a CSV download in the browser. `columns` controls both the
 * header labels (Arabic) and the row order - keys map into each row
 * object. The UTF-8 BOM prefix isn't optional: Excel's default CSV import
 * without it renders Arabic names as garbled characters on Windows, even
 * though the file itself is valid UTF-8.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  columns: { key: keyof T; label: string }[],
  rows: T[]
) {
  if (rows.length === 0) return;

  const headerLine = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const dataLines = rows.map((row) =>
    columns
      .map((c) => escapeCsvValue(String(row[c.key] ?? "")))
      .join(",")
  );

  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
