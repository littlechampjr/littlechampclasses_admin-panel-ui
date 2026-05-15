import { apiFetch } from "./http";

export async function adminLogin(body: { email: string; password: string }) {
  return apiFetch<{ token: string; admin: { id: string; email: string; role: string; permissions: string[] } }>(
    "/api/admin/auth/login",
    { method: "POST", body: JSON.stringify(body), timeoutMs: 25_000 },
  );
}

/** Authenticated helpers — pass Bearer token from `useAdminAuth()`. */
export const adminApi = {
  metricsSummary: (token: string) =>
    apiFetch<{
      totalUsers: number;
      paidUsers: number;
      unpaidUsers: number;
      demoEnrolledUsers: number;
      activeCourses: number;
    }>("/api/admin/metrics/summary", { token }),

  enrollSeries: (token: string, from: string, to: string) =>
    apiFetch<{ points: { date: string; count: number }[] }>(
      `/api/admin/metrics/enrollments-timeseries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { token },
    ),

  revenueSeries: (token: string, from: string, to: string) =>
    apiFetch<{ points: { date: string; amountPaise: number; amountRupees: number }[] }>(
      `/api/admin/metrics/revenue-timeseries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { token },
    ),

  recentEnrollments: (token: string, cursor?: string) =>
    apiFetch<{ items: { id: string; createdAt: string; userPhone: string; courseTitle: string }[]; nextCursor: string | null }>(
      `/api/admin/activity/recent-enrollments?limit=15${cursor ? `&cursor=${cursor}` : ""}`,
      { token },
    ),

  recentPayments: (token: string, cursor?: string) =>
    apiFetch<{
      items: {
        id: string;
        createdAt: string;
        amountRupees: number;
        userPhone: string;
        courseTitle: string;
      }[];
      nextCursor: string | null;
    }>(`/api/admin/activity/recent-payments?limit=15${cursor ? `&cursor=${cursor}` : ""}`, { token }),

  auditLogs: (token: string, cursor?: string) =>
    apiFetch<{ items: { id: string; action: string; entityType: string; actorEmail: string; summary: string; createdAt: string }[]; nextCursor: string | null }>(
      `/api/admin/audit-logs?limit=25${cursor ? `&cursor=${cursor}` : ""}`,
      { token },
    ),

  coursesList: (token: string, params: { page: number; limit: number; search?: string; status?: string }) => {
    const q = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
    });
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    return apiFetch<{
      total: number;
      courses: {
        id: string;
        title: string;
        slug: string;
        status: string;
        isActive: boolean;
        tags: string[];
        track: string;
        pricePaise: number;
        compareAtPricePaise: number | null;
      }[];
    }>(`/api/admin/courses?${q}`, { token });
  },

  courseGet: (token: string, courseId: string) =>
    apiFetch<{ course: Record<string, unknown> }>(`/api/admin/courses/${courseId}`, { token }),

  courseCreate: (token: string, body: Record<string, unknown>) =>
    apiFetch<{ id: string }>("/api/admin/courses", { method: "POST", body: JSON.stringify(body), token }),

  coursePatch: (token: string, courseId: string, body: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  courseDelete: (token: string, courseId: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${courseId}`, { method: "DELETE", token }),

  courseBulk: (token: string, body: { courseIds: string[]; action: "deactivate" | "publish" | "draft" }) =>
    apiFetch<{ ok: boolean; affected: number }>("/api/admin/courses/bulk-actions", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),

  validatePublish: (token: string, courseId: string) =>
    apiFetch<{ ok: boolean; errors: string[] }>(`/api/admin/courses/${courseId}/validate-publish`, {
      method: "POST",
      token,
    }),

  outlineGet: (token: string, courseId: string) =>
    apiFetch<{ outline: { subjects?: unknown[] }; updatedAt: string | null }>(
      `/api/admin/courses/${courseId}/outline`,
      { token },
    ),

  outlinePut: (token: string, courseId: string, body: { subjects: unknown[] }) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${courseId}/outline`, {
      method: "PUT",
      body: JSON.stringify(body),
      token,
    }),

  teachersOnCourse: (token: string, courseId: string) =>
    apiFetch<{ links: { id: string; teacherId: string; subjectLabel: string; teacher?: unknown }[] }>(
      `/api/admin/courses/${courseId}/teachers`,
      { token },
    ),

  teachersOnCoursePut: (token: string, courseId: string, links: { teacherId: string; subjectLabel: string }[]) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${courseId}/teachers`, {
      method: "PUT",
      body: JSON.stringify({ links }),
      token,
    }),

  couponsGet: (token: string, courseId: string) =>
    apiFetch<{ coupons: unknown[] }>(`/api/admin/courses/${courseId}/coupons`, { token }),

  couponsPut: (token: string, courseId: string, couponRows: unknown[]) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${courseId}/coupons`, {
      method: "PUT",
      body: JSON.stringify({ coupons: couponRows }),
      token,
    }),

  batchesList: (token: string, courseId: string) =>
    apiFetch<{ batches: { id: string; code: string; startsAt: string; endsAt: string; isActive: boolean }[] }>(
      `/api/admin/courses/${courseId}/batches`,
      { token },
    ),

  batchCreate: (token: string, courseId: string, body: Record<string, unknown>) =>
    apiFetch<{ id: string }>(`/api/admin/courses/${courseId}/batches`, {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),

  batchPatch: (token: string, batchId: string, body: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/api/admin/batches/${batchId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  batchDelete: (token: string, batchId: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/batches/${batchId}`, { method: "DELETE", token }),

  sessionsList: (token: string, batchId: string) =>
    apiFetch<{ sessions: Record<string, unknown>[] }>(`/api/admin/batches/${batchId}/sessions`, { token }),

  sessionCreate: (token: string, batchId: string, body: Record<string, unknown>) =>
    apiFetch<{ id: string }>(`/api/admin/batches/${batchId}/sessions`, {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),

  sessionPatch: (token: string, sessionId: string, body: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/api/admin/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  sessionDelete: (token: string, sessionId: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/sessions/${sessionId}`, { method: "DELETE", token }),

  teachersList: (token: string, page: number, search?: string) => {
    const q = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) q.set("search", search);
    return apiFetch<{ total: number; teachers: { id: string; name: string; subjectExpertise: string[] }[] }>(
      `/api/admin/teachers?${q}`,
      { token },
    );
  },

  teacherCreate: (token: string, body: Record<string, unknown>) =>
    apiFetch<{ id: string }>("/api/admin/teachers", { method: "POST", body: JSON.stringify(body), token }),

  teacherPatch: (token: string, id: string, body: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/api/admin/teachers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  teacherDelete: (token: string, id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/teachers/${id}`, { method: "DELETE", token }),

  faqsList: (token: string, page: number, search?: string) => {
    const q = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) q.set("search", search);
    return apiFetch<{
      total: number;
      faqs: { id: string; question: string; answer: string; courseIds: string[]; isActive: boolean }[];
    }>(`/api/admin/faqs?${q}`, { token });
  },

  faqCreate: (token: string, body: Record<string, unknown>) =>
    apiFetch<{ id: string }>("/api/admin/faqs", { method: "POST", body: JSON.stringify(body), token }),

  faqPatch: (token: string, id: string, body: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/api/admin/faqs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  faqDelete: (token: string, id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/faqs/${id}`, { method: "DELETE", token }),

  testsList: (token: string, page: number, search?: string) => {
    const q = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) q.set("search", search);
    return apiFetch<{ total: number; tests: { id: string; slug: string; title: string; isActive: boolean }[] }>(
      `/api/admin/tests?${q}`,
      { token },
    );
  },

  testGet: (token: string, testId: string) =>
    apiFetch<{ test: Record<string, unknown> }>(`/api/admin/tests/${testId}`, { token }),

  testCreate: (token: string, body: Record<string, unknown>) =>
    apiFetch<{ id: string }>("/api/admin/tests", { method: "POST", body: JSON.stringify(body), token }),

  testPut: (token: string, testId: string, body: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/api/admin/tests/${testId}`, {
      method: "PUT",
      body: JSON.stringify(body),
      token,
    }),

  testDelete: (token: string, testId: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/tests/${testId}`, { method: "DELETE", token }),

  assignmentsList: (token: string, courseId?: string, page = 1) => {
    const q = new URLSearchParams({ page: String(page), limit: "20" });
    if (courseId) q.set("courseId", courseId);
    return apiFetch<{
      total: number;
      assignments: {
        id: string;
        courseId: string;
        title: string;
        dueAt: string;
        attachmentUrl: string;
      }[];
    }>(`/api/admin/assignments?${q}`, { token });
  },

  assignmentCreate: (token: string, body: Record<string, unknown>) =>
    apiFetch<{ id: string }>("/api/admin/assignments", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),

  assignmentPatch: (token: string, id: string, body: Record<string, unknown>) =>
    apiFetch<{ ok: boolean }>(`/api/admin/assignments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),

  assignmentDelete: (token: string, id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/assignments/${id}`, { method: "DELETE", token }),

  presignUpload: (token: string, body: { keySuffix: string; contentType: string }) =>
    apiFetch<{ ok: true; uploadUrl: string; publicUrl: string; headers: Record<string, string> }>(
      "/api/admin/uploads/presign",
      { method: "POST", body: JSON.stringify(body), token },
    ),
};
