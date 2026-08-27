import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { MediaPicker } from "@company/media-react";

const meta = {
  title: "Media Picker/Emoji",
  component: MediaPicker,
  args: { onSelect: fn() },
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof MediaPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { args: { theme: "dark" } };

export const Light: Story = { args: { theme: "light" } };

export const CustomTheme: Story = {
  args: {
    theme: "light",
    themeTokens: {
      accent: "#8b35d1",
      background: "#fff9ef",
      hover: "#f3e6ff",
      radiusLarge: "0.25rem",
    },
  },
};

export const SmallContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = { args: { features: { emoji: false } } };
