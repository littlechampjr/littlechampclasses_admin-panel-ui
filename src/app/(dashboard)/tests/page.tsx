"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Input, Table, Typography } from "antd";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

function defaultTestPayload() {
  const slug = `draft-test-${Date.now()}`;
  return {
    slug,
    title: "Untitled test",
    courseIds: [] as string[],
    durationMins: 30,
    totalMarks: 10,
    sections: [{ id: "sec_a", title: "Section A", order: 0 }],
    questions: [
      {
        publicId: "q1",
        sectionId: "sec_a",
        type: "single" as const,
        text: "Sample question?",
        options: [
          { id: "opt_a", text: "Option A" },
          { id: "opt_b", text: "Option B" },
        ],
        correctOptionId: "opt_a",
        marks: 10,
        negativeMarks: 0,
        explanation: "",
      },
    ],
    generalInstructions: "",
    testInstructions: "",
    isActive: true,
    recommended: false,
    attemptsCount: 0,
  };
}

export default function TestsAdminPage() {
  const router = useRouter();
  const { token } = useAdminAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 320);

  const list = useQuery({
    queryKey: ["admin", "tests", page, debounced],
    queryFn: () => adminApi.testsList(token!, page, debounced || undefined),
    enabled: Boolean(token),
    placeholderData: (p) => p,
  });

  const create = useMutation({
    mutationFn: () => adminApi.testCreate(token!, defaultTestPayload()),
    onSuccess: (res) => {
      message.success("Draft test created");
      void qc.invalidateQueries({ queryKey: ["admin", "tests"] });
      router.push(`/tests/${res.id}`);
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.testDelete(token!, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "tests"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} className="!mb-0">
          Tests (MCQ)
        </Typography.Title>
        <Button type="primary" loading={create.isPending} onClick={() => create.mutate()}>
          New draft test
        </Button>
      </div>
      <Typography.Paragraph type="secondary">
        Tests use structured MCQ payloads. Creating opens the JSON editor for the full document (sections + questions).
      </Typography.Paragraph>
      <Input
        allowClear
        placeholder="Search slug/title"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Table
        bordered
        rowKey="id"
        loading={list.isLoading}
        dataSource={list.data?.tests ?? []}
        pagination={{
          current: page,
          total: list.data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
        }}
        columns={[
          {
            title: "Title",
            dataIndex: "title",
            render: (t: string, row) => <Link href={`/tests/${row.id}`}>{t}</Link>,
          },
          { title: "Slug", dataIndex: "slug" },
          {
            title: "Active",
            dataIndex: "isActive",
            render: (v: boolean) => (v ? "yes" : "no"),
          },
          {
            title: "",
            render: (_, row) => (
              <Button
                type="link"
                danger
                onClick={() =>
                  modal.confirm({
                    title: "Delete test?",
                    onOk: () => del.mutate(row.id),
                  })
                }
              >
                Delete
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
