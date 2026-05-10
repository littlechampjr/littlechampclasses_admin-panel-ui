"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, DatePicker, Drawer, Form, Input, Select, Table, Typography } from "antd";
import dayjs from "dayjs";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function HomeworkPage() {
  const { token } = useAdminAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [courseFilter, setCourseFilter] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const courses = useQuery({
    queryKey: ["admin", "courses", "hw-picker"],
    queryFn: () => adminApi.coursesList(token!, { page: 1, limit: 200 }),
    enabled: Boolean(token),
  });

  const list = useQuery({
    queryKey: ["admin", "assignments", courseFilter],
    queryFn: () => adminApi.assignmentsList(token!, courseFilter, 1),
    enabled: Boolean(token),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi.assignmentCreate(token!, body),
    onSuccess: () => {
      message.success("Homework created");
      setOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.assignmentDelete(token!, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "assignments"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} className="!mb-0">
          Homework & PDFs
        </Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          New assignment
        </Button>
      </div>
      <Select
        allowClear
        placeholder="Filter by course"
        className="max-w-md w-full"
        options={(courses.data?.courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
        onChange={setCourseFilter}
      />
      <Table
        rowKey="id"
        loading={list.isLoading}
        dataSource={list.data?.assignments ?? []}
        pagination={false}
        columns={[
          { title: "Title", dataIndex: "title" },
          {
            title: "Due",
            dataIndex: "dueAt",
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: "Attachment",
            dataIndex: "attachmentUrl",
            ellipsis: true,
          },
          {
            title: "",
            render: (_, row) => (
              <Button type="link" danger onClick={() => del.mutate(row.id)}>
                Delete
              </Button>
            ),
          },
        ]}
      />
      <Drawer title="Assignment" open={open} onClose={() => setOpen(false)} width={480}>
        <Form
          layout="vertical"
          form={form}
          onFinish={(values) =>
            create.mutate({
              courseId: values.courseId,
              batchId: values.batchId || null,
              title: values.title,
              description: values.description ?? "",
              dueAt: (values.dueAt as dayjs.Dayjs).toISOString(),
              attachmentUrl: values.attachmentUrl ?? "",
            })
          }
        >
          <Form.Item name="courseId" label="Course" rules={[{ required: true }]}>
            <Select
              options={(courses.data?.courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
            />
          </Form.Item>
          <Form.Item name="batchId" label="Batch ID (optional)">
            <Input placeholder="Mongo ObjectId" />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="dueAt" label="Due" rules={[{ required: true }]}>
            <DatePicker showTime className="w-full" />
          </Form.Item>
          <Form.Item name="attachmentUrl" label="PDF / file URL">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={create.isPending} block>
            Save
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
