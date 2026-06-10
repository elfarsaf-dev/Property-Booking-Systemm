import { useState, useEffect, useCallback } from "react";
import { getAdminName } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Table2, LinkIcon, RefreshCw, AlertCircle } from "lucide-react";
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

function toCSVUrls(url: string): string[] {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const id = match[1];
    const gidMatch = url.match(/[?&]gid=(\d+)/);
    const gid = gidMatch ? `&gid=${gidMatch[1]}` : "";
    return [
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gid}`,
      `https://docs.google.com/spreadsheets/d/${id}/pub?output=csv${gid}`,
    ];
  }
  return [url];
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

function getLinkName(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return `Sheet · ${match[1].slice(0, 10)}…`;
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 30) + "…";
  }
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
  const [tableData, setTableData] = useState<string[][]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableError, setTableError] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

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

  const loadTable = useCallback(async (url: string) => {
    setLoadingTable(true);
    setTableError("");
    setTableData([]);
    const urls = toCSVUrls(url);
    let lastError = "";
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
        lastError = csvUrl;
      }
    }
    setTableError(
      "Gagal memuat data. Pastikan spreadsheet di-share ke 'Anyone with the link' atau sudah dipublish:\nFile → Share → Publish to web."
    );
    setLoadingTable(false);
  }, []);

  useEffect(() => {
    if (selectedLink) loadTable(selectedLink.message);
  }, [selectedLink, loadTable]);

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    const url = inputUrl.trim();
    if (!url) return;
    setAdding(true);
    try {
      const res = await fetch(
        `${CHAT_BASE}/messages?user=${encodeURIComponent(myName)}&pwd=${encodeURIComponent(myPwd)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender: LINK_CHANNEL, receiver: LINK_CHANNEL, message: url }),
        }
      );
      if (!res.ok) throw new Error();
      setInputUrl("");
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
            className="flex items-center gap-2 p-3 border-t border-slate-700/50 shrink-0"
          >
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
                  href={selectedLink.message}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs flex items-center gap-1 hover:underline truncate"
                >
                  <LinkIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{selectedLink.message}</span>
                </a>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => loadTable(selectedLink.message)}
                disabled={loadingTable}
                className="text-slate-400 hover:text-white shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTable ? "animate-spin" : ""}`} />
              </Button>
            </div>

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
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-900/90 backdrop-blur-sm">
                      <th className="text-left text-slate-400 font-semibold px-4 py-2.5 border-b border-slate-700/60 text-xs w-10">
                        #
                      </th>
                      {headers.map((h, i) => (
                        <th
                          key={i}
                          className="text-left text-slate-300 font-semibold px-4 py-2.5 border-b border-slate-700/60 whitespace-nowrap"
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
                        <td className="px-4 py-2 text-slate-600 text-xs">{ri + 1}</td>
                        {headers.map((_, ci) => (
                          <td key={ci} className="px-4 py-2 text-slate-300 whitespace-nowrap">
                            {row[ci] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Row count */}
            {!loadingTable && !tableError && rows.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-700/50 text-slate-500 text-xs shrink-0">
                {rows.length} baris · {headers.length} kolom
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
