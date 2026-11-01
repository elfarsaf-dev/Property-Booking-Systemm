import test from "node:test";
import assert from "node:assert/strict";
import {
  formatRupiah,
  getNights,
  getStatusColor,
  getStatusLabel,
  getBookingCategoryLabel,
  getAvailableYears,
} from "./helpers";

test("getNights calculates nights accurately between checkin and checkout", () => {
  assert.equal(getNights("2026-07-01", "2026-07-04"), 3);
  assert.equal(getNights("2026-07-05", "2026-07-05"), 0);
  assert.equal(getNights("2026-07-05", "2026-07-03"), 0);
});

test("getStatusLabel and getStatusColor return expected values", () => {
  assert.equal(getStatusLabel("lunas"), "Lunas");
  assert.equal(getStatusLabel("pending"), "Pending");
  assert.equal(getStatusLabel("cancel"), "Cancel");
  assert.match(getStatusColor("lunas"), /emerald/);
  assert.match(getStatusColor("pending"), /amber/);
  assert.match(getStatusColor("cancel"), /red/);
});

test("getBookingCategoryLabel detects category from property_id prefix", () => {
  assert.equal(getBookingCategoryLabel("villa-rn1"), "Properti");
  assert.equal(getBookingCategoryLabel("trips:jeep-1"), "Trips");
  assert.equal(getBookingCategoryLabel("catering:paket-a"), "Catering");
  assert.equal(getBookingCategoryLabel("outbound:paintball"), "Outbound");
});

test("formatRupiah formats Indonesian currency", () => {
  const formatted = formatRupiah(1500000);
  assert.match(formatted, /1\.500\.000/);
});

test("getAvailableYears includes years up to 2030 plus any reservation years", () => {
  const years = getAvailableYears(["2024-12-01", "2026-05-10", null, undefined]);
  assert.deepEqual(years, ["2024", "2025", "2026", "2027", "2028", "2029", "2030"]);
});
