import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMORIES_KEY = "@zenith_memories_v2";
export const MAX_MEMORIES = 500; // 10× more than most competitors
const MEMORY_INJECTION_LIMIT = 20; // Top memories injected per prompt

export interface Memory {
  id: string;
  text: string;
  createdAt: string;
  pinned?: boolean;
  /** Model key that was active when the memory was created, e.g. "openai" */
  model?: string;
  /** Custom user-defined string attributes, e.g. { "tv show": "Breaking Bad" } */
  labels?: Record<string, string>;
}

export async function getMemories(): Promise<Memory[]> {
  try {
    const raw = await AsyncStorage.getItem(MEMORIES_KEY);
    if (raw) return JSON.parse(raw) as Memory[];
    // Migrate from v1 key
    const oldRaw = await AsyncStorage.getItem("@zenith_memories_v1");
    if (oldRaw) {
      const mems = JSON.parse(oldRaw) as Memory[];
      await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(mems));
      return mems;
    }
    return [];
  } catch {
    return [];
  }
}

export async function addMemory(text: string, model?: string): Promise<Memory> {
  const memories = await getMemories();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const mem: Memory = {
    id,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    ...(model ? { model } : {}),
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

export async function deleteMemories(ids: Set<string>): Promise<void> {
  const memories = await getMemories();
  await AsyncStorage.setItem(MEMORIES_KEY, JSON.stringify(memories.filter((m) => !ids.has(m.id))));
}

export async function pinMemory(id: string): Promise<void> {
  const memories = await getMemories();
  await AsyncStorage.setItem(
    MEMORIES_KEY,
    JSON.stringify(memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)))
  );
}

export async function updateMemory(id: string, patch: Partial<Pick<Memory, "text" | "labels" | "model" | "pinned">>): Promise<void> {
  const memories = await getMemories();
  await AsyncStorage.setItem(
    MEMORIES_KEY,
    JSON.stringify(memories.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  );
}

/** Apply a label key+value to an array of memory ids */
export async function applyLabelToMemories(ids: string[], key: string, value: string): Promise<void> {
  const memories = await getMemories();
  const idSet = new Set(ids);
  await AsyncStorage.setItem(
    MEMORIES_KEY,
    JSON.stringify(
      memories.map((m) =>
        idSet.has(m.id)
          ? { ...m, labels: { ...(m.labels ?? {}), [key]: value } }
          : m
      )
    )
  );
}

/** Remove a label key from an array of memory ids */
export async function removeLabelFromMemories(ids: string[], key: string): Promise<void> {
  const memories = await getMemories();
  const idSet = new Set(ids);
  await AsyncStorage.setItem(
    MEMORIES_KEY,
    JSON.stringify(
      memories.map((m) => {
        if (!idSet.has(m.id)) return m;
        const labels = { ...(m.labels ?? {}) };
        delete labels[key];
        return { ...m, labels };
      })
    )
  );
}

export async function clearAllMemories(): Promise<void> {
  await AsyncStorage.removeItem(MEMORIES_KEY);
}

/** Returns all unique label keys across all memories */
export async function getMemoryLabelKeys(): Promise<string[]> {
  const memories = await getMemories();
  const keys = new Set<string>();
  for (const m of memories) {
    if (m.labels) Object.keys(m.labels).forEach((k) => keys.add(k));
  }
  return Array.from(keys).sort();
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
