# quirq avatar

A [Blobatar](https://blobatar.dev/) character for the home screen, adapted from Euler's avatar. Avatars render locally from a name (the seed) with the vendored renderer in `src/vendor/blobatar/`; nothing calls an avatar service.

```tsx
<QuirqAvatar className="size-10" />
<AvatarEditor />
```

- `QuirqAvatar` renders the saved avatar as an image. It is decorative by default; pass `alt` when it stands alone.
- `QuirqAvatarTile` is the avatar as an app icon, as the dock's quirqy item, the quirqy window and the Home window's header show it. By default the avatar has no background of its own and sits on the same frosted tile as the other apps (`QuirqTile`); an icon background chosen in the editor is drawn instead. `className` sizes and rounds the tile, `avatarClassName` the avatar on it.
- `AvatarEditor` is the "Make quirq yours" panel, which the quirqy window (`components/Quirqy`) shows: a live preview, names to try, Randomize and Reset, and tabs for shape, color (presets, hue, tone, icon background, default None) and expression. Changes stay a draft until **Save avatar**.

`src/lib/quirqAvatar.ts` holds the configuration, rendering and storage. A save writes `quirq.avatar.v1` to this browser's `localStorage` and repaints every mounted avatar, including those in other tabs. Server rendering and the first client render use the default avatar so hydration matches; the saved one paints right after mount. If storage is unavailable the default avatar is shown and saving reports an error.
