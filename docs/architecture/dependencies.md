# Dependency decisions

- **React** is a peer dependency of the rendering layer and is never pulled into core.
- **Emojibase data** is development-only input to a build-time transformer; it is absent from runtime dependency graphs.
- **tsup** provides small ESM bundles and declarations with minimal configuration.
- **Vite/Vitest** share fast transforms for the playground and tests.
- **Storybook** is the component documentation and visual QA surface.
- **Testing Library** verifies behavior through accessible roles instead of component internals.

No runtime utility, state-management, CSS-in-JS, or icon dependency is used in Phases 0–2.
