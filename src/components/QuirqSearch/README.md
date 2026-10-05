# Quirq search

`SearchOverlay` replaces global PostHog search in the desktop wrapper. It consumes the same `getQuirqApps()` catalog as Home base, the desktop icons, and the taskbar. The index contains visible organization repositories plus Home base and Display options. Hidden, archived, and excluded repositories never enter it.

Mount the named or default `SearchOverlay` once inside the app provider. Existing `openSearch()` actions and the `/` and Cmd/Ctrl+K shortcuts control the app's `searchOpen` flag; the overlay closes through `setSearchOpen(false)`.

Search matches the app name, description, URL, repository name, language, category, and topics locally. It sends no search requests and needs no external search credentials. The catalog is refreshed through the organization sync workflow, not on each keystroke.

Radix Dialog handles the portal, focus trap, outside click, Escape, and focus restoration. Headless UI Combobox handles arrow keys, active options, and Enter. Selecting a result uses Gatsby navigation to its mapped internal URL and retains normal window-manager behavior. A closed search clears the query for its next use.

The panel uses existing color tokens for light and dark modes, container queries for optional result paths, `QuirqAppIcon` for the original glass treatment, and existing `OSButton` and `KeyboardShortcut` components.
