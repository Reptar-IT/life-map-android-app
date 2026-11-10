import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  MapDocument,
  MapNode,
  NodeKind,
  NodeStatus,
  ConnectionSide,
  createMap,
  createNode,
  makeId,
  normalizeMaps,
} from "./src/types/map";
import { loadMaps, saveMaps } from "./src/storage/maps";

const C = {
  bg: "#F5F7F6",
  surface: "#FFFFFF",
  text: "#18312C",
  muted: "#71817C",
  border: "#DCE5E1",
  primary: "#176B55",
  primarySoft: "#E2F3EC",
  danger: "#B42318",
};
const PALETTE = [
  "#BDE7D5",
  "#DDE8FB",
  "#F9E8C9",
  "#F1DFF5",
  "#F9DDDD",
  "#D8EEF4",
];
type Tab = "Maps" | "Tasks" | "Milestones" | "Settings";
const KINDS: NodeKind[] = [
  "idea",
  "goal",
  "project",
  "task",
  "milestone",
  "requirement",
  "note",
];
const STATUSES: NodeStatus[] = ["idea", "planned", "in-progress", "done"];
const kindLabel = (k?: NodeKind) =>
  ({
    idea: "Idea",
    goal: "Goal",
    project: "Project",
    task: "Task",
    milestone: "Milestone",
    requirement: "Requirement",
    note: "Note",
  })[k || "idea"];
const statusLabel = (v?: NodeStatus) =>
  ({
    idea: "Idea",
    planned: "Planned",
    "in-progress": "In progress",
    done: "Done",
  })[v || "idea"];
const SIDES: ConnectionSide[] = ["top", "right", "bottom", "left"];
const sideLabel = (side: ConnectionSide) =>
  side[0].toUpperCase() + side.slice(1);
function autoConnectionSides(
  parent: MapNode,
  child: MapNode,
): { parentSide: ConnectionSide; childSide: ConnectionSide } {
  const dx = child.x - parent.x,
    dy = child.y - parent.y;
  if (Math.abs(dx) >= Math.abs(dy))
    return dx >= 0
      ? { parentSide: "right", childSide: "left" }
      : { parentSide: "left", childSide: "right" };
  return dy >= 0
    ? { parentSide: "bottom", childSide: "top" }
    : { parentSide: "top", childSide: "bottom" };
}
function sidePoint(
  node: MapNode,
  side: ConnectionSide,
  width: number,
  height: number,
) {
  switch (side) {
    case "top":
      return { x: node.x, y: node.y - height / 2 };
    case "right":
      return { x: node.x + width / 2, y: node.y };
    case "bottom":
      return { x: node.x, y: node.y + height / 2 };
    case "left":
      return { x: node.x - width / 2, y: node.y };
  }
}

function AppContent() {
  const [maps, setMaps] = useState<MapDocument[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Maps");
  const [newMapName, setNewMapName] = useState("");
  const [nodeDraft, setNodeDraft] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const activeMap = useMemo(
    () => maps.find((m) => m.id === activeMapId) ?? null,
    [maps, activeMapId],
  );
  const selectedNode = useMemo(
    () => activeMap?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [activeMap, selectedNodeId],
  );

  useEffect(() => {
    loadMaps()
      .then((saved) => {
        if (saved.length) setMaps(saved);
        else {
          const starter = createMap("My Life"),
            rootId = starter.nodes[0].id;
          starter.nodes = [
            {
              ...starter.nodes[0],
              x: 390,
              y: 280,
              color: "#BDE7D5",
              kind: "goal",
            },
            createNode("Goals & Future", 390, 115, rootId, "#DDE8FB"),
            createNode("Businesses", 600, 280, rootId, "#F9E8C9"),
            createNode("Projects", 390, 445, rootId, "#F1DFF5"),
            createNode("Skills & Knowledge", 180, 280, rootId, "#D8EEF4"),
          ];
          setMaps([starter]);
        }
      })
      .catch(() => Alert.alert("Load error", "Could not load your saved maps."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!loading)
      saveMaps(maps).catch(() =>
        Alert.alert("Save error", "Your latest changes could not be saved."),
      );
  }, [maps, loading]);

  const updateMap = useCallback(
    (id: string, updater: (m: MapDocument) => MapDocument) =>
      setMaps((current) =>
        current.map((m) =>
          m.id === id
            ? { ...updater(m), updatedAt: new Date().toISOString() }
            : m,
        ),
      ),
    [],
  );
  const updateSelected = (patch: Partial<MapNode>) => {
    if (!activeMap || !selectedNodeId) return;
    updateMap(activeMap.id, (m) => ({
      ...m,
      nodes: m.nodes.map((n) =>
        n.id === selectedNodeId
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n,
      ),
    }));
  };
  const openMap = (m: MapDocument) => {
    setActiveMapId(m.id);
    setSelectedNodeId(m.nodes[0]?.id ?? null);
    setZoom(1);
    setTab("Maps");
  };
  const createNewMap = () => {
    const name = newMapName.trim();
    if (!name) return Alert.alert("Name your map", "Enter a name first.");
    const map = createMap(name);
    setMaps((current) => [map, ...current]);
    setNewMapName("");
    openMap(map);
  };
  const addNode = () => {
    if (!activeMap) return;
    const title = nodeDraft.trim();
    if (!title)
      return Alert.alert(
        "Enter a node name",
        "Name this idea, goal, or requirement.",
      );
    const parent =
      activeMap.nodes.find((n) => n.id === selectedNodeId) ??
      activeMap.nodes[0];
    const direction = activeMap.nodes.length % 2 === 0 ? 1 : -1;
    const childCount = activeMap.nodes.filter(
      (n) => n.parentId === parent.id,
    ).length;
    const node = createNode(
      title,
      parent.x + direction * (145 + (childCount % 2) * 20),
      parent.y + (childCount % 2 === 0 ? 95 : -95),
      parent.id,
      PALETTE[activeMap.nodes.length % PALETTE.length],
    );
    Object.assign(node, autoConnectionSides(parent, node));
    updateMap(activeMap.id, (m) => ({ ...m, nodes: [...m.nodes, node] }));
    setSelectedNodeId(node.id);
    setNodeDraft("");
  };
  const moveNode = (id: string, x: number, y: number) => {
    if (!activeMap) return;
    updateMap(activeMap.id, (m) => ({
      ...m,
      nodes: m.nodes.map((n) =>
        n.id === id ? { ...n, x, y, updatedAt: new Date().toISOString() } : n,
      ),
    }));
  };
  const createChildAtConnection = (
    parentId: string,
    parentSide: ConnectionSide,
    x: number,
    y: number,
  ) => {
    if (!activeMap) return;
    const parent = activeMap.nodes.find((n) => n.id === parentId);
    if (!parent) return;
    // Keep the dragged attachment side fixed and choose the child's facing edge
    // from the final drop position. The coordinates are map/world coordinates.
    const child = createNode(
      "New node",
      x,
      y,
      parentId,
      PALETTE[activeMap.nodes.length % PALETTE.length],
    );
    const sides = autoConnectionSides(parent, child);
    child.parentSide = parentSide;
    child.childSide = sides.childSide;
    updateMap(activeMap.id, (m) => ({ ...m, nodes: [...m.nodes, child] }));
    setSelectedNodeId(child.id);
    setDetailsExpanded(true);
  };

  const reparentNode = (
    sourceId: string,
    targetId: string,
    sourceSide: ConnectionSide,
    targetSide: ConnectionSide,
  ) => {
    if (!activeMap || sourceId === targetId) return;
    const byId = new Map(activeMap.nodes.map((n) => [n.id, n]));
    const source = byId.get(sourceId),
      target = byId.get(targetId);
    if (!source || !target) return;
    if (!source.parentId) {
      Alert.alert("Main node", "The main node cannot be reparented.");
      return;
    }
    let cursor: MapNode | undefined = target;
    while (cursor) {
      if (cursor.id === sourceId) {
        Alert.alert(
          "Invalid connection",
          "A node cannot be connected to one of its descendants.",
        );
        return;
      }
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    updateMap(activeMap.id, (m) => ({
      ...m,
      nodes: m.nodes.map((n) =>
        n.id === sourceId
          ? {
              ...n,
              parentId: targetId,
              childSide: sourceSide,
              parentSide: targetSide,
              updatedAt: new Date().toISOString(),
            }
          : n,
      ),
    }));
    setSelectedNodeId(sourceId);
  };
  const deleteNode = () => {
    if (!activeMap || !selectedNode) return;
    if (!selectedNode.parentId)
      return Alert.alert("Main node", "The root node cannot be deleted.");
    Alert.alert(
      "Delete node?",
      `Delete “${selectedNode.title}”? Its children will connect to its parent.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            updateMap(activeMap.id, (m) => ({
              ...m,
              nodes: m.nodes
                .filter((n) => n.id !== selectedNode.id)
                .map((n) =>
                  n.parentId === selectedNode.id
                    ? { ...n, parentId: selectedNode.parentId }
                    : n,
                ),
            }));
            setSelectedNodeId(null);
          },
        },
      ],
    );
  };
  const cloneNode = () => {
    if (!activeMap || !selectedNode) return;
    const now = new Date().toISOString();
    // A clone duplicates this node's complete details, but not its descendants.
    // Cloning the root creates a child of the root rather than a second root.
    const parentId = selectedNode.parentId ?? selectedNode.id;
    const parent =
      activeMap.nodes.find((n) => n.id === parentId) ?? selectedNode;
    const clone: MapNode = {
      ...selectedNode,
      id: makeId(),
      title: `Copy of ${selectedNode.title}`,
      x: selectedNode.x + 72,
      y: selectedNode.y + 64,
      parentId,
      linkedMapIds: [...(selectedNode.linkedMapIds ?? [])],
      createdAt: now,
      updatedAt: now,
    };
    const sides = autoConnectionSides(parent, clone);
    clone.parentSide = sides.parentSide;
    clone.childSide = sides.childSide;
    updateMap(activeMap.id, (m) => ({ ...m, nodes: [...m.nodes, clone] }));
    setSelectedNodeId(clone.id);
    setDetailsExpanded(true);
  };
  const exportBackup = async () => {
    try {
      const payload = JSON.stringify(
        {
          app: "LifeMap",
          formatVersion: 1,
          exportedAt: new Date().toISOString(),
          maps,
        },
        null,
        2,
      );
      const dir = FileSystem.cacheDirectory;
      if (!dir) throw new Error("No writable cache directory is available.");
      const uri = `${dir}lifemap-backup-${new Date().toISOString().slice(0, 10)}.json`;
      await FileSystem.writeAsStringAsync(uri, payload, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Export LifeMap backup",
        });
      else Alert.alert("Backup created", `File saved at ${uri}`);
    } catch (e) {
      Alert.alert(
        "Export failed",
        e instanceof Error ? e.message : "Could not export.",
      );
    }
  };
  const exportChatGPT = async (map: MapDocument) => {
    try {
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      const children = new Map<string, MapNode[]>();
      map.nodes.forEach((n) => { if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) || []), n]); });
      const lines = [
        `# LifeMap: ${map.name}`, "", `Exported: ${new Date().toISOString()}`, "",
        "## Instructions for ChatGPT", "Treat this as a structured personal mind map. Preserve node IDs and hierarchy when proposing changes. Help break goals into actionable tasks, identify dependencies, risks, missing requirements, milestones, and practical next steps. Distinguish recorded facts from suggestions.", "",
        "## Map overview", `- Map ID: ${map.id}`, `- Total nodes: ${map.nodes.length}`, "",
        "## Complete hierarchy and node details", ""
      ];
      const visited = new Set<string>();
      const render = (node: MapNode, depth: number) => {
        if (visited.has(node.id)) return;
        visited.add(node.id);
        const indent = "  ".repeat(depth);
        lines.push(`${indent}- **${node.title}**`);
        lines.push(`${indent}  - ID: ${node.id}`);
        lines.push(`${indent}  - Type: ${kindLabel(node.kind)} | Status: ${statusLabel(node.status)}`);
        if (node.dueDate) lines.push(`${indent}  - Target date: ${node.dueDate}`);
        if (node.notes?.trim()) lines.push(`${indent}  - Notes: ${node.notes.trim().replace(/\n/g, `\n${indent}    `)}`);
        if (node.requirement?.trim()) lines.push(`${indent}  - Requirement: ${node.requirement.trim().replace(/\n/g, `\n${indent}    `)}`);
        if (node.linkedMapIds?.length) lines.push(`${indent}  - Linked map IDs: ${node.linkedMapIds.join(", ")}`);
        (children.get(node.id) || []).forEach((child) => render(child, depth + 1));
      };
      const roots = map.nodes.filter((n) => !n.parentId || !byId.has(n.parentId));
      roots.forEach((root) => render(root, 0));
      const orphaned = map.nodes.filter((n) => !visited.has(n.id));
      if (orphaned.length) { lines.push("", "## Unattached or cyclic nodes"); orphaned.forEach((n) => render(n, 0)); }
      const dir = FileSystem.cacheDirectory;
      if (!dir) throw new Error("No writable cache directory is available.");
      const safeName = map.name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "map";
      const uri = `${dir}lifemap-${safeName}-chatgpt.md`;
      await FileSystem.writeAsStringAsync(uri, lines.join("\n"), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/markdown", dialogTitle: "Export map for ChatGPT" });
      else Alert.alert("Export created", uri);
    } catch (e) { Alert.alert("Export failed", e instanceof Error ? e.message : "Could not export map details."); }
  };

  const importBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const data = JSON.parse(raw);
      if (
        data?.app !== "LifeMap" ||
        data?.formatVersion !== 1 ||
        !Array.isArray(data.maps)
      )
        throw new Error("This is not a valid LifeMap backup.");
      const restored = normalizeMaps(data.maps);
      if (restored.length !== data.maps.length)
        throw new Error("The backup contains invalid map data.");
      Alert.alert(
        "Restore backup?",
        "This replaces all maps currently stored on this device.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace maps",
            style: "destructive",
            onPress: () => {
              setMaps(restored);
              setActiveMapId(null);
              setSelectedNodeId(null);
              setTab("Maps");
              Alert.alert("Restore complete", "Your maps have been restored.");
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert(
        "Import failed",
        e instanceof Error ? e.message : "Could not read backup.",
      );
    }
  };

  if (loading)
    return (
      <SafeAreaView style={s.loading}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.muted}>Loading your maps…</Text>
      </SafeAreaView>
    );
  const allNodes = maps.flatMap((m) =>
    m.nodes.map((n) => ({ ...n, mapId: m.id, mapName: m.name })),
  );
  const tasks = allNodes
    .filter((n) => n.kind === "task" || n.status === "in-progress")
    .filter((n) =>
      `${n.title} ${n.notes}`.toLowerCase().includes(search.toLowerCase()),
    );
  const milestones = allNodes
    .filter((n) => n.kind === "milestone")
    .filter((n) =>
      `${n.title} ${n.notes}`.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={s.topBar}>
        <View style={s.logo}>
          <Text style={s.logoText}>L</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>YOUR PERSONAL THINKING SPACE</Text>
          <Text style={s.title}>LifeMap</Text>
        </View>
        {tab === "Maps" && activeMap ? (
          <>
            <Pressable
              style={s.iconButton}
              onPress={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}
            >
              <Text style={s.iconButtonText}>＋</Text>
            </Pressable>
            <Pressable
              style={s.iconButton}
              onPress={() =>
                setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))
              }
            >
              <Text style={s.iconButtonText}>−</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      <View style={s.body}>
        {tab === "Maps" && !activeMap && (
          <ScrollView contentContainerStyle={s.home}>
            <View style={s.hero}>
              <Text style={s.heroText}>
                Map your life, ideas, projects, requirements, and the paths to
                your future.
              </Text>
            </View>
            <Text style={s.sectionTitle}>Your maps · {maps.length}</Text>
            {maps.map((m) => (
              <Pressable
                key={m.id}
                style={s.mapCard}
                onPress={() => openMap(m)}
              >
                <View style={s.mapGlyph}>
                  <Text style={s.mapGlyphText}>✳</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.mapName}>{m.name}</Text>
                  <Text style={s.mapMeta}>
                    {m.nodes.length} nodes · Updated{" "}
                    {new Date(m.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </Pressable>
            ))}
            <View style={s.createCard}>
              <Text style={s.sectionTitle}>Create a map</Text>
              <TextInput
                value={newMapName}
                onChangeText={setNewMapName}
                style={s.input}
                placeholder="e.g. My Future, Farm Business, App Ideas"
                placeholderTextColor="#91A09A"
                returnKeyType="done"
                onSubmitEditing={createNewMap}
              />
              <Pressable style={s.primaryButton} onPress={createNewMap}>
                <Text style={s.primaryButtonText}>＋ New map</Text>
              </Pressable>
            </View>
            <Text style={s.privacyNote}>
              Stored on this device · Export backups regularly to protect your
              work.
            </Text>
          </ScrollView>
        )}
        {tab === "Maps" && activeMap && (
          <View style={s.editor}>
            <View style={s.editorHeader}>
              <Pressable
                style={s.backButton}
                onPress={() => {
                  setActiveMapId(null);
                  setSelectedNodeId(null);
                }}
              >
                <Text style={s.backText}>‹ Maps</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={s.editorTitle} numberOfLines={1}>
                  {activeMap.name}
                </Text>
                <Text style={s.editorSubtitle}>
                  {activeMap.nodes.length} nodes · Auto-saved
                </Text>
              </View>
              <Pressable style={s.iconButton} onPress={() => exportChatGPT(activeMap)}><Text style={s.iconButtonText}>AI</Text></Pressable>
              <Text style={s.zoomLabel}>{Math.round(zoom * 100)}%</Text>
            </View>
            {!detailsExpanded && <View style={s.canvasWrap}>
              <Text style={s.canvasHint}>
                Drag nodes to arrange · Drag green dots onto nodes to reparent
                or into empty space to create a child · Pinch to zoom
              </Text>
              <MapCanvas
                map={activeMap}
                collapsedNodeIds={activeMap.collapsedNodeIds || []}
                onToggleCollapse={(id) => updateMap(activeMap.id, (m) => ({ ...m, collapsedNodeIds: (m.collapsedNodeIds || []).includes(id) ? (m.collapsedNodeIds || []).filter((v) => v !== id) : [...(m.collapsedNodeIds || []), id] }))}
                selectedNodeId={selectedNodeId}
                zoom={zoom}
                onZoomChange={setZoom}
                onSelect={(id) => setSelectedNodeId(id)}
                onOpenDetails={(id) => {
                  setSelectedNodeId(id);
                  setDetailsExpanded(true);
                }}
                onMove={moveNode}
                onReparent={reparentNode}
                onCreateChild={createChildAtConnection}
              />
            </View>}
            {detailsExpanded && (
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.nodePanel} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
                <View style={s.panelHeader}>
                  <Pressable
                    style={s.panelToggle}
                    onPress={() => setDetailsExpanded(false)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.panelLabel}>
                        {selectedNode ? "NODE DETAILS" : "ADD A NODE"}
                      </Text>
                      <Text style={s.panelSummary} numberOfLines={1}>
                        {selectedNode
                          ? `${selectedNode.title} · ${kindLabel(selectedNode.kind)}`
                          : "Select a node or add a branch"}
                      </Text>
                    </View>
                    <Text style={s.panelChevron}>
                      {"✕"}
                    </Text>
                  </Pressable>
                  {selectedNode ? (
                    <Pressable
                      accessibilityLabel="Save node details"
                      style={s.saveButton}
                      onPress={async () => {
                        try {
                          await saveMaps(maps);
                          Alert.alert(
                            "Saved",
                            "Node details saved on this device.",
                          );
                        } catch {
                          Alert.alert(
                            "Save failed",
                            "Could not save node details.",
                          );
                        }
                      }}
                    >
                      <Text style={s.saveIcon}>✓</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!detailsExpanded ? (
                  <View style={s.collapsedAddRow}>
                    <TextInput
                      value={nodeDraft}
                      onChangeText={setNodeDraft}
                      style={[s.input, { flex: 1 }]}
                      placeholder="Add a child node…"
                      placeholderTextColor="#91A09A"
                      returnKeyType="done"
                      onSubmitEditing={addNode}
                    />
                    <Pressable style={s.addButton} onPress={addNode}>
                      <Text style={s.addButtonText}>＋</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ScrollView
                    style={s.nodeDetailsScroll}
                    contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {selectedNode ? (
                      <>
                        <TextInput
                          value={selectedNode.title}
                          onChangeText={(title) => updateSelected({ title })}
                          style={s.input}
                          placeholder="Node title"
                          placeholderTextColor="#91A09A"
                        />
                        <Text style={s.helper}>
                          To change a node’s parent, select it and drag one of
                          its connection dots onto the new parent.
                        </Text>
                        <Text style={s.fieldLabel}>Type</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={s.chips}
                        >
                          {KINDS.map((k) => (
                            <Pressable
                              key={k}
                              style={[
                                s.chip,
                                (selectedNode.kind || "idea") === k &&
                                  s.chipActive,
                              ]}
                              onPress={() => updateSelected({ kind: k })}
                            >
                              <Text
                                style={[
                                  s.chipText,
                                  (selectedNode.kind || "idea") === k &&
                                    s.chipTextActive,
                                ]}
                              >
                                {kindLabel(k)}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                        <Text style={s.fieldLabel}>Status</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={s.chips}
                        >
                          {STATUSES.map((st) => (
                            <Pressable
                              key={st}
                              style={[
                                s.chip,
                                selectedNode.status === st && s.chipActive,
                              ]}
                              onPress={() => updateSelected({ status: st })}
                            >
                              <Text
                                style={[
                                  s.chipText,
                                  selectedNode.status === st &&
                                    s.chipTextActive,
                                ]}
                              >
                                {statusLabel(st)}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                        <Text style={s.fieldLabel}>Notes</Text>
                        <TextInput
                          value={selectedNode.notes}
                          onChangeText={(notes) => updateSelected({ notes })}
                          style={[s.input, s.multiline, s.notesArea]}
                          multiline
                          scrollEnabled
                          placeholder="Add context, steps, or thoughts…"
                          placeholderTextColor="#91A09A"
                        />
                        {(selectedNode.kind === "milestone" ||
                          selectedNode.kind === "task" ||
                          selectedNode.kind === "goal") && (
                          <>
                            <Text style={s.fieldLabel}>
                              Target date (YYYY-MM-DD)
                            </Text>
                            <TextInput
                              value={selectedNode.dueDate || ""}
                              onChangeText={(dueDate) =>
                                updateSelected({ dueDate })
                              }
                              style={s.input}
                              placeholder="2027-01-31"
                              placeholderTextColor="#91A09A"
                            />
                          </>
                        )}
                        {selectedNode.kind === "requirement" && (
                          <>
                            <Text style={s.fieldLabel}>
                              Requirement / acceptance criteria
                            </Text>
                            <TextInput
                              value={selectedNode.requirement || ""}
                              onChangeText={(requirement) =>
                                updateSelected({ requirement })
                              }
                              style={[s.input, s.multiline, s.notesArea]}
                              multiline
                              scrollEnabled
                              placeholder="What must be true for this to be complete?"
                              placeholderTextColor="#91A09A"
                            />
                          </>
                        )}
                        <Text style={s.fieldLabel}>Link to another map</Text>
                        <View style={s.linkList}>
                          {maps
                            .filter((m) => m.id !== activeMap.id)
                            .map((m) => {
                              const linked = (
                                selectedNode.linkedMapIds || []
                              ).includes(m.id);
                              return (
                                <Pressable
                                  key={m.id}
                                  style={s.linkRow}
                                  onPress={() =>
                                    updateSelected({
                                      linkedMapIds: linked
                                        ? (
                                            selectedNode.linkedMapIds || []
                                          ).filter((id) => id !== m.id)
                                        : [
                                            ...(selectedNode.linkedMapIds ||
                                              []),
                                            m.id,
                                          ],
                                    })
                                  }
                                >
                                  <Text style={s.linkCheck}>
                                    {linked ? "☑" : "□"}
                                  </Text>
                                  <Text style={s.linkName}>{m.name}</Text>
                                </Pressable>
                              );
                            })}
                          {maps.length < 2 && (
                            <Text style={s.helper}>
                              Create another map to link it here.
                            </Text>
                          )}
                        </View>
                        <Pressable
                          style={s.secondaryButton}
                          onPress={cloneNode}
                        >
                          <Text style={s.secondaryText}>
                            ⧉ Clone selected node
                          </Text>
                        </Pressable>
                        <Text style={s.helper}>
                          Clones all node details, including notes, type,
                          status, dates, requirements, and map links. The clone
                          is independent; its descendants are not copied.
                        </Text>
                        <Pressable style={s.deleteButton} onPress={deleteNode}>
                          <Text style={s.deleteText}>Delete selected node</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Text style={s.helper}>
                        Select a node to edit its details or create a branch.
                      </Text>
                    )}
                    <View style={s.addRow}>
                      <TextInput
                        value={nodeDraft}
                        onChangeText={setNodeDraft}
                        style={[s.input, { flex: 1 }]}
                        placeholder="New idea, goal, task, requirement…"
                        placeholderTextColor="#91A09A"
                        returnKeyType="done"
                        onSubmitEditing={addNode}
                      />
                      <Pressable style={s.addButton} onPress={addNode}>
                        <Text style={s.addButtonText}>＋</Text>
                      </Pressable>
                    </View>
                    <Text style={s.helper}>
                      New nodes connect to the selected node. Map links are
                      saved with the node.
                    </Text>
                  </ScrollView>
                )}
              </KeyboardAvoidingView>
            )}
          </View>
        )}
        {tab === "Tasks" && (
          <ScrollView contentContainerStyle={s.listPage}>
            <Text style={s.pageTitle}>Tasks</Text>
            <Text style={s.pageIntro}>
              Nodes marked as tasks or currently in progress across your maps.
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              style={s.input}
              placeholder="Search tasks…"
              placeholderTextColor="#91A09A"
            />
            {tasks.map((n) => (
              <Pressable
                key={`${n.mapId}-${n.id}`}
                style={s.itemCard}
                onPress={() => {
                  const m = maps.find((x) => x.id === n.mapId);
                  if (m) openMap(m);
                  setSelectedNodeId(n.id);
                }}
              >
                <Text style={s.itemTitle}>{n.title}</Text>
                <Text style={s.mapMeta}>
                  {n.mapName} · {kindLabel(n.kind)} · {statusLabel(n.status)}
                </Text>
                {n.dueDate ? (
                  <Text style={s.itemMeta}>Target: {n.dueDate}</Text>
                ) : null}
                {n.notes ? <Text style={s.itemNotes}>{n.notes}</Text> : null}
              </Pressable>
            ))}
            {tasks.length === 0 && (
              <Text style={s.emptyText}>
                No tasks match your search. Mark a node as Task or In progress
                in a map.
              </Text>
            )}
          </ScrollView>
        )}
        {tab === "Milestones" && (
          <ScrollView contentContainerStyle={s.listPage}>
            <Text style={s.pageTitle}>Milestones</Text>
            <Text style={s.pageIntro}>
              Important checkpoints and target dates from all your maps.
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              style={s.input}
              placeholder="Search milestones…"
              placeholderTextColor="#91A09A"
            />
            {milestones
              .sort((a, b) =>
                (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
              )
              .map((n) => (
                <Pressable
                  key={`${n.mapId}-${n.id}`}
                  style={s.itemCard}
                  onPress={() => {
                    const m = maps.find((x) => x.id === n.mapId);
                    if (m) openMap(m);
                    setSelectedNodeId(n.id);
                  }}
                >
                  <Text style={s.itemTitle}>{n.title}</Text>
                  <Text style={s.mapMeta}>
                    {n.mapName} · {statusLabel(n.status)}
                  </Text>
                  <Text style={s.itemMeta}>
                    {n.dueDate ? `Target: ${n.dueDate}` : "No target date set"}
                  </Text>
                  {n.notes ? <Text style={s.itemNotes}>{n.notes}</Text> : null}
                </Pressable>
              ))}
            {milestones.length === 0 && (
              <Text style={s.emptyText}>
                No milestones yet. Change a node type to Milestone inside a map.
              </Text>
            )}
          </ScrollView>
        )}
        {tab === "Settings" && (
          <ScrollView contentContainerStyle={s.listPage}>
            <Text style={s.pageTitle}>Settings & backup</Text>
            <Text style={s.pageIntro}>
              Your maps are stored locally on this device. Export backups
              regularly before changing devices or reinstalling the app.
            </Text>
            <Pressable style={s.primaryButton} onPress={exportBackup}>
              <Text style={s.primaryButtonText}>↑ Export JSON backup</Text>
            </Pressable>
            <Pressable style={s.secondaryButton} onPress={importBackup}>
              <Text style={s.secondaryText}>↓ Restore from JSON backup</Text>
            </Pressable>
            <View style={s.infoCard}>
              <Text style={s.itemTitle}>Data & privacy</Text>
              <Text style={s.itemNotes}>
                LifeMap currently stores data in local device storage. Backups
                include your maps, nodes, notes, statuses, dates, requirements,
                and map links. Restoring replaces all maps on this device.
              </Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.itemTitle}>Current overview</Text>
              <Text style={s.itemNotes}>
                {maps.length} maps ·{" "}
                {maps.reduce((sum, m) => sum + m.nodes.length, 0)} nodes ·{" "}
                {
                  allNodes.filter(
                    (n) => n.kind === "task" || n.status === "in-progress",
                  ).length
                }{" "}
                tasks/in-progress ·{" "}
                {allNodes.filter((n) => n.kind === "milestone").length}{" "}
                milestones
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
      <View style={s.bottomNav}>
        {(["Maps", "Tasks", "Milestones", "Settings"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={s.navItem}
            onPress={() => {
              setTab(t);
              if (t !== "Maps") setActiveMapId(null);
            }}
          >
            <Text style={[s.navIcon, tab === t && s.navSelected]}>
              {
                (
                  {
                    Maps: "⌘",
                    Tasks: "☷",
                    Milestones: "◇",
                    Settings: "⚙",
                  } as Record<Tab, string>
                )[t]
              }
            </Text>
            <Text style={[s.navText, tab === t && s.navSelected]}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function MapCanvas({
  map,
  collapsedNodeIds,
  onToggleCollapse,
  selectedNodeId,
  zoom,
  onZoomChange,
  onSelect,
  onOpenDetails,
  onMove,
  onReparent,
  onCreateChild,
}: {
  map: MapDocument;
  collapsedNodeIds: string[];
  onToggleCollapse: (id: string) => void;
  selectedNodeId: string | null;
  zoom: number;
  onZoomChange: (value: number | ((previous: number) => number)) => void;
  onSelect: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onReparent: (
    sourceId: string,
    targetId: string,
    sourceSide: ConnectionSide,
    targetSide: ConnectionSide,
  ) => void;
  onCreateChild: (
    parentId: string,
    parentSide: ConnectionSide,
    x: number,
    y: number,
  ) => void;
}) {
  const nodeWidth = 136,
    nodeHeight = 62;
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const [camera, setCamera] = useState(() => ({
    x: map.nodes[0]?.x ?? 0,
    y: map.nodes[0]?.y ?? 0,
  }));
  const cameraRef = useRef(camera);
  const zoomRef = useRef(zoom);
  const panStart = useRef({ x: 0, y: 0, cameraX: 0, cameraY: 0 });
  const pinchStart = useRef<{
    zoom: number;
    cameraX: number;
    cameraY: number;
    focalX: number;
    focalY: number;
  } | null>(null);
  const [pinching, setPinching] = useState(false);
  const byId = useMemo(
    () => new Map(map.nodes.map((n) => [n.id, n])),
    [map.nodes],
  );

  useEffect(() => {
    const next = { x: map.nodes[0]?.x ?? 0, y: map.nodes[0]?.y ?? 0 };
    cameraRef.current = next;
    setCamera(next);
  }, [map.id]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const commitCamera = (next: { x: number; y: number }) => {
    cameraRef.current = next;
    setCamera(next);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !pinching && (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3),
        onPanResponderGrant: () => {
          panStart.current = {
            x: 0,
            y: 0,
            cameraX: cameraRef.current.x,
            cameraY: cameraRef.current.y,
          };
        },
        onPanResponderMove: (_event, gesture) => {
          const scale = Math.max(0.05, zoomRef.current);
          commitCamera({
            x: panStart.current.cameraX - gesture.dx / scale,
            y: panStart.current.cameraY - gesture.dy / scale,
          });
        },
        onPanResponderRelease: () => {},
        onPanResponderTerminate: () => {},
      }),
    [pinching],
  );

  const handlePinch = (event: any) => {
    const e = event.nativeEvent;
    const fx = typeof e.focalX === "number" ? e.focalX : viewport.width / 2;
    const fy = typeof e.focalY === "number" ? e.focalY : viewport.height / 2;
    // Capture the camera and pinch focal point once per gesture. Reusing the
    // moving focal point here causes the whole map to drift while zooming.
    if (!pinchStart.current)
      pinchStart.current = {
        zoom: zoomRef.current,
        cameraX: cameraRef.current.x,
        cameraY: cameraRef.current.y,
        focalX: fx,
        focalY: fy,
      };
    const base = pinchStart.current;
    const nextZoom = Math.max(0.30, Math.min(2.5, base.zoom * e.scale));
    const worldX =
      base.cameraX + (base.focalX - viewport.width / 2) / base.zoom;
    const worldY =
      base.cameraY + (base.focalY - viewport.height / 2) / base.zoom;
    commitCamera({
      x: worldX - (base.focalX - viewport.width / 2) / nextZoom,
      y: worldY - (base.focalY - viewport.height / 2) / nextZoom,
    });
    zoomRef.current = nextZoom;
    onZoomChange(+nextZoom.toFixed(2));
  };
  const finishPinch = (event: any) => {
    const state = event.nativeEvent.state;
    if (state === State.BEGAN || state === State.ACTIVE) setPinching(true);
    if ([State.END, State.CANCELLED, State.FAILED].includes(state)) {
      pinchStart.current = null;
      setPinching(false);
    }
  };

  const screen = (node: MapNode) => ({
    x: viewport.width / 2 + (node.x - camera.x) * zoom,
    y: viewport.height / 2 + (node.y - camera.y) * zoom,
  });
  const hiddenIds = new Set<string>();
  const queue = [...collapsedNodeIds];
  while (queue.length) {
    const parentId = queue.shift()!;
    for (const child of map.nodes.filter((n) => n.parentId === parentId)) {
      if (!hiddenIds.has(child.id)) { hiddenIds.add(child.id); queue.push(child.id); }
    }
  }
  const visibleNodes = map.nodes.filter((node) => {
    if (hiddenIds.has(node.id)) return false;
    const p = screen(node);
    return (
      p.x > -nodeWidth * 2 &&
      p.x < viewport.width + nodeWidth * 2 &&
      p.y > -nodeHeight * 2 &&
      p.y < viewport.height + nodeHeight * 2
    );
  });
  const connectors = map.nodes
    .filter((node) => !hiddenIds.has(node.id) && node.parentId && byId.has(node.parentId) && !hiddenIds.has(node.parentId))
    .map((node) => {
      const parent = byId.get(node.parentId!)!;
      const inferred = autoConnectionSides(parent, node);
      const parentSide = node.parentSide || inferred.parentSide;
      const childSide = node.childSide || inferred.childSide;
      const a = screen(
        sidePoint(parent, parentSide, nodeWidth, nodeHeight) as MapNode,
      );
      const b = screen(
        sidePoint(node, childSide, nodeWidth, nodeHeight) as MapNode,
      );
      if (
        Math.max(a.x, b.x) < -20 ||
        Math.min(a.x, b.x) > viewport.width + 20 ||
        Math.max(a.y, b.y) < -20 ||
        Math.min(a.y, b.y) > viewport.height + 20
      )
        return null;
      return (
        <Line
          key={node.id}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="#AFC5BB"
          strokeWidth={2.2 * zoom}
        />
      );
    })
    .filter(Boolean);

  const handleReparentDrop = (
    sourceId: string,
    sourceSide: ConnectionSide,
    dropX: number,
    dropY: number,
  ) => {
    const target = map.nodes.find((n) => {
      if (n.id === sourceId) return false;
      const p = screen(n);
      return (
        dropX >= p.x - (nodeWidth * zoom) / 2 - 8 &&
        dropX <= p.x + (nodeWidth * zoom) / 2 + 8 &&
        dropY >= p.y - (nodeHeight * zoom) / 2 - 8 &&
        dropY <= p.y + (nodeHeight * zoom) / 2 + 8
      );
    });
    if (!target) {
      // Dropping a connection handle into empty canvas creates a new child at
      // the drop point. Convert screen coordinates back into stable map space.
      const worldX = camera.x + (dropX - viewport.width / 2) / zoom;
      const worldY = camera.y + (dropY - viewport.height / 2) / zoom;
      onCreateChild(sourceId, sourceSide, worldX, worldY);
      return;
    }
    const p = screen(target),
      dx = dropX - p.x,
      dy = dropY - p.y;
    const targetSide: ConnectionSide =
      Math.abs(dx / Math.max(1, nodeWidth)) >=
      Math.abs(dy / Math.max(1, nodeHeight))
        ? dx >= 0
          ? "right"
          : "left"
        : dy >= 0
          ? "bottom"
          : "top";
    onReparent(sourceId, target.id, sourceSide, targetSide);
  };
  // A selected node can become hidden when one of its ancestors is collapsed.
  // Do not leave its connection handles (green extender dots) on the canvas.
  const connectionHandles = selectedNodeId && !hiddenIds.has(selectedNodeId)
    ? (() => {
        const node = byId.get(selectedNodeId);
        if (!node) return null;
        const p = screen(node);
        return SIDES.map((side) => {
          const pt = sidePoint(node, side, nodeWidth, nodeHeight);
          const sx = viewport.width / 2 + (pt.x - camera.x) * zoom;
          const sy = viewport.height / 2 + (pt.y - camera.y) * zoom;
          return (
            <ConnectionHandle
              key={`${node.id}-${side}`}
              x={sx}
              y={sy}
              side={side}
              zoom={zoom}
              onDragEnd={(dx, dy) =>
                handleReparentDrop(node.id, side, sx + dx, sy + dy)
              }
            />
          );
        });
      })()
    : null;

  return (
    <PinchGestureHandler
      onGestureEvent={handlePinch}
      onHandlerStateChange={finishPinch}
    >
      <View
        style={{ flex: 1 }}
        onLayout={(e) =>
          setViewport({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        <View {...panResponder.panHandlers} style={StyleSheet.absoluteFill} />
        <Svg
          pointerEvents="none"
          width={viewport.width}
          height={viewport.height}
          style={StyleSheet.absoluteFill}
        >
          {connectors}
        </Svg>
        {visibleNodes.map((node) => {
          const p = screen(node);
          const hasChildren = map.nodes.some((n) => n.parentId === node.id);
          const collapsed = collapsedNodeIds.includes(node.id);
          return (
            <React.Fragment key={node.id}>
            <DraggableNode
              node={node}
              selected={node.id === selectedNodeId}
              width={nodeWidth}
              height={nodeHeight}
              zoom={zoom}
              screenX={p.x}
              screenY={p.y}
              onSelect={() => onSelect(node.id)}
              onOpenDetails={() => onOpenDetails(node.id)}
              onMove={(x, y) => onMove(node.id, x, y)}
            />
            {hasChildren && (
              <Pressable onPress={() => onToggleCollapse(node.id)} style={{ position: "absolute", left: p.x + nodeWidth * zoom / 2 - 10, top: p.y + nodeHeight * zoom / 2 - 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", zIndex: 25, elevation: 6 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800", lineHeight: 17 }}>{collapsed ? "+" : "−"}</Text>
              </Pressable>
            )}
            </React.Fragment>
          );
        })}
        {connectionHandles}
        <View pointerEvents="none" style={s.canvasFooter}>
          <Text style={s.canvasFooterText}>
            Drag green dots onto nodes to reparent, or into empty space to
            create a child · pinch to zoom · drag empty space to pan ·{" "}
            {Math.round(zoom * 100)}% · {visibleNodes.length}/{map.nodes.length} visible nodes
          </Text>
        </View>
      </View>
    </PinchGestureHandler>
  );
}
function ConnectionHandle({
  x,
  y,
  side,
  zoom,
  onDragEnd,
}: {
  x: number;
  y: number;
  side: ConnectionSide;
  zoom: number;
  onDragEnd: (dx: number, dy: number) => void;
}) {
  const dragged = useRef(false);
  const [delta, setDelta] = useState({ x: 0, y: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: () => {
          dragged.current = false;
          setDelta({ x: 0, y: 0 });
        },
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) dragged.current = true;
          setDelta({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: (_e, g) => {
          if (dragged.current) onDragEnd(g.dx, g.dy);
          setDelta({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => {
          dragged.current = false;
          setDelta({ x: 0, y: 0 });
        },
      }),
    [onDragEnd],
  );
  const size = Math.max(12, 13 * zoom);
  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel={`Drag ${side} connection point to change parent`}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#176B55",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        zIndex: 30,
        elevation: 8,
        transform: [{ translateX: delta.x }, { translateY: delta.y }],
      }}
    />
  );
}

function DraggableNode({
  node,
  selected,
  width,
  height,
  zoom,
  screenX,
  screenY,
  onSelect,
  onOpenDetails,
  onMove,
}: {
  node: MapNode;
  selected: boolean;
  width: number;
  height: number;
  zoom: number;
  screenX: number;
  screenY: number;
  onSelect: () => void;
  onOpenDetails: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const renderedWidth = width * zoom;
  const renderedHeight = height * zoom;
  const readableZoom = Math.max(0.65, zoom);
  const latest = useRef({ x: node.x, y: node.y });
  const start = useRef({ x: node.x, y: node.y });
  const lastTap = useRef(0);
  const dragged = useRef(false);
  const callbacks = useRef({ onSelect, onOpenDetails, onMove, zoom });
  callbacks.current = { onSelect, onOpenDetails, onMove, zoom };
  useEffect(() => {
    latest.current = { x: node.x, y: node.y };
  }, [node.x, node.y]);
  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = { ...latest.current };
          dragged.current = false;
          callbacks.current.onSelect();
        },
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) dragged.current = true;
          if (dragged.current) {
            const scale = Math.max(0.01, callbacks.current.zoom);
            callbacks.current.onMove(
              start.current.x + g.dx / scale,
              start.current.y + g.dy / scale,
            );
          }
        },
        onPanResponderRelease: (_e, g) => {
          if (!dragged.current && Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
            const now = Date.now();
            if (now - lastTap.current < 350) {
              lastTap.current = 0;
              callbacks.current.onOpenDetails();
            } else lastTap.current = now;
          }
        },
        onPanResponderTerminate: () => {
          dragged.current = false;
        },
      }),
    [],
  );
  return (
    <View
      {...responder.panHandlers}
      style={{
        position: "absolute",
        left: screenX - renderedWidth / 2,
        top: screenY - renderedHeight / 2,
        width: renderedWidth,
        height: renderedHeight,
        borderRadius: 14 * zoom,
        borderWidth: (selected ? 2.5 : 1) * zoom,
        borderColor: selected ? C.primary : "#D3E2DB",
        backgroundColor: node.color,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 7 * zoom,
        elevation: selected ? 3 : 1,
      }}
    >
      <Text
        numberOfLines={2}
        style={{
          color: C.text,
          fontSize: 12 * zoom,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {node.title}
      </Text>
      <Text style={{ fontSize: 8 * zoom, color: C.muted }}>
        {kindLabel(node.kind)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  loading: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#FFF", fontSize: 24, fontWeight: "800" },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: C.muted,
    fontWeight: "700",
  },
  title: { fontSize: 23, fontWeight: "800", color: C.text },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonText: { color: C.primary, fontSize: 21, fontWeight: "600" },
  body: { flex: 1 },
  home: { padding: 18, paddingBottom: 26, gap: 15 },
  hero: {
    backgroundColor: "#173D35",
    borderRadius: 22,
    padding: 20,
    gap: 8,
    marginTop: 3,
  },
  heroTitle: { color: "#FFF", fontSize: 23, fontWeight: "800" },
  heroText: { color: "#D2E8DF", fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: "800" },
  mapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  mapGlyph: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  mapGlyphText: { fontSize: 22, color: C.primary },
  mapName: { color: C.text, fontSize: 15, fontWeight: "700" },
  mapMeta: { color: C.muted, fontSize: 10, marginTop: 4 },
  chevron: { color: C.muted, fontSize: 28 },
  createCard: {
    backgroundColor: C.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    gap: 11,
  },
  input: {
    backgroundColor: "#F8FAF9",
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 13,
    minHeight: 44,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryButtonText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryText: { color: C.primary, fontWeight: "800", fontSize: 13 },
  privacyNote: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 16,
  },
  editor: { flex: 1 },
  editorHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  backButton: { paddingVertical: 8, paddingRight: 3 },
  backText: { color: C.primary, fontSize: 13, fontWeight: "700" },
  editorTitle: { color: C.text, fontSize: 15, fontWeight: "800" },
  editorSubtitle: { color: C.muted, fontSize: 10, marginTop: 3 },
  zoomLabel: { fontSize: 11, color: C.muted, fontWeight: "700" },
  canvasWrap: {
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 7,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FBFDFC",
    borderWidth: 1,
    borderColor: C.border,
  },
  canvasHint: {
    color: C.muted,
    fontSize: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F4F8F6",
  },
  canvasFooter: {
    position: "absolute",
    bottom: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  canvasFooterText: { color: C.muted, fontSize: 9 },
  nodePanel: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 7,
    backgroundColor: C.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 42,
  },
  panelToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  panelSummary: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  panelChevron: { fontSize: 22, color: C.primary, paddingHorizontal: 7 },
  saveButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B9DCCD",
  },
  saveIcon: { fontSize: 21, color: C.primary, fontWeight: "800" },
  nodeDetailsScroll: { flex: 1 },
  collapsedAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
  },
  panelLabel: {
    color: C.muted,
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: "800",
  },
  helper: { color: C.muted, fontSize: 10, lineHeight: 15 },
  fieldLabel: { color: C.text, fontSize: 11, fontWeight: "700", marginTop: 2 },
  chips: { gap: 6, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F4F7F5",
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primarySoft, borderColor: C.primary },
  chipText: { fontSize: 10, color: C.muted, fontWeight: "600" },
  chipTextActive: { color: C.primary },
  multiline: { minHeight: 120, textAlignVertical: "top" },
  notesArea: { minHeight: 150, maxHeight: 260 },
  linkList: { gap: 5 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 8,
  },
  linkCheck: { fontSize: 17, color: C.primary },
  linkName: { fontSize: 12, color: C.text },
  deleteButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8C9C5",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: C.danger, fontSize: 11, fontWeight: "700" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addButton: {
    width: 45,
    height: 44,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#FFF", fontSize: 24 },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    paddingTop: 7,
    paddingBottom: 5,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 3,
  },
  navIcon: { fontSize: 18, color: C.muted },
  navText: { fontSize: 9, color: C.muted, fontWeight: "600" },
  navSelected: { color: C.primary, fontWeight: "800" },
  listPage: { padding: 18, gap: 12 },
  pageTitle: { fontSize: 24, fontWeight: "800", color: C.text },
  pageIntro: { fontSize: 12, lineHeight: 18, color: C.muted, marginBottom: 3 },
  itemCard: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  itemTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  itemMeta: { fontSize: 11, color: C.primary, fontWeight: "700", marginTop: 2 },
  itemNotes: { fontSize: 11, color: C.muted, lineHeight: 16, marginTop: 4 },
  emptyText: { fontSize: 12, lineHeight: 18, color: C.muted, padding: 12 },
  infoCard: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  muted: { color: C.muted },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContent />
    </GestureHandlerRootView>
  );
}
