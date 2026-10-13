# Home base

The Home window at `/`, laid out after [Euler](https://github.com/quirq-ai/euler)'s Home, inside the existing Explorer and desktop window system. It opens on a first visit to `/`, and the dock's Home icon opens it or brings it forward. Closing it reveals the desktop and its icons.

From top to bottom:

- **Header:** the saved Blobatar avatar and the quirq wordmark, the time, **Live** once the repository list has been read from GitHub (until then, the date the snapshot was synced), and **Personalize**, which opens the quirqy window, where the avatar's appearance is edited (`components/Quirqy`; the dock's quirqy item opens it too).
- **Welcome:** the date, a time-of-day greeting, and three counts: apps with a launch URL (**Live**), catalog **Apps**, and public **Repos** in the organization. The date and greeting render after mount, so the server and browser renders match.
- **Your apps:** type filters and a type badge on each card (the organization's `role` property on GitHub, once three types are in use; the mapping's categories until then), local search, and a card per app. **Open** opens the app's own window (`newWindow: true`), so each app keeps its window, route and local state. **Launch** opens the app's website in its own window on this site when it has one, and the code button opens the repository on GitHub in a window too. A page that can't be shown in a window (GitHub refuses frames, as do `launchMode: "external"` apps) shows **Oops** there with an **Open in new tab** button.
All entries and counts come from `useQuirqCatalog()` in `src/lib/quirqLiveApps.ts`, with featured apps first: the committed snapshot on first paint, then the organization's repository list as GitHub has it now. Change `quirq.apps.json` to map a repository to an icon, a category, a URL, or a custom component, and run `pnpm apps:sync` to refresh the committed GitHub snapshot.

Surfaces use Euler's frosted glass in light mode, a darker glass in dark mode, and solid backgrounds under the `reduce-transparency` setting. Layout responds to the window's width (`@container`). Nothing here launches local processes or assumes a repository has a deployed website.
