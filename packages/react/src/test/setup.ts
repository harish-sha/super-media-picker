import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Full picker/provider panels are deliberately lazy chunks. Give concurrent
// monorepo runs enough time to resolve them without weakening test assertions.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
