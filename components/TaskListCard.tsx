"use client";

import Button from "./button";
import SectionTitle from "./SectionTitle";
import TaskRow from "./TaskRow";
import BodyText from "./BodyText";

type Task = {
  id: string;
  description?: string;
  title: string;
  xp: number;
  completed: boolean;
};

type TaskListCardProps = {
  title: string;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  actionLabel?: string;
  onAction?: () => void;
};

export default function TaskListCard({
  title,
  tasks,
  onToggleTask,
  actionLabel,
  onAction,
}: TaskListCardProps) {
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <section className="app-card">
      <SectionTitle
        as="h3"
        title={title}
        action={
          <BodyText size="xs" tone="muted" weight="normal">
            {completedCount} / {tasks.length} tamamlandı
          </BodyText>
        }
      />

      <div className="mt-4 space-y-1">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            title={task.title}
            description={task.description}
            xp={task.xp}
            completed={task.completed}
            onComplete={() => onToggleTask(task.id)}
          />
        ))}
      </div>

      {actionLabel && onAction && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="secondary"
            onClick={onAction}
            className="px-4 py-2 text-xs"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
