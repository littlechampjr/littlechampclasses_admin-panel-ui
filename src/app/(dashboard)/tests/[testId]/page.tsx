"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Input, Typography } from "antd";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function TestEditorPage() {
  const params = useParams<{ testId: string }>();
  const testId = params.testId;
  const { token } = useAdminAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "test", testId],
    queryFn: () => adminApi.testGet(token!, testId),
    enabled: Boolean(token && testId),
  });

  const remoteStr = useMemo(
    () => (q.data?.test ? JSON.stringify(q.data.test, null, 2) : ""),
    [q.data],
  );

  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? remoteStr;

  const save = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      delete parsed._id;
      delete parsed.__v;
      delete parsed.createdAt;
      delete parsed.updatedAt;
      await adminApi.testPut(token!, testId, parsed);
    },
    onSuccess: () => {
      message.success("Saved");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["admin", "test", testId] });
      void qc.invalidateQueries({ queryKey: ["admin", "tests"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Invalid JSON or save failed"),
  });

  if (!testId) return null;

  return (
    <div key={testId} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={3} className="!mb-0">
          Test JSON
        </Typography.Title>
        <Link href="/tests" className="text-sm text-slate-500">
          ← Back
        </Link>
      </div>
      <Typography.Paragraph type="secondary">
        PUT replaces the entire document; server fields like <Typography.Text code>_id</Typography.Text> are stripped on save.
      </Typography.Paragraph>
      <Input.TextArea value={text} onChange={(e) => setDraft(e.target.value)} rows={22} className="font-mono text-xs" />
      <Button type="primary" loading={save.isPending} onClick={() => save.mutate()}>
        Save test
      </Button>
    </div>
  );
}
