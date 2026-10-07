# Quirq app icons

`QuirqAppIcon` is a small adapter for the existing `OSIcons/GlassIcon`. It keeps the desktop's beveled silhouettes, glass, hover motion, and wallpaper-colored glow while giving each repository a distinct glyph and color.

```tsx
<QuirqAppIcon icon={app.icon} color={app.color} className="!size-12" />
```

The `icon` and `color` values come from the shared GitHub organization mapping. Supported glyphs are `home`, `code`, `cloud`, `book`, `desktop`, `agent`, `database`, `globe`, `mail`, `chat`, `rocket`, and `palette`. Unknown glyphs use `code`. Colors use the existing project palette; unknown colors use `purple`.

Optional `glowColor` and `glowColorDark` override the hover glow. `className` controls size (`!size-6`, for example) and additional presentation. The icon is decorative; the surrounding link or button supplies its accessible name. This component does not fetch data or handle navigation.

`QuirqAppTile` places the same icon on a frosted rounded tile, as the home screen cards and the dock show apps. `className` sets the tile's size and corner radius (default `size-[58px] rounded-[17px]`); `iconClassName` sets the icon's size (default `!size-10`).

```tsx
<QuirqAppTile icon="rocket" color="green" className="size-[54px] rounded-[14px]" iconClassName="!size-9" />
```
