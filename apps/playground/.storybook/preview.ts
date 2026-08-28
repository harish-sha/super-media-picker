import type { Preview } from "@storybook/react";

import "@company/media-react/styles.css";

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    controls: { expanded: true },
    layout: "centered",
  },
};

export default preview;
