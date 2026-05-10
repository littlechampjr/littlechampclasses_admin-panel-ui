"use client";

import { useParams } from "next/navigation";
import { CourseWorkspace } from "@/components/admin/CourseWorkspace";

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  if (!courseId) return null;
  return <CourseWorkspace key={courseId} courseId={courseId} />;
}
