"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntApp, ConfigProvider, theme } from "antd";
import type { ReactNode } from "react";
import { AdminAuthProvider } from "./AdminAuthProvider";
import { QueryProvider } from "./QueryProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry layer hashPriority="high">
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: "#f97316",
            borderRadiusLG: 12,
            colorBgLayout: "#f1f5f9",
            colorBgContainer: "#ffffff",
            colorBorderSecondary: "#e2e8f0",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          },
          components: {
            Layout: {
              headerBg: "#0f172a",
              headerHeight: 64,
              headerPadding: "0 24px",
              siderBg: "#ffffff",
              bodyBg: "#f1f5f9",
            },
            Menu: {
              itemBg: "transparent",
              itemSelectedBg: "rgba(249, 115, 22, 0.12)",
              itemSelectedColor: "#ea580c",
              activeBarBorderWidth: 0,
              iconSize: 16,
              itemMarginInline: 8,
              itemBorderRadius: 8,
            },
            Card: {
              headerBg: "#ffffff",
              paddingLG: 20,
            },
            Table: {
              headerBg: "#f8fafc",
              headerColor: "#475569",
              rowHoverBg: "#fff7ed",
              borderColor: "#e2e8f0",
            },
            Button: {
              primaryShadow: "0 2px 0 rgba(249, 115, 22, 0.08)",
            },
          },
        }}
      >
        <AntApp message={{ top: 72 }}>
          <QueryProvider>
            <AdminAuthProvider>{children}</AdminAuthProvider>
          </QueryProvider>
        </AntApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
