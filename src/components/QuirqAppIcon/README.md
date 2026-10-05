# Quirq app icons

`QuirqAppIcon` is a small adapter for the existing `OSIcons/GlassIcon`. It keeps the desktop's beveled silhouettes, glass, hover motion, and wallpaper-colored glow while giving each repository a distinct glyph and color.

```tsx
<QuirqAppIcon icon={app.icon} color={app.color} className="!size-12" />
```

The `icon` and `color` values come from the shared GitHub organization mapping. Supported glyphs are `home`, `code`, `cloud`, `book`, `desktop`, `agent`, `database`, `globe`, `mail`, `chat`, `rocket`, and `palette`. Unknown glyphs use `code`. Colors use the existing project palette; unknown colors use `purple`.

Optional `glowColor` and `glowColorDark` override the hover glow. `className` controls size (`!size-6`, for example) and additional presentation. The icon is decorative; the surrounding link or button supplies its accessible name. This component does not fetch data or handle navigation.
