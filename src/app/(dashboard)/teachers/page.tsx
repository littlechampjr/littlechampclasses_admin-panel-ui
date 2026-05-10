"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Drawer, Form, Input, Space, Switch, Table, Typography } from "antd";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function TeachersPage() {
  const { token } = useAdminAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const list = useQuery({
    queryKey: ["admin", "teachers", page, debounced],
    queryFn: () => adminApi.teachersList(token!, page, debounced || undefined),
    enabled: Boolean(token),
    placeholderData: (p) => p,
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi.teacherCreate(token!, body),
    onSuccess: () => {
      message.success("Teacher created");
      setOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminApi.teacherPatch(token!, id, body),
    onSuccess: () => {
      message.success("Updated");
      void qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.teacherDelete(token!, id),
    onSuccess: () => {
      message.success("Removed");
      void qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} className="!mb-0">
          Teachers
        </Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Add teacher
        </Button>
      </div>
      <Input.Search placeholder="Search name" allowClear onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      <Table
        rowKey="id"
        loading={list.isLoading}
        dataSource={list.data?.teachers ?? []}
        pagination={{
          current: page,
          total: list.data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: "Name", dataIndex: "name" },
          {
            title: "Subjects",
            dataIndex: "subjectExpertise",
            render: (v: string[]) => v?.join(", ") ?? "",
          },
          {
            title: "Active",
            dataIndex: "isActive",
            render: (v: boolean, row) => (
              <Switch checked={v !== false} onChange={(checked) => patch.mutate({ id: row.id, body: { isActive: checked } })} />
            ),
          },
          {
            title: "",
            render: (_, row) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => {
                    const next = prompt("New name", row.name);
                    if (next) patch.mutate({ id: row.id, body: { name: next } });
                  }}
                >
                  Rename
                </Button>
                <Button type="link" danger onClick={() => del.mutate(row.id)}>
                  Delete
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Drawer title="Create teacher" open={open} onClose={() => setOpen(false)} width={420}>
        <Form
          layout="vertical"
          form={form}
          onFinish={(values) => {
            const subjectExpertise =
              typeof values.subjectExpertise === "string"
                ? values.subjectExpertise.split(",").map((s: string) => s.trim()).filter(Boolean)
                : [];
            create.mutate({
              name: values.name,
              imageUrl: values.imageUrl,
              bioLine: values.bioLine,
              subjectExpertise,
            });
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="imageUrl" label="Image URL">
            <Input />
          </Form.Item>
          <Form.Item name="bioLine" label="Bio line">
            <Input />
          </Form.Item>
          <Form.Item name="subjectExpertise" label="Subjects (comma separated)">
            <Input placeholder="Mathematics, English" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={create.isPending} block>
            Create
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
