import React, { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "/src/assets/styles/dayCard.css";

import TaskModal from "../Modals/TaskModal";

export type Task = {
  id: string;
  text: string;
  completed: boolean;
  position?: number;
  date?: string;
};

interface DayCardProps {
  cardId: number;
  date: Date;
  dateStr: string;
  tasks: Task[];
  highlightedTaskId?: string | null;
  onUpdateTask: (taskId: string, text: string) => void;
  onSetTaskCompleted: (taskId: string, completed: boolean) => void;
  onAddTask: (text: string) => void;
  onDeleteTask: (taskId: string) => void;
}

interface SortableTaskRowProps {
  task: Task;
  cardId: number;
  highlightedTaskId?: string | null;
  onTaskClick: (taskId: string) => void;
  onToggleCompleted: (task: Task, e: React.MouseEvent) => void;
}

function SortableTaskRow({
  task,
  cardId,
  highlightedTaskId,
  onTaskClick,
  onToggleCompleted,
}: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      dateStr: task.date,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-row ${task.text.trim() === "" ? "empty-task" : ""} ${highlightedTaskId === task.id ? "task-highlighted" : ""} ${isDragging ? "task-row-dragging" : ""}`}
      onClick={() => onTaskClick(task.id)}
      data-task-id={task.id}
    >
      <button
        type="button"
        className="task-drag-handle"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Перетащить задачу"
      > 
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="2" fill="currentColor" />
        </svg>
      </button>

      <input
        className={`task-input ${task.completed ? "completed-text" : ""}`}
        type="text"
        value={task.text}
        readOnly
      />

      {task.text.trim() !== "" && (
        <div className="checkbox-wrapper fade-in" onClick={(e) => e.stopPropagation()}>
          <input
            id={`check-${cardId}-${task.id}`}
            type="checkbox"
            className="checkbox-real"
            checked={task.completed}
            onChange={() => {}}
            onClick={(e) => onToggleCompleted(task, e)}
          />

          <label htmlFor={`check-${cardId}-${task.id}`} className="checkbox-fake">
            <svg viewBox="0 0 24 24" className="checkbox-icon">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </label>
        </div>
      )}
    </div>
  );
}

export default function DayCard({ cardId, date, dateStr, tasks, highlightedTaskId, onUpdateTask, onSetTaskCompleted, onAddTask, onDeleteTask }: DayCardProps) {
  const BASE_COUNT = 7;
  const nowMoscow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" })
  );

  const isToday =
    nowMoscow.getDate() === date.getDate() &&
    nowMoscow.getMonth() === date.getMonth() &&
    nowMoscow.getFullYear() === date.getFullYear();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: {
      type: "day",
      dateStr,
    },
  });

  const savedTasks = tasks || [];
  const filledCount = savedTasks.filter(t => t.text.trim()).length;
  const emptyInputsCount = Math.max(0, BASE_COUNT - filledCount);

  useEffect(() => {
    if (!activeTask) return;
    const actualTask = savedTasks.find((task) => task.id === activeTask.id);
    if (!actualTask) {
      setActiveTask(null);
      return;
    }
    if (actualTask.text !== activeTask.text || actualTask.completed !== activeTask.completed) {
      setActiveTask(actualTask);
    }
  }, [savedTasks, activeTask]);

  const handleTaskClick = (taskId: string) => {
    const task = savedTasks.find(t => t.id === taskId);
    if (task && task.text.trim()) {
      setActiveTask(task);
    }
  };

  const handleSavedTaskUpdate = (updated: Task) => {
    const existing = savedTasks.find((task) => task.id === updated.id);
    setActiveTask(updated);

    if (existing && !updated.id.startsWith("local-")) {
      if (existing.completed !== updated.completed) {
        onSetTaskCompleted(updated.id, updated.completed);
      }
      if (existing.text !== updated.text) {
        onUpdateTask(updated.id, updated.text);
      }
    }
  };

  const handleSavedTaskDelete = (id: string) => {
    onDeleteTask(id);
    setActiveTask(null);
  };

  const handleModalClose = () => {
    setActiveTask(null);
  };

  const toggleTaskCompleted = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.id.startsWith("local-")) {
      const updated = { ...task, completed: !task.completed };
      if (activeTask?.id === task.id) {
        setActiveTask(updated);
      }
      onSetTaskCompleted(task.id, updated.completed);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const text = e.target.value.trim();
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    if (relatedTarget && e.target.closest('.day-card-body')?.contains(relatedTarget)) {
      e.target.closest('.task-row')?.classList.remove('input-focused');
      return;
    }
    
    if (text) {
      onAddTask(text);
      e.target.value = "";
    }
    e.target.closest('.task-row')?.classList.remove('input-focused');
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.closest('.task-row')?.classList.add('input-focused');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const input = e.currentTarget;
      const text = input.value.trim();
      if (text) {
        onAddTask(text);
        input.value = "";
      }
      input.blur();
    }
  };

  const emptyInputs = Array.from({ length: emptyInputsCount }, (_, i) => (
    <div key={`empty-${i}`} className="task-row empty-task">
      <input
        ref={i === 0 ? inputRef : undefined}
        className="task-input"
        type="text"
        defaultValue=""
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
      />
    </div>
  ));

  return (
    <div className={`day-card ${isToday ? "today-highlight" : ""}`} data-date={dateStr}>
      <div className="day-card-header">
        <p className="data-number">
          {date.getDate()} {date.toLocaleString("ru-RU", { month: "short" })}
        </p>
        <p className="data-day">
          {date.toLocaleString("ru-RU", { weekday: "short" })}
        </p>
      </div>

      <div ref={setDroppableRef} className={`day-card-body ${isOver ? "day-drop-active" : ""}`}>
        <SortableContext items={savedTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {savedTasks.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              cardId={cardId}
              highlightedTaskId={highlightedTaskId}
              onTaskClick={handleTaskClick}
              onToggleCompleted={toggleTaskCompleted}
            />
          ))}
        </SortableContext>

        {emptyInputs}
      </div>

      {activeTask && (
        <TaskModal
          task={activeTask}
          date={date}
          onClose={handleModalClose}
          onSave={handleSavedTaskUpdate}
          onDelete={handleSavedTaskDelete}
        />
      )}
    </div>
  );
}
