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
    new/page.tsx          — chronological feed
    paper/[id]/page.tsx   — paper detail
  components/
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

## FilterBar — two-tier discipline selector

**Row 1: Top-level categories (expandable)**
- `[Endurance Sports ▾]` — Click to expand/collapse sport chips
- `[Martial Arts]` `[Mind-Body]` `[Yoga & Pilates]` — movement_practices, direct toggle

**Row 2: Endurance sport chips (conditional on expand or active sport)**
- Shows when Endurance Sports is expanded or a sport is active
- `[Running]` `[Cycling]` `[Rowing]` `[Skiing]` `[Triathlon]` `[Hyrox]`
- Left-bordered visual nesting

**Row 3: Running distances (conditional on Running selected)**
- Distance: `[Marathon]` `[Half Marathon]` `[Ultra]` `[Trail]` `[5K/10K]`
- Left-bordered visual nesting

**Row 4: Research focus**
- `[Women's Health]` `[Masters & Longevity]` `[Supplements]` `[Tech & Wearables]` `[AI/ML]` `[Para Sport]`
- Violet badge colors (research_dimensions)

**Row 5: Search + topic chips**
- Search input (blurs to update)
- Quick chips: `[VO2max]` `[HRV]` `[Lactate]` `[Intervals]` `[Strength]` `[Sleep]` `[Prevention]`
- `[More ▾]` toggle reveals extended topic list (17 total topics)
- `[× Clear]` button appears when any filter is active

## FeedCard — required fields
- Title (linked to paper detail)
- Journal name + published_at (formatted: "May 2024")
- EvidenceBadge (1–4)
- Sport tags OR movement practice tags (pill style)
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
// New feed with filters
const { data } = await supabase
  .from('enriched_papers')
  .select('*')
  .in('enrichment_status', ['auto_committed', 'needs_review'])
  .eq(activeSport ? 'sports' : null, activeSport ?? null)
  .contains('movement_practices', activeMovement ? [activeMovement] : [])
  .contains('research_dimensions', activeDimension ? [activeDimension] : [])
  .contains('topics', activeTopic ? [activeTopic] : [])
  .textSearch('title,abstract', searchText)
  .order('published_at', { ascending: false, nullsFirst: false })

// Anatomy filter (from body map)
const { data } = await supabase
  .from('enriched_papers')
  .select('id, title, evidence_level, sports, published_at, citation_count')
  .contains('body_regions', [region])
  .order(sort === 'best' ? 'citation_count' : 'published_at', { ascending: sort === 'best' ? false : false })
```

## URL params (all optional, composable)
```
?sport=running              — single endurance sport
?movement=yoga_pilates      — single movement practice
?topic=vo2max              — single topic (quick or extended)
?dimension=female_athlete   — single research dimension
?search=hydration          — full-text search
```
Filters are cumulative. Clearing one param doesn't clear others.
