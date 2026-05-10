"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button, Layout, Menu, Typography } from "antd";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/teachers", label: "Teachers" },
  { href: "/schedule", label: "Schedule" },
  { href: "/faqs", label: "FAQs" },
  { href: "/homework", label: "Homework" },
  { href: "/tests", label: "Tests" },
  { href: "/audit", label: "Audit log" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();

  const selected =
    nav.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href + "/")))?.href ??
    pathname;

  return (
    <Layout className="min-h-screen">
      <Layout.Header className="flex items-center justify-between !bg-slate-900 !px-6">
        <Typography.Title level={4} className="!mb-0 !text-white">
          Little Champ Admin
        </Typography.Title>
        <div className="flex items-center gap-3">
          <Typography.Text className="text-slate-400">{admin?.email}</Typography.Text>
          <Typography.Text type="secondary" className="hidden text-slate-500 sm:inline">
            {admin?.role}
          </Typography.Text>
          <Button size="small" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </Layout.Header>
      <Layout>
        <Layout.Sider width={220} theme="light" className="border-r border-[var(--border-soft)] !bg-[var(--card)]">
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            items={nav.map((n) => ({
              key: n.href,
              label: <Link href={n.href}>{n.label}</Link>,
            }))}
          />
        </Layout.Sider>
        <Layout.Content className="min-h-[calc(100vh-64px)] bg-[var(--background)] p-6">{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
