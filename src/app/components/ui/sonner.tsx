"use client";

import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg":
            "color-mix(in oklch, var(--background) 70%, var(--ring) 30%)",
          "--normal-text": "var(--foreground)",
          "--normal-border":
            "color-mix(in oklch, var(--ring) 80%, transparent 20%)",
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
