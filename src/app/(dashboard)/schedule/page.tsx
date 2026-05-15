"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, Table, Typography } from "antd";
import { adminApi } from "@/lib/api/adminApi";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function SchedulePage() {
  const { token } = useAdminAuth();
  const [courseId, setCourseId] = useState<string | undefined>();

  const courses = useQuery({
    queryKey: ["admin", "courses", "schedule-picker"],
    queryFn: () => adminApi.coursesList(token!, { page: 1, limit: 100 }),
    enabled: Boolean(token),
  });

  const batches = useQuery({
    queryKey: ["admin", "batches", courseId],
    queryFn: () => adminApi.batchesList(token!, courseId!),
    enabled: Boolean(token && courseId),
  });

  return (
    <div className="space-y-4">
      <Typography.Title level={2}>Schedule overview</Typography.Title>
      <Typography.Paragraph type="secondary">
        Pick a course to review batches. Edit schedules and sessions from the course workspace{" "}
        <Typography.Text code>Schedule</Typography.Text> tab.
      </Typography.Paragraph>
      <Select
        showSearch
        allowClear
        placeholder="Select course"
        className="max-w-md w-full"
        optionFilterProp="label"
        options={(courses.data?.courses ?? []).map((c) => ({
          value: c.id,
          label: `${c.title} (${c.slug})`,
        }))}
        onChange={(v) => setCourseId(v)}
      />
      <Table
        bordered
        rowKey="id"
        loading={batches.isLoading}
        dataSource={batches.data?.batches ?? []}
        pagination={false}
        columns={[
          { title: "Code", dataIndex: "code" },
          {
            title: "Starts",
            dataIndex: "startsAt",
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: "Ends",
            dataIndex: "endsAt",
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: "",
            render: (_, row) =>
              courseId ? (
                <Link href={`/courses/${courseId}?batch=${row.id}`}>Open in course</Link>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
