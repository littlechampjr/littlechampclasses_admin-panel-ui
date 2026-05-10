"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Drawer, Form, Input, Space, Switch, Table, Typography } from "antd";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function FaqsPage() {
  const { token } = useAdminAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const list = useQuery({
    queryKey: ["admin", "faqs", page, debounced],
    queryFn: () => adminApi.faqsList(token!, page, debounced || undefined),
    enabled: Boolean(token),
    placeholderData: (p) => p,
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi.faqCreate(token!, body),
    onSuccess: () => {
      message.success("FAQ created");
      setOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminApi.faqPatch(token!, id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "faqs"] }),
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.faqDelete(token!, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "faqs"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} className="!mb-0">
          FAQs
        </Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Add FAQ
        </Button>
      </div>
      <Input.Search allowClear placeholder="Search" onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      <Table
        rowKey="id"
        loading={list.isLoading}
        dataSource={list.data?.faqs ?? []}
        pagination={{
          current: page,
          total: list.data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
        }}
        columns={[
          { title: "Question", dataIndex: "question", width: "28%" },
          { title: "Answer", dataIndex: "answer", ellipsis: true },
          {
            title: "Active",
            dataIndex: "isActive",
            render: (v: boolean, row) => (
              <Switch checked={v !== false} onChange={(c) => patch.mutate({ id: row.id, body: { isActive: c } })} />
            ),
          },
          {
            title: "",
            render: (_, row) => (
              <Space>
                <Button type="link" danger onClick={() => del.mutate(row.id)}>
                  Delete
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Drawer title="FAQ" open={open} onClose={() => setOpen(false)} width={520}>
        <Form
          layout="vertical"
          form={form}
          initialValues={{ isActive: true }}
          onFinish={(values) =>
            create.mutate({
              ...values,
              courseIds:
                typeof values.courseIds === "string"
                  ? values.courseIds.split(",").map((s: string) => s.trim()).filter(Boolean)
                  : [],
            })
          }
        >
          <Form.Item name="question" label="Question" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="answer" label="Answer" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
          <Form.Item name="courseIds" label="Course IDs (comma-separated Mongo ids, optional)">
            <Input placeholder="Leave blank for global" />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={create.isPending} block>
            Save
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
