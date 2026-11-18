import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

const preview: Preview = {
  decorators: [
    // useNavigate / Link を使う部品がそのまま表示できるように、全ストーリーをルーターで包む
    (Story) => createElement(MemoryRouter, null, createElement(Story)),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
