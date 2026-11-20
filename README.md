# LifeMap

**A personal visual workspace for mapping your life, organizing goals, and turning ideas into actionable plans.**

LifeMap is an Android-focused, local-first application built with Expo, React Native, and TypeScript. It lets you organize personal goals, projects, tasks, milestones, requirements, and notes as connected visual maps.

Instead of keeping plans in disconnected lists, LifeMap gives you a visual structure: arrange ideas on a canvas, connect related items, track their status, attach target dates and requirements, and link separate maps together.

## Features

### Visual life maps
- Create and manage multiple independent maps.
- Start with a map and build a hierarchy of connected nodes.
- Arrange nodes freely on an SVG-based canvas.
- Drag nodes to reposition them.
- Reparent nodes by dragging their connection handles onto another node.
- Create a child node by dragging a connection handle into empty canvas space.
- Collapse and expand branches to manage large maps.
- Zoom the canvas with pinch gestures and on-screen controls.
- Clone a node, including its details and map links.

### Flexible node types
Organize information using purpose-specific node types:

- **Idea** — capture an initial thought or possibility.
- **Goal** — define an intended outcome.
- **Project** — represent a larger body of work.
- **Task** — record an actionable item.
- **Milestone** — identify an important checkpoint.
- **Requirement** — document something that must be satisfied.
- **Note** — keep supporting information.

### Status and planning details
Each node can include:
- A status: Idea, Planned, In Progress, or Done.
- Notes and supporting context.
- A target date.
- A requirement or completion condition.
- Links to other maps.

### Tasks overview
The Tasks area brings together task nodes and in-progress items from across all maps. Search the list and open an item in its source map.

### Milestones overview
The Milestones area collects milestone nodes from all maps, displays their target dates, and orders them by date where available.

### Cross-map links
Link a node to one or more other maps. This makes it possible to connect related areas of a person's life without forcing everything into one enormous map.

### Local-first storage
- Maps are stored on the device using AsyncStorage.
- Changes are saved locally.
- No application account or hosted backend is required by the current implementation.
- A data-normalization layer supplies defaults when older saved maps are loaded.

### Backup and restore
- Export all maps to a versioned JSON backup.
- Share the backup through the device's available sharing options.
- Restore a backup using the document picker.
- Validate the backup format before restoring.

**Important:** Restoring a backup replaces all maps currently stored in the app. Export a current backup first if you need to preserve the existing data. Uninstalling the app or clearing its storage may remove locally stored maps.

### AI-assisted map export
Export an individual map as a structured Markdown document designed to be shared with an AI assistant. The export includes the map hierarchy, node IDs, types, statuses, target dates, notes, requirements, and linked map IDs, together with guidance to preserve the map's structure when suggesting changes.

This is an export workflow; it does not mean an AI assistant is built into the app or that map data is automatically uploaded to an AI service.

## Technology stack

| Technology | Purpose |
|---|---|
| Expo SDK 58 | Application framework and development tooling |
| React 19 | UI rendering |
| React Native 0.88 | Native mobile interface |
| TypeScript 6 | Typed application and data models |
| React Native SVG | Map canvas and connection lines |
| React Native Gesture Handler | Pinch gesture support |
| React Native PanResponder | Node dragging and canvas interactions |
| AsyncStorage | On-device map persistence |
| Expo Document Picker | Selecting JSON backup files |
| Expo File System | Reading and writing exported files |
| Expo Sharing | Sharing JSON and Markdown exports |
| React Native Safe Area Context | Safe-area layout support |

## Getting started

### Requirements

- Node.js LTS
- npm
- Android device or Android emulator
- Expo-compatible development environment

### Install

Clone the repository:

```bash
git clone https://github.com/Reptar-IT/life-map-android-app.git
cd life-map-android-app
```

Install dependencies:

```bash
npm install
```

### Start the application

```bash
npx expo start
```

Then:
- Scan the QR code using a compatible Expo Go app on your Android device, or
- Press `a` to open the app in a running Android emulator.

If Expo reports dependency-version mismatches, run:

```bash
npx expo install --check
```

Follow Expo's suggested installation commands if any package needs to be aligned with the installed SDK.

### Type-check

```bash
npm run typecheck
```

This runs TypeScript without emitting build output.

## Android builds

The repository includes EAS Build profiles configured to produce Android APK files.

Install or invoke the EAS CLI:

```bash
npx eas-cli --version
```

To create an internal preview APK:

```bash
npx eas-cli build --platform android --profile preview
```

To create a development APK:

```bash
npx eas-cli build --platform android --profile development
```

The development profile includes a development client. The preview profile is configured for internal distribution.

A successful cloud build is required before an APK is available; the repository contains the application source and build configuration, not a prebuilt APK.

## Using LifeMap

### 1. Create a map

Open the Maps area and create a map for an area of your life, a goal, or a project. Give it a meaningful name.

Examples:
- My Life
- Personal Goals
- Businesses
- Projects
- Skills & Knowledge

### 2. Build the map

Select a node and add child nodes to break a broad subject into smaller areas. Drag nodes to arrange the map. Use connection handles to move a node under a different parent or create a new child branch.

### 3. Add detail to nodes

Select a node to edit its title, type, status, notes, target date, requirement, and links to other maps.

### 4. Track work

Use the Tasks and Milestones areas to review actionable and time-bound items across your maps. Select an item to return to its map.

### 5. Back up your work

Open Settings and export a JSON backup regularly. Store the exported file somewhere separate from the device.

### 6. Work with an AI assistant

Open a map and use its AI export action to create a Markdown representation. Share that file with an AI assistant when you want help reviewing the plan, identifying missing requirements, breaking goals into tasks, or considering dependencies and next steps.

## Data model

LifeMap stores a collection of map documents. Each map contains nodes with identifiers, titles, canvas coordinates, parent relationships, display colors, notes, statuses, timestamps, and optional planning metadata.

The current node model supports:

- `idea`, `goal`, `project`, `task`, `milestone`, `requirement`, and `note` kinds.
- `idea`, `planned`, `in-progress`, and `done` statuses.
- Parent-child relationships.
- Connector attachment sides.
- Due dates and requirements.
- Linked map IDs.
- Collapsed branch state at the map level.

### Storage key

```text
@lifemap/maps/v1
```

Maps are serialized as JSON in AsyncStorage. The backup export wraps the map collection in a versioned document containing the app identifier, format version, and export timestamp.

## Project structure

```text
life-map-android-app/
├── assets/
│   ├── icon.png
│   └── splash-icon.png
├── src/
│   ├── storage/
│   │   └── maps.ts
│   └── types/
│       └── map.ts
├── App.tsx
├── app.json
├── eas.json
├── package.json
├── package-lock.json
└── tsconfig.json
```

## Privacy and data handling

The current application is local-first:
- Map data is stored on the device.
- JSON backup files are created locally before being shared.
- Markdown AI exports are created locally and shared through the device's sharing interface.
- The app does not require a LifeMap account or a hosted application backend.

When you share an export with another app or service, that service's own privacy and data-handling practices apply.

## Current scope

LifeMap is actively evolving. The repository documents the current implementation and should be treated as the source of truth for available functionality.

The app currently focuses on visual map organization, node metadata, cross-map references, task and milestone overviews, local persistence, and portable exports. Features not present in the code should not be assumed to exist.

## Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run `npm run typecheck`.
5. Test map editing, persistence, and backup/restore behavior on a device or emulator.
6. Submit a pull request describing the change and the tests performed.

For changes to the data model or backup format, consider backward compatibility and update the normalization and backup validation logic.

## License

No license file was confirmed during repository review. Unless a license is added to the repository, the source code should not be assumed to be open source or available for unrestricted reuse.

## Repository

[Reptar-IT/life-map-android-app](https://github.com/Reptar-IT/life-map-android-app)
