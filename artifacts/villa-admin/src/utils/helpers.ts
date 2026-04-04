import ExcelJS from "exceljs";
import type { Reservation, CatalogItem, CatalogEndpoint } from "@/services/api";

/* ─────────────────────── formatting helpers ─────────────────────── */

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function getNights(checkin: string, checkout: string): number {
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "lunas":   return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "pending": return "bg-amber-100 text-amber-700 border-amber-200";
    case "cancel":  return "bg-red-100 text-red-700 border-red-200";
    default:        return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "lunas":   return "Lunas";
    case "pending": return "Pending";
    case "cancel":  return "Cancel";
    default:        return status;
  }
}

/* ─────────────────────── booking category ─────────────────────── */

export function getBookingCategoryLabel(propertyId: string): string {
  if (propertyId?.startsWith("trips:")) return "Trips";
  if (propertyId?.startsWith("catering:")) return "Catering";
  if (propertyId?.startsWith("outbound:")) return "Outbound";
  return "Properti";
}

/* ─────────────────────── period helpers ─────────────────────── */

const MONTHS_ID = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

function getMonthLabel(filterMonth: string, filterYear: string): string {
  if (filterMonth !== "all" && filterYear !== "all")
    return `${MONTHS_ID[parseInt(filterMonth) - 1]} ${filterYear}`;
  if (filterMonth !== "all") return MONTHS_ID[parseInt(filterMonth) - 1];
  if (filterYear !== "all") return `Semua ${filterYear}`;
  return "Semua Periode";
}

/* ─────────────────────── XLSX color palette ─────────────────────── */

// ExcelJS uses ARGB hex (FF prefix = fully opaque)
const C = {
  navyDark:  "FF0F172A",
  navyMid:   "FF1E3A5F",
  navyBlue:  "FF1D4ED8",
  white:     "FFFFFFFF",
  offWhite:  "FFF8FAFC",
  rowAlt:    "FFF1F5F9",
  grayLight: "FFE2E8F0",
  grayText:  "FF64748B",
  green:     "FF16A34A",
  greenBg:   "FFDCFCE7",
  amber:     "FFD97706",
  amberBg:   "FFFEF9C3",
  red:       "FFDC2626",
  redBg:     "FFFEE2E2",
  teal:      "FF059669",
  indigo:    "FF6366F1",
};

// Cycling palette for property groups (matches PDF colors)
const PROP_PALETTE = [
  { bg: "FFDBEAFE", text: "FF1D4ED8", sub: "FFEFF6FF" },
  { bg: "FFD1FAE5", text: "FF065F46", sub: "FFF0FDF4" },
  { bg: "FFFEF3C7", text: "FF92400E", sub: "FFFEFCE8" },
  { bg: "FFEDE9FE", text: "FF5B21B6", sub: "FFF5F3FF" },
  { bg: "FFFCE7F3", text: "FF9D174D", sub: "FFFDF2F8" },
  { bg: "FFFFEDD5", text: "FF9A3412", sub: "FFFFF7ED" },
];

/* ─────────────────────── ExcelJS cell helpers ─────────────────────── */

type FillColor = { argb: string };
type CellStyle = {
  bg?: string; fontColor?: string; bold?: boolean; italic?: boolean;
  size?: number; align?: ExcelJS.Alignment["horizontal"]; wrapText?: boolean;
  numFmt?: string; borderTop?: boolean; borderBottom?: boolean;
};

function styleCell(cell: ExcelJS.Cell, s: CellStyle) {
  if (s.bg) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.bg } as FillColor };
  }
  cell.font = {
    name: "Calibri",
    bold: s.bold ?? false,
    italic: s.italic ?? false,
    size: s.size ?? 10,
    color: { argb: s.fontColor ?? C.navyDark } as FillColor,
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: s.align ?? "left",
    wrapText: s.wrapText ?? false,
  };
  if (s.numFmt) cell.numFmt = s.numFmt;
  const border: ExcelJS.Border = { style: "thin", color: { argb: C.grayLight } as FillColor };
  const thick: ExcelJS.Border = { style: "medium", color: { argb: C.navyBlue } as FillColor };
  if (s.borderTop || s.borderBottom) {
    cell.border = {
      ...(s.borderTop    && { top:    thick }),
      ...(s.borderBottom && { bottom: thick }),
    };
  } else {
    cell.border = { bottom: border };
  }
}

const COL_DEFS = [
  { header: "No",          key: "no",       width: 5,  align: "center" as const },
  { header: "Nama Tamu",   key: "name",     width: 22, align: "left"   as const },
  { header: "No HP",       key: "phone",    width: 16, align: "left"   as const },
  { header: "Properti",    key: "prop",     width: 26, align: "left"   as const },
  { header: "Kategori",    key: "cat",      width: 12, align: "center" as const },
  { header: "Checkin",     key: "ci",       width: 13, align: "center" as const },
  { header: "Checkout",    key: "co",       width: 13, align: "center" as const },
  { header: "Malam",       key: "nights",   width: 8,  align: "center" as const },
  { header: "Asal",        key: "addr",     width: 18, align: "left"   as const },
  { header: "Peserta",     key: "people",   width: 14, align: "left"   as const },
  { header: "Kendaraan",   key: "vehicles", width: 14, align: "left"   as const },
  { header: "Total Harga", key: "total",    width: 20, align: "right"  as const, money: true },
  { header: "DP",          key: "dp",       width: 18, align: "right"  as const, money: true },
  { header: "Sisa",        key: "sisa",     width: 18, align: "right"  as const, money: true },
  { header: "Status",      key: "status",   width: 11, align: "center" as const },
  { header: "Admin",       key: "admin",    width: 14, align: "left"   as const },
  { header: "Catatan",     key: "note",     width: 32, align: "left"   as const },
] as const;

// Column indices (1-based):
// 1=No, 2=Nama, 3=HP, 4=Properti, 5=Kategori, 6=Checkin, 7=Checkout, 8=Malam,
// 9=Asal, 10=Peserta, 11=Kendaraan, 12=Total, 13=DP, 14=Sisa, 15=Status, 16=Admin, 17=Catatan

const NC = COL_DEFS.length;
const IDR_FMT = `"Rp"#,##0`;

/* ─────────────────────── sheet builder ─────────────────────── */

function buildStyledSheet(
  ws: ExcelJS.Worksheet,
  data: Reservation[],
  sheetTitle: string,
  adminName: string,
  periodLabel: string,
  includePropertyCol = true,
) {
  const now = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  ws.columns = COL_DEFS.map((c) => ({ key: c.key, width: c.width }));

  // ── Row 1: Big title ──────────────────────────────────────────────
  const r1 = ws.addRow([sheetTitle]);
  r1.height = 36;
  ws.mergeCells(r1.number, 1, r1.number, NC);
  const t1 = r1.getCell(1);
  styleCell(t1, { bg: C.navyDark, fontColor: C.white, bold: true, size: 14, align: "center" });

  // ── Row 2: Admin + period ─────────────────────────────────────────
  const r2 = ws.addRow([`Admin: ${adminName}   |   Periode: ${periodLabel}`]);
  r2.height = 20;
  ws.mergeCells(r2.number, 1, r2.number, NC);
  styleCell(r2.getCell(1), { bg: C.navyMid, fontColor: "FFB3C6E0", bold: false, size: 10, align: "center" });

  // ── Row 3: Date printed ───────────────────────────────────────────
  const r3 = ws.addRow([`Dicetak: ${now}`]);
  r3.height = 18;
  ws.mergeCells(r3.number, 1, r3.number, NC);
  styleCell(r3.getCell(1), { bg: "FF1A2E4A", fontColor: "FF7FA8CA", size: 9, align: "center" });

  // ── Row 4: empty spacer ───────────────────────────────────────────
  ws.addRow([]);

  // ── Row 5: Column headers ─────────────────────────────────────────
  const hdr = ws.addRow(COL_DEFS.map((c) => c.header));
  hdr.height = 26;
  for (let ci = 1; ci <= NC; ci++) {
    const cd = COL_DEFS[ci - 1];
    const cell = hdr.getCell(ci);
    styleCell(cell, {
      bg: C.navyBlue, fontColor: C.white, bold: true, size: 10,
      align: cd.align, borderBottom: true,
    });
  }

  // ── Data rows, grouped by category (or property for "Properti") ──
  const propMap = new Map<string, Reservation[]>();
  for (const r of data) {
    const cat = getBookingCategoryLabel(r.property_id);
    const key = cat === "Properti" ? (r.property_name?.trim() || "Tanpa Properti") : cat;
    if (!propMap.has(key)) propMap.set(key, []);
    propMap.get(key)!.push(r);
  }

  const gtHarga = data.reduce((s, r) => s + (r.total_price ?? 0), 0);
  const gtDP    = data.reduce((s, r) => s + (r.dp ?? 0), 0);
  const gtSisa  = gtHarga - gtDP;
  const gtMalam = data.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);

  let globalNo = 0;
  let pc = 0;

  for (const [propName, propRows] of propMap) {
    const pal = PROP_PALETTE[pc % PROP_PALETTE.length];
    pc++;

    const subHarga = propRows.reduce((s, r) => s + (r.total_price ?? 0), 0);
    const subDP    = propRows.reduce((s, r) => s + (r.dp ?? 0), 0);
    const subSisa  = subHarga - subDP;
    const subMalam = propRows.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);

    // Category/Property group header
    const catLbl = getBookingCategoryLabel(propRows[0].property_id);
    const grpIcon = catLbl === "Properti" ? "🏠" : catLbl === "Trips" ? "✈️" : catLbl === "Catering" ? "🍽️" : "🏃";
    const ph = ws.addRow([`${grpIcon} ${propName}`, ...Array(NC - 1).fill("")]);
    ph.height = 22;
    ws.mergeCells(ph.number, 1, ph.number, NC);
    styleCell(ph.getCell(1), {
      bg: pal.bg, fontColor: pal.text, bold: true, size: 11, align: "left", borderTop: true,
    });

    // Data rows
    propRows.forEach((r, li) => {
      globalNo++;
      const nights = getNights(r.checkin, r.checkout);
      const sisa   = (r.total_price ?? 0) - (r.dp ?? 0);
      const rowBg  = li % 2 === 0 ? C.white : C.offWhite;

      const row = ws.addRow([
        globalNo,
        r.guest_name ?? "",
        r.guest_phone ?? "",
        includePropertyCol ? (r.property_name ?? "") : propName,
        getBookingCategoryLabel(r.property_id),
        r.checkin  ? formatDate(r.checkin)  : "",
        r.checkout ? formatDate(r.checkout) : "",
        nights,
        r.address  ?? "",
        r.people   ?? "",
        r.vehicles ?? "",
        r.total_price ?? 0,
        r.dp          ?? 0,
        sisa,
        getStatusLabel(r.status),
        r.admin_name ?? "",
        r.note ?? "",
      ]);
      row.height = 18;

      COL_DEFS.forEach((cd, i) => {
        const cell = row.getCell(i + 1);
        const isMoney = "money" in cd && cd.money;
        styleCell(cell, {
          bg: rowBg, size: 10, align: cd.align,
          numFmt: isMoney ? IDR_FMT : undefined,
        });
      });

      // Status color override (col 15)
      const sc = row.getCell(15);
      const statusFg =
        r.status === "lunas"   ? C.green :
        r.status === "pending" ? C.amber : C.red;
      const statusBg =
        r.status === "lunas"   ? C.greenBg :
        r.status === "pending" ? C.amberBg : C.redBg;
      styleCell(sc, { bg: statusBg, fontColor: statusFg, bold: true, align: "center" });

      // Sisa color: red if positive, green if zero/paid (col 14)
      const sisaCell = row.getCell(14);
      styleCell(sisaCell, {
        bg: rowBg, fontColor: sisa > 0 ? C.red : C.green,
        bold: true, align: "right", numFmt: IDR_FMT,
      });

      // Total (col 12) & DP (col 13) coloring
      styleCell(row.getCell(12), { bg: rowBg, fontColor: C.navyDark, bold: true, align: "right", numFmt: IDR_FMT });
      styleCell(row.getCell(13), { bg: rowBg, fontColor: C.teal, align: "right", numFmt: IDR_FMT });
      // Malam (indigo, col 8)
      styleCell(row.getCell(8), { bg: rowBg, fontColor: C.indigo, bold: true, align: "center" });
      // No column (gray, col 1)
      styleCell(row.getCell(1), { bg: rowBg, fontColor: C.grayText, align: "center" });
    });

    // Subtotal row
    const sub = ws.addRow([
      "", `Subtotal — ${propRows.length} booking`, "", "", "", "", subMalam,
      "", "", "", subHarga, subDP, subSisa, "", "", "",
    ]);
    sub.height = 20;
    COL_DEFS.forEach((_, i) => {
      const cell = sub.getCell(i + 1);
      styleCell(cell, { bg: pal.bg, fontColor: pal.text, bold: true, italic: true, align: COL_DEFS[i].align });
    });
    styleCell(sub.getCell(11), { bg: pal.bg, fontColor: pal.text, bold: true, align: "right", numFmt: IDR_FMT });
    styleCell(sub.getCell(12), { bg: pal.bg, fontColor: C.teal, bold: true, align: "right", numFmt: IDR_FMT });
    styleCell(sub.getCell(13), { bg: pal.bg, fontColor: subSisa > 0 ? C.red : C.green, bold: true, align: "right", numFmt: IDR_FMT });

    // Spacer
    ws.addRow([]);
  }

  // ── Grand total row ──────────────────────────────────────────────
  const gt = ws.addRow([
    "", `GRAND TOTAL — ${data.length} booking`, "", "", "", "", gtMalam,
    "", "", "", gtHarga, gtDP, gtSisa, "", "", "",
  ]);
  gt.height = 26;
  COL_DEFS.forEach((cd, i) => {
    styleCell(gt.getCell(i + 1), {
      bg: C.navyDark, fontColor: C.white, bold: true, size: 11,
      align: cd.align, borderTop: true,
    });
  });
  styleCell(gt.getCell(11), { bg: C.navyDark, fontColor: "FFFBBF24", bold: true, size: 11, align: "right", numFmt: IDR_FMT });
  styleCell(gt.getCell(12), { bg: C.navyDark, fontColor: "FF6EE7B7", bold: true, size: 11, align: "right", numFmt: IDR_FMT });
  styleCell(gt.getCell(13), { bg: C.navyDark, fontColor: "FFFCA5A5", bold: true, size: 11, align: "right", numFmt: IDR_FMT });
}

/* ─────────────────────── public export functions ─────────────────────── */

export async function exportToXLSX(
  data: Reservation[],
  adminName: string,
  filterMonth: string,
  filterYear: string,
) {
  if (!data.length) return;

  const period = getMonthLabel(filterMonth, filterYear);
  const wb = new ExcelJS.Workbook();
  wb.creator = "E-Rekap";
  wb.created = new Date();

  // ── Sheet 1: Full data (all properties together), named after period ──
  const sheet1Name = period.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
  const ws1 = wb.addWorksheet(sheet1Name);
  buildStyledSheet(ws1, data, `Laporan Reservasi — ${period}`, adminName, period, true);

  // ── Sheet 2+: One sheet per property name (Properti only) ───────
  const propertiRows = data.filter((r) => getBookingCategoryLabel(r.property_id) === "Properti");
  const propNameMap = new Map<string, Reservation[]>();
  for (const r of propertiRows) {
    const key = r.property_name?.trim() || "Tanpa Properti";
    if (!propNameMap.has(key)) propNameMap.set(key, []);
    propNameMap.get(key)!.push(r);
  }
  for (const [propName, propRows] of propNameMap) {
    const sheetName = propName.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
    const ws = wb.addWorksheet(sheetName);
    buildStyledSheet(ws, propRows, `${propName} — ${period}`, adminName, period, false);
  }

  // ── Sheet last: Trips / Catering / Outbound (one sheet each) ────
  for (const cat of ["Trips", "Catering", "Outbound"] as const) {
    const catRows = data.filter((r) => getBookingCategoryLabel(r.property_id) === cat);
    if (!catRows.length) continue;
    const ws = wb.addWorksheet(cat);
    buildStyledSheet(ws, catRows, `${cat} — ${period}`, adminName, period, true);
  }

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservasi_${period.replace(/\s+/g, "_")}_${adminName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────── Catalog XLSX export ───────────────────────── */

const CATALOG_LABEL: Record<string, string> = {
  trips:    "Trips",
  catering: "Catering",
  outbound: "Outbound",
};

const CAT_COL_DEFS: Record<CatalogEndpoint, Array<{ header: string; key: string; width: number; align: ExcelJS.Alignment["horizontal"] }>> = {
  properties: [],
  trips: [
    { header: "No",         key: "no",           width: 5,  align: "center" },
    { header: "Nama",       key: "name",          width: 28, align: "left"   },
    { header: "Kategori",   key: "category",      width: 18, align: "left"   },
    { header: "Harga",      key: "price",         width: 20, align: "right"  },
    { header: "Destinasi",  key: "destinations",  width: 36, align: "left"   },
    { header: "Fasilitas",  key: "facilities",    width: 36, align: "left"   },
    { header: "Catatan",    key: "notes",         width: 36, align: "left"   },
  ],
  catering: [
    { header: "No",         key: "no",            width: 5,  align: "center" },
    { header: "Nama",       key: "name",          width: 28, align: "left"   },
    { header: "Kategori",   key: "category",      width: 18, align: "left"   },
    { header: "Harga",      key: "price",         width: 20, align: "right"  },
    { header: "Deskripsi",  key: "description",   width: 36, align: "left"   },
    { header: "Menu",       key: "menu",          width: 40, align: "left"   },
  ],
  outbound: [
    { header: "No",         key: "no",            width: 5,  align: "center" },
    { header: "Nama",       key: "name",          width: 28, align: "left"   },
    { header: "Kategori",   key: "category",      width: 18, align: "left"   },
    { header: "Harga",      key: "price",         width: 20, align: "right"  },
    { header: "Durasi",     key: "duration",      width: 14, align: "center" },
    { header: "Kapasitas",  key: "capacity",      width: 16, align: "center" },
    { header: "Deskripsi",  key: "description",   width: 36, align: "left"   },
    { header: "Aktivitas",  key: "activities",    width: 40, align: "left"   },
    { header: "Fasilitas",  key: "facilities",    width: 36, align: "left"   },
  ],
};

function buildCatalogSheet(
  ws: ExcelJS.Worksheet,
  items: CatalogItem[],
  endpoint: CatalogEndpoint,
  sheetTitle: string,
) {
  const cols = CAT_COL_DEFS[endpoint];
  const NC = cols.length;
  const now = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));

  // Title row
  const r1 = ws.addRow([sheetTitle]);
  r1.height = 34;
  ws.mergeCells(r1.number, 1, r1.number, NC);
  styleCell(r1.getCell(1), { bg: C.navyDark, fontColor: C.white, bold: true, size: 13, align: "center" });

  // Printed row
  const r2 = ws.addRow([`Dicetak: ${now}   |   ${items.length} item`]);
  r2.height = 18;
  ws.mergeCells(r2.number, 1, r2.number, NC);
  styleCell(r2.getCell(1), { bg: C.navyMid, fontColor: "FFB3C6E0", size: 9, align: "center" });

  ws.addRow([]);

  // Header row
  const hdr = ws.addRow(cols.map((c) => c.header));
  hdr.height = 24;
  for (let ci = 1; ci <= NC; ci++) {
    styleCell(hdr.getCell(ci), {
      bg: C.navyBlue, fontColor: C.white, bold: true, size: 10,
      align: cols[ci - 1].align, borderBottom: true,
    });
  }

  // Data rows (no grouping here — called per category)
  items.forEach((item, li) => {
    const rowBg = li % 2 === 0 ? C.white : C.offWhite;
    const rowData: Record<string, unknown> = {
      no:          li + 1,
      name:        item.name ?? "",
      category:    item.category ?? "",
      price:       item.price ?? 0,
      description: item.description ?? "",
      duration:    item.duration ?? "",
      capacity:    item.capacity ?? "",
      destinations: (item.destinations ?? []).join(", "),
      facilities:  (item.facilities ?? []).join(", "),
      activities:  (item.activities ?? []).join(", "),
      menu:        (item.menu ?? []).join(", "),
      notes:       (item.notes ?? []).join(", "),
    };
    const row = ws.addRow(cols.map((c) => rowData[c.key] ?? ""));
    row.height = 18;
    cols.forEach((cd, i) => {
      const cell = row.getCell(i + 1);
      const isMoney = cd.key === "price";
      styleCell(cell, {
        bg: rowBg, size: 10, align: cd.align,
        numFmt: isMoney ? IDR_FMT : undefined,
        wrapText: ["destinations", "facilities", "activities", "menu", "notes", "description"].includes(cd.key),
      });
      if (isMoney) {
        styleCell(cell, { bg: rowBg, fontColor: C.navyDark, bold: true, align: "right", numFmt: IDR_FMT });
      }
    });
  });
}

export async function exportCatalogToXLSX(
  endpoint: CatalogEndpoint,
  items: CatalogItem[],
) {
  if (!items.length || endpoint === "properties") return;

  const label = CATALOG_LABEL[endpoint] ?? endpoint;
  const now = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  const wb = new ExcelJS.Workbook();
  wb.creator = "E-Rekap";
  wb.created = new Date();

  // Group by category
  const catMap = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || "Tanpa Kategori";
    if (!catMap.has(key)) catMap.set(key, []);
    catMap.get(key)!.push(item);
  }

  // Sheet 1: All items
  const ws1 = wb.addWorksheet(`Semua ${label}`);
  buildCatalogSheet(ws1, items, endpoint, `${label} — Semua Kategori (${now})`);

  // Sheet per category
  for (const [catName, catItems] of catMap) {
    const sheetName = catName.replace(/[:\\/?*[\]]/g, "").slice(0, 31);
    const ws = wb.addWorksheet(sheetName);
    buildCatalogSheet(ws, catItems, endpoint, `${label} — ${catName} (${now})`);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `katalog_${endpoint}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────── PDF export ─────────────────────────────────── */

export function exportToPDF(
  data: Reservation[],
  adminName: string,
  filterMonth: string,
  filterYear: string,
) {
  if (!data.length) return;

  const monthLabel = getMonthLabel(filterMonth, filterYear);
  const now = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });

  const totalHarga = data.reduce((s, r) => s + (r.total_price ?? 0), 0);
  const totalDP    = data.reduce((s, r) => s + (r.dp ?? 0), 0);
  const totalSisa  = totalHarga - totalDP;
  const totalMalam = data.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);

  const cLunas   = data.filter((r) => r.status === "lunas").length;
  const cPending = data.filter((r) => r.status === "pending").length;
  const cCancel  = data.filter((r) => r.status === "cancel").length;

  const propMap = new Map<string, Reservation[]>();
  for (const r of data) {
    const cat = getBookingCategoryLabel(r.property_id);
    const key = cat === "Properti" ? (r.property_name?.trim() || "Tanpa Properti") : cat;
    if (!propMap.has(key)) propMap.set(key, []);
    propMap.get(key)!.push(r);
  }

  const propColors = [
    { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
    { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
    { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
    { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
    { bg: "#fce7f3", border: "#ec4899", text: "#9d174d" },
    { bg: "#ffedd5", border: "#f97316", text: "#9a3412" },
  ];

  let globalIndex = 0;
  let colorCycle = 0;

  function statusBadge(status: string) {
    const map: Record<string, [string, string, string]> = {
      lunas:   ["#dcfce7", "#16a34a", "✓ Lunas"],
      pending: ["#fef9c3", "#ca8a04", "⏳ Pending"],
      cancel:  ["#fee2e2", "#dc2626", "✕ Cancel"],
    };
    const [bg, color, label] = map[status] ?? ["#f1f5f9", "#475569", status];
    return `<span style="display:inline-block;background:${bg};color:${color};border:1px solid ${color}33;border-radius:20px;padding:1px 7px;font-size:8px;font-weight:700;white-space:nowrap">${label}</span>`;
  }

  const bodyRows = [...propMap.entries()].map(([propName, propRows]) => {
    const pc = propColors[colorCycle % propColors.length];
    colorCycle++;

    const subHarga = propRows.reduce((s, r) => s + (r.total_price ?? 0), 0);
    const subDP    = propRows.reduce((s, r) => s + (r.dp ?? 0), 0);
    const subSisa  = subHarga - subDP;
    const subMalam = propRows.reduce((s, r) => s + getNights(r.checkin, r.checkout), 0);

    const dataRows = propRows.map((r, li) => {
      globalIndex++;
      const nights = getNights(r.checkin, r.checkout);
      const sisa   = (r.total_price ?? 0) - (r.dp ?? 0);
      return `
        <tr style="background:${li % 2 === 0 ? "#ffffff" : "#f8fafc"}">
          <td style="text-align:center;color:#94a3b8;font-weight:500">${globalIndex}</td>
          <td><span style="font-weight:700;color:#0f172a;font-size:9.5px">${r.guest_name}</span><br><span style="color:#94a3b8;font-size:8px">${r.guest_phone}</span></td>
          <td style="color:#334155">${formatDate(r.checkin)}</td>
          <td style="color:#334155">${formatDate(r.checkout)}</td>
          <td style="text-align:center;font-weight:700;color:#6366f1">${nights}</td>
          <td style="color:#475569">${r.address || "-"}</td>
          <td style="text-align:right;font-weight:700;color:#0f172a">${formatRupiah(r.total_price)}</td>
          <td style="text-align:right;color:#059669">${formatRupiah(r.dp)}</td>
          <td style="text-align:right;font-weight:600;color:${sisa > 0 ? "#dc2626" : "#16a34a"}">${formatRupiah(sisa)}</td>
          <td style="text-align:center">${statusBadge(r.status)}</td>
          <td style="color:#94a3b8;font-size:8px">${r.admin_name || "-"}</td>
        </tr>`;
    }).join("");

    return `
      <tr>
        <td colspan="11" style="background:${pc.bg};border-left:4px solid ${pc.border};border-top:2px solid ${pc.border}22;border-bottom:1px solid ${pc.border}44;padding:6px 10px;color:${pc.text};font-weight:800;font-size:10px">
          ${(()=>{const c=getBookingCategoryLabel(propRows[0].property_id);return c==="Properti"?"🏠":c==="Trips"?"✈️":c==="Catering"?"🍽️":"🏃";})() } ${propName}
          <span style="font-weight:400;font-size:8.5px;opacity:0.8;margin-left:8px">${propRows.length} booking · ${subMalam} malam</span>
        </td>
      </tr>
      ${dataRows}
      <tr style="background:${pc.bg}ee">
        <td colspan="4" style="padding:5px 8px;font-weight:700;font-size:8.5px;color:${pc.text};border-top:1px solid ${pc.border}55">Subtotal ${propName}</td>
        <td style="text-align:center;font-weight:700;font-size:8.5px;color:${pc.text};border-top:1px solid ${pc.border}55">${subMalam}</td>
        <td style="border-top:1px solid ${pc.border}55"></td>
        <td style="text-align:right;font-weight:700;font-size:8.5px;color:${pc.text};border-top:1px solid ${pc.border}55">${formatRupiah(subHarga)}</td>
        <td style="text-align:right;font-weight:700;font-size:8.5px;color:#059669;border-top:1px solid ${pc.border}55">${formatRupiah(subDP)}</td>
        <td style="text-align:right;font-weight:700;font-size:8.5px;color:${subSisa > 0 ? "#dc2626" : "#16a34a"};border-top:1px solid ${pc.border}55">${formatRupiah(subSisa)}</td>
        <td colspan="2" style="border-top:1px solid ${pc.border}55"></td>
      </tr>
      <tr><td colspan="11" style="height:6px;background:#f8fafc;border:none"></td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"/><title>Laporan Reservasi – ${monthLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:9px;background:#f1f5f9;color:#1e293b}
.page{background:#fff}
.report-header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1d4ed8 100%);padding:18px 22px 14px;color:#fff;position:relative;overflow:hidden}
.report-header::before{content:'';position:absolute;top:-30px;right:-30px;width:140px;height:140px;background:rgba(255,255,255,0.05);border-radius:50%}
.header-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.header-logo{width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.header-tag{display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:2px 10px;font-size:8px;font-weight:600;letter-spacing:.5px;margin-bottom:5px;color:#bfdbfe}
.header-title{font-size:17px;font-weight:800;letter-spacing:-.3px;line-height:1.2}
.header-sub{font-size:9px;color:#93c5fd;margin-top:3px}
.header-meta{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 12px;text-align:right;flex-shrink:0}
.meta-label{font-size:7.5px;color:#93c5fd;margin-bottom:1px}
.meta-val{font-size:8.5px;font-weight:600;color:#fff}
.header-strip{height:4px;background:linear-gradient(90deg,#60a5fa,#a78bfa,#34d399,#f59e0b,#f87171)}
.summary{display:flex;gap:8px;padding:12px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.sc{flex:1;border-radius:8px;padding:9px 11px;border:1px solid transparent;position:relative;overflow:hidden}
.sc::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;border-radius:8px 0 0 8px}
.sc.blue{background:#eff6ff;border-color:#bfdbfe}.sc.blue::before{background:#3b82f6}
.sc.violet{background:#f5f3ff;border-color:#ddd6fe}.sc.violet::before{background:#8b5cf6}
.sc.green{background:#f0fdf4;border-color:#bbf7d0}.sc.green::before{background:#10b981}
.sc.orange{background:#fff7ed;border-color:#fed7aa}.sc.orange::before{background:#f97316}
.sc.red{background:#fef2f2;border-color:#fecaca}.sc.red::before{background:#ef4444}
.sc-icon{font-size:16px;margin-bottom:2px}
.sc-label{font-size:7.5px;color:#64748b;font-weight:500;margin-bottom:2px}
.sc-value{font-size:12px;font-weight:800;color:#0f172a;line-height:1}
.sc-sub{font-size:7px;color:#94a3b8;margin-top:2px}
.status-bar{display:flex;gap:6px;padding:8px 22px;background:#fff;border-bottom:2px solid #e2e8f0;align-items:center}
.sb-title{font-size:8px;font-weight:700;color:#64748b;margin-right:4px;text-transform:uppercase;letter-spacing:.5px}
.sb-badge{display:flex;align-items:center;gap:4px;border-radius:20px;padding:3px 10px;font-size:8px;font-weight:700}
.sb-dot{width:7px;height:7px;border-radius:50%}
.table-wrap{padding:0 0 16px}
table{width:100%;border-collapse:collapse}
thead tr{background:linear-gradient(90deg,#1e3a5f,#1d4ed8)}
th{color:#fff;padding:7px 7px;text-align:left;font-size:8.5px;font-weight:700;letter-spacing:.2px}
td{padding:5px 7px;font-size:8.5px;vertical-align:middle;border-bottom:1px solid #f1f5f9}
.grand-total td{background:linear-gradient(90deg,#0f172a,#1e3a5f);color:#fff;font-weight:800;font-size:9px;padding:8px 7px;border:none}
.report-footer{text-align:center;padding:10px;font-size:7.5px;color:#94a3b8;border-top:1px solid #e2e8f0;background:#f8fafc}
@media print{body{background:#fff}.page{box-shadow:none}@page{size:landscape;margin:8mm}}
</style></head><body><div class="page">
<div class="report-header">
  <div class="header-top">
    <div style="display:flex;align-items:center;gap:12px">
      <div class="header-logo">🏡</div>
      <div>
        <div class="header-tag">VILLA BOOKING SYSTEM</div>
        <div class="header-title">Laporan Reservasi</div>
        <div class="header-sub">Periode: <b>${monthLabel}</b> &nbsp;·&nbsp; Admin: <b>${adminName}</b></div>
      </div>
    </div>
    <div class="header-meta"><div class="meta-label">Dicetak pada</div><div class="meta-val">${now}</div></div>
  </div>
</div>
<div class="header-strip"></div>
<div class="summary">
  <div class="sc blue"><div class="sc-icon">📋</div><div class="sc-label">Total Booking</div><div class="sc-value">${data.length}</div><div class="sc-sub">reservasi</div></div>
  <div class="sc violet"><div class="sc-icon">🌙</div><div class="sc-label">Total Malam</div><div class="sc-value">${totalMalam}</div><div class="sc-sub">malam menginap</div></div>
  <div class="sc green"><div class="sc-icon">💰</div><div class="sc-label">Total Pendapatan</div><div class="sc-value">${formatRupiah(totalHarga)}</div><div class="sc-sub">bruto</div></div>
  <div class="sc orange"><div class="sc-icon">💳</div><div class="sc-label">DP Masuk</div><div class="sc-value">${formatRupiah(totalDP)}</div><div class="sc-sub">sudah dibayar</div></div>
  <div class="sc red"><div class="sc-icon">⚡</div><div class="sc-label">Total Sisa</div><div class="sc-value">${formatRupiah(totalSisa)}</div><div class="sc-sub">belum dilunasi</div></div>
</div>
<div class="status-bar">
  <span class="sb-title">Rekap Status:</span>
  <span class="sb-badge" style="background:#dcfce7;color:#15803d"><span class="sb-dot" style="background:#16a34a"></span> Lunas: ${cLunas}</span>
  <span class="sb-badge" style="background:#fef9c3;color:#b45309"><span class="sb-dot" style="background:#ca8a04"></span> Pending: ${cPending}</span>
  <span class="sb-badge" style="background:#fee2e2;color:#b91c1c"><span class="sb-dot" style="background:#dc2626"></span> Cancel: ${cCancel}</span>
  <span style="margin-left:auto;font-size:7.5px;color:#94a3b8">${propMap.size} properti · ${data.length} tamu</span>
</div>
<div class="table-wrap">
<table>
  <thead><tr>
    <th style="width:26px;text-align:center">No</th>
    <th style="min-width:90px">Nama Tamu</th>
    <th>Checkin</th><th>Checkout</th>
    <th style="text-align:center;width:34px">Mlm</th>
    <th>Asal</th>
    <th style="text-align:right">Total Harga</th>
    <th style="text-align:right">DP</th>
    <th style="text-align:right">Sisa</th>
    <th style="text-align:center;width:72px">Status</th>
    <th style="width:52px">Admin</th>
  </tr></thead>
  <tbody>${bodyRows}</tbody>
  <tr class="grand-total">
    <td colspan="4">GRAND TOTAL — ${data.length} booking dari ${propMap.size} properti</td>
    <td style="text-align:center">${totalMalam}</td>
    <td></td>
    <td style="text-align:right">${formatRupiah(totalHarga)}</td>
    <td style="text-align:right">${formatRupiah(totalDP)}</td>
    <td style="text-align:right;color:#fca5a5">${formatRupiah(totalSisa)}</td>
    <td colspan="2"></td>
  </tr>
</table>
</div>
<div class="report-footer">Dokumen ini digenerate otomatis oleh E-Rekap &nbsp;·&nbsp; ${now}</div>
</div></body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }
}

// Legacy shim (unused but prevents import errors in old callers)
export function exportToCSV(_data: Record<string, unknown>[], _filename: string) {}
