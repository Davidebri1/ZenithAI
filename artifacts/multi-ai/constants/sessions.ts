import AsyncStorage from "@react-native-async-storage/async-storage";

export const SESSIONS_KEY = "@multiai_sessions_v2";
export const CONV_IDS_KEY = "@multiai_conv_ids_v2";

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  convIds: Record<string, number>;
  isPrivate?: boolean;
}

export async function getSessions(): Promise<Session[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export async function saveSession(
  title: string,
  convIds: Record<string, number>
): Promise<void> {
  if (!title || Object.keys(convIds).length === 0) return;
  const sessions = await getSessions();
  const session: Session = {
    id: Date.now().toString(),
    title,
    createdAt: new Date().toISOString(),
    convIds,
    isPrivate: false,
  };
  sessions.unshift(session);
  if (sessions.length > 100) sessions.splice(100);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify(sessions.filter((s) => s.id !== id))
  );
}

export async function toggleSessionPrivate(id: string): Promise<boolean> {
  const sessions = await getSessions();
  let newPrivate = false;
  const updated = sessions.map((s) => {
    if (s.id === id) {
      newPrivate = !s.isPrivate;
      return { ...s, isPrivate: newPrivate };
    }
    return s;
  });
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  return newPrivate;
}

export async function clearSessionsByFilter(
  filter: "public" | "private" | "all"
): Promise<void> {
  if (filter === "all") {
    await AsyncStorage.removeItem(SESSIONS_KEY);
    return;
  }
  const sessions = await getSessions();
  const kept = sessions.filter((s) =>
    filter === "private" ? !s.isPrivate : s.isPrivate
  );
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(kept));
}

export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(SESSIONS_KEY);
}

export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  } else {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
