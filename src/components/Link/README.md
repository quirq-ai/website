# Link

Shared navigation for the desktop and app views. Local paths use Gatsby routing; `state.newWindow` opens them in a managed window. The context menu offers side-by-side navigation, a real browser tab and copying the address.

Absolute web links carry `target="_blank" rel="noopener noreferrer"`. The site-wide external-link listener turns a plain click into a `/launch/web/*` window; modifier clicks and browsers without JavaScript keep normal new-tab behavior. Put `data-new-tab` on a link that must open a real browser tab.

Use `external` to show an external-link arrow or `externalNoIcon` to retain normal content. Disable the menu with `contextMenu={false}` where the surrounding UI supplies its own. `OSButton asLink` uses the same behavior.
