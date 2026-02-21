export interface CsvRow {
  businessName: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  email: string;
  reviews: number;
  rating: number;
  sourceQuery: string;
}

export function generateCsv(rows: CsvRow[]): string {
  const headers = [
    "Business Name",
    "City",
    "Address",
    "Phone",
    "Website",
    "Email",
    "Reviews",
    "Rating",
    "Source Query",
  ];

  const csvLines = [headers.join(",")];

  for (const row of rows) {
    const line = [
      escapeField(row.businessName),
      escapeField(row.city),
      escapeField(row.address),
      escapeField(row.phone),
      escapeField(row.website),
      escapeField(row.email),
      String(row.reviews),
      String(row.rating),
      escapeField(row.sourceQuery),
    ].join(",");
    csvLines.push(line);
  }

  return csvLines.join("\n");
}

function escapeField(value: string): string {
  if (!value) return '""';
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
