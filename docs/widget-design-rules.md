# Widget design rules

Distilled from Anthropic's [MCP Apps design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines) and [theme blending guide](https://claude.com/docs/connectors/building/mcp-apps/transparent-theming), read 16 October 2026. Every widget in this repo follows these. The [Figma UI kit](https://www.figma.com/community/file/1597641111449594397/mcp-apps-for-claude) is the design starting point.

## Blend in, don't box in

- Never paint `html` or `body`. Keep them transparent so the chat surface shows through.
- Put `<meta name="color-scheme" content="light dark">` in the head, or the browser paints an opaque white or black backdrop behind the frame.
- Ask for a borderless frame with `_meta.ui.prefersBorder: false`. Claude web is borderless by default; mobile is bordered unless told otherwise.
- Allow `https://assets.claude.ai` in `resourceDomains` so Anthropic Sans loads via `applyHostFonts`.
- Style everything structural from the host variables: `--color-background-*`, `--color-text-*`, `--color-border-*`, `--font-*`, `--border-radius-*`, `--border-width-regular`. Our own colour is for accents only, and we have none yet.

## Claude's card

```css
background: var(--color-background-secondary);
border: var(--border-width-regular) solid var(--color-border-primary);
border-radius: var(--border-radius-md);
```

## Type

Three sizes only: heading, body, caption. Two weights: regular and emphasised. Anthropic Sans comes from the host; local fallback is system-ui.

## Inline cards

- Height fits content. No nested vertical scrolling; the conversation owns it and the host caps inline height.
- At most two actions, at the bottom. At most four or five data points. No drill-ins, breadcrumbs or multiple views.
- Visible controls only: segmented buttons, chips, inline tabs. No dropdowns, menus or popovers.
- Anything needing its own scroll goes to full screen via `ui/request-display-mode`.

## Mobile

- Fill the width; design from 320px up with no fixed widths.
- Tap targets at least 44 by 44 points, with space between them.
- Honour `hostContext.safeAreaInsets` as padding so the composer and nav bar never cover controls.
- Both themes always; test both.

## Loading

Skeletons that match the final layout, never spinners.

## What belongs in the widget versus chat

- Widget: direct manipulation, filtering or sorting what is already shown, expand and collapse, confirming a prepared action, interacting with a chart.
- Chat: free text, follow-up questions, anything that needs Claude's interpretation. Never replicate a chat input.
