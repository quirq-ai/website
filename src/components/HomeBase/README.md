# Home base

The organization app launcher, inside the existing Explorer and desktop window system.
All entries come from `getQuirqApps()` in `src/lib/quirqApps.ts`. Change `quirq.apps.json`
to map a repository to an icon, a category, a URL, a presentation, or a custom component.
Run `pnpm apps:sync` to refresh the committed GitHub snapshot.

The homepage supports local search, category filters, and grid/list views. App links
use `newWindow: true` so each app retains its own window, route, and local state.
Nothing here launches local processes or assumes a repository has a deployed website.
Custom artwork, wallpapers, glass icons, and the shared window controls remain independent
of the GitHub data source.
