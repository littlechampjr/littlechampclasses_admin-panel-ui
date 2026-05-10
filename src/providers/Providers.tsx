"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App as AntApp, ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";
import { AdminAuthProvider } from "./AdminAuthProvider";
import { QueryProvider } from "./QueryProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: "#f97316",
            borderRadiusLG: 12,
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          },
        }}
      >
        <AntApp>
          <QueryProvider>
            <AdminAuthProvider>{children}</AdminAuthProvider>
          </QueryProvider>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  );
}
