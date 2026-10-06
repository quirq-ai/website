# ui

[shadcn/ui](https://ui.shadcn.com) primitives for new quirq UI: `Button`, `Card`, `Badge` and `Tabs`. They are copied from
shadcn's source and restyled with this site's color tokens (`bg-primary`, `bg-accent`, `border-primary`,
`text-primary`, `text-secondary`), so they follow the light and dark themes like the rest of the desktop.

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`: bordered panels.
- `Badge`: `default`, `outline`, and the status variants `good`, `warn`, `bad` and `muted`. Status variants keep the
  label in the primary text color and show the status color on a dot, so the label meets 4.5:1 contrast.
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`: Radix tabs with keyboard support. The selected tab has a bottom
  bar in the primary text color.
- `Button` and `ButtonLink`: `default`, `outline`, `ghost` and `link` variants in `sm`, `default` and `lg` sizes.
  `ButtonLink` replaces shadcn's `asChild`: it renders a Gatsby `Link` for internal paths and a new-tab anchor for
  `https://` URLs.

Variants are a plain class map rather than `class-variance-authority`, to avoid a new dependency.

```tsx
import { Badge } from 'components/ui/badge'

;<Badge variant="good">open</Badge>
```

Add further shadcn components here the same way: copy the source, swap shadcn's CSS variables for the site tokens,
and check both themes.
