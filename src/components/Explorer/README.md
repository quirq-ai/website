# Explorer

Shared layout for Home base, repository windows, Projects, quirqy, the infra guide and the 404 page. It provides a history/search header and a scrolling content area inside the existing flex window system.

Pass `children` and an optional `title`. `showTitle`, `padding` and `transparent` control the content surface. `headerBarOptions` selects `showBack`, `showForward` and `showSearch`; an empty array hides those controls. `rightActionButtons` adds app-specific actions. `onSearch` handles searches in a custom view; otherwise search highlights the content.

App identity, document tabs and sidebars belong to the app view. Explorer does not supply an upstream product selector, cart, account controls or presentation mode. Size layouts with container queries so they respond to the containing window.
