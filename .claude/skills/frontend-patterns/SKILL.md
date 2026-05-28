---
name: frontend-patterns
description: >
  Use when building Next.js components, feed UI, filter system,
  paper cards, save/list functionality, or any frontend feature.
  Load before writing any React or Tailwind code.
---

# Frontend Patterns

## Component structure
```
apps/web/
  app/
    page.tsx              — homepage (anatomy + feed)
    for-you/page.tsx      — personalized feed
    new/page.tsx          — chronological feed
    paper/[id]/page.tsx   — paper detail
  components/
    anatomy/              — 3D model, hover, highlighting (see anatomy-mapping skill)
    feed/
      FeedCard.tsx        — paper card component
      FeedList.tsx        — virtualized list
      FilterBar.tsx       — sport/topic/region filters
    paper/
      SummaryBlock.tsx    — AI summary display
      EvidenceBadge.tsx   — color-coded evidence level
      MetaBlock.tsx       — journal, authors, date
    ui/                   — shadcn re-exports only, no custom styles here
  types/
    supabase.ts           — auto-generated Supabase types
```

## Server vs. Client components
Server components: initial feed load, paper detail, static pages
Client components: FilterBar, anatomy hover/click, save button, list management

## FeedCard — required fields
- Title (linked to paper detail)
- Journal name + published_at (formatted: "May 2024")
- EvidenceBadge (1–4)
- Sport tags (pill style)
- Summary excerpt (max 60 words, truncate with ellipsis)
- Save button (optimistic UI)

## Evidence badge colors
```
1 (RCT/Meta-analysis)  → bg-green-100  text-green-800
2 (Cohort study)       → bg-blue-100   text-blue-800
3 (Case study)         → bg-yellow-100 text-yellow-800
4 (Mechanistic)        → bg-gray-100   text-gray-700
```

## Feed query patterns
```ts
// For You feed
const { data } = await supabase
  .from('papers')
  .select('*, enrichments(*)')
  .contains('enrichments.sports', [user.primary_sport])
  .order('created_at', { ascending: false })
  .limit(20)

// New feed
const { data } = await supabase
  .from('papers')
  .select('*, enrichments!inner(*)')
  .eq('enrichments.enrichment_status', 'auto_committed')
  .order('published_at', { ascending: false, nullsFirst: false })
  .limit(20)

// Anatomy filter
const { data } = await supabase
  .from('enrichments')
  .select('*, papers(*)')
  .contains('body_regions', [region])
  .order('papers.created_at', { ascending: false })
```

## Personalization logic
"For You": filter by user.primary_sport + user.interests
"New": ORDER BY created_at DESC, no filter
Anatomy click: filter by body_region param (?region=<value>)
Filters are additive except region (exclusive)

## Filter URL params
?sport=running&topic=recovery&region=calves&view=stress
All optional, combinable except region replaces sport filter.
