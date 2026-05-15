"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  isActive: boolean;
  tags: string[];
  track: string;
  pricePaise: number;
};

export default function CoursesAdminPage() {
  const { token } = useAdminAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 320);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();

  const list = useQuery({
    queryKey: ["admin", "courses", page, debouncedSearch, statusFilter],
    queryFn: () =>
      adminApi.coursesList(token!, {
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    enabled: Boolean(token),
    placeholderData: (prev) => prev,
  });

  const bulk = useMutation({
    mutationFn: (payload: { courseIds: string[]; action: "deactivate" | "publish" | "draft" }) =>
      adminApi.courseBulk(token!, payload),
    onSuccess: (data) => {
      message.success(`Updated ${data.affected} courses`);
      void qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      setSelected([]);
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Bulk action failed"),
  });

  const createCourse = useMutation({
    mutationFn: (values: Record<string, unknown>) => adminApi.courseCreate(token!, values),
    onSuccess: () => {
      message.success("Course created");
      setDrawerOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Create failed"),
  });

  const columns: ColumnsType<CourseRow> = useMemo(
    () => [
      {
        title: "Title",
        dataIndex: "title",
        render: (t: string, r) => <Link href={`/courses/${r.id}`}>{t}</Link>,
      },
      { title: "Slug", dataIndex: "slug" },
      {
        title: "Status",
        dataIndex: "status",
        render: (s: string) => <Tag color={s === "draft" ? "orange" : "green"}>{s}</Tag>,
      },
      {
        title: "Active",
        dataIndex: "isActive",
        render: (v: boolean) => <Tag>{v ? "yes" : "no"}</Tag>,
      },
      { title: "Track", dataIndex: "track" },
      {
        title: "Price ₹",
        dataIndex: "pricePaise",
        render: (p: number) => (p / 100).toFixed(0),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} className="!mb-0">
          Courses
        </Typography.Title>
        <Button type="primary" onClick={() => setDrawerOpen(true)}>
          New course
        </Button>
      </div>

      <Space wrap className="w-full">
        <Input.Search
          allowClear
          placeholder="Search title or slug"
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
          ]}
        />
        <Select
          placeholder="Bulk action"
          style={{ width: 180 }}
          allowClear
          onChange={(action) => {
            if (!action || selected.length === 0) return;
            bulk.mutate({ courseIds: selected as string[], action });
          }}
          options={[
            { value: "publish", label: "Publish selected" },
            { value: "draft", label: "Mark draft" },
            { value: "deactivate", label: "Deactivate" },
          ]}
        />
      </Space>

      <Table<CourseRow>
        bordered
        rowKey="id"
        loading={list.isLoading}
        dataSource={(list.data?.courses ?? []) as CourseRow[]}
        columns={columns}
        pagination={{
          current: page,
          pageSize: 12,
          total: list.data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: setSelected,
        }}
      />

      <Drawer title="Create course" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={520}>
        <Form
          layout="vertical"
          form={form}
          initialValues={{ track: "after-school", status: "draft", isActive: true, pricePaise: 50000 }}
          onFinish={(values) => {
            const { tags: tagsRaw, ...rest } = values;
            const tags =
              typeof tagsRaw === "string"
                ? tagsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
                : [];
            createCourse.mutate({ ...rest, tags });
          }}
        >
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="detailDescription" label="Detail description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="track" label="Track" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "after-school", label: "After school" },
                { value: "english", label: "English" },
                { value: "maths", label: "Maths" },
                { value: "activity", label: "Activity" },
              ]}
            />
          </Form.Item>
          <Form.Item name="pricePaise" label="Price (paise)" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="compareAtPricePaise" label="Compare-at (paise)">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ]} />
          </Form.Item>
          <Form.Item name="isActive" label="Catalog active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="tags" label="Tags (comma separated)">
            <Input placeholder="CBSE, ICSE" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createCourse.isPending} block>
            Create
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
