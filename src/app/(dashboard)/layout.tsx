"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const { authHydrated, token } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authHydrated) return;
    if (!token) {
      router.replace("/login");
    }
  }, [authHydrated, token, router]);

  if (!authHydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Spin size="large" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
