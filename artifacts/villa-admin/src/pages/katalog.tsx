import { useState, useEffect, useCallback } from "react";
import {
  getCatalog,
  createCatalog,
  updateCatalog,
  deleteCatalog,
  uploadImage,
  type CatalogItem,
  type CatalogEndpoint,
} from "@/services/api";
import { formatRupiah, exportCatalogToXLSX } from "@/utils/helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Building2,
  MapPin,
  UtensilsCrossed,
  Bike,
  X,
  Image as ImageIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  Tag,
  Search,
  Upload,
  FileDown,
} from "lucide-react";

type Tab = { key: CatalogEndpoint; label: string; icon: React.ElementType; color: string };

const TABS: Tab[] = [
  { key: "properties", label: "Properties", icon: Building2,       color: "blue" },
  { key: "trips",      label: "Trips",      icon: MapPin,          color: "emerald" },
  { key: "catering",   label: "Catering",   icon: UtensilsCrossed, color: "orange" },
  { key: "outbound",   label: "Outbound",   icon: Bike,            color: "violet" },
];

const TAB_ACTIVE: Record<string, string> = {
  blue:    "bg-blue-600 text-white",
  emerald: "bg-emerald-600 text-white",
  orange:  "bg-orange-600 text-white",
  violet:  "bg-violet-600 text-white",
};

type ArrayField = "facilities" | "menu" | "activities" | "destinations" | "notes";

interface FieldDef {
  key: keyof CatalogItem;
  label: string;
  type?: "text" | "number" | "url" | "array" | "rates" | "image";
  placeholder?: string;
}

const FIELDS: Record<CatalogEndpoint, FieldDef[]> = {
  properties: [
    { key: "name",       label: "Nama",       placeholder: "Nama properti" },
    { key: "location",   label: "Lokasi",     placeholder: "Lokasi properti" },
    { key: "type",       label: "Tipe",       placeholder: "villa / glamping" },
    { key: "capacity",   label: "Kapasitas",  placeholder: "Contoh: 20 orang" },
    { key: "image",      label: "Gambar",     type: "image" },
    { key: "rates",      label: "Harga (tarif)", type: "rates" },
    { key: "facilities", label: "Fasilitas",  type: "array", placeholder: "Tambah fasilitas..." },
    { key: "notes",      label: "Peraturan",  type: "array", placeholder: "Tambah peraturan..." },
  ],
  trips: [
    { key: "name",         label: "Nama",       placeholder: "Nama trip" },
    { key: "category",     label: "Kategori",   placeholder: "Contoh: Adventure" },
    { key: "price",        label: "Harga",      type: "number", placeholder: "Harga per orang" },
    { key: "image",        label: "Gambar",     type: "image" },
    { key: "destinations", label: "Destinasi",  type: "array",  placeholder: "Tambah destinasi..." },
    { key: "facilities",   label: "Fasilitas",  type: "array",  placeholder: "Tambah fasilitas..." },
    { key: "notes",        label: "Catatan",    type: "array",  placeholder: "Tambah catatan..." },
  ],
  catering: [
    { key: "name",        label: "Nama",       placeholder: "Nama paket catering" },
    { key: "category",    label: "Kategori",   placeholder: "Contoh: Prasmanan" },
    { key: "price",       label: "Harga",      type: "number", placeholder: "Harga per porsi/paket" },
    { key: "image",       label: "Gambar",     type: "image" },
    { key: "description", label: "Deskripsi",  placeholder: "Deskripsi singkat" },
    { key: "menu",        label: "Menu",       type: "array",  placeholder: "Tambah menu..." },
  ],
  outbound: [
    { key: "name",        label: "Nama",       placeholder: "Nama paket outbound" },
    { key: "category",    label: "Kategori",   placeholder: "Contoh: Team Building" },
    { key: "price",       label: "Harga",      type: "number", placeholder: "Harga per orang" },
    { key: "duration",    label: "Durasi",     placeholder: "Contoh: 2 jam" },
    { key: "capacity",    label: "Kapasitas",  placeholder: "Contoh: 10-30 orang" },
    { key: "image",       label: "Gambar",     type: "image" },
    { key: "description", label: "Deskripsi",  placeholder: "Deskripsi singkat" },
    { key: "activities",  label: "Aktivitas",  type: "array",  placeholder: "Tambah aktivitas..." },
    { key: "facilities",  label: "Fasilitas",  type: "array",  placeholder: "Tambah fasilitas..." },
  ],
};

/* ─── Tag Input ─── */
function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const t = input.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setInput("");
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-slate-800 border-slate-600 text-white text-sm h-8" />
        <Button type="button" size="sm" onClick={add}
          className="bg-slate-700 hover:bg-slate-600 text-white h-8 px-3 shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="flex items-center gap-1 bg-slate-700 text-slate-300 text-xs rounded-full px-2.5 py-0.5">
              {v}
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Rates Input ─── */
function RatesInput({ values, onChange }: {
  values: Array<{ label: string; price: number }>;
  onChange: (v: Array<{ label: string; price: number }>) => void;
}) {
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  function add() {
    const l = label.trim();
    const p = Number(price);
    if (l && p > 0) {
      onChange([...values, { label: l, price: p }]);
      setLabel("");
      setPrice("");
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Label (cth: Sabtu/Minggu)"
          className="bg-slate-800 border-slate-600 text-white text-sm h-8 flex-1" />
        <Input value={price} onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          type="number" placeholder="Harga"
          className="bg-slate-800 border-slate-600 text-white text-sm h-8 w-28" />
        <Button type="button" size="sm" onClick={add}
          className="bg-slate-700 hover:bg-slate-600 text-white h-8 px-3 shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="space-y-1">
          {values.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-slate-300">{r.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{formatRupiah(r.price)}</span>
                <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
                  className="text-slate-500 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Image Uploader ─── */
function ImageUploader({ value, onChange }: {
  value: string; onChange: (url: string) => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
      toast({ title: "Upload berhasil", description: "Gambar berhasil diunggah" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden">
          <img src={value} alt="preview" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <button type="button"
            onClick={() => onChange("")}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600/80 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Upload + URL row */}
      <div className="flex gap-2">
        <label className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium cursor-pointer transition-colors shrink-0 ${
          uploading
            ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
            : "border-slate-600 text-slate-300 hover:bg-slate-700"
        }`}>
          {uploading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading..." : "Pilih File"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="atau paste URL gambar..."
          className="bg-slate-800 border-slate-600 text-white text-sm h-9 flex-1"
        />
      </div>
    </div>
  );
}

/* ─── Image Gallery ─── */
function ImageGallery({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  return (
    <div>
      <div className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden mb-2">
        <img src={images[idx]} alt="" className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        {images.length > 1 && (
          <>
            <button onClick={() => setIdx((c) => (c - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setIdx((c) => (c + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {idx + 1}/{images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {images.slice(0, 8).map((img, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${i === idx ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Detail Modal ─── */
function DetailModal({ item, endpoint, open, onClose, onEdit, onDelete }: {
  item: CatalogItem; endpoint: CatalogEndpoint; open: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const allImages = [item.image].filter(Boolean) as string[];

  const typeColor = item.type === "villa"
    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
    : item.type === "glamping"
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : "bg-slate-700 text-slate-400 border-slate-600";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-white text-lg">{item.name}</DialogTitle>
              {item.location && (
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />{item.location}
                </div>
              )}
            </div>
            {item.type && (
              <Badge className={`border text-xs shrink-0 capitalize ${typeColor}`}>{item.type}</Badge>
            )}
            {item.category && !item.type && (
              <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs shrink-0">{item.category}</Badge>
            )}
          </div>
        </DialogHeader>

        {allImages.length > 0 && <ImageGallery images={allImages} />}

        <div className="space-y-4">
          {(item.capacity) && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Users className="w-4 h-4" />
              Kapasitas: <span className="text-white">{item.capacity}</span>
              {item.units != null && <span className="text-slate-500">· {item.units} unit</span>}
            </div>
          )}
          {item.duration && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>⏱</span> Durasi: <span className="text-white">{item.duration}</span>
            </div>
          )}
          {item.description && (
            <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
          )}

          {/* Rates */}
          {item.rates && item.rates.length > 0 && (
            <div>
              <h4 className="text-white font-medium text-sm mb-2">Harga per Malam</h4>
              <div className="space-y-1.5">
                {item.rates.map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-2 text-sm">
                    <span className="text-slate-300">{r.label}</span>
                    <span className="text-white font-semibold">{formatRupiah(r.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flat price */}
          {item.price != null && !item.rates?.length && (
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Harga:</span>
              <span className="text-white font-semibold text-base">{formatRupiah(item.price)}</span>
            </div>
          )}

          {(["destinations", "activities", "menu", "facilities", "notes"] as ArrayField[]).map((field) => {
            const arr = item[field];
            if (!arr || !arr.length) return null;
            const labels: Record<ArrayField, string> = {
              destinations: "Destinasi", activities: "Aktivitas",
              menu: "Menu", facilities: "Fasilitas", notes: "Peraturan",
            };
            return (
              <div key={field}>
                <h4 className="text-white font-medium text-sm mb-2">{labels[field]}</h4>
                {field === "notes" ? (
                  <ul className="space-y-1">
                    {arr.map((v, i) => (
                      <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>{v}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {arr.map((v, i) => (
                      <Badge key={i} className="bg-slate-700 text-slate-300 border-slate-600 text-xs font-normal">{v}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <Button onClick={onEdit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-9">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit
          </Button>
          <Button onClick={onDelete} variant="outline"
            className="border-red-600/40 text-red-400 hover:bg-red-500/10 h-9 px-3">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Form Modal ─── */
function CatalogModal({ open, onClose, endpoint, item, onSuccess }: {
  open: boolean; onClose: () => void; endpoint: CatalogEndpoint;
  item: CatalogItem | null; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CatalogItem>>({});

  useEffect(() => {
    if (open) setForm(item ? { ...item } : {});
  }, [open, item]);

  function setField(key: keyof CatalogItem, value: string | number | string[] | Array<{label:string;price:number}>) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Strip empty strings and empty arrays before sending
      const cleaned = Object.fromEntries(
        Object.entries(form).filter(([, v]) => {
          if (v === "" || v === undefined || v === null) return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        })
      ) as Partial<CatalogItem>;

      let res: Response;
      if (item) {
        res = await updateCatalog(endpoint, { ...cleaned, id: item.id } as CatalogItem);
      } else {
        res = await createCatalog(endpoint, cleaned);
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(errText || `HTTP ${res.status}`);
      }

      toast({ title: item ? "Diperbarui" : "Ditambahkan", description: "Data berhasil disimpan" });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const tab = TABS.find((t) => t.key === endpoint)!;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{item ? "Edit" : "Tambah"} {tab.label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {FIELDS[endpoint].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-slate-400 text-xs font-medium">{field.label}</label>
              {field.type === "image" ? (
                <ImageUploader
                  value={(form.image as string) || ""}
                  onChange={(url) => setField("image", url)}
                />
              ) : field.type === "rates" ? (
                <RatesInput
                  values={(form.rates as Array<{label:string;price:number}>) || []}
                  onChange={(v) => setField("rates", v)}
                />
              ) : field.type === "array" ? (
                <TagInput
                  values={(form[field.key] as string[]) || []}
                  onChange={(v) => setField(field.key, v)}
                  placeholder={field.placeholder}
                />
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                  value={(form[field.key] as string | number) ?? ""}
                  onChange={(e) =>
                    setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)
                  }
                  placeholder={field.placeholder}
                  className="bg-slate-800 border-slate-600 text-white text-sm h-9"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 h-9">Batal</Button>
            <Button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white h-9">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : item ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Item Card ─── */
function ItemCard({ item, endpoint, onClick }: {
  item: CatalogItem; endpoint: CatalogEndpoint; onClick: () => void;
}) {
  const mainPrice = item.rates?.length
    ? Math.min(...item.rates.map((r) => r.price))
    : item.price;

  const sub =
    endpoint === "properties" ? item.location :
    endpoint === "trips"      ? item.category :
    endpoint === "catering"   ? item.category :
    endpoint === "outbound"   ? item.category : null;

  const arrField: ArrayField =
    endpoint === "catering"   ? "menu" :
    endpoint === "trips"      ? "destinations" :
    endpoint === "outbound"   ? "activities" :
    "facilities";

  const arrItems: string[] = item[arrField] ? (item[arrField] as string[]) : [];

  const typeColor =
    item.type === "villa"    ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
    item.type === "glamping" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <Card
      className="bg-slate-800/60 border-slate-700/50 overflow-hidden hover:border-slate-500/50 transition-all cursor-pointer group"
      onClick={onClick}
    >
      {item.image ? (
        <div className="aspect-[3/2] bg-slate-700 overflow-hidden">
          <img src={item.image} alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
        </div>
      ) : endpoint === "properties" ? (
        <div className="aspect-[3/2] bg-slate-700/40 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-slate-600" />
        </div>
      ) : null}

      <CardContent className="p-2 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-white font-semibold text-[11px] leading-tight flex-1 min-w-0 line-clamp-2">{item.name}</p>
          {item.type && (
            <Badge className={`border text-[9px] shrink-0 capitalize px-1 py-0 leading-4 ${typeColor}`}>{item.type}</Badge>
          )}
        </div>

        {sub && <p className="text-slate-400 text-[10px] truncate">{sub}</p>}
        {item.duration && <p className="text-slate-500 text-[10px]">⏱ {item.duration}</p>}

        {mainPrice != null && (
          <div className="flex items-baseline gap-0.5">
            {item.rates?.length ? <span className="text-slate-500 text-[9px]">mulai</span> : null}
            <span className="text-blue-400 font-bold text-[11px]">{formatRupiah(mainPrice)}</span>
          </div>
        )}

        {arrItems.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {arrItems.slice(0, 2).map((f, i) => (
              <Badge key={i} className="bg-slate-700 text-slate-300 border-slate-600 text-[9px] font-normal px-1 py-0 leading-4">{f}</Badge>
            ))}
            {arrItems.length > 2 && (
              <Badge className="bg-slate-700/60 text-slate-500 border-slate-700 text-[9px] font-normal px-1 py-0 leading-4">+{arrItems.length - 2}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
export default function KatalogPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CatalogEndpoint>("properties");
  const [data, setData] = useState<Record<CatalogEndpoint, CatalogItem[]>>({
    properties: [], trips: [], catering: [], outbound: [],
  });
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null);
  const [editItem,   setEditItem]   = useState<CatalogItem | null>(null);
  const [formOpen,   setFormOpen]   = useState(false);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [deleting,   setDeleting]   = useState(false);

  const load = useCallback(async (ep: CatalogEndpoint, forceRefresh = false) => {
    setLoading(true);
    try {
      const result = await getCatalog(ep, forceRefresh);
      setData((prev) => ({ ...prev, [ep]: result }));
    } catch {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(activeTab);
    setTypeFilter("all");
    setSearch("");
  }, [activeTab]);

  function openAdd() { setEditItem(null); setFormOpen(true); }
  function openEdit(item: CatalogItem) {
    setDetailItem(null);
    setEditItem(item);
    setFormOpen(true);
  }
  function openDelete(item: CatalogItem) {
    setDetailItem(null);
    setDeleteItem(item);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await deleteCatalog(activeTab, deleteItem.id);
      if (!res.ok) throw new Error();
      toast({ title: "Dihapus", description: "Data berhasil dihapus" });
      setData((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].filter((i) => i.id !== deleteItem.id),
      }));
    } catch {
      toast({ title: "Error", description: "Gagal menghapus", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteItem(null);
    }
  }

  const rawItems = data[activeTab];
  const items = rawItems.filter((p) => {
    const matchType = activeTab !== "properties" || typeFilter === "all"
      || (p.type || "").toLowerCase() === typeFilter;
    const q = search.toLowerCase().trim();
    const arrMatch = (arr?: string[]) => arr?.some((v) => v.toLowerCase().includes(q));
    const priceStr = p.price != null ? String(p.price) : "";
    const ratesMatch = p.rates?.some(
      (r) => r.label.toLowerCase().includes(q) || String(r.price).includes(q)
    );
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.type?.toLowerCase().includes(q) ||
      p.capacity?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.duration?.toLowerCase().includes(q) ||
      priceStr.includes(q) ||
      ratesMatch ||
      arrMatch(p.facilities) ||
      arrMatch(p.menu) ||
      arrMatch(p.activities) ||
      arrMatch(p.destinations) ||
      arrMatch(p.notes);
    return matchType && matchSearch;
  });

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white leading-tight">Katalog</h1>
          <p className="text-slate-400 text-xs">{items.length} item · {currentTab.label}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={() => load(activeTab, true)}
            title="Refresh data dari server"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 h-7 w-7 p-0">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {activeTab !== "properties" && items.length > 0 && (
            <Button size="sm" variant="outline"
              onClick={() => exportCatalogToXLSX(activeTab, items)}
              className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 h-7 px-2 gap-1 text-[10px]">
              <FileDown className="w-3 h-3" />
              Export
            </Button>
          )}
          <Button size="sm" onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-500 text-white h-7 px-2 text-[10px] gap-1">
            <Plus className="w-3 h-3" />Tambah
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                active ? TAB_ACTIVE[tab.color] : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}>
              <Icon className="w-3 h-3 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Cari nama, lokasi, fasilitas, harga...`}
          className="bg-slate-800 border-slate-600 text-white text-xs h-7 pl-7"
        />
      </div>

      {/* Properties type filter */}
      {activeTab === "properties" && (
        <div className="flex gap-1.5">
          {(["all", "villa", "glamping"] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all capitalize border ${
                typeFilter === t
                  ? t === "villa"    ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                  : t === "glamping" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                  : "bg-slate-700 text-white border-slate-600"
                  : "text-slate-500 border-slate-700 hover:text-slate-300 hover:border-slate-600"
              }`}>
              {t === "all" ? "Semua" : t}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          <currentTab.icon className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          Belum ada data {currentTab.label}
          <div className="mt-3">
            <Button size="sm" onClick={openAdd} className="bg-blue-600 hover:bg-blue-500 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" />Tambah Pertama
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} endpoint={activeTab}
              onClick={() => setDetailItem(item)} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <DetailModal open={!!detailItem} item={detailItem} endpoint={activeTab}
          onClose={() => setDetailItem(null)}
          onEdit={() => openEdit(detailItem)}
          onDelete={() => openDelete(detailItem)} />
      )}

      {/* Form Modal */}
      <CatalogModal open={formOpen} onClose={() => setFormOpen(false)}
        endpoint={activeTab} item={editItem}
        onSuccess={() => load(activeTab)} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              <strong className="text-slate-300">{deleteItem?.name}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
