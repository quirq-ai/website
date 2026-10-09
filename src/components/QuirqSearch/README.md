# quirq search

`SearchOverlay` replaces global PostHog search in the desktop wrapper. It consumes the same live catalog (`useQuirqApps()` from `src/lib/quirqLiveApps.ts`) as Home base and the desktop icons, so a repository added to the organization is searchable without a rebuild. The index contains visible organization repositories plus Home base, Projects, and Edit (Display options). Hidden, archived, and excluded repositories never enter it.

Mount the named or default `SearchOverlay` once inside the app provider. Existing `openSearch()` actions and the `/` and Cmd/Ctrl+K shortcuts control the app's `searchOpen` flag; the overlay closes through `setSearchOpen(false)`.

Search matches the app name, description, URL, repository name, language, category, type (its `role` on GitHub, by value, name or plural), and topics locally. It sends no search requests and needs no external search credentials. The catalog refreshes on its own schedule, not on each keystroke.

Radix Dialog handles the portal, focus trap, outside click, Escape, and focus restoration. Headless UI Combobox handles arrow keys, active options, and Enter. Selecting a result uses Gatsby navigation to its mapped internal URL and retains normal window-manager behavior. A closed search clears the query for its next use.

The panel uses existing color tokens for light and dark modes, container queries for optional result paths, `QuirqAppIcon` for the original glass treatment, and existing `OSButton` and `KeyboardShortcut` components.
