import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMORIES_KEY = "@zenith_memories_v1";
const MAX_MEMORIES = 50;
const MEMORY_INJECTION_LIMIT = 10; // Max memories injected per prompt (to keep token cost low)

export interface Memory {
  id: string;
  text: string;
  createdAt: string;
  pinned?: boolean;
}

export async function getMemories(): Promise<Memory[]> {
  try {
    const raw = await AsyncStorage.getItem(MEMORIES_KEY);
    return raw ? (JSON.parse(raw) as Memory[]) : [];
  } catch {
    return [];
  }
}

export async function addMemory(text: string): Promise<Memory> {
  const memories = await getMemories();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const mem: Memory = {
    id,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  memories.unshift(mem);
  if (memories.length > MAX_MEMORIES) memories.splice(MAX_MEMORIES);
  await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
  return mem;
}

export async function deleteMemory(id: string): Promise<void> {
  const memories = await getMemories();
  await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(memories.filter((m) => m.id !== id)));
}

export async function pinMemory(id: string): Promise<void> {
  const memories = await getMemories();
  await AsyncStorage.setItem(
    MEMORIES_KEY,
    JSON.stringify(memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)))
  );
}

export async function clearAllMemories(): Promise<void> {
  await AsyncStorage.removeItem(MEMORIES_KEY);
}

/**
 * Returns a system prompt snippet from the top memories.
 * Pinned memories always appear first, then most recent.
 * Returns empty string if no memories exist.
 */
export async function buildMemorySystemPrompt(): Promise<string> {
  const memories = await getMemories();
  if (memories.length === 0) return "";

  // Pinned first, then by recency
  const sorted = [
    ...memories.filter((m) => m.pinned),
    ...memories.filter((m) => !m.pinned),
  ].slice(0, MEMORY_INJECTION_LIMIT);

  const lines = sorted.map((m) => `- ${m.text}`).join("\n");
  return `The user has the following personal context you should keep in mind:\n${lines}`;
}
