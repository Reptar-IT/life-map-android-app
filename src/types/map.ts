export type NodeStatus = "idea" | "planned" | "in-progress" | "done";

export type NodeKind =
  | "idea"
  | "goal"
  | "project"
  | "task"
  | "milestone"
  | "requirement"
  | "note"
  | "person";

export type ConnectionSide = "top" | "right" | "bottom" | "left";

export type MapType = "mindmap" | "genogram";

export type GenogramMemberStatus = "alive" | "deceased" | "incarcerated";

export type GenogramRelationshipType =
  | "parent-child"
  | "adoptive-parent-child"
  | "spouse"
  | "partner"
  | "guardian";

export type ImportantDate = {
  id: string;
  label: string;
  date: string;
  notes?: string;
};

export type GenogramEvent = {
  id: string;
  title: string;
  date?: string;
  description?: string;
};

export type GenogramProfile = {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  memberStatus: GenogramMemberStatus;
  bloodType: string;
  importantDates: ImportantDate[];
  socialMedia: {
    platform: string;
    url: string;
  }[];
  contactNumber: string;
  email: string;
  medicalHistory: string;
  events: GenogramEvent[];
  occupation: string;
  notes: string;
};

export type ParentConnection = {
  parentId: string;
  parentSide: ConnectionSide;
  childSide: ConnectionSide;
};

export type GenogramRelationship = {
  id: string;
  fromId: string;
  toId: string;
  type: GenogramRelationshipType;
  label?: string;
  notes?: string;
  createdAt: string;
};

export type MapNode = {
  id: string;
  title: string;
  x: number;
  y: number;

  /**
   * Backwards-compatible single-parent field.
   * New code should use parentIds and parentConnections.
   */
  parentId: string | null;

  /** A node may have more than one parent. */
  parentIds: string[];

  /** Connector attachment sides are stored separately for each parent edge. */
  parentConnections: ParentConnection[];

  color: string;
  notes: string;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  kind?: NodeKind;
  dueDate?: string;
  requirement?: string;
  linkedMapIds?: string[];

  /**
   * Legacy connector fields retained so old backups and older callers remain
   * compatible. New connections are stored in parentConnections.
   */
  parentSide?: ConnectionSide;
  childSide?: ConnectionSide;

  /** Present on people in a Genogram map. */
  genogram?: GenogramProfile;
};

export type MapDocument = {
  id: string;
  name: string;
  type: MapType;
  nodes: MapNode[];
  createdAt: string;
  updatedAt: string;
  collapsedNodeIds?: string[];
  genogramRelationships?: GenogramRelationship[];
};

const VALID_STATUSES: NodeStatus[] = ["idea", "planned", "in-progress", "done"];

const VALID_KINDS: NodeKind[] = [
  "idea",
  "goal",
  "project",
  "task",
  "milestone",
  "requirement",
  "note",
  "person",
];

const VALID_SIDES: ConnectionSide[] = ["top", "right", "bottom", "left"];

const VALID_MEMBER_STATUSES: GenogramMemberStatus[] = [
  "alive",
  "deceased",
  "incarcerated",
];

const VALID_RELATIONSHIP_TYPES: GenogramRelationshipType[] = [
  "parent-child",
  "adoptive-parent-child",
  "spouse",
  "partner",
  "guardian",
];

export const makeId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const statusColor = (status: NodeStatus): string =>
  ({
    planned: "#DCE9FF",
    "in-progress": "#DCE9FF",
    done: "#DDF4E4",
    idea: "#F9DDDD",
  })[status];

export const genogramStatusColor = (status: GenogramMemberStatus): string =>
  ({
    alive: "#DCE9FF",
    deceased: "#E5E7EB",
    incarcerated: "#F9DDDD",
  })[status];

export const createGenogramProfile = (): GenogramProfile => ({
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  memberStatus: "alive",
  bloodType: "",
  importantDates: [],
  socialMedia: [],
  contactNumber: "",
  email: "",
  medicalHistory: "",
  events: [],
  occupation: "",
  notes: "",
});

export const createNode = (
  title: string,
  x: number,
  y: number,
  parentId: string | null,
  color = "#E2F3EC",
): MapNode => {
  const now = new Date().toISOString();

  return {
    id: makeId(),
    title,
    x,
    y,
    parentId,
    parentIds: parentId ? [parentId] : [],
    parentConnections: [],
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
};

export const createMap = (
  name: string,
  type: MapType = "mindmap",
): MapDocument => {
  const now = new Date().toISOString();
  const cleanName = name.trim();
  const root = createNode(
    cleanName,
    390,
    270,
    null,
    type === "genogram" ? "#DCE9FF" : "#BDE7D5",
  );

  if (type === "genogram") {
    root.kind = "person";
    root.genogram = createGenogramProfile();
  }

  return {
    id: makeId(),
    name: cleanName,
    type,
    nodes: [root],
    createdAt: now,
    updatedAt: now,
    collapsedNodeIds: [],
    genogramRelationships: [],
  };
};

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validSide = (value: unknown): value is ConnectionSide =>
  typeof value === "string" && VALID_SIDES.includes(value as ConnectionSide);

const normalizeImportantDates = (value: unknown): ImportantDate[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is Record<string, any> =>
            isRecord(item) &&
            typeof item.label === "string" &&
            typeof item.date === "string",
        )
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : makeId(),
          label: item.label,
          date: item.date,
          ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
        }))
    : [];

const normalizeGenogramEvents = (value: unknown): GenogramEvent[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is Record<string, any> =>
            isRecord(item) && typeof item.title === "string",
        )
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : makeId(),
          title: item.title,
          ...(typeof item.date === "string" ? { date: item.date } : {}),
          ...(typeof item.description === "string"
            ? { description: item.description }
            : {}),
        }))
    : [];

const normalizeGenogramProfile = (value: unknown): GenogramProfile => {
  const source = isRecord(value) ? value : {};
  const socialMedia = Array.isArray(source.socialMedia)
    ? source.socialMedia
        .filter(
          (item: unknown): item is Record<string, any> =>
            isRecord(item) &&
            typeof item.platform === "string" &&
            typeof item.url === "string",
        )
        .map((item: Record<string, any>) => ({
          platform: item.platform,
          url: item.url,
        }))
    : [];

  return {
    firstName: typeof source.firstName === "string" ? source.firstName : "",
    middleName: typeof source.middleName === "string" ? source.middleName : "",
    lastName: typeof source.lastName === "string" ? source.lastName : "",
    dateOfBirth:
      typeof source.dateOfBirth === "string" ? source.dateOfBirth : "",
    memberStatus: VALID_MEMBER_STATUSES.includes(source.memberStatus)
      ? source.memberStatus
      : "alive",
    bloodType: typeof source.bloodType === "string" ? source.bloodType : "",
    importantDates: normalizeImportantDates(source.importantDates),
    socialMedia,
    contactNumber:
      typeof source.contactNumber === "string" ? source.contactNumber : "",
    email: typeof source.email === "string" ? source.email : "",
    medicalHistory:
      typeof source.medicalHistory === "string" ? source.medicalHistory : "",
    events: normalizeGenogramEvents(source.events),
    occupation: typeof source.occupation === "string" ? source.occupation : "",
    notes: typeof source.notes === "string" ? source.notes : "",
  };
};

const inferConnectionSides = (
  parent: MapNode,
  child: MapNode,
): ParentConnection => {
  const dx = child.x - parent.x;
  const dy = child.y - parent.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? {
          parentId: parent.id,
          parentSide: "right",
          childSide: "left",
        }
      : {
          parentId: parent.id,
          parentSide: "left",
          childSide: "right",
        };
  }

  return dy >= 0
    ? {
        parentId: parent.id,
        parentSide: "bottom",
        childSide: "top",
      }
    : {
        parentId: parent.id,
        parentSide: "top",
        childSide: "bottom",
      };
};

const normalizeParentConnections = (
  value: unknown,
  parentIds: string[],
  node: MapNode,
  byId: Map<string, MapNode>,
  legacyParentSide?: ConnectionSide,
  legacyChildSide?: ConnectionSide,
): ParentConnection[] => {
  const supplied = Array.isArray(value)
    ? value
        .filter(
          (item: unknown): item is Record<string, any> =>
            isRecord(item) &&
            typeof item.parentId === "string" &&
            validSide(item.parentSide) &&
            validSide(item.childSide),
        )
        .map((item: Record<string, any>) => ({
          parentId: item.parentId,
          parentSide: item.parentSide as ConnectionSide,
          childSide: item.childSide as ConnectionSide,
        }))
    : [];

  return parentIds
    .filter((parentId) => byId.has(parentId))
    .map((parentId) => {
      const existing = supplied.find((item) => item.parentId === parentId);
      if (existing) return existing;

      const parent = byId.get(parentId)!;
      const inferred = inferConnectionSides(parent, node);

      return {
        parentId,
        parentSide:
          parentId === node.parentId && validSide(legacyParentSide)
            ? legacyParentSide
            : inferred.parentSide,
        childSide:
          parentId === node.parentId && validSide(legacyChildSide)
            ? legacyChildSide
            : inferred.childSide,
      };
    });
};

const normalizeGenogramRelationships = (
  value: unknown,
  nodeIds: Set<string>,
  now: string,
): GenogramRelationship[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item: unknown): item is Record<string, any> =>
            isRecord(item) &&
            typeof item.fromId === "string" &&
            typeof item.toId === "string" &&
            item.fromId !== item.toId &&
            nodeIds.has(item.fromId) &&
            nodeIds.has(item.toId) &&
            VALID_RELATIONSHIP_TYPES.includes(item.type),
        )
        .map((item: Record<string, any>) => ({
          id: typeof item.id === "string" ? item.id : makeId(),
          fromId: item.fromId,
          toId: item.toId,
          type: item.type as GenogramRelationshipType,
          ...(typeof item.label === "string" ? { label: item.label } : {}),
          ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
          createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
        }))
    : [];

/**
 * Adds defaults to older saved maps and migrates the original parentId
 * relationship into parentIds and parentConnections.
 *
 * Existing map IDs, node IDs, positions, notes, and map links are retained.
 */
export const normalizeMaps = (value: unknown): MapDocument[] => {
  if (!Array.isArray(value)) return [];

  const validMaps = value.filter(
    (
      map,
    ): map is Record<string, any> & {
      id: string;
      name: string;
      nodes: unknown[];
    } =>
      isRecord(map) &&
      typeof map.id === "string" &&
      typeof map.name === "string" &&
      Array.isArray(map.nodes),
  );

  return validMaps.map((source): MapDocument => {
    const now = new Date().toISOString();

    const initialNodes: MapNode[] = source.nodes
      .filter(
        (
          node: unknown,
        ): node is Record<string, any> &
          Pick<MapNode, "id" | "title" | "x" | "y"> =>
          isRecord(node) &&
          typeof node.id === "string" &&
          typeof node.title === "string" &&
          typeof node.x === "number" &&
          typeof node.y === "number",
      )
      .map((node: Record<string, any>) => {
        const legacyParentId =
          typeof node.parentId === "string" ? node.parentId : null;

        const parentIds = Array.isArray(node.parentIds)
          ? node.parentIds.filter(
              (id: unknown): id is string =>
                typeof id === "string" && id !== node.id,
            )
          : legacyParentId
            ? [legacyParentId]
            : [];

        const uniqueParentIds = [...new Set(parentIds)];

        return {
          ...node,
          id: node.id,
          title: node.title,
          x: node.x,
          y: node.y,
          parentId: legacyParentId ?? uniqueParentIds[0] ?? null,
          parentIds: uniqueParentIds,
          parentConnections: [],
          color: typeof node.color === "string" ? node.color : "#E2F3EC",
          notes: typeof node.notes === "string" ? node.notes : "",
          status: VALID_STATUSES.includes(node.status) ? node.status : "idea",
          kind: VALID_KINDS.includes(node.kind) ? node.kind : "idea",
          dueDate: typeof node.dueDate === "string" ? node.dueDate : "",
          requirement:
            typeof node.requirement === "string" ? node.requirement : "",
          linkedMapIds: Array.isArray(node.linkedMapIds)
            ? node.linkedMapIds.filter(
                (id: unknown): id is string => typeof id === "string",
              )
            : [],
          createdAt: typeof node.createdAt === "string" ? node.createdAt : now,
          updatedAt: typeof node.updatedAt === "string" ? node.updatedAt : now,
          ...(node.genogram
            ? { genogram: normalizeGenogramProfile(node.genogram) }
            : {}),
        } satisfies MapNode;
      });

    const byId = new Map(initialNodes.map((node) => [node.id, node]));
    const nodes = initialNodes.map((node) => {
      const parentIds = node.parentIds.filter(
        (parentId) => parentId !== node.id && byId.has(parentId),
      );

      const parentConnections = normalizeParentConnections(
        (
          source.nodes.find((item: any) => item.id === node.id) as
            | Record<string, any>
            | undefined
        )?.parentConnections,
        parentIds,
        node,
        byId,
        node.parentSide,
        node.childSide,
      );

      return {
        ...node,
        parentIds,
        parentId: parentIds[0] ?? null,
        parentConnections,
      };
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const type: MapType = source.type === "genogram" ? "genogram" : "mindmap";

    const genogramRelationships = normalizeGenogramRelationships(
      source.genogramRelationships,
      nodeIds,
      now,
    );

    return {
      ...source,
      id: source.id,
      name: source.name,
      type,
      nodes,
      collapsedNodeIds: Array.isArray(source.collapsedNodeIds)
        ? source.collapsedNodeIds.filter(
            (id: unknown): id is string =>
              typeof id === "string" && nodeIds.has(id),
          )
        : [],
      genogramRelationships,
      createdAt: typeof source.createdAt === "string" ? source.createdAt : now,
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : now,
    };
  });
};

/** Return all parent IDs, including data migrated from the legacy parentId. */
export const getNodeParentIds = (node: MapNode): string[] =>
  node.parentIds?.length
    ? [...new Set(node.parentIds)]
    : node.parentId
      ? [node.parentId]
      : [];

/** Return all direct children of a node. */
export const getNodeChildren = (
  nodes: MapNode[],
  parentId: string,
): MapNode[] =>
  nodes.filter((node) => getNodeParentIds(node).includes(parentId));

/** Return all ancestors, without repeating nodes if malformed data contains a cycle. */
export const getNodeAncestors = (
  nodes: MapNode[],
  nodeId: string,
): MapNode[] => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const pending = [...getNodeParentIds(byId.get(nodeId) ?? ({} as MapNode))];

  return pending.flatMap((parentId) => {
    if (visited.has(parentId)) return [];
    visited.add(parentId);

    const parent = byId.get(parentId);
    if (!parent) return [];

    return [
      parent,
      ...getNodeAncestorsFromQueue(byId, getNodeParentIds(parent), visited),
    ];
  });
};

const getNodeAncestorsFromQueue = (
  byId: Map<string, MapNode>,
  parentIds: string[],
  visited: Set<string>,
): MapNode[] =>
  parentIds.flatMap((parentId) => {
    if (visited.has(parentId)) return [];
    visited.add(parentId);

    const parent = byId.get(parentId);
    if (!parent) return [];

    return [
      parent,
      ...getNodeAncestorsFromQueue(byId, getNodeParentIds(parent), visited),
    ];
  });

/** Return every descendant, without duplicating nodes in multi-parent graphs. */
export const getNodeDescendants = (
  nodes: MapNode[],
  nodeId: string,
): MapNode[] => {
  const visited = new Set<string>();
  const childrenByParent = new Map<string, MapNode[]>();

  nodes.forEach((node) =>
    getNodeParentIds(node).forEach((parentId) => {
      childrenByParent.set(parentId, [
        ...(childrenByParent.get(parentId) ?? []),
        node,
      ]);
    }),
  );

  const visit = (parentId: string): MapNode[] =>
    (childrenByParent.get(parentId) ?? []).flatMap((child) => {
      if (visited.has(child.id)) return [];
      visited.add(child.id);
      return [child, ...visit(child.id)];
    });

  return visit(nodeId);
};

/** Check whether adding parentId to childId would create a directed cycle. */
export const wouldCreateParentCycle = (
  nodes: MapNode[],
  childId: string,
  parentId: string,
): boolean => {
  if (childId === parentId) return true;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();

  const visit = (currentId: string): boolean => {
    if (currentId === childId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);

    const current = byId.get(currentId);
    return current ? getNodeParentIds(current).some(visit) : false;
  };

  return visit(parentId);
};

/** Create an independent edge record with connector sides inferred from layout. */
export const createParentConnection = (
  parent: MapNode,
  child: MapNode,
  parentSide?: ConnectionSide,
  childSide?: ConnectionSide,
): ParentConnection => {
  const inferred = inferConnectionSides(parent, child);

  return {
    parentId: parent.id,
    parentSide: parentSide ?? inferred.parentSide,
    childSide: childSide ?? inferred.childSide,
  };
};

/**
 * Derive common family groupings from parent-child relationships.
 * These are calculated values; they are not stored as manually editable facts.
 */
export const deriveGenogramFamily = (map: MapDocument, memberId: string) => {
  const nodes = map.nodes;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parents = getNodeParentIds(byId.get(memberId) ?? ({} as MapNode))
    .map((id) => byId.get(id))
    .filter((node): node is MapNode => Boolean(node));

  const siblings = nodes.filter(
    (candidate) =>
      candidate.id !== memberId &&
      getNodeParentIds(candidate).some((parentId) =>
        parents.some((parent) => parent.id === parentId),
      ),
  );

  const children = nodes.filter((candidate) =>
    getNodeParentIds(candidate).includes(memberId),
  );

  const grandchildren = children.flatMap((child) =>
    nodes.filter((candidate) => getNodeParentIds(candidate).includes(child.id)),
  );

  const greatGrandchildren = grandchildren.flatMap((grandchild) =>
    nodes.filter((candidate) =>
      getNodeParentIds(candidate).includes(grandchild.id),
    ),
  );

  const parentIds = new Set(parents.map((parent) => parent.id));
  const siblingIds = new Set(siblings.map((sibling) => sibling.id));

  const cousins = nodes.filter((candidate) => {
    if (
      candidate.id === memberId ||
      siblingIds.has(candidate.id) ||
      parentIds.has(candidate.id)
    ) {
      return false;
    }

    const candidateParents = getNodeParentIds(candidate);
    return candidateParents.some((candidateParentId) =>
      nodes.some(
        (possibleAuntOrUncle) =>
          siblingIds.has(possibleAuntOrUncle.id) &&
          getNodeParentIds(possibleAuntOrUncle).includes(candidateParentId),
      ),
    );
  });

  const relationships = map.genogramRelationships ?? [];
  const partners = relationships
    .filter(
      (relationship) =>
        ["spouse", "partner"].includes(relationship.type) &&
        (relationship.fromId === memberId || relationship.toId === memberId),
    )
    .map((relationship) =>
      byId.get(
        relationship.fromId === memberId
          ? relationship.toId
          : relationship.fromId,
      ),
    )
    .filter((node): node is MapNode => Boolean(node));

  return {
    parents,
    siblings,
    cousins,
    children,
    grandchildren,
    greatGrandchildren,
    partners,
    counts: {
      parents: parents.length,
      siblings: siblings.length,
      cousins: cousins.length,
      children: children.length,
      grandchildren: grandchildren.length,
      greatGrandchildren: greatGrandchildren.length,
      partners: partners.length,
    },
  };
};
