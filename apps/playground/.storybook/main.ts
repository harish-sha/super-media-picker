import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Stories consume the prebuilt public package. React Docgen 7 cannot parse
  // native private fields in those ESM chunks; TypeScript still validates all
  // story args through `Meta`/`StoryObj` and the workspace typecheck.
  typescript: { reactDocgen: false },
};

export default config;
