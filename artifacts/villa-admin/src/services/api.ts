import { apiCache } from "@/utils/cache";

const BASE_URL = "https://villadata.elfar.my.id";

export const SUPERADMIN_USER = "superadmin";

function getAuth() {
  const user = localStorage.getItem("user");
  const pwd = localStorage.getItem("pwd");
  return `?user=${user}&pwd=${pwd}`;
}

/* ── Auth helpers ── */
export function isLoggedIn() {
  return !!localStorage.getItem("user") && !!localStorage.getItem("pwd");
}

export function isSuperAdmin() {
  return localStorage.getItem("role") === "superadmin";
}

export function login(username: string, password: string, role: "admin" | "superadmin", adminId: string) {
  localStorage.setItem("user", username);
  localStorage.setItem("pwd", password);
  localStorage.setItem("role", role);
  localStorage.setItem("admin_id", adminId);
}

export function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("pwd");
  localStorage.removeItem("role");
  localStorage.removeItem("admin_id");
}

export function getAdminName() {
  return localStorage.getItem("user") || "";
}

export function getAdminId() {
  return localStorage.getItem("admin_id") || "";
}

/* ── Interfaces ── */
export interface User {
  id: string;
  username: string;
  status: "active" | "banned";
  profile_url?: string;
  created_at?: string;
}

export interface Reservation {
  id: string;
  admin_id?: string;
  admin_name: string;
  guest_name: string;
  guest_phone: string;
  property_name: string;
  property_id: string;
  checkin: string;
  checkout: string;
  total_price: number;
  dp: number;
  address: string;
  people: string;
  vehicles: string;
  note: string;
  status: "pending" | "lunas" | "cancel";
  created_at: string;
}

export interface Rate {
  label: string;
  price: number;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  type: "villa" | "glamping";
  rates: Rate[];
  facilities: string[];
  capacity: string;
  notes: string[];
  image: string;
  slide_images: string[];
  units: number;
}

export type CatalogEndpoint = "properties" | "trips" | "catering" | "outbound";

export interface CatalogItem {
  id: string;
  name: string;
  price?: number;
  category?: string;
  description?: string;
  image?: string;
  location?: string;
  type?: string;
  capacity?: string;
  units?: number;
  duration?: string;
  facilities?: string[];
  menu?: string[];
  activities?: string[];
  destinations?: string[];
  notes?: string[];
  rates?: Array<{ label: string; price: number }>;
  slide_images?: string[];
}

/* ── User endpoints ── */
export async function getCurrentUser(): Promise<User> {
  const res = await fetch(`${BASE_URL}/user${getAuth()}`);
  if (!res.ok) throw new Error("Gagal mengambil data user");
  return res.json();
}

export async function updateCurrentUser(data: {
  username?: string;
  password?: string;
  profile_url?: string;
}): Promise<User> {
  const res = await fetch(`${BASE_URL}/user/update${getAuth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Gagal update profil");
    throw new Error(msg);
  }
  return res.json();
}

export async function getAllUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users${getAuth()}`);
  if (!res.ok) throw new Error("Gagal mengambil data users");
  return res.json();
}

export async function createUser(data: {
  username: string;
  password: string;
  profile_url?: string;
}): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/users/create${getAuth()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Tidak bisa terhubung ke server. Pastikan endpoint /users/create sudah di-deploy di worker.");
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "Gagal membuat user");
    throw new Error(msg);
  }
  const text = await res.text();
  if (!text) return { id: "", username: data.username, status: "active" } as User;
  return JSON.parse(text);
}

export async function updateUser(data: {
  id: string;
  username?: string;
  password?: string;
  status?: "active" | "banned";
  profile_url?: string;
}): Promise<User> {
  const res = await fetch(`${BASE_URL}/users/update${getAuth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Gagal update user");
    throw new Error(msg);
  }
  return res.json();
}

/* ── Reservation endpoints ── */
function handleUnauth(res: Response) {
  if (res.status === 401 || res.status === 403) {
    logout();
    window.location.href = "/login";
    throw new Error("Sesi habis, silakan login ulang");
  }
}

export async function getReservations(): Promise<Reservation[]> {
  const adminId = getAdminId();
  const extraParam = (!isSuperAdmin() && adminId) ? `&admin_id=eq.${adminId}` : "";
  const res = await fetch(`${BASE_URL}/reservations${getAuth()}${extraParam}`);
  handleUnauth(res);
  if (!res.ok) throw new Error("Gagal mengambil data reservasi");
  return res.json();
}

export async function createReservation(
  data: Omit<Reservation, "id" | "created_at">
): Promise<Response> {
  return fetch(`${BASE_URL}/reservations${getAuth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateReservation(data: Reservation): Promise<Response> {
  return fetch(`${BASE_URL}/reservations${getAuth()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteReservation(id: string): Promise<Response> {
  return fetch(`${BASE_URL}/reservations?id=${id}${getAuth().replace("?", "&")}`, {
    method: "DELETE",
  });
}

/* ── Property & Catalog endpoints (with sessionStorage cache) ── */
export async function getProperties(forceRefresh = false): Promise<Property[]> {
  if (!forceRefresh) {
    const cached = apiCache.get<Property[]>("properties");
    if (cached) return cached;
  }
  const res = await fetch(`${BASE_URL}/properties${getAuth()}`);
  if (!res.ok) throw new Error("Gagal mengambil data properti");
  const data = await res.json();
  apiCache.set("properties", data);
  return data;
}

export async function getCatalog(endpoint: CatalogEndpoint, forceRefresh = false): Promise<CatalogItem[]> {
  if (!forceRefresh) {
    const cached = apiCache.get<CatalogItem[]>(endpoint);
    if (cached) return cached;
  }
  const res = await fetch(`${BASE_URL}/${endpoint}${getAuth()}`);
  if (!res.ok) throw new Error(`Gagal mengambil data ${endpoint}`);
  const data = await res.json();
  apiCache.set(endpoint, data);
  return data;
}

export async function createCatalog(
  endpoint: CatalogEndpoint,
  data: Partial<CatalogItem>
): Promise<Response> {
  apiCache.clear(endpoint);
  return fetch(`${BASE_URL}/${endpoint}${getAuth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateCatalog(
  endpoint: CatalogEndpoint,
  data: Partial<CatalogItem> & { id: string }
): Promise<Response> {
  apiCache.clear(endpoint);
  return fetch(`${BASE_URL}/${endpoint}${getAuth()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteCatalog(endpoint: CatalogEndpoint, id: string): Promise<Response> {
  apiCache.clear(endpoint);
  return fetch(`${BASE_URL}/${endpoint}?id=${id}${getAuth().replace("?", "&")}`, {
    method: "DELETE",
  });
}

export async function uploadImage(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch(`${BASE_URL}/upload${getAuth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, content: base64 }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Upload gagal");
    throw new Error(text);
  }

  const data = await res.json();
  return data.content?.download_url as string;
}
