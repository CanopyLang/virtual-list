# Virtual List Height Modes

`canopy/virtual-list` supports three height modes: `Fixed`, `Variable`, and `Dynamic`. Choosing the right mode is the single most important performance decision when using this package. This document explains how each mode works, what it costs, and when to use it.

---

## Fixed

```canopy
VirtualList.configure
    { height = Fixed 48.0
    , ...
    }
```

Every item in the list has the same height, supplied as a `Float` (pixels).

### How it works

With a uniform item height, every calculation is arithmetic. To find which items are visible in a scroll window, the runtime computes:

```
firstVisible = floor(scrollTop / itemHeight)
lastVisible  = ceil((scrollTop + viewportHeight) / itemHeight)
```

No data structures are consulted, no DOM nodes are measured.

### Complexity

- Range query: O(1)
- DOM reads: zero
- Memory overhead: constant regardless of list length

### Performance

A Fixed list of 100,000 items scrolls at a steady 60 fps on mid-range hardware. The runtime renders only the items in the visible window plus a small configurable overscan buffer. Total DOM node count stays constant as the user scrolls.

### When to use it

Use Fixed whenever all items share the same height. Common cases:

- Chat message rows with a fixed-height bubble layout
- Data table rows
- File browser entries
- Navigation menus
- Contact lists

If your design specifies that items have the same height, prefer Fixed over Variable even if you could theoretically compute heights from data. Fixed is strictly faster and simpler.

---

## Variable

```canopy
VirtualList.configure
    { height = Variable (\item -> toFloat (heightForItem item))
    , ...
    }
```

Each item has a height that can be computed from its data without touching the DOM. You supply a pure function `data -> Float`.

### How it works

At list initialisation (and whenever the data changes), the runtime calls your height function for every item and accumulates a prefix-sum array. For a list of `n` items this is an O(n) build step.

When the user scrolls, the runtime performs a binary search over the prefix-sum array to find the first visible item.

To find which items cover `scrollTop`:

```
binarySearch(prefixSums, scrollTop)  -- O(log n)
```

Item offsets and total list height are read directly from the prefix-sum array.

### Complexity

- Prefix-sum build: O(n) — runs once on data change
- Range query: O(log n)
- DOM reads: zero

### Performance

The O(log n) scroll path is fast enough for lists well into the tens of thousands of items. The O(n) rebuild on data change is the cost to watch: if your list updates frequently (e.g., live-sorting a 50,000-item dataset at 30 Hz), the rebuild may become visible. In those cases, consider whether Fixed is applicable or whether you can debounce updates.

### When to use it

Use Variable when items have discrete, predictable height classes that you can derive from data without measuring:

- Cards that are either compact (60 px) or expanded (200 px) based on a boolean field
- List items that render one, two, or three lines of text based on string length thresholds
- Sections with a known header height and a per-item count you can multiply
- Any list where height is a function of the item's record fields

Variable avoids all DOM reads while still handling non-uniform heights. It should be the first choice when Fixed does not apply.

---

## Dynamic

```canopy
VirtualList.configure
    { height = Dynamic { estimatedHeight = 120.0 }
    , ...
    }
```

Items have heights that cannot be predicted from data alone — they depend on browser layout. You supply an estimated average height; the runtime measures actual heights after rendering.

### How it works

Dynamic mode uses a two-pass render cycle:

1. **Estimate pass**: The runtime renders items using the estimated height to determine which items are approximately in the viewport.
2. **Measure pass**: After the DOM updates, the runtime reads the rendered height of each newly visible item using `getBoundingClientRect` (one DOM read per item).
3. **Re-render pass**: Measured heights replace estimates in the prefix-sum array. If measurements differ significantly from estimates, the runtime adjusts scroll position and re-renders.

Once an item has been measured, its height is cached. Subsequent scrolls that bring the same item back into view skip the measurement step. The cache is keyed by item identity (index by default, or a custom key function if supplied).

### Complexity

- Initial render of `k` visible items: O(k) DOM reads
- Re-scroll to previously visible items: O(log n) — uses cached heights
- Scroll to never-before-seen items: O(k) DOM reads for the new batch
- Total DOM reads over a full scroll-through: O(n)

### Performance

Each layout pass forces a browser reflow. For a viewport showing 10 items, that is 10 `getBoundingClientRect` calls per scroll step to new territory. On content with embedded media, deeply nested flexbox, or heavy CSS, a single layout read can take 1–3 ms. Ten of them in sequence on the main thread can push frame time past 16 ms, causing visible jank.

A Dynamic list of 500 items with complex content (markdown-rendered text, inline images, mixed font sizes) may produce 16 ms+ layout thrash on the first full scroll-through. After all items are measured and cached, subsequent scrolls are fast.

Practical guidelines:
- Dynamic lists of 50–100 items with simple content are usually smooth.
- Dynamic lists beyond 200–300 items should cache heights persistently (store measured heights in your model and supply them back on re-mount) to avoid re-measuring on every component mount.
- Avoid Dynamic for lists that remount frequently (e.g., inside a tab that the user switches back and forth between) unless you persist the measurement cache.

### When to use it

Use Dynamic only when neither Fixed nor Variable is applicable:

- Markdown-rendered content where paragraph count and image presence vary per item
- Embedded media (video thumbnails, audio waveforms) whose aspect ratio determines height
- User-generated content of unbounded length
- Items that reflow based on viewport width (responsive text wrapping)

Dynamic is the correct choice for these cases, not a workaround. Use it deliberately, and plan for the first-render measurement cost.

---

## Decision Guide

```
Does every item have the same height?
  Yes → Fixed

Can you compute each item's height from its data with a pure function?
  Yes → Variable

Neither of the above?
  → Dynamic (measure after render)
```

When in doubt, start with `Variable` using a rough estimate function. If the estimates are close enough that scroll position drift is unnoticeable, you are done. Only reach for `Dynamic` when estimates cause visible layout errors (items overlapping, gaps, or incorrect scroll position).

---

## Summary Table

| Mode | Range Query | DOM Reads | Data Change Cost | Best For |
|---|---|---|---|---|
| `Fixed` | O(1) | Zero | Zero | Uniform-height items |
| `Variable` | O(log n) | Zero | O(n) rebuild | Discrete height classes computable from data |
| `Dynamic` | O(log n) after cache warm | O(n) total over full scroll | O(n) rebuild + re-measure | Content whose height requires browser layout |
