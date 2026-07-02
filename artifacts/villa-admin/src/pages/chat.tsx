import { useState, useEffect, useCallback } from "react";
import { getAdminName } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Table2, LinkIcon, RefreshCw, AlertCircle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CHAT_BASE = "https://villa.cocspedsafliz.workers.dev";
const LINK_CHANNEL = "spreadsheets";

interface LinkMessage {
  id: string;
  sender: string;
  receiver: string;
  message: string;
  created_at: string;
}

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function toCSVUrls(url: string, sheetName?: string): string[] {
  const id = extractSpreadsheetId(url);
  if (id) {
    const sheetParam = sheetName
      ? `&sheet=${encodeURIComponent(sheetName)}`
      : (() => {
          const gidMatch = url.match(/[?&]gid=(\d+)/);
          return gidMatch ? `&gid=${gidMatch[1]}` : "";
        })();
    return [
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${sheetParam}`,
      `https://docs.google.com/spreadsheets/d/${id}/pub?output=csv${sheetParam}`,
    ];
  }
  return [url];
}

async function fetchSheetNames(spreadsheetId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=__invalid__xyz__`
    );
    const text = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
    if (!match) return [];
    const json = JSON.parse(match[1]);
    if (json.status === "error") {
      for (const err of (json.errors ?? [])) {
        const namesMatch = (err.message ?? "").match(/Valid sheet names are:\s*(.+)/i);
        if (namesMatch) {
          return namesMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }
    }
    if (json.status === "ok") {
      return [];
    }
  } catch {
    // ignore
  }
  return [];
}

function parseCSV(text: string): string[][] {
  const lines = text.split("\n");
  return lines
    .map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (line[i] === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += line[i];
        }
      }
      result.push(current.trim());
      return result;
    })
    .filter((row) => row.some((cell) => cell !== ""));
}

const SEP = "||";

function parseMessage(msg: string): { title: string; url: string } {
  const idx = msg.indexOf(SEP);
  if (idx !== -1) {
    return { title: msg.slice(0, idx).trim(), url: msg.slice(idx + SEP.length).trim() };
  }
  return { title: "", url: msg.trim() };
}

function getLinkName(msg: string): string {
  const { title, url } = parseMessage(msg);
  if (title) return title;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return `Sheet · ${match[1].slice(0, 10)}…`;
  try { return new URL(url).hostname; } catch { return url.slice(0, 30) + "…"; }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ChatPage() {
  const { toast } = useToast();
  const myName = getAdminName();
  const myPwd = localStorage.getItem("pwd") || "";

  const [links, setLinks] = useState<LinkMessage[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [selectedLink, setSelectedLink] = useState<LinkMessage | null>(null);

  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [loadingSheets, setLoadingSheets] = useState(false);

  const [tableData, setTableData] = useState<string[][]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [inputTitle, setInputTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 2.0;

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(
        `${CHAT_BASE}/messages?user=${encodeURIComponent(myName)}&pwd=${encodeURIComponent(myPwd)}&user1=${encodeURIComponent(LINK_CHANNEL)}&user2=${encodeURIComponent(LINK_CHANNEL)}`
      );
      if (!res.ok) throw new Error();
      const data: LinkMessage[] = await res.json();
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLinks(sorted);
    } catch {
      toast({ title: "Error", description: "Gagal memuat daftar link", variant: "destructive" });
    } finally {
      setLoadingLinks(false);
    }
  }, [myName, myPwd, toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const loadTable = useCallback(async (url: string, sheetName?: string) => {
    setLoadingTable(true);
    setTableError("");
    setTableData([]);
    const urls = toCSVUrls(url, sheetName);
    for (const csvUrl of urls) {
      try {
        const res = await fetch(csvUrl);
        if (!res.ok) continue;
        const text = await res.text();
        if (text.trim().startsWith("<!")) continue;
        const parsed = parseCSV(text);
        if (parsed.length === 0) continue;
        setTableData(parsed);
        setLoadingTable(false);
        return;
      } catch {
        // try next url
      }
    }
    setTableError(
      "Gagal memuat data. Pastikan spreadsheet di-share ke 'Anyone with the link' atau sudah dipublish:\nFile → Share → Publish to web."
    );
    setLoadingTable(false);
  }, []);

  const loadSheetsAndData = useCallback(async (link: LinkMessage) => {
    const { url } = parseMessage(link.message);
    const id = extractSpreadsheetId(url);

    setSheetNames([]);
    setActiveSheet(null);

    if (id) {
      setLoadingSheets(true);
      const names = await fetchSheetNames(id);
      setLoadingSheets(false);
      if (names.length > 0) {
        setSheetNames(names);
        setActiveSheet(names[0]);
        loadTable(url, names[0]);
        return;
      }
    }

    loadTable(url);
  }, [loadTable]);

  useEffect(() => {
    if (selectedLink) {
      loadSheetsAndData(selectedLink);
    }
  }, [selectedLink, loadSheetsAndData]);

  function handleTabClick(name: string) {
    if (!selectedLink || name === activeSheet) return;
    setActiveSheet(name);
    const { url } = parseMessage(selectedLink.message);
    loadTable(url, name);
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    const url = inputUrl.trim();
    const title = inputTitle.trim();
    if (!url) return;
    const stored = title ? `${title}${SEP}${url}` : url;
    setAdding(true);
    try {
      const res = await fetch(
        `${CHAT_BASE}/messages?user=${encodeURIComponent(myName)}&pwd=${encodeURIComponent(myPwd)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender: LINK_CHANNEL, receiver: LINK_CHANNEL, message: stored }),
        }
      );
      if (!res.ok) throw new Error();
      setInputUrl("");
      setInputTitle("");
      await fetchLinks();
      toast({ title: "Link disimpan", description: "Spreadsheet berhasil ditambahkan." });
    } catch {
      toast({ title: "Error", description: "Gagal menambahkan link", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  function selectLink(link: LinkMessage) {
    setSelectedLink(link);
    setShowDetail(true);
  }

  const headers = tableData[0] || [];
  const rows = tableData.slice(1);

  return (
    <div className="h-[calc(100vh-10rem)] md:h-[calc(100vh-3rem)] flex gap-0 md:gap-4">

      {/* Sidebar — link list */}
      <div className={`${showDetail ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 shrink-0`}>
        <div className="mb-3">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Table2 className="w-5 h-5 text-blue-400" />
            Spreadsheet
          </h1>
          <p className="text-slate-400 text-sm">Data dari Google Sheets</p>
        </div>

        <Card className="bg-slate-800/60 border-slate-700/50 flex-1 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {loadingLinks ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm px-4">
                Belum ada link.<br />Tambahkan link Google Sheets di bawah.
              </div>
            ) : (
              links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => selectLink(link)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/40 transition-colors border-b border-slate-700/30 text-left ${
                    selectedLink?.id === link.id
                      ? "bg-blue-600/15 border-l-2 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-green-600/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <Table2 className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-300 truncate">
                      {getLinkName(link.message)}
                    </p>
                    <p className="text-slate-500 text-xs">{formatDate(link.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </CardContent>

          {/* Input tambah link */}
          <form
            onSubmit={handleAddLink}
            className="flex flex-col gap-2 p-3 border-t border-slate-700/50 shrink-0"
          >
            <Input
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              placeholder="Judul (contoh: Data Booking Juni)"
              className="bg-slate-700/60 border-slate-600 text-white text-sm h-9 placeholder:text-slate-500"
              disabled={adding}
            />
            <div className="flex items-center gap-2">
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste link Google Sheets…"
                className="bg-slate-700/60 border-slate-600 text-white text-sm flex-1 h-9 placeholder:text-slate-500"
                disabled={adding}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputUrl.trim() || adding}
                className="bg-blue-600 hover:bg-blue-500 text-white h-9 w-9 p-0 shrink-0"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Main area — table */}
      <div className={`${showDetail ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0`}>
        {!selectedLink ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
              <Table2 className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">Pilih spreadsheet untuk melihat data</p>
          </div>
        ) : (
          <Card className="flex-1 bg-slate-800/60 border-slate-700/50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
              <button
                onClick={() => setShowDetail(false)}
                className="md:hidden text-slate-400 hover:text-white mr-1"
              >
                ←
              </button>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-green-600/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Table2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold">
                  {getLinkName(selectedLink.message)}
                </p>
                <a
                  href={parseMessage(selectedLink.message).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs flex items-center gap-1 hover:underline truncate"
                >
                  <LinkIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{parseMessage(selectedLink.message).url}</span>
                </a>
              </div>
              {/* Zoom controls */}
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  size="sm" variant="ghost"
                  onClick={() => setZoom(z => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))}
                  disabled={zoom <= ZOOM_MIN}
                  className="text-slate-400 hover:text-white h-7 w-7 p-0"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <button
                  onClick={() => setZoom(0.8)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-mono w-9 text-center leading-none"
                  title="Reset zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => setZoom(z => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))}
                  disabled={zoom >= ZOOM_MAX}
                  className="text-slate-400 hover:text-white h-7 w-7 p-0"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => setZoom(1)}
                  className="text-slate-400 hover:text-white h-7 w-7 p-0"
                  title="Reset ke 100%"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => loadSheetsAndData(selectedLink)}
                disabled={loadingTable || loadingSheets}
                className="text-slate-400 hover:text-white shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${(loadingTable || loadingSheets) ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Sheet tabs */}
            {(loadingSheets || sheetNames.length > 0) && (
              <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-slate-700/50 overflow-x-auto shrink-0">
                {loadingSheets ? (
                  <div className="flex items-center gap-2 pb-2 text-slate-500 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Memuat tab…
                  </div>
                ) : (
                  sheetNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleTabClick(name)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-t-md whitespace-nowrap border-b-2 transition-colors ${
                        activeSheet === name
                          ? "text-blue-400 border-blue-400 bg-blue-500/10"
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/40"
                      }`}
                    >
                      {name}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Table content */}
            <div className="flex-1 overflow-auto">
              {loadingTable ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              ) : tableError ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-slate-400 text-sm whitespace-pre-line">{tableError}</p>
                </div>
              ) : tableData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Tidak ada data
                </div>
              ) : (
                <div style={{ zoom, transformOrigin: "top left" }}>
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-900/90 backdrop-blur-sm">
                        <th className="text-left text-slate-400 font-semibold px-3 py-2 border-b border-slate-700/60 text-xs w-8 whitespace-nowrap">
                          #
                        </th>
                        {headers.map((h, i) => (
                          <th
                            key={i}
                            className="text-left text-slate-300 font-semibold px-3 py-2 border-b border-slate-700/60 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr
                          key={ri}
                          className={`border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors ${
                            ri % 2 === 0 ? "" : "bg-slate-800/30"
                          }`}
                        >
                          <td className="px-3 py-1.5 text-slate-600 text-xs">{ri + 1}</td>
                          {headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-1.5 text-slate-300 whitespace-nowrap">
                              {row[ci] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Row count */}
            {!loadingTable && !tableError && rows.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-700/50 text-slate-500 text-xs shrink-0">
                {activeSheet && <span className="text-slate-600 mr-2">Tab: <span className="text-slate-400">{activeSheet}</span> ·</span>}
                {rows.length} baris · {headers.length} kolom
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
