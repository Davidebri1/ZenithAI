import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { BgImage } from "@/components/BgImage";
import { NeonGlowOverlay } from "@/components/NeonGlowOverlay";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getMemories,
  addMemory,
  deleteMemory,
  deleteMemories,
  pinMemory,
  updateMemory,
  applyLabelToMemories,
  removeLabelFromMemories,
  clearAllMemories,
  MAX_MEMORIES,
  type Memory,
} from "@/constants/memories";

type SortMode = "newest" | "oldest" | "pinned" | "label";
type GroupMode = "none" | string; // "none" or a label key

export default function MemoriesScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { theme } = useTheme();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<TextInput>(null);

  // ── Selection mode ──
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Sort / filter / group ──
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterLabelKey, setFilterLabelKey] = useState<string | null>(null);
  const [filterLabelValue, setFilterLabelValue] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupMode>("none");

  // ── Sort/filter panel ──
  const [controlsOpen, setControlsOpen] = useState(false);

  // ── Label editor sheet ──
  const [labelSheet, setLabelSheet] = useState<{
    mode: "single" | "bulk";
    memoryId?: string;
    selectedIds?: string[];
  } | null>(null);
  const [labelKey, setLabelKey] = useState("");
  const [labelValue, setLabelValue] = useState("");

  // All unique label keys across all memories
  const allLabelKeys = useMemo(() => {
    const keys = new Set<string>();
    memories.forEach((m) => m.labels && Object.keys(m.labels).forEach((k) => keys.add(k)));
    return Array.from(keys).sort();
  }, [memories]);

  const load = useCallback(() => {
    getMemories().then(setMemories);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Derived / sorted / filtered list ──
  const displayed = useMemo(() => {
    let list = [...memories];

    // Filter by label
    if (filterLabelKey && filterLabelValue) {
      list = list.filter((m) => m.labels?.[filterLabelKey] === filterLabelValue);
    } else if (filterLabelKey) {
      list = list.filter((m) => m.labels && filterLabelKey in m.labels);
    }

    // Sort
    switch (sortMode) {
      case "newest":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "pinned":
        list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "label":
        if (filterLabelKey) {
          list.sort((a, b) => (a.labels?.[filterLabelKey] ?? "").localeCompare(b.labels?.[filterLabelKey] ?? ""));
        }
        break;
    }

    return list;
  }, [memories, sortMode, filterLabelKey, filterLabelValue]);

  // Group the displayed list
  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "__all__", label: null, items: displayed }];
    const groups = new Map<string, Memory[]>();
    const noLabel: Memory[] = [];
    displayed.forEach((m) => {
      const val = m.labels?.[groupBy];
      if (val) {
        if (!groups.has(val)) groups.set(val, []);
        groups.get(val)!.push(m);
      } else {
        noLabel.push(m);
      }
    });
    const result: { key: string; label: string | null; items: Memory[] }[] = [];
    Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([val, items]) => {
      result.push({ key: val, label: val, items });
    });
    if (noLabel.length > 0) result.push({ key: "__unlabeled__", label: "(unlabeled)", items: noLabel });
    return result;
  }, [displayed, groupBy]);

  const handleAdd = async () => {
    const text = inputText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addMemory(text);
    setInputText("");
    load();
  };

  const handlePin = async (id: string) => {
    Haptics.selectionAsync();
    await pinMemory(id);
    load();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete memory?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMemory(id);
          setMemories((prev) => prev.filter((m) => m.id !== id));
        },
      },
    ]);
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    Alert.alert(`Delete ${selected.size} ${selected.size === 1 ? "memory" : "memories"}?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMemories(selected);
          setSelected(new Set());
          setSelectMode(false);
          load();
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (memories.length === 0) return;
    Alert.alert("Clear all memories?", "All memories will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          await clearAllMemories();
          setMemories([]);
          setSelected(new Set());
          setSelectMode(false);
        },
      },
    ]);
  };

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(displayed.map((m) => m.id)));
  };

  const openLabelSheet = (memoryId?: string) => {
    if (memoryId) {
      setLabelSheet({ mode: "single", memoryId });
    } else {
      setLabelSheet({ mode: "bulk", selectedIds: Array.from(selected) });
    }
    setLabelKey("");
    setLabelValue("");
  };

  const handleApplyLabel = async () => {
    const key = labelKey.trim().toLowerCase();
    const value = labelValue.trim();
    if (!key || !value) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (labelSheet?.mode === "single" && labelSheet.memoryId) {
      const mem = memories.find((m) => m.id === labelSheet.memoryId);
      await updateMemory(labelSheet.memoryId, { labels: { ...(mem?.labels ?? {}), [key]: value } });
    } else if (labelSheet?.mode === "bulk" && labelSheet.selectedIds) {
      await applyLabelToMemories(labelSheet.selectedIds, key, value);
    }
    setLabelSheet(null);
    load();
  };

  const handleRemoveLabel = async (memoryId: string, key: string) => {
    const mem = memories.find((m) => m.id === memoryId);
    if (!mem) return;
    const labels = { ...(mem.labels ?? {}) };
    delete labels[key];
    await updateMemory(memoryId, { labels });
    load();
  };

  // ── Value options for the active filter label key ──
  const filterValueOptions = useMemo(() => {
    if (!filterLabelKey) return [];
    const vals = new Set<string>();
    memories.forEach((m) => { const v = m.labels?.[filterLabelKey]; if (v) vals.add(v); });
    return Array.from(vals).sort();
  }, [memories, filterLabelKey]);

  const sortLabels: { key: SortMode; label: string }[] = [
    { key: "newest", label: "Newest" },
    { key: "oldest", label: "Oldest" },
    { key: "pinned", label: "Pinned first" },
    ...(filterLabelKey ? [{ key: "label" as SortMode, label: `Sort by "${filterLabelKey}"` }] : []),
  ];

  const renderMemory = ({ item }: { item: Memory }) => {
    const isSelected = selected.has(item.id);
    const labelEntries = Object.entries(item.labels ?? {});
    return (
      <TouchableOpacity
        onPress={() => selectMode ? toggleSelect(item.id) : null}
        onLongPress={() => { if (!selectMode) { setSelectMode(true); setSelected(new Set([item.id])); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } }}
        activeOpacity={0.8}
        style={[styles.memCard, { overflow: "hidden" }, isSelected && { borderColor: `${theme.accent}88` }]}
      >
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.memCardBg, item.pinned && styles.memCardBgPinned]} />
        {item.pinned && <View style={[styles.pinAccent, { backgroundColor: theme.accent }]} />}

        {selectMode && (
          <View style={[styles.selectCircle, isSelected && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
            {isSelected && <Feather name="check" size={11} color="#000" />}
          </View>
        )}

        <View style={styles.memContent}>
          <Text style={styles.memText}>{item.text}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.memDate}>
              {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </Text>
            {item.model && (
              <View style={styles.modelChip}>
                <Text style={styles.modelChipText}>{item.model}</Text>
              </View>
            )}
          </View>
          {labelEntries.length > 0 && (
            <View style={styles.labelsRow}>
              {labelEntries.map(([k, v]) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.labelChip, { borderColor: `${theme.accent}55` }]}
                  onPress={() => handleRemoveLabel(item.id, k)}
                  hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.labelChipKey, { color: `${theme.accent}cc` }]}>{k}:</Text>
                  <Text style={styles.labelChipValue}>{v}</Text>
                  <Feather name="x" size={9} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {!selectMode && (
          <View style={styles.memActions}>
            <TouchableOpacity
              onPress={() => openLabelSheet(item.id)}
              style={styles.actionBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 4, bottom: 8, left: 4 }}
            >
              <Feather name="tag" size={13} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePin(item.id)}
              style={[styles.actionBtn, item.pinned && { backgroundColor: `${theme.accent}22` }]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 4, bottom: 8, left: 4 }}
            >
              <Feather name="bookmark" size={13} color={item.pinned ? theme.accent : "rgba(255,255,255,0.3)"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.actionBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }}
            >
              <Feather name="trash-2" size={13} color="rgba(255,80,80,0.6)" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Build flat data for FlatList with group headers
  const flatData: ({ type: "header"; label: string | null; count: number } | { type: "item"; memory: Memory })[] = useMemo(() => {
    const result: typeof flatData = [];
    grouped.forEach((g) => {
      if (groupBy !== "none" && g.label !== null) {
        result.push({ type: "header", label: g.label, count: g.items.length });
      }
      g.items.forEach((m) => result.push({ type: "item", memory: m }));
    });
    return result;
  }, [grouped, groupBy]);

  return (
    <BgImage style={styles.bg}>
      <LinearGradient
        colors={["rgba(7,7,13,0.6)", "rgba(7,7,13,0.92)", "rgba(7,7,13,0.98)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <NeonGlowOverlay />

      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 10 }]}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.headerBg]} />
        <TouchableOpacity onPress={() => { if (selectMode) { setSelectMode(false); setSelected(new Set()); } else { router.back(); } }} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={22} color="#e8e8f4" />
        </TouchableOpacity>
        <View style={styles.headerTextRow}>
          <Text style={styles.headerTitle}>{selectMode ? `${selected.size} selected` : "Memories"}</Text>
          <Text style={styles.headerSub}>
            {selectMode
              ? "Long-press a memory to select"
              : `${memories.length} / ${MAX_MEMORIES} · persistent context`}
          </Text>
        </View>
        <View style={styles.headerBtns}>
          {selectMode ? (
            <>
              <TouchableOpacity onPress={selectAll} style={styles.headerAction} activeOpacity={0.7}>
                <Text style={[styles.headerActionText, { color: theme.accent }]}>All</Text>
              </TouchableOpacity>
              {selected.size > 0 && (
                <>
                  <TouchableOpacity onPress={() => openLabelSheet()} style={styles.headerAction} activeOpacity={0.7}>
                    <Feather name="tag" size={16} color={theme.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerAction} activeOpacity={0.7}>
                    <Feather name="trash-2" size={16} color="rgba(255,80,80,0.7)" />
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setControlsOpen((v) => !v)} style={[styles.headerAction, controlsOpen && { backgroundColor: `${theme.accent}18` }]} activeOpacity={0.7}>
                <Feather name="sliders" size={16} color={controlsOpen ? theme.accent : "rgba(255,255,255,0.5)"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSelectMode} style={styles.headerAction} activeOpacity={0.7}>
                <Feather name="check-square" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              {memories.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={styles.headerAction} activeOpacity={0.7}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Sort / Filter / Group Controls */}
      {controlsOpen && (
        <View style={styles.controlsPanel}>
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.55)" }]} />

          {/* Sort row */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>SORT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
              {sortLabels.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => { setSortMode(s.key); Haptics.selectionAsync(); }}
                  style={[styles.pill, sortMode === s.key && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, sortMode === s.key && { color: theme.accent }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filter by label key */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>FILTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
              <TouchableOpacity
                onPress={() => { setFilterLabelKey(null); setFilterLabelValue(null); }}
                style={[styles.pill, !filterLabelKey && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, !filterLabelKey && { color: theme.accent }]}>All</Text>
              </TouchableOpacity>
              {allLabelKeys.map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => { setFilterLabelKey(filterLabelKey === k ? null : k); setFilterLabelValue(null); Haptics.selectionAsync(); }}
                  style={[styles.pill, filterLabelKey === k && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                  activeOpacity={0.7}
                >
                  <Feather name="tag" size={10} color={filterLabelKey === k ? theme.accent : "rgba(255,255,255,0.4)"} />
                  <Text style={[styles.pillText, filterLabelKey === k && { color: theme.accent }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filter by label value (only if a key is selected) */}
          {filterLabelKey && filterValueOptions.length > 0 && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>VALUE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
                <TouchableOpacity
                  onPress={() => setFilterLabelValue(null)}
                  style={[styles.pill, !filterLabelValue && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, !filterLabelValue && { color: theme.accent }]}>Any</Text>
                </TouchableOpacity>
                {filterValueOptions.map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => { setFilterLabelValue(filterLabelValue === v ? null : v); Haptics.selectionAsync(); }}
                    style={[styles.pill, filterLabelValue === v && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, filterLabelValue === v && { color: theme.accent }]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Group by */}
          {allLabelKeys.length > 0 && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>GROUP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
                <TouchableOpacity
                  onPress={() => { setGroupBy("none"); Haptics.selectionAsync(); }}
                  style={[styles.pill, groupBy === "none" && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, groupBy === "none" && { color: theme.accent }]}>Off</Text>
                </TouchableOpacity>
                {allLabelKeys.map((k) => (
                  <TouchableOpacity
                    key={k}
                    onPress={() => { setGroupBy(groupBy === k ? "none" : k); Haptics.selectionAsync(); }}
                    style={[styles.pill, groupBy === k && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, groupBy === k && { color: theme.accent }]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Add memory input */}
      <View style={styles.addRow}>
        <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.addRowBg]} />
        <TextInput
          ref={inputRef}
          style={styles.addInput}
          placeholder="Add a memory… (e.g. I prefer concise answers)"
          placeholderTextColor="rgba(255,255,255,0.28)"
          selectionColor={theme.accent}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={400}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!inputText.trim()}
          style={[
            styles.addBtn,
            { backgroundColor: inputText.trim() ? theme.accent : "rgba(255,255,255,0.08)" },
          ]}
          activeOpacity={0.75}
        >
          <Feather name="plus" size={18} color={inputText.trim() ? "#000" : "rgba(255,255,255,0.25)"} />
        </TouchableOpacity>
      </View>

      {/* Empty state */}
      {memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="bookmark" size={32} color="rgba(255,255,255,0.12)" />
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptySub}>
            Memories are injected as context into every prompt you send, helping AI models remember your preferences.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, i) => item.type === "header" ? `hdr-${item.label}-${i}` : item.memory.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View style={styles.groupHeader}>
                  <Feather name="tag" size={11} color={theme.accent} />
                  <Text style={[styles.groupHeaderText, { color: theme.accent }]}>{item.label}</Text>
                  <Text style={styles.groupHeaderCount}>{item.count}</Text>
                </View>
              );
            }
            return renderMemory({ item: item.memory });
          }}
          ListHeaderComponent={
            <Text style={styles.countLabel}>
              {displayed.length}{displayed.length !== memories.length ? ` of ${memories.length}` : ""} {displayed.length === 1 ? "memory" : "memories"}{groupBy !== "none" ? ` · grouped by "${groupBy}"` : sortMode !== "newest" ? ` · ${sortLabels.find(s => s.key === sortMode)?.label.toLowerCase()}` : ""}
            </Text>
          }
        />
      )}

      {/* Label editor sheet */}
      <Modal
        visible={!!labelSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setLabelSheet(null)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setLabelSheet(null)} />
        <View style={[styles.labelSheet, { paddingBottom: bottom + 24 }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,20,0.82)", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" }]} />

          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {labelSheet?.mode === "bulk"
              ? `Apply label to ${labelSheet.selectedIds?.length} ${(labelSheet.selectedIds?.length ?? 0) === 1 ? "memory" : "memories"}`
              : "Add / edit label"}
          </Text>

          {/* Existing label keys as quick-fill */}
          {allLabelKeys.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingVertical: 4 }}>
              {allLabelKeys.map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setLabelKey(k)}
                  style={[styles.pill, labelKey === k && { backgroundColor: `${theme.accent}28`, borderColor: `${theme.accent}70` }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, labelKey === k && { color: theme.accent }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.sheetFields}>
            <View style={styles.sheetField}>
              <Text style={styles.sheetFieldLabel}>Attribute name</Text>
              <TextInput
                style={styles.sheetInput}
                placeholder='e.g. "tv show", "topic", "priority"'
                placeholderTextColor="rgba(255,255,255,0.25)"
                selectionColor={theme.accent}
                value={labelKey}
                onChangeText={setLabelKey}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
            <View style={styles.sheetField}>
              <Text style={styles.sheetFieldLabel}>Value</Text>
              <TextInput
                style={styles.sheetInput}
                placeholder='e.g. "Breaking Bad", "cooking", "high"'
                placeholderTextColor="rgba(255,255,255,0.25)"
                selectionColor={theme.accent}
                value={labelValue}
                onChangeText={setLabelValue}
                returnKeyType="done"
                onSubmitEditing={handleApplyLabel}
              />
            </View>
          </View>

          <View style={styles.sheetActions}>
            <TouchableOpacity onPress={() => setLabelSheet(null)} style={styles.sheetCancelBtn} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApplyLabel}
              disabled={!labelKey.trim() || !labelValue.trim()}
              style={[styles.sheetApplyBtn, { backgroundColor: labelKey.trim() && labelValue.trim() ? theme.accent : "rgba(255,255,255,0.08)" }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.sheetApplyText, { color: labelKey.trim() && labelValue.trim() ? "#000" : "rgba(255,255,255,0.25)" }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </BgImage>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  headerBg: { backgroundColor: "rgba(7,7,20,0.55)" },
  backBtn: { marginBottom: 2, paddingRight: 4 },
  headerTextRow: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#e8e8f4" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 2 },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 2 },
  headerAction: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  headerActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,80,80,0.6)" },

  // Controls panel
  controlsPanel: {
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
    paddingVertical: 8,
    gap: 2,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 10,
  },
  controlLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1.2,
    width: 44,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },

  addRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  addRowBg: { backgroundColor: "rgba(255,255,255,0.03)" },
  addInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#f0f0ff",
    maxHeight: 80,
    lineHeight: 20,
    paddingVertical: 4,
    zIndex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.3)" },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    lineHeight: 19,
  },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 6 },
  countLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingHorizontal: 4,
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
  },
  groupHeaderText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flex: 1,
  },
  groupHeaderCount: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
  },

  memCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
    gap: 8,
  },
  memCardBg: { backgroundColor: "rgba(255,255,255,0.03)" },
  memCardBgPinned: { backgroundColor: "rgba(255,255,255,0.05)" },
  pinAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 2.5, opacity: 0.7 },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },

  memContent: { flex: 1, gap: 4 },
  memText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(240,240,255,0.85)",
    lineHeight: 19,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  memDate: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.25)",
  },
  modelChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modelChipText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  labelsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  labelChipKey: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  labelChipValue: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },

  memActions: { flexDirection: "column", alignItems: "center", gap: 2 },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // Label sheet modal
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  labelSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    paddingTop: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#e8e8f4",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  sheetFields: { gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  sheetField: { gap: 6 },
  sheetFieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sheetInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#f0f0ff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  sheetActions: { flexDirection: "row", gap: 10, paddingHorizontal: 20 },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  sheetCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)" },
  sheetApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  sheetApplyText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
