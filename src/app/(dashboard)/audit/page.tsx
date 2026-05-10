"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Typography } from "antd";
import { adminApi } from "@/lib/api/adminApi";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function AuditPage() {
  const { token } = useAdminAuth();
  const [cursor, setCursor] = useState<string | undefined>();

  const q = useQuery({
    queryKey: ["admin", "audit", cursor],
    queryFn: () => adminApi.auditLogs(token!, cursor),
    enabled: Boolean(token),
  });

  return (
    <div className="space-y-4">
      <Typography.Title level={2}>Audit log</Typography.Title>
      <Typography.Paragraph type="secondary">
        Recent admin actions (newest first). Sub-admins need the <Typography.Text code>audit:read</Typography.Text> permission.
      </Typography.Paragraph>
      <Table
        rowKey="id"
        loading={q.isLoading}
        dataSource={q.data?.items ?? []}
        pagination={false}
        columns={[
          { title: "When", dataIndex: "createdAt", width: 200 },
          { title: "Actor", dataIndex: "actorEmail", width: 200 },
          { title: "Action", dataIndex: "action" },
          { title: "Entity", dataIndex: "entityType", width: 140 },
          { title: "Summary", dataIndex: "summary", ellipsis: true },
        ]}
      />
      {q.data?.nextCursor ? (
        <Typography.Link onClick={() => setCursor(q.data?.nextCursor ?? undefined)}>Load older</Typography.Link>
      ) : null}
    </div>
  );
}
