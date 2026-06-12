---
name: anatomy-mapping
description: >
  Use when working on the 3D anatomy UI, muscle group highlighting,
  hover states, high stress area views, sport-to-body-region mappings,
  or the anatomy → feed filter connection.
---

# Anatomy Mapping

> **NOTE (2026-06-12):** The 3D body viewer experiment was removed from the app
> (components/anatomy/, public/models/, three.js deps are gone). The component
> and tech-stack sections below are historical. The sport → body-region and
> injury-zone mappings remain the canonical reference for the tagger enums and
> the Injury Risk Explorer on /explore.

## Tech stack (historical — removed)
React Three Fiber + Three.js + GLTF model
Component location: apps/web/components/anatomy/

## GLTF mesh naming convention
All meshes snake_case, matching body_regions enum exactly.
Examples: left_calf, right_quad, lower_back, left_achilles
Bilateral muscles: prefix left_ / right_ for hover, use base name for DB queries.

## Sport → primary muscle groups

| Sport         | Primary regions                                      |
|---------------|------------------------------------------------------|
| running       | calves, quads, glutes, hamstrings, core              |
| cycling       | quads, hip_flexors, lower_back, knees, neck          |
| rowing        | lats, core, quads, lower_back, grip_forearms         |
| hyrox         | shoulders, lower_back, knees, grip_forearms          |
| skiing        | quads, core, hip_flexors, ankles                     |

## High stress / injury zones (alternate view)

| Sport    | Injury-prone zones                          |
|----------|---------------------------------------------|
| running  | achilles, knees, calves, it_band            |
| cycling  | knees, lower_back, hip_flexors, neck        |
| hyrox    | shoulders, lower_back, knees, grip_forearms |
| rowing   | lower_back, knees, grip_forearms            |

## Hover behavior
On hover over mesh:
- Show: region display name
- Show: related research topics
- Show: count of new articles (last 30 days)
- Show: typical load context (e.g. "high eccentric load — downhill running")

## Click behavior
Click on mesh → set body_region filter → re-query feed
URL param: ?region=calves
Clears other active filters (region is exclusive filter)

## Component structure
```
anatomy/
  AnatomyViewer.tsx      — R3F canvas, model loader, camera
  MeshHighlighter.tsx    — hover + click state, mesh coloring
  HoverCard.tsx          — floating info panel on hover
  SportOverlay.tsx       — highlights primary muscles for user's sport
  useAnatomyStore.ts     — zustand store for active region state
```

## Highlight colors (CSS vars)
--anatomy-neutral: #4a5568
--anatomy-active-sport: #3b82f6   (blue — primary sport muscles)
--anatomy-hover: #f59e0b          (amber — hover state)
--anatomy-stress: #ef4444         (red — high stress / injury zones)
--anatomy-selected: #10b981       (green — clicked / filtered)
