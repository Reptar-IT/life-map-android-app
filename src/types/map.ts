export type NodeStatus = "idea" | "planned" | "in-progress" | "done";
export type NodeKind =
  | "idea"
  | "goal"
  | "project"
  | "task"
  | "milestone"
  | "requirement"
  | "note";
export type ConnectionSide = "top" | "right" | "bottom" | "left";

export type MapNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  parentId: string | null;
  color: string;
  notes: string;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  kind?: NodeKind;
  dueDate?: string;
  requirement?: string;
  linkedMapIds?: string[];
  /** Fixed connector attachment on the parent and this node for its parent-child edge. */
  parentSide?: ConnectionSide;
  childSide?: ConnectionSide;
};

export type MapDocument = {
  id: string;
  name: string;
  nodes: MapNode[];
  createdAt: string;
  updatedAt: string;
};

export const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function createNode(
  title: string,
  x: number,
  y: number,
  parentId: string | null,
  color = "#E2F3EC",
): MapNode {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    title,
    x,
    y,
    parentId,
    color,
    notes: "",
    status: "idea",
    kind: "idea",
    dueDate: "",
    requirement: "",
    linkedMapIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createMap(name: string): MapDocument {
  const now = new Date().toISOString();
  const cleanName = name.trim();
  const root = createNode(cleanName, 390, 270, null, "#BDE7D5");
  return {
    id: makeId(),
    name: cleanName,
    nodes: [root],
    createdAt: now,
    updatedAt: now,
  };
}

/** Adds defaults to older saved maps and fixes legacy connector sides from their current layout. */
export function normalizeMaps(value: unknown): MapDocument[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m: any) =>
        m &&
        typeof m.id === "string" &&
        typeof m.name === "string" &&
        Array.isArray(m.nodes),
    )
    .map((m: any) => {
      const now = new Date().toISOString();
      const nodes: MapNode[] = m.nodes
        .filter(
          (n: any) =>
            n && typeof n.id === "string" && typeof n.title === "string",
        )
        .map((n: any) => ({
          ...n,
          notes: typeof n.notes === "string" ? n.notes : "",
          status: ["idea", "planned", "in-progress", "done"].includes(n.status)
            ? n.status
            : "idea",
          kind: n.kind || "idea",
          dueDate: n.dueDate || "",
          requirement: n.requirement || "",
          linkedMapIds: Array.isArray(n.linkedMapIds) ? n.linkedMapIds : [],
          createdAt: n.createdAt || now,
          updatedAt: n.updatedAt || now,
        }));
      const byId = new Map(nodes.map((n) => [n.id, n]));
      for (const node of nodes) {
        if (!node.parentId || (node.parentSide && node.childSide)) continue;
        const parent = byId.get(node.parentId);
        if (!parent) continue;
        const dx = node.x - parent.x;
        const dy = node.y - parent.y;
        const sides =
          Math.abs(dx) >= Math.abs(dy)
            ? dx >= 0
              ? { parentSide: "right" as const, childSide: "left" as const }
              : { parentSide: "left" as const, childSide: "right" as const }
            : dy >= 0
              ? { parentSide: "bottom" as const, childSide: "top" as const }
              : { parentSide: "top" as const, childSide: "bottom" as const };
        node.parentSide = node.parentSide || sides.parentSide;
        node.childSide = node.childSide || sides.childSide;
      }
      return {
        ...m,
        nodes,
        createdAt: m.createdAt || now,
        updatedAt: m.updatedAt || now,
      } as MapDocument;
    });
}
