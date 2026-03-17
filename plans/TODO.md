# canopy/virtual-list — TODO

## Status: Mostly Complete (v1.0.0)

Virtual scrolling for lists, horizontal lists, and grids. 7 modules with 1:1 test coverage.

---

## Critical: Bugs to Fix

- [ ] **VirtualList/Scroll.can line 139**: `ToIndex` in `resolveScrollOffset` always returns 0 regardless of index — implement proper offset calculation based on item heights

---

## Features to Add

- [ ] Smooth scroll animation when programmatically scrolling
- [ ] Windowed mode — render a fixed window with overscan
- [ ] Accessibility — announce visible range changes to screen readers
- [ ] Dynamic item measurement integration — auto-measure items on first render
- [ ] Scroll restoration on navigation (save/restore scroll position)
- [ ] Pull-to-refresh gesture support

---

## Test Improvements

- [ ] Good coverage (7 test files) — add regression test for ToIndex bug
- [ ] Add tests for scroll position save/restore
- [ ] Add tests for infinite scroll trigger thresholds
