import { useState, useEffect, useRef, useCallback } from "react";
import { getReservations, getAdminName } from "@/services/api";
import { markContactSeen, getContactSeen } from "@/hooks/use-unread";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageCircle, Users, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CHAT_BASE = "https://villa.cocspedsafliz.workers.dev";

interface Message {
  id: string;
  sender: string;
  receiver: string;
  message: string;
  created_at: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

async function fetchMessages(user: string, pwd: string, user1: string, user2: string): Promise<Message[]> {
  const res = await fetch(
    `${CHAT_BASE}/messages?user=${encodeURIComponent(user)}&pwd=${encodeURIComponent(pwd)}&user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`
  );
  if (!res.ok) throw new Error("Gagal mengambil pesan");
  return res.json();
}

async function sendMessage(user: string, pwd: string, sender: string, receiver: string, message: string): Promise<void> {
  const res = await fetch(`${CHAT_BASE}/messages?user=${encodeURIComponent(user)}&pwd=${encodeURIComponent(pwd)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, receiver, message }),
  });
  if (!res.ok) throw new Error("Gagal mengirim pesan");
}

export default function ChatPage() {
  const { toast } = useToast();
  const myName = getAdminName();
  const myPwd = localStorage.getItem("pwd") || "";

  const [contacts, setContacts] = useState<string[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showList, setShowList] = useState(true);
  const [unreadContacts, setUnreadContacts] = useState<Set<string>>(new Set());
  const unreadPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getReservations()
      .then((data) => {
        const names = [...new Set(data.map((r) => r.admin_name).filter(Boolean))]
          .filter((n) => n.toLowerCase() !== myName.toLowerCase())
          .sort();
        setContacts(names);
      })
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [myName]);

  const checkUnread = useCallback(async (contactList: string[]) => {
    if (!myName || !myPwd || contactList.length === 0) return;
    const newUnread = new Set<string>();
    await Promise.all(
      contactList.map(async (c) => {
        try {
          const res = await fetch(
            `${CHAT_BASE}/messages?user=${encodeURIComponent(myName)}&pwd=${encodeURIComponent(myPwd)}&user1=${encodeURIComponent(myName)}&user2=${encodeURIComponent(c)}`
          );
          if (!res.ok) return;
          const msgs: Message[] = await res.json();
          const latest = msgs
            .filter((m) => m.sender.toLowerCase() === c.toLowerCase())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          if (!latest) return;
          const seen = getContactSeen(c);
          if (!seen || new Date(latest.created_at).getTime() > new Date(seen).getTime()) {
            newUnread.add(c);
          }
        } catch { /* ignore */ }
      })
    );
    setUnreadContacts(newUnread);
  }, [myName, myPwd]);

  const loadMessages = useCallback(async (contact: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const data = await fetchMessages(myName, myPwd, myName, contact);
      const sorted = data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(sorted);
      markContactSeen(contact);
    } catch {
      if (!silent) toast({ title: "Error", description: "Gagal memuat pesan", variant: "destructive" });
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [myName, myPwd, toast]);

  useEffect(() => {
    if (contacts.length === 0) return;
    checkUnread(contacts);
    unreadPollRef.current = setInterval(() => checkUnread(contacts), 15000);
    return () => { if (unreadPollRef.current) clearInterval(unreadPollRef.current); };
  }, [contacts.join(",")]);

  useEffect(() => {
    if (!selectedContact) return;
    loadMessages(selectedContact);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(selectedContact, true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedContact, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectContact(name: string) {
    setSelectedContact(name);
    setMessages([]);
    setShowList(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !selectedContact) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await sendMessage(myName, myPwd, myName, selectedContact, msg);
      await loadMessages(selectedContact, true);
    } catch {
      toast({ title: "Error", description: "Gagal mengirim pesan", variant: "destructive" });
      setText(msg);
    } finally {
      setSending(false);
    }
  }

  function getInitial(name: string) {
    return name.slice(0, 2).toUpperCase();
  }

  const lastMsgByContact = (contact: string) => {
    const msgs = messages.filter(
      (m) =>
        (m.sender.toLowerCase() === myName.toLowerCase() && m.receiver.toLowerCase() === contact.toLowerCase()) ||
        (m.receiver.toLowerCase() === myName.toLowerCase() && m.sender.toLowerCase() === contact.toLowerCase())
    );
    return msgs[msgs.length - 1]?.message || "";
  };

  const groupByDay = (msgs: Message[]) => {
    const groups: { day: string; messages: Message[] }[] = [];
    for (const m of msgs) {
      const day = formatDay(m.created_at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) {
        last.messages.push(m);
      } else {
        groups.push({ day, messages: [m] });
      }
    }
    return groups;
  };

  return (
    <div className="h-[calc(100vh-10rem)] md:h-[calc(100vh-3rem)] flex gap-0 md:gap-4">

      {/* Contact list */}
      <div className={`${showList ? "flex" : "hidden"} md:flex flex-col w-full md:w-72 shrink-0`}>
        <div className="mb-3">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            Chat
          </h1>
          <p className="text-slate-400 text-sm">Pesan antar admin</p>
        </div>
        <Card className="bg-slate-800/60 border-slate-700/50 flex-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>{contacts.length} admin tersedia</span>
            </div>
          </div>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm px-4">
                Belum ada admin lain di sistem
              </div>
            ) : (
              contacts.map((contact) => {
                const hasUnread = unreadContacts.has(contact);
                const isActive = selectedContact === contact;

                return (
                  <button
                    key={contact}
                    onClick={() => selectContact(contact)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/40 transition-colors border-b border-slate-700/30 text-left ${
                      isActive ? "bg-blue-600/15 border-l-2 border-l-blue-500" : ""
                    }`}
                  >
                    <div className="relative w-9 h-9 shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                        <span className="text-blue-300 text-xs font-bold">{getInitial(contact)}</span>
                      </div>
                      {hasUnread && !isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full ring-2 ring-slate-800 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium capitalize truncate ${hasUnread && !isActive ? "text-white font-semibold" : "text-slate-300"}`}>
                        {contact}
                      </p>
                      {isActive && lastMsgByContact(contact) && (
                        <p className="text-slate-500 text-xs truncate">{lastMsgByContact(contact)}</p>
                      )}
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat area */}
      <div className={`${!showList ? "flex" : "hidden"} md:flex flex-col flex-1 min-w-0`}>
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">Pilih admin untuk mulai chat</p>
          </div>
        ) : (
          <Card className="flex-1 bg-slate-800/60 border-slate-700/50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
              <button
                onClick={() => setShowList(true)}
                className="md:hidden text-slate-400 hover:text-white mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-400/30 flex items-center justify-center">
                <span className="text-blue-300 text-xs font-bold">{getInitial(selectedContact)}</span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold capitalize">{selectedContact}</p>
                <p className="text-slate-500 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Live · update tiap 3 detik
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Belum ada pesan. Mulai percakapan!
                </div>
              ) : (
                groupByDay(messages).map(({ day, messages: dayMsgs }) => (
                  <div key={day}>
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-slate-700/60" />
                      <span className="text-slate-500 text-xs px-2">{day}</span>
                      <div className="flex-1 h-px bg-slate-700/60" />
                    </div>
                    <div className="space-y-1.5">
                      {dayMsgs.map((m) => {
                        const isMe = m.sender.toLowerCase() === myName.toLowerCase();
                        return (
                          <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                              isMe
                                ? "bg-blue-600 text-white rounded-br-sm"
                                : "bg-slate-700/80 text-slate-100 rounded-bl-sm"
                            }`}>
                              <p className="text-sm leading-snug break-words">{m.message}</p>
                              <p className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200/70" : "text-slate-500"} text-right`}>
                                {formatTime(m.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-slate-700/50 shrink-0">
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Kirim pesan ke ${selectedContact}...`}
                className="bg-slate-700/60 border-slate-600 text-white text-sm flex-1 h-9 placeholder:text-slate-500"
                disabled={sending}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!text.trim() || sending}
                className="bg-blue-600 hover:bg-blue-500 text-white h-9 w-9 p-0 shrink-0"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
