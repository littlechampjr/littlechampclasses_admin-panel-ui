"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Avatar,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Typography,
  Upload,
} from "antd";
import { DeleteOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadRequestOption } from "@rc-component/upload/lib/interface";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

type TeacherRow = {
  id: string;
  name: string;
  imageUrl: string;
  bioLine: string;
  subjectExpertise: string[];
  modalTagline: string;
  highlights: string[];
  displayOrder: number;
  isActive: boolean;
};

type FormValues = {
  name: string;
  imageUrl?: string;
  bioLine?: string;
  subjectExpertise?: string;
  modalTagline?: string;
  highlights?: string[];
  displayOrder?: number;
  isActive?: boolean;
};

export default function TeachersPage() {
  const { token } = useAdminAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const list = useQuery({
    queryKey: ["admin", "teachers", page, debounced],
    queryFn: () => adminApi.teachersList(token!, page, debounced || undefined),
    enabled: Boolean(token),
    placeholderData: (p) => p,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        imageUrl: editing.imageUrl,
        bioLine: editing.bioLine,
        subjectExpertise: (editing.subjectExpertise ?? []).join(", "),
        modalTagline: editing.modalTagline,
        highlights: editing.highlights?.length ? editing.highlights : [""],
        displayOrder: editing.displayOrder ?? 0,
        isActive: editing.isActive,
      });
      setImageUrl(editing.imageUrl ?? "");
    } else {
      form.resetFields();
      form.setFieldsValue({ highlights: [""], displayOrder: 0, isActive: true });
      setImageUrl("");
    }
  }, [open, editing, form]);

  const closeDrawer = () => {
    setOpen(false);
    setEditing(null);
  };

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi.teacherCreate(token!, body),
    onSuccess: () => {
      message.success("Teacher created");
      closeDrawer();
      void qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminApi.teacherPatch(token!, id, body),
    onSuccess: () => {
      message.success("Updated");
      closeDrawer();
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

  async function handleUpload(opts: UploadRequestOption) {
    const file = opts.file as File;
    if (!file) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const keySuffix = `teachers/${Date.now()}-${safeName}`;
      const signed = await adminApi.presignUpload(token!, {
        keySuffix,
        contentType: file.type || "application/octet-stream",
      });
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: signed.headers,
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      setImageUrl(signed.publicUrl);
      form.setFieldValue("imageUrl", signed.publicUrl);
      message.success("Image uploaded");
      opts.onSuccess?.({}, file as unknown as XMLHttpRequest);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      message.error(msg);
      opts.onError?.(new Error(msg));
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(values: FormValues) {
    const subjectExpertise =
      typeof values.subjectExpertise === "string"
        ? values.subjectExpertise.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    const highlights = (values.highlights ?? [])
      .map((s) => (s ?? "").trim())
      .filter(Boolean);
    const body = {
      name: values.name.trim(),
      imageUrl: imageUrl || values.imageUrl || "",
      bioLine: (values.bioLine ?? "").trim(),
      subjectExpertise,
      modalTagline: (values.modalTagline ?? "").trim(),
      highlights,
      displayOrder: values.displayOrder ?? 0,
      isActive: values.isActive ?? true,
    };
    if (editing) {
      patch.mutate({ id: editing.id, body });
    } else {
      create.mutate(body);
    }
  }

  const rows = (list.data?.teachers ?? []) as TeacherRow[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={2} className="!mb-0">
          Teachers
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add teacher
        </Button>
      </div>
      <Input.Search
        placeholder="Search name"
        allowClear
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 320 }}
      />
      <Table
        bordered
        rowKey="id"
        loading={list.isLoading}
        dataSource={rows}
        pagination={{
          current: page,
          total: list.data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          {
            title: "",
            dataIndex: "imageUrl",
            width: 60,
            render: (url: string, row) => (
              <Avatar src={url || undefined} size={40}>
                {row.name?.[0] ?? "?"}
              </Avatar>
            ),
          },
          { title: "Name", dataIndex: "name" },
          {
            title: "Tagline",
            dataIndex: "modalTagline",
            ellipsis: true,
          },
          {
            title: "Order",
            dataIndex: "displayOrder",
            width: 80,
          },
          {
            title: "Active",
            dataIndex: "isActive",
            width: 90,
            render: (v: boolean, row) => (
              <Switch
                checked={v !== false}
                onChange={(checked) => patch.mutate({ id: row.id, body: { isActive: checked } })}
              />
            ),
          },
          {
            title: "",
            width: 160,
            render: (_, row) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => {
                    setEditing(row);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button type="link" danger onClick={() => del.mutate(row.id)}>
                  Delete
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Drawer
        title={editing ? "Edit teacher" : "Create teacher"}
        open={open}
        onClose={closeDrawer}
        width={520}
        destroyOnHidden
      >
        <Form layout="vertical" form={form} onFinish={onSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Shubham Sir" />
          </Form.Item>

          <Form.Item label="Photo">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Teacher"
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid #eee",
                  }}
                />
              ) : null}
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={handleUpload}
                disabled={uploading}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {imageUrl ? "Replace photo" : "Upload photo"}
                </Button>
              </Upload>
              <Form.Item name="imageUrl" hidden>
                <Input />
              </Form.Item>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Square images work best (e.g. 600×600).
              </Typography.Text>
            </Space>
          </Form.Item>

          <Form.Item
            name="bioLine"
            label="Bio line (shown on card)"
            extra="Short description under the name on the card. e.g. 'B.Sc. Graduate, CTET qualified with 4+ years of teaching experience.'"
          >
            <Input.TextArea rows={2} maxLength={280} showCount />
          </Form.Item>

          <Form.Item
            name="modalTagline"
            label="Modal tagline"
            extra="Subheader in the 'Know More' modal. e.g. 'Expertise in Mathematics'."
          >
            <Input maxLength={200} placeholder="Expertise in Mathematics" />
          </Form.Item>

          <Form.Item label="Highlights (modal bullets)">
            <Form.List name="highlights">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  {fields.map((field) => (
                    <Space.Compact key={field.key} style={{ width: "100%" }}>
                      <Form.Item
                        {...field}
                        noStyle
                        rules={[{ max: 200, message: "Max 200 chars" }]}
                      >
                        <Input placeholder="e.g. 7+ Years Teaching CBSE, ICSE, IB Boards" />
                      </Form.Item>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                        disabled={fields.length <= 1}
                      />
                    </Space.Compact>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add("")}
                    disabled={fields.length >= 8}
                    block
                  >
                    Add highlight
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item
            name="subjectExpertise"
            label="Subjects (internal tags, comma separated)"
            extra="Used for filtering inside the admin only. Not shown to public."
          >
            <Input placeholder="Mathematics, English" />
          </Form.Item>

          <Form.Item
            name="displayOrder"
            label="Display order"
            extra="Lower numbers appear first in the public carousel."
          >
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={create.isPending || patch.isPending}
            block
          >
            {editing ? "Save changes" : "Create"}
          </Button>
        </Form>
      </Drawer>
    </div>
  );
}
