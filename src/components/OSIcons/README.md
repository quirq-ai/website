# Glass desktop icons

`GlassIcon` gives each app a frosted silhouette with translucent fill, backdrop blur, hairline bevels and soft shadows. quirq app glyphs live in [`../QuirqAppIcon/glyphs.ts`](../QuirqAppIcon/glyphs.ts), with five reused silhouettes in [`glyphs.ts`](glyphs.ts).

```tsx
import GlassIcon from 'components/OSIcons/GlassIcon'
import { HOME_SILHOUETTE } from 'components/OSIcons/glyphs'

<GlassIcon path={HOME_SILHOUETTE} />
```

Author filled paths in the 36 × 36 canvas. Pass `fillRule="evenodd"` for cutouts, or an array of `{ d, fillRule }` parts for overlapping segments. Keep approved logo artwork separate: branding uses [`../QuirqBrand`](../QuirqBrand/README.md).

The frost is a clipped HTML element because browsers do not apply backdrop blur inside SVG `foreignObject`. The two SVG layers provide outer and inner highlights. Masks preserve stroke alignment and remove shadows behind the translucent fill. Multipart glyphs share one fill and shadow; each part retains its own bevel. `useId` scopes filters and clip paths per instance.

`className` sets the icon size (36 px by default). `glowColor` and `glowColorDark` control the theme's hover glow. Optional `image` or SVG `children` are clipped inside the silhouette. Preserve the design canvas and proportions when reusing artwork.

[`AppIcon.tsx`](AppIcon.tsx) exports `AppLink` and `AppItem`: the desktop's icon, label and link figure. It accepts a React icon element or component and uses the shared `Link` for window navigation and external-link behavior. Icon identity comes from the quirq catalog.
