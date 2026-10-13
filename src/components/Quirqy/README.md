# quirqy

The quirqy window: the appearance of your quirq character (the Blobatar avatar) and nothing else. **Personalize** in the Home window opens it. It is off the dock for now, until quirqy is reintroduced.

```tsx
const openQuirqy = useOpenQuirqy()

;<button onClick={openQuirqy}>quirqy</button>
```

- `QuirqyWindow` is the window's content: a header with the avatar on its tile, the `AvatarEditor` from `components/QuirqAvatar` in a frosted panel, and a link to Display options for theme, cursor and screensaver.
- `useOpenQuirqy()` returns a function that opens the window, or brings it forward and restores it if it is minimized.

The window has no route: it is keyed `quirqy` (`QUIRQY_WINDOW` in `src/lib/quirqAvatar.ts`), so the address bar keeps the page behind it. Closing it brings the previous window forward.
