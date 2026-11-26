"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BuildJobProvider } from "@/components/curator/useBuildJob";

const curatorTheme = createTheme({
  primaryColor: "curator",
  primaryShade: 7,
  // Ink scale; the live values come from --mantine-color-curator-* in curator.css.
  colors: {
    curator: ["#fafafa", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a3a3a3", "#525252", "#171717", "#171717", "#0a0a0a", "#000000"],
  },
  fontFamily: "var(--font-plex-sans), \"PingFang SC\", \"Hiragino Sans GB\", \"Noto Sans SC\", system-ui, sans-serif",
  fontFamilyMonospace: "var(--font-plex-mono), ui-monospace, monospace",
  headings: {
    fontFamily: "var(--font-plex-sans), \"PingFang SC\", \"Hiragino Sans GB\", \"Noto Sans SC\", system-ui, sans-serif",
    fontWeight: "500",
    sizes: {
      h1: { fontSize: "1.25rem", lineHeight: "1.4" },
      h2: { fontSize: "0.875rem", lineHeight: "1.5" },
      h3: { fontSize: "0.875rem", lineHeight: "1.5" },
      h4: { fontSize: "0.875rem", lineHeight: "1.5" },
      h5: { fontSize: "0.875rem", lineHeight: "1.5" },
      h6: { fontSize: "0.875rem", lineHeight: "1.5" },
    },
  },
  // Three text sizes; component size aliases still control padding and height.
  fontSizes: { xs: "0.75rem", sm: "0.875rem", md: "0.875rem", lg: "1.25rem", xl: "1.25rem" },
  fontWeights: { regular: "400", medium: "500", bold: "500" },
  // Wenworks AI: square corners everywhere.
  radius: { xs: "0", sm: "0", md: "0", lg: "0", xl: "0" },
  defaultRadius: "sm",
  cursorType: "pointer",
  focusRing: "auto",
  components: {
    Button: { defaultProps: { size: "sm", radius: "sm" } },
    TextInput: { defaultProps: { size: "sm", radius: "sm" } },
    Textarea: { defaultProps: { size: "sm", radius: "sm", autosize: false } },
    Select: { defaultProps: { size: "sm", radius: "sm", allowDeselect: false } },
    Checkbox: { defaultProps: { size: "sm", radius: "sm" } },
    Paper: { defaultProps: { radius: "sm" } },
  },
});

export function CuratorProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={curatorTheme} forceColorScheme="light">
      <Notifications position="top-right" limit={3} autoClose={3600} />
      <BuildJobProvider>{children}</BuildJobProvider>
    </MantineProvider>
  );
}
