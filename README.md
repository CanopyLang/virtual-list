# canopy/virtual-list

Headless virtual scrolling for large lists. Only items within the visible viewport are rendered, keeping DOM size constant regardless of data size. Handles fixed-height, variable-height, and dynamically-measured item layouts.

## Features

- **Fixed-height mode**: O(1) range computation with zero DOM measurement
- **Variable-height mode**: Per-item height function with O(log n) binary search scroll
- **Dynamic-height mode**: Post-render DOM measurement for truly unknown heights
- **Horizontal scrolling**: First-class horizontal list support via `VirtualList.Horizontal`
- **Grid layout**: Virtualized grid with fixed column count
- **Infinite scroll**: Append-on-demand via `VirtualList.InfiniteScroll`
- **Sticky headers**: Section headers that pin during scroll via `VirtualList.StickyHeader`
- **Keyed rendering**: Preserve focus and scroll position on re-render with `viewKeyed`

## Installation

```
canopy install canopy/virtual-list
```

## Quick Start

```canopy
import VirtualList
import VirtualList.Scroll exposing (ScrollEvent)


type alias Model =
    { items : List String
    , listState : VirtualList.State
    }


type Msg
    = ListScrolled ScrollEvent


init : Model
init =
    { items = List.range 1 50000 |> List.map (\i -> "Item " ++ String.fromInt i)
    , listState =
        VirtualList.init
            { itemHeight = VirtualList.Fixed 40
            , containerHeight = 600
            , overscan = 3
            }
    }


update : Msg -> Model -> Model
update msg model =
    case msg of
        ListScrolled event ->
            { model | listState = VirtualList.onScroll event model.listState }


view : Model -> Html Msg
view model =
    VirtualList.view
        { itemHeight = VirtualList.Fixed 40
        , containerHeight = 600
        , overscan = 3
        }
        model.listState
        (\index ->
            case List.drop index model.items |> List.head of
                Just item ->
                    Html.div [ Html.Attributes.class "list-row" ] [ Html.text item ]

                Nothing ->
                    Html.text ""
        )
        |> Html.map ListScrolled
```

The container element rendered by `view` already carries `overflow: auto` and the correct height style. Do not wrap it in a second scrollable container.

## Modules

### VirtualList

Core API for vertical lists. Manages scroll position, computes the visible range, and renders only the items that intersect the viewport plus the configured overscan buffer.

```canopy
-- Initialize
VirtualList.init config                  -- State

-- React to scroll
VirtualList.onScroll : ScrollEvent -> State -> State

-- Compute the visible range without rendering
VirtualList.compute : State -> VirtualRange

-- Render
VirtualList.view : Config -> State -> (Int -> Html msg) -> Html msg
VirtualList.viewKeyed : Config -> State -> (Int -> (String, Html msg)) -> Html msg
```

### VirtualList.Horizontal

Identical API to `VirtualList`, oriented along the horizontal axis. Items are laid out left-to-right; the container scrolls horizontally.

```canopy
VirtualList.Horizontal.init config
VirtualList.Horizontal.onScroll event state
VirtualList.Horizontal.view config state renderItem
```

### VirtualList.Grid

Virtualizes a two-dimensional grid. Requires a fixed column count. Row height may be Fixed or Variable; column width is always fixed.

```canopy
VirtualList.Grid.init
    { columnCount = 4
    , columnWidth = 200
    , rowHeight = VirtualList.Fixed 180
    , containerHeight = 600
    , containerWidth = 800
    , overscan = 2
    }

VirtualList.Grid.view config state (\row col -> ...)
```

### VirtualList.Scroll

Scroll event type and helpers for wiring browser scroll events into `onScroll`.

```canopy
-- Decode a native scroll event
VirtualList.Scroll.onScroll : (ScrollEvent -> msg) -> Html.Attribute msg

-- Read current position without a full event
VirtualList.Scroll.scrollTop : ScrollEvent -> Float
VirtualList.Scroll.scrollLeft : ScrollEvent -> Float
```

### VirtualList.Measurement

DOM measurement utilities used by Dynamic height mode. In most cases you do not need to call these directly — `Dynamic` height mode drives them automatically.

```canopy
-- Request measurement of rendered items
VirtualList.Measurement.measure : List Int -> Cmd Msg

-- Feed measurements back into state
VirtualList.Measurement.applyMeasurements : List (Int, Float) -> State -> State
```

### VirtualList.InfiniteScroll

Detects proximity to the end of the list and fires a command to load more data.

```canopy
VirtualList.InfiniteScroll.config
    { threshold = 200          -- px from bottom
    , onLoadMore = LoadMore
    }

-- Call in your update after onScroll
VirtualList.InfiniteScroll.check infiniteConfig state
    |> Maybe.map (\cmd -> ( newState, cmd ))
    |> Maybe.withDefault ( newState, Cmd.none )
```

### VirtualList.StickyHeader

Renders section headers that stick to the top of the container while scrolling through their section.

```canopy
VirtualList.StickyHeader.view
    { sections = mySections        -- List { headerIndex : Int, label : String }
    , itemHeight = VirtualList.Fixed 40
    , headerHeight = 32
    }
    state
    renderItem
```

## Item Height Modes

Choosing the right height mode is the most important performance decision when using this package.

### Fixed

All items share the same height. Range computation is pure arithmetic — no binary search, no DOM reads. Use this whenever items have uniform height.

```canopy
itemHeight = VirtualList.Fixed 48
```

### Variable

Each item's height is determined by a function you supply. Heights are computed from your data, not from the DOM, so there are no layout reads. Scroll position is computed via binary search over a prefix-sum array, giving O(log n) performance. Use this when items fall into a small number of discrete height classes.

```canopy
itemHeight =
    VirtualList.Variable
        (\item ->
            if item.expanded then
                120

            else
                48
        )
```

### Dynamic

Heights are measured from the DOM after items are rendered. This triggers a two-pass cycle: items first render at an estimated height, measurements are collected, then items re-render at their true height. Measurements are cached so subsequent scrolls do not re-measure stable items.

Dynamic mode involves O(n) DOM reads on first render. For lists of 100 or more items, ensure your render function is cheap and that measured heights are stable. Avoid Dynamic mode if heights can be computed from data — use Variable instead.

```canopy
itemHeight = VirtualList.Dynamic
```

## Types

```canopy
type alias Config =
    { itemHeight : ItemHeight
    , containerHeight : Float
    , overscan : Int
    }

type ItemHeight
    = Fixed Float
    | Variable (data -> Float)
    | Dynamic

type alias VirtualRange =
    { startIndex : Int
    , endIndex : Int
    , offsetTop : Float
    , totalHeight : Float
    }

type alias VirtualItem =
    { index : Int
    , offsetTop : Float
    , height : Float
    }
```

## Container Requirements

The container element rendered by `view` must have an explicit height. The package sets `overflow: auto` on the container automatically. If you place the list inside a flex or grid layout, ensure the container is constrained rather than allowed to grow to fit its content — an unconstrained container will never scroll.

Use `viewKeyed` when list items have identity (unique IDs, focus state, or embedded inputs). Keyed rendering allows the Canopy runtime to match DOM nodes across re-renders, preserving focus and avoiding unnecessary layout.

## License

BSD-3-Clause
