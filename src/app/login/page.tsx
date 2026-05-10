"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { App, Button, Card, Form, Input, Typography } from "antd";
import { ApiError } from "@/lib/api/http";
import { adminLogin } from "@/lib/api/adminApi";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function LoginPage() {
  const { authHydrated, token, login } = useAdminAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authHydrated) return;
    if (token) router.replace("/dashboard");
  }, [authHydrated, token, router]);

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    try {
      const res = await adminLogin(values);
      login({ token: res.token, admin: res.admin });
      message.success("Signed in");
      router.replace("/dashboard");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Login failed";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-md shadow-lg" title={<Typography.Title level={3}>Admin sign in</Typography.Title>}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Continue
          </Button>
        </Form>
      </Card>
    </div>
  );
}
