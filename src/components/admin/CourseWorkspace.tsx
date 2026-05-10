"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { ApiError } from "@/lib/api/http";
import { adminApi } from "@/lib/api/adminApi";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

type Props = { courseId: string };

export function CourseWorkspace({ courseId }: Props) {
  const { token } = useAdminAuth();
  const { message, modal } = App.useApp();
  const router = useRouter();
  const qc = useQueryClient();
  const [generalForm] = Form.useForm();
  const [outlineDraft, setOutlineDraft] = useState<string | null>(null);
  const [couponDraft, setCouponDraft] = useState<string | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherPickForm] = Form.useForm();

  const courseQ = useQuery({
    queryKey: ["admin", "course", courseId],
    queryFn: () => adminApi.courseGet(token!, courseId),
    enabled: Boolean(token && courseId),
  });

  const outlineQ = useQuery({
    queryKey: ["admin", "outline", courseId],
    queryFn: () => adminApi.outlineGet(token!, courseId),
    enabled: Boolean(token && courseId),
  });

  const teachersCourseQ = useQuery({
    queryKey: ["admin", "courseTeachers", courseId],
    queryFn: () => adminApi.teachersOnCourse(token!, courseId),
    enabled: Boolean(token && courseId),
  });

  const teachersPoolQ = useQuery({
    queryKey: ["admin", "teachersPool"],
    queryFn: () => adminApi.teachersList(token!, 1),
    enabled: Boolean(token),
  });

  const couponsQ = useQuery({
    queryKey: ["admin", "coupons", courseId],
    queryFn: () => adminApi.couponsGet(token!, courseId),
    enabled: Boolean(token && courseId),
  });

  const batchesQ = useQuery({
    queryKey: ["admin", "batches", courseId],
    queryFn: () => adminApi.batchesList(token!, courseId),
    enabled: Boolean(token && courseId),
  });

  const sessionsQ = useQuery({
    queryKey: ["admin", "sessions", selectedBatchId],
    queryFn: () => adminApi.sessionsList(token!, selectedBatchId!),
    enabled: Boolean(token && selectedBatchId),
  });

  const remoteOutlineStr = useMemo(() => {
    const subj = outlineQ.data?.outline?.subjects;
    if (subj == null) return "{}";
    return JSON.stringify({ subjects: subj }, null, 2);
  }, [outlineQ.data]);

  const remoteCouponStr = useMemo(() => JSON.stringify(couponsQ.data?.coupons ?? [], null, 2), [couponsQ.data]);

  const outlineText = outlineDraft ?? remoteOutlineStr;
  const couponText = couponDraft ?? remoteCouponStr;

  useEffect(() => {
    if (courseQ.data?.course) {
      const c = courseQ.data.course as Record<string, unknown>;
      generalForm.setFieldsValue({
        title: c.title,
        slug: c.slug,
        description: c.description,
        detailDescription: c.detailDescription,
        track: c.track,
        pricePaise: c.pricePaise,
        compareAtPricePaise: c.compareAtPricePaise,
        status: c.status ?? "published",
        isActive: c.isActive,
        tags: Array.isArray(c.tags) ? (c.tags as string[]).join(", ") : "",
        scheduleStartsAt: c.scheduleStartsAt ? dayjs(String(c.scheduleStartsAt)) : null,
        scheduleEndsAt: c.scheduleEndsAt ? dayjs(String(c.scheduleEndsAt)) : null,
      });
    }
  }, [courseQ.data, generalForm]);

  const patchCourse = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi.coursePatch(token!, courseId, body),
    onSuccess: () => {
      message.success("Saved");
      void qc.invalidateQueries({ queryKey: ["admin", "course", courseId] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  const saveOutline = useMutation({
    mutationFn: (subjects: unknown[]) => adminApi.outlinePut(token!, courseId, { subjects }),
    onSuccess: () => {
      message.success("Outline saved");
      setOutlineDraft(null);
      void qc.invalidateQueries({ queryKey: ["admin", "outline", courseId] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Outline invalid"),
  });

  const saveCoupons = useMutation({
    mutationFn: (coupons: unknown[]) => adminApi.couponsPut(token!, courseId, coupons),
    onSuccess: () => {
      message.success("Coupons saved");
      setCouponDraft(null);
      void qc.invalidateQueries({ queryKey: ["admin", "coupons", courseId] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Coupons invalid"),
  });

  const replaceTeachers = useMutation({
    mutationFn: (links: { teacherId: string; subjectLabel: string }[]) =>
      adminApi.teachersOnCoursePut(token!, courseId, links),
    onSuccess: () => {
      message.success("Teachers updated");
      void qc.invalidateQueries({ queryKey: ["admin", "courseTeachers", courseId] });
      setTeacherModalOpen(false);
      teacherPickForm.resetFields();
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const validatePub = useMutation({
    mutationFn: () => adminApi.validatePublish(token!, courseId),
    onSuccess: (res) => {
      modal.info({
        title: res.ok ? "Ready to publish" : "Validation issues",
        content: (
          <ul className="list-disc pl-5">
            {(res.errors ?? []).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        ),
      });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: () => adminApi.courseDelete(token!, courseId),
    onSuccess: () => {
      message.success("Deleted");
      router.push("/courses");
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const createBatch = useMutation({
    mutationFn: (body: Record<string, unknown>) => adminApi.batchCreate(token!, courseId, body),
    onSuccess: () => {
      message.success("Batch created");
      setBatchModalOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin", "batches", courseId] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const createSession = useMutation({
    mutationFn: ({ batchId, body }: { batchId: string; body: Record<string, unknown> }) =>
      adminApi.sessionCreate(token!, batchId, body),
    onSuccess: () => {
      message.success("Session created");
      setSessionModalOpen(false);
      void qc.invalidateQueries({ queryKey: ["admin", "sessions", selectedBatchId] });
    },
    onError: (e) => message.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const teacherLinks = teachersCourseQ.data?.links ?? [];

  function appendTeacherLink(values: { teacherId: string; subjectLabel: string }) {
    const next = [
      ...teacherLinks.map((l) => ({ teacherId: l.teacherId, subjectLabel: l.subjectLabel })),
      { teacherId: values.teacherId, subjectLabel: values.subjectLabel },
    ];
    replaceTeachers.mutate(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={3} className="!mb-0">
            {(courseQ.data?.course as { title?: string } | undefined)?.title ?? "Course"}
          </Typography.Title>
          <Link href="/courses" className="text-sm text-slate-500">
            ← Back to courses
          </Link>
        </div>
        <Space wrap>
          <Button onClick={() => validatePub.mutate()} loading={validatePub.isPending}>
            Validate publish
          </Button>
          <Button
            danger
            onClick={() =>
              modal.confirm({
                title: "Delete course?",
                onOk: () => deleteCourse.mutate(),
              })
            }
          >
            Delete
          </Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: "general",
            label: "General",
            children: (
              <Card loading={courseQ.isLoading}>
                <Form
                  layout="vertical"
                  form={generalForm}
                  onFinish={(values) => {
                    const tags =
                      typeof values.tags === "string"
                        ? values.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
                        : [];
                    patchCourse.mutate({
                      ...values,
                      tags,
                      scheduleStartsAt: values.scheduleStartsAt
                        ? (values.scheduleStartsAt as dayjs.Dayjs).toISOString()
                        : null,
                      scheduleEndsAt: values.scheduleEndsAt
                        ? (values.scheduleEndsAt as dayjs.Dayjs).toISOString()
                        : null,
                    });
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
                    <Input.TextArea rows={5} />
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
                  <Space wrap className="w-full">
                    <Form.Item name="pricePaise" label="Price (paise)" rules={[{ required: true }]}>
                      <InputNumber min={0} />
                    </Form.Item>
                    <Form.Item name="compareAtPricePaise" label="Compare-at (paise)">
                      <InputNumber min={0} />
                    </Form.Item>
                  </Space>
                  <Space wrap className="w-full">
                    <Form.Item name="status" label="Status">
                      <Select
                        options={[
                          { value: "draft", label: "Draft" },
                          { value: "published", label: "Published" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="isActive" label="Active" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Space>
                  <Form.Item name="tags" label="Tags (comma separated)">
                    <Input />
                  </Form.Item>
                  <Space wrap>
                    <Form.Item name="scheduleStartsAt" label="Schedule start">
                      <DatePicker showTime />
                    </Form.Item>
                    <Form.Item name="scheduleEndsAt" label="Schedule end">
                      <DatePicker showTime />
                    </Form.Item>
                  </Space>
                  <Button type="primary" htmlType="submit" loading={patchCourse.isPending}>
                    Save changes
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: "outline",
            label: "Study outline",
            children: (
              <Card loading={outlineQ.isLoading}>
                <Typography.Paragraph type="secondary">
                  Edit the JSON payload ({`{ "subjects": [...] }`}). Lectures and notes live under each chapter.
                </Typography.Paragraph>
                <Input.TextArea rows={18} className="font-mono text-sm" value={outlineText} onChange={(e) => setOutlineDraft(e.target.value)} />
                <Button
                  className="mt-3"
                  type="primary"
                  loading={saveOutline.isPending}
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(outlineText) as { subjects?: unknown[] };
                      if (!parsed.subjects || !Array.isArray(parsed.subjects)) {
                        message.error('JSON must contain a "subjects" array');
                        return;
                      }
                      saveOutline.mutate(parsed.subjects);
                    } catch {
                      message.error("Invalid JSON");
                    }
                  }}
                >
                  Save outline
                </Button>
              </Card>
            ),
          },
          {
            key: "teachers",
            label: "Teachers",
            children: (
              <Card>
                <Space className="mb-3">
                  <Button type="primary" onClick={() => setTeacherModalOpen(true)}>
                    Add teacher link
                  </Button>
                </Space>
                <Table
                  rowKey="id"
                  loading={teachersCourseQ.isLoading}
                  dataSource={teacherLinks}
                  pagination={false}
                  columns={[
                    { title: "Subject line", dataIndex: "subjectLabel" },
                    {
                      title: "Teacher",
                      render: (_, row) => {
                        const t = row.teacher as { name?: string } | undefined;
                        return t?.name ?? row.teacherId;
                      },
                    },
                    {
                      title: "",
                      render: (_, row) => (
                        <Button
                          type="link"
                          danger
                          onClick={() => {
                            const next = teacherLinks
                              .filter((l) => l.id !== row.id)
                              .map((l) => ({ teacherId: l.teacherId, subjectLabel: l.subjectLabel }));
                            replaceTeachers.mutate(next);
                          }}
                        >
                          Remove
                        </Button>
                      ),
                    },
                  ]}
                />
                <Modal
                  title="Link teacher"
                  open={teacherModalOpen}
                  onCancel={() => setTeacherModalOpen(false)}
                  onOk={() => teacherPickForm.submit()}
                  confirmLoading={replaceTeachers.isPending}
                >
                  <Form layout="vertical" form={teacherPickForm} onFinish={appendTeacherLink}>
                    <Form.Item name="teacherId" label="Teacher" rules={[{ required: true }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={(teachersPoolQ.data?.teachers ?? []).map((t) => ({
                          value: t.id,
                          label: t.name,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name="subjectLabel" label="Subject label" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Form>
                </Modal>
              </Card>
            ),
          },
          {
            key: "coupons",
            label: "Coupons",
            children: (
              <Card loading={couponsQ.isLoading}>
                <Input.TextArea rows={14} className="font-mono text-sm" value={couponText} onChange={(e) => setCouponDraft(e.target.value)} />
                <Button
                  className="mt-3"
                  type="primary"
                  loading={saveCoupons.isPending}
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(couponText) as unknown[];
                      if (!Array.isArray(parsed)) {
                        message.error("Coupons JSON must be an array");
                        return;
                      }
                      saveCoupons.mutate(parsed);
                    } catch {
                      message.error("Invalid JSON");
                    }
                  }}
                >
                  Save coupons
                </Button>
              </Card>
            ),
          },
          {
            key: "schedule",
            label: "Schedule",
            children: (
              <Card loading={batchesQ.isLoading}>
                <Space className="mb-3">
                  <Button onClick={() => setBatchModalOpen(true)}>New batch</Button>
                  <Button disabled={!selectedBatchId} onClick={() => setSessionModalOpen(true)}>
                    New session
                  </Button>
                </Space>
                <Typography.Text type="secondary">
                  Select a batch row to load sessions for that batch.
                </Typography.Text>
                <Table
                  className="mt-3"
                  rowKey="id"
                  dataSource={batchesQ.data?.batches ?? []}
                  pagination={false}
                  rowSelection={{
                    type: "radio",
                    selectedRowKeys: selectedBatchId ? [selectedBatchId] : [],
                    onChange: (keys) => setSelectedBatchId(keys[0] ? String(keys[0]) : null),
                  }}
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
                      title: "Active",
                      dataIndex: "isActive",
                      render: (v: boolean) => <Tag>{v ? "yes" : "no"}</Tag>,
                    },
                  ]}
                />

                {selectedBatchId ? (
                  <Card className="mt-4" title="Sessions" loading={sessionsQ.isLoading}>
                    <Table
                      rowKey="id"
                      dataSource={sessionsQ.data?.sessions ?? []}
                      pagination={false}
                      columns={[
                        { title: "Title", dataIndex: "title" },
                        { title: "Subject", dataIndex: "subject" },
                        {
                          title: "Starts",
                          dataIndex: "startsAt",
                          render: (v: string) => new Date(v).toLocaleString(),
                        },
                        { title: "Meet", dataIndex: "meetUrl", ellipsis: true },
                        {
                          title: "",
                          render: (_, row) => (
                            <Button
                              type="link"
                              danger
                              onClick={() =>
                                modal.confirm({
                                  title: "Delete session?",
                                  onOk: () =>
                                    adminApi.sessionDelete(token!, String(row.id)).then(() => {
                                      void qc.invalidateQueries({ queryKey: ["admin", "sessions", selectedBatchId] });
                                    }),
                                })
                              }
                            >
                              Delete
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Card>
                ) : null}

                <Modal
                  title="New batch"
                  open={batchModalOpen}
                  onCancel={() => setBatchModalOpen(false)}
                  footer={null}
                >
                  <Form
                    layout="vertical"
                    initialValues={{ isActive: true }}
                    onFinish={(values) =>
                      createBatch.mutate({
                        code: values.code,
                        startsAt: (values.startsAt as dayjs.Dayjs).toISOString(),
                        endsAt: (values.endsAt as dayjs.Dayjs).toISOString(),
                        isActive: values.isActive ?? true,
                      })
                    }
                  >
                    <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="startsAt" label="Starts" rules={[{ required: true }]}>
                      <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="endsAt" label="Ends" rules={[{ required: true }]}>
                      <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="isActive" label="Active" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={createBatch.isPending}>
                      Create
                    </Button>
                  </Form>
                </Modal>

                <Modal
                  title="New session"
                  open={sessionModalOpen}
                  onCancel={() => setSessionModalOpen(false)}
                  footer={null}
                >
                  <Form
                    layout="vertical"
                    onFinish={(values) =>
                      createSession.mutate({
                        batchId: selectedBatchId!,
                        body: {
                          title: values.title,
                          subject: values.subject,
                          startsAt: (values.startsAt as dayjs.Dayjs).toISOString(),
                          durationMinutes: values.durationMinutes,
                          meetUrl: values.meetUrl,
                          teacher: values.teacher || null,
                        },
                      })
                    }
                  >
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="startsAt" label="Starts" rules={[{ required: true }]}>
                      <DatePicker showTime className="w-full" />
                    </Form.Item>
                    <Form.Item name="durationMinutes" label="Duration (minutes)" rules={[{ required: true }]}>
                      <InputNumber min={1} className="w-full" />
                    </Form.Item>
                    <Form.Item name="meetUrl" label="Meet URL">
                      <Input />
                    </Form.Item>
                    <Form.Item name="teacher" label="Teacher ID (optional)">
                      <Input placeholder="Mongo ObjectId" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={createSession.isPending}>
                      Create
                    </Button>
                  </Form>
                </Modal>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
