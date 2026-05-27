import Link from "next/link";
import { roomTypeLabels, statusLabels, statusColors } from "@/lib/labels";

type Project = {
  id: string;
  name: string;
  room_type: string | null;
  status: string;
  area_m2: number | null;
  created_at: string;
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={"/projects/" + project.id}
      className="block rounded-xl border border-border bg-surface p-4 transition hover:border-gold"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-paper">{project.name}</h3>
        <span className={"text-xs " + (statusColors[project.status] ?? "text-muted")}>
          {statusLabels[project.status] ?? project.status}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">
        {project.room_type
          ? roomTypeLabels[project.room_type] ?? project.room_type
          : "Tipo não definido"}
        {project.area_m2 ? ` · ${project.area_m2} m²` : ""}
      </p>
    </Link>
  );
}
