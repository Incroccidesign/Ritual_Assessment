# Ritual design system

## Surfaces

- Content cards may retain their restrained translucent treatment.
- Menus, popovers and dialogs use `ritual-popover-surface` or
  `ritual-overlay-surface`: opaque `#15181f`, bone border at 16% opacity and
  the shared live shadow. This is the same surface used by Create assessment.
- Form selects use the same opaque surface so native dropdown states remain
  readable against the night-blue application background.

## Interaction

- Overlay backdrops provide separation and blur; the interactive surface itself
  remains opaque for legibility.
- Keyboard focus uses the mint ring already defined by Ritual UI primitives.
