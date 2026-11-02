# LifeMap Expo — Starter

A local-first Android life-mapping app built with Expo and TypeScript.

## Included

- Create and open multiple maps
- Starter “My Life” map with example branches
- Add, rename, select, move, and delete nodes
- Parent-child connections rendered on an SVG canvas
- Basic zoom controls
- Local persistence using AsyncStorage
- JSON backup export via the Android share sheet
- JSON backup restore through the document picker
- Typed map and node data model, including notes and status fields

## Run it

Requirements: Node.js LTS and npm.

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` to launch an Android emulator.

Type-check:

```bash
npm run typecheck
```

After installing, run `npx expo install --check` to verify package versions against your installed Expo SDK. If Expo reports a version mismatch, follow its suggested `npx expo install` command.

## Data and backups

Map data is saved on-device using AsyncStorage under `@lifemap/maps/v1`. Export a JSON backup regularly. Restoring a backup replaces all maps currently stored on this device. Clearing app storage or uninstalling the app may delete local data.

## Current scope and next milestones

This is a starter foundation. Node dragging is wired using React Native PanResponder; zoom currently uses buttons and does not yet implement pinch gestures. Planned next features include pan/pinch canvas gestures, undo/redo, node notes and metadata editing, cross-map links, search/filtering, export to image/PDF, improved validation and storage migrations.

The package is source code only; no Android APK is included.
