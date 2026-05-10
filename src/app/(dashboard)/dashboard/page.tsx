"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Statistic, Table, Typography } from "antd";
import { adminApi } from "@/lib/api/adminApi";
import { useAdminAuth } from "@/providers/AdminAuthProvider";

export default function DashboardPage() {
  const { token } = useAdminAuth();
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const summary = useQuery({
    queryKey: ["admin", "metrics", "summary"],
    queryFn: () => adminApi.metricsSummary(token!),
    enabled: Boolean(token),
  });

  const enroll = useQuery({
    queryKey: ["admin", "metrics", "enroll", range.from, range.to],
    queryFn: () => adminApi.enrollSeries(token!, range.from, range.to),
    enabled: Boolean(token),
  });

  const revenue = useQuery({
    queryKey: ["admin", "metrics", "revenue", range.from, range.to],
    queryFn: () => adminApi.revenueSeries(token!, range.from, range.to),
    enabled: Boolean(token),
  });

  const recentEnroll = useQuery({
    queryKey: ["admin", "activity", "enroll"],
    queryFn: () => adminApi.recentEnrollments(token!),
    enabled: Boolean(token),
  });

  const recentPay = useQuery({
    queryKey: ["admin", "activity", "pay"],
    queryFn: () => adminApi.recentPayments(token!),
    enabled: Boolean(token),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Typography.Title level={2} className="!mb-1">
            Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            Charts below cover the last 30 days (rolling window).
          </Typography.Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {[
          { title: "Total users", value: summary.data?.totalUsers },
          { title: "Paid users", value: summary.data?.paidUsers },
          { title: "Unpaid users", value: summary.data?.unpaidUsers },
          { title: "Demo enrolled", value: summary.data?.demoEnrolledUsers },
          { title: "Active courses", value: summary.data?.activeCourses },
        ].map((c) => (
          <Col xs={24} sm={12} md={8} lg={6} key={c.title}>
            <Card>
              <Statistic title={c.title} value={c.value ?? "—"} loading={summary.isLoading} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Enrollments (daily)">
            <Table
              size="small"
              pagination={false}
              loading={enroll.isLoading}
              dataSource={enroll.data?.points ?? []}
              rowKey="date"
              columns={[
                { title: "Date", dataIndex: "date" },
                { title: "New enrollments", dataIndex: "count" },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Revenue (daily, ₹)">
            <Table
              size="small"
              pagination={false}
              loading={revenue.isLoading}
              dataSource={revenue.data?.points ?? []}
              rowKey="date"
              columns={[
                { title: "Date", dataIndex: "date" },
                {
                  title: "Paid",
                  dataIndex: "amountRupees",
                  render: (v: number) => v?.toFixed?.(2) ?? v,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Recent enrollments">
            <Table
              size="small"
              loading={recentEnroll.isLoading}
              dataSource={recentEnroll.data?.items ?? []}
              rowKey="id"
              pagination={false}
              columns={[
                { title: "When", dataIndex: "createdAt", width: 200 },
                { title: "Phone", dataIndex: "userPhone" },
                { title: "Course", dataIndex: "courseTitle" },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Recent payments">
            <Table
              size="small"
              loading={recentPay.isLoading}
              dataSource={recentPay.data?.items ?? []}
              rowKey="id"
              pagination={false}
              columns={[
                { title: "When", dataIndex: "createdAt", width: 200 },
                { title: "Phone", dataIndex: "userPhone" },
                { title: "Course", dataIndex: "courseTitle" },
                { title: "₹", dataIndex: "amountRupees" },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
