import { useState, useEffect, useRef } from "react";
import { getAdminName } from "@/services/api";

const CHAT_BASE = "https://villa.cocspedsafliz.workers.dev";
const POLL_INTERVAL = 10000;

function seenKey(me: string, contact: string) {
  return `chat_seen_${me.toLowerCase()}_${contact.toLowerCase()}`;
}

export function markContactSeen(contact: string) {
  const me = getAdminName();
  localStorage.setItem(seenKey(me, contact), new Date().toISOString());
}

export function getContactSeen(contact: string): string {
  const me = getAdminName();
  return localStorage.getItem(seenKey(me, contact)) || "";
}

async function fetchLatestFrom(me: string, pwd: string, contact: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${CHAT_BASE}/messages?user=${encodeURIComponent(me)}&pwd=${encodeURIComponent(pwd)}&user1=${encodeURIComponent(me)}&user2=${encodeURIComponent(contact)}`
    );
    if (!res.ok) return null;
    const msgs: { id: string; sender: string; receiver: string; created_at: string }[] = await res.json();
    const fromContact = msgs
      .filter((m) => m.sender.toLowerCase() === contact.toLowerCase() && m.receiver.toLowerCase() === me.toLowerCase())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return fromContact[0]?.created_at ?? null;
  } catch {
    return null;
  }
}

export function useUnreadCount(contacts: string[]) {
  const [unread, setUnread] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function check(contactList: string[]) {
    const me = getAdminName();
    const pwd = localStorage.getItem("pwd") || "";
    if (!me || !pwd || contactList.length === 0) return;

    let count = 0;
    await Promise.all(
      contactList.map(async (c) => {
        const latest = await fetchLatestFrom(me, pwd, c);
        if (!latest) return;
        const seen = getContactSeen(c);
        if (!seen || new Date(latest).getTime() > new Date(seen).getTime()) {
          count++;
        }
      })
    );
    setUnread(count);
  }

  useEffect(() => {
    if (contacts.length === 0) return;
    check(contacts);
    timerRef.current = setInterval(() => check(contacts), POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [contacts.join(",")]);

  return unread;
}
