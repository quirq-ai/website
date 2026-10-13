# Dock

Euler's floating glass dock, used as the site's navigation bar in place of the old top bar. It sits below the desktop viewport, so windows end above it rather than under it.

- **Home**, the glass house, opens the Home window (`/`) or brings it forward.
- **Projects** opens the `/projects` window or brings it forward.
- **Edit**, the orange palette, opens the Display options window (`/display-options`: theme, cursor and screensaver) or brings it forward. It used to be an icon in the desktop's top-right corner.
- After the divider, **Search apps** opens the catalog search (also on the `/` key), and **Open windows** opens the `ActiveWindowsPanel`, with a count of open windows.

Every app has a card in the Home window; apps with a website also have an icon on the desktop. Home, Projects and Edit are only on the dock (Edit is also in search). quirqy, the Blobatar avatar, is off the dock for now; Home base's **Personalize** still opens its window. Indicators follow Euler: a short bar under the item whose window is in front, and a dot while its window is open behind another. Labels appear above an item on hover with a fine pointer, or on keyboard focus. The dock shrinks below the `xs` breakpoint, respects reduced motion and reduced transparency, and is hidden in compact (embedded) mode and in print.

```tsx
{!compact && <Dock />}
```
