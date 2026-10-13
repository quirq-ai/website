# Dock

Euler's floating glass dock, used as the site's navigation bar in place of the old top bar. It sits below the desktop viewport, so windows end above it rather than under it.

- **Home**, the glass house, opens the Home window (`/`) or brings it forward.
- **Projects** opens the `/projects` window or brings it forward.
- **quirqy**, shown as the saved Blobatar avatar on its tile, opens the quirqy window (`components/Quirqy`), which holds only the avatar's appearance, or brings it forward. The window has no route, so this item is a button.
- After the divider, **Search apps** opens the catalog search (also on the `/` key), and **Open windows** opens the `ActiveWindowsPanel`, with a count of open windows.

Every app has a card in the Home window; apps with a website also have an icon on the desktop. Home and Projects are only on the dock. Indicators follow Euler: a short bar under the item whose window is in front, and a dot while its window is open behind another. Labels appear above an item on hover with a fine pointer, or on keyboard focus. The dock shrinks below the `xs` breakpoint, respects reduced motion and reduced transparency, and is hidden in compact (embedded) mode and in print.

```tsx
{!compact && <Dock />}
```
