# Quirq app icons

`QuirqAppIcon` is a small adapter for the existing `OSIcons/GlassIcon`. It keeps the desktop's beveled silhouettes, glass, hover motion, and soft hover glow while giving each repository a distinct glyph and color.

```tsx
<QuirqAppIcon icon={app.icon} color={app.color} className="!size-12" />
```

The `icon` and `color` values come from the shared GitHub organization mapping, `quirq.apps.json`. Unknown or unset glyphs use `folder`; unknown colors use `purple`. Colors are the project palette: `blue`, `purple`, `lilac`, `orange`, `yellow`, `red`, `salmon`, `teal`, `seagreen`, `green`, and `pink`.

Optional `glowColor` and `glowColorDark` override the hover glow. `className` controls size (`!size-6`, for example) and additional presentation. The icon is decorative; the surrounding link or button supplies its accessible name. This component does not fetch data or handle navigation.

`QuirqAppTile` places the same icon on a frosted rounded tile, as the home screen cards and the dock show apps. `className` sets the tile's size and corner radius (default `size-[58px] rounded-[17px]`); `iconClassName` sets the icon's size (default `!size-10`). `QuirqTile` is that tile on its own, for anything else that should sit beside the apps, such as the avatar (`QuirqAvatarTile`).

```tsx
<QuirqAppTile icon="rocket" color="green" className="size-[54px] rounded-[14px]" iconClassName="!size-9" />
```

## Glyphs

The glyphs live in [`glyphs.ts`](glyphs.ts), by name. Each one depicts something an app is or does, so any repository can reuse it:

| Name | Shows | Name | Shows |
| --- | --- | --- | --- |
| `apps` | four app tiles | `megaphone` | a megaphone |
| `blob` | a round character, smiling | `palette` | a painter's palette |
| `book` | a stack of books | `photos` | two instant photos |
| `browser` | a browser window | `planet` | a ringed planet |
| `brush` | a paintbrush | `profile` | a profile card |
| `chat` | a speech bubble | `quirq` | the quirq "q" |
| `chef-hat` | a chef's toque | `rocket` | a rocket |
| `clipboard` | a clipboard with a check | `server` | two server units |
| `cloud` | a cloud | `shapes` | a triangle, circle and square |
| `conveyor` | a parcel on a roller conveyor | `shield` | a shield with a check |
| `cube` | an isometric cube | `slash` | a square with a slash; `code` is an older name for it |
| `document` | a page with sparkles | `sliders` | three sliders |
| `download` | a cloud with a down arrow | `sprout` | a seedling |
| `flask` | a lab flask | `stopwatch` | a stopwatch |
| `folder` | a folder (the default) | `sync` | two arrows in a circle |
| `gauge` | a dashboard gauge | `tag` | a tag |
| `globe` | a globe | `telescope` | a telescope on a tripod |
| `home` | a house | `terminal` | a terminal with a `>_` prompt |
| `hub` | a ring wired to four nodes | `toolbox` | a toolbox |
| `mail` | an envelope | `wand` | a magic wand with sparkles |
| `map` | a map folded in three |  |  |

### Adding a glyph

Draw it as a filled silhouette in GlassIcon's 36-unit canvas; `QuirqAppIcon` renders every glyph with `fillRule="evenodd"`, so details are cut-out holes. Match the existing set: about 24 to 30 units across and centered, soft corners, roughly a quarter to two fifths of the canvas filled, and cut-outs and gaps at least 1.8 units wide, or the glass bevel closes them at the desktop's 36px size. Prefer one strong shape with a few bold cut-outs over fine detail.

Add it to `QUIRQ_GLYPHS` in `glyphs.ts` and its name to `QUIRQ_ICONS` in `scripts/lib/quirq-catalog.mjs`, which validates the mapping; `pnpm test` fails until the two lists match. Check it on the desktop, in Home base, and in search, in light and dark themes.
