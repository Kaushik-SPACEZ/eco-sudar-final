/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Branded report PDF generator — shared across the Finance and Reports modules.
 *
 * Every downloadable report in the system flows through here so the whole ERP
 * exports one consistent, polished "EcoSudar report" document:
 *   • a green brand header band with the logo + company block (redrawn each page)
 *   • the report title, the period/as-of line and any meta chips
 *   • an optional KPI summary strip (the headline numbers)
 *   • one or more tables (auto-paginated) with an optional bold totals row
 *   • a footer with "generated on" + page x of y
 *
 * Amounts are the caller's responsibility — pass pre-formatted strings for money
 * columns (use `inrText`) so the number style matches the on-screen figures.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// EcoSudar brand palette (kept in sync with the sales-document PDF).
const BRAND: [number, number, number] = [20, 110, 70];
const BRAND_DARK: [number, number, number] = [15, 82, 53];
const BAND_TEXT: [number, number, number] = [255, 255, 255];
const MUTED: [number, number, number] = [110, 110, 110];
const ROW_ALT: [number, number, number] = [244, 249, 246];

const COMPANY = {
  name: "ECO SUDAR BIO ENERGY LLP",
  lines: ["Biomass Pellet Manufacturer · Kancheepuram, Tamil Nadu", "GSTIN: 33AANFE… · app.ecosudar.com"],
};

/** Rupee string for report cells/totals. Pass this into money columns. */
export const inrText = (n: any) =>
  `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Compact rupee for KPI tiles (e.g. Rs. 12.4L / Rs. 3.2Cr). */
export const inrCompact = (n: any) => {
  const v = Number(n || 0);
  const a = Math.abs(v);
  if (a >= 1e7) return `Rs. ${(v / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `Rs. ${(v / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `Rs. ${(v / 1e3).toFixed(1)}k`;
  return `Rs. ${v.toLocaleString("en-IN")}`;
};

const LOGO_URL = new URL("../assets/eco-sudar-logo.png", import.meta.url).href;
let cachedLogo: Promise<string> | null = null;
function loadLogo(): Promise<string> {
  cachedLogo ??= fetch(LOGO_URL)
    .then((r) => { if (!r.ok) throw new Error("logo missing"); return r.blob(); })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("logo read failed"));
      reader.readAsDataURL(blob);
    }));
  return cachedLogo;
}

export type Align = "left" | "right" | "center";

export interface ReportColumn<T> {
  header: string;
  /** Column key, or a function that returns the cell's display string. */
  key: keyof T | ((row: T) => string | number);
  align?: Align;
}

export interface ReportKpi {
  label: string;
  value: string;
  /** Optional accent for the value text. */
  tone?: "brand" | "positive" | "negative" | "muted";
}

export interface ReportTable<T = any> {
  /** Optional caption shown above this table. */
  title?: string;
  columns: ReportColumn<T>[];
  rows: T[];
  /** Optional bold summary row rendered at the foot of the table. */
  totalsRow?: (string | number)[];
}

export interface ReportPdfOptions {
  /** Report name — the big title under the brand band. */
  title: string;
  /** Period / as-of line, e.g. "Period: 2026-04-01 → 2026-06-30". */
  subtitle?: string;
  /** Small meta chips under the subtitle (record count, filters, etc.). */
  meta?: string[];
  /** Headline numbers rendered as a KPI strip. */
  kpis?: ReportKpi[];
  /** One or more tables. Empty tables render an "no records" note. */
  tables: ReportTable[];
  filename: string;
  orientation?: "portrait" | "landscape";
  /** Optional free-text note above the footer (disclaimers etc.). */
  note?: string;
}

function cellValue<T>(row: T, key: ReportColumn<T>["key"]): string {
  if (typeof key === "function") return String(key(row) ?? "");
  const v = (row as any)[key];
  return v == null ? "" : String(v);
}

function toneRgb(tone?: ReportKpi["tone"]): [number, number, number] {
  switch (tone) {
    case "positive": return [22, 130, 70];
    case "negative": return [190, 45, 45];
    case "muted":    return MUTED;
    default:         return BRAND_DARK;
  }
}

/**
 * Render + download a branded report PDF. Async because the logo is fetched once
 * and cached; falls back to a text-only header if the asset can't be loaded.
 */
export async function downloadReportPdf(opts: ReportPdfOptions): Promise<void> {
  const orientation = opts.orientation ?? "landscape";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const BAND_H = 56;

  let logo: string | null = null;
  try { logo = await loadLogo(); } catch { logo = null; }

  const stamp = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  // Header band — drawn on every page by autotable's didDrawPage hook.
  const drawBand = () => {
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, W, BAND_H, "F");
    let cx = M;
    if (logo) {
      try {
        const props = doc.getImageProperties(logo);
        const h = 30;
        const w = (props.width / props.height) * h;
        doc.addImage(logo, "PNG", M, (BAND_H - h) / 2, w, h);
        cx = M + w + 12;
      } catch { /* text-only */ }
    }
    doc.setTextColor(...BAND_TEXT);
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text(COMPANY.name, cx, 22);
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    COMPANY.lines.forEach((l, i) => doc.text(l, cx, 33 + i * 9));
    // Report title on the right of the band.
    doc.setFont("helvetica", "bold").setFontSize(13);
    doc.text(opts.title, W - M, 26, { align: "right" });
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text("EcoSudar ERP · Report", W - M, 38, { align: "right" });
  };

  const drawFooter = () => {
    const page = doc.getNumberOfPages();
    doc.setFontSize(7.5).setTextColor(...MUTED).setFont("helvetica", "normal");
    doc.text(`Generated ${stamp}`, M, H - 16);
    doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${page}`, W - M, H - 16, { align: "right" });
  };

  // First page intro block below the band.
  drawBand();
  let y = BAND_H + 26;
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(60, 60, 60);
    doc.text(opts.subtitle, M, y);
    y += 14;
  }
  if (opts.meta?.length) {
    doc.setFontSize(8).setTextColor(...MUTED);
    doc.text(opts.meta.join("   ·   "), M, y);
    y += 14;
  }

  // KPI strip.
  if (opts.kpis?.length) {
    const gap = 10;
    const n = opts.kpis.length;
    const tileW = (W - M * 2 - gap * (n - 1)) / n;
    const tileH = 42;
    opts.kpis.forEach((kpi, i) => {
      const x = M + i * (tileW + gap);
      doc.setDrawColor(225, 232, 228);
      doc.setFillColor(250, 252, 251);
      doc.roundedRect(x, y, tileW, tileH, 5, 5, "FD");
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
      doc.text(kpi.label.toUpperCase(), x + 10, y + 15);
      doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...toneRgb(kpi.tone));
      doc.text(kpi.value, x + 10, y + 33);
    });
    y += tileH + 18;
  }

  // Tables.
  opts.tables.forEach((table, ti) => {
    if (ti > 0) y += 8;
    if (table.title) {
      // Keep the caption with its table if near the page bottom.
      if (y > H - 120) { doc.addPage(); drawBand(); y = BAND_H + 26; }
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...BRAND_DARK);
      doc.text(table.title, M, y);
      y += 8;
    }
    const head = [table.columns.map((c) => c.header)];
    const body = table.rows.map((r) => table.columns.map((c) => cellValue(r, c.key)));
    if (table.totalsRow) body.push(table.totalsRow.map((v) => String(v)));
    const lastIsTotal = !!table.totalsRow;

    autoTable(doc, {
      startY: y + 4,
      margin: { top: BAND_H + 12, left: M, right: M, bottom: 34 },
      head,
      body: body.length ? body : [table.columns.map(() => "")],
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak", textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: table.columns.reduce((acc, c, i) => {
        if (c.align) acc[i] = { halign: c.align };
        return acc;
      }, {} as Record<number, any>),
      didParseCell: (data) => {
        if (lastIsTotal && data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [230, 240, 234];
          data.cell.styles.textColor = BRAND_DARK;
        }
      },
      didDrawPage: () => { drawBand(); drawFooter(); },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    if (!table.rows.length) {
      doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(...MUTED);
      doc.text("No records in this range.", M, y + 8);
      y += 16;
    }
  });

  if (opts.note) {
    if (y > H - 60) { doc.addPage(); drawBand(); drawFooter(); y = BAND_H + 26; }
    doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(opts.note, W - M * 2), M, y + 12);
  }

  // Ensure footer on the final page (autotable draws it on paged tables).
  drawFooter();

  doc.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
}
