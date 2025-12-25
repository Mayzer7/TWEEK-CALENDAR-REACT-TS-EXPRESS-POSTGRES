import React, { useState } from "react";
import "/src/assets/styles/dayCard.css";

import TaskModal from "../Modals/TaskModal";

type Task = {
  id: number;
  text: string;
  completed: boolean;
};

interface DayCardProps {
  cardId: number;
  date: Date;
}

export default function DayCard({ cardId, date }: DayCardProps) {
  const BASE_COUNT = 7;

  const INITIAL_TASKS = Array.from({ length: BASE_COUNT }, (_, i) => ({
    id: i + 1,
    text: "",
    completed: false
  }));

  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const updateTaskText = (id: number, text: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, text } : t)));
  };

  const toggleTaskCompleted = (id: number) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const applyTaskRules = () => {
    const filledCount = tasks.filter(t => t.text.trim() !== "").length;

    if (filledCount >= tasks.length) {
      setTasks(prev => [
        ...prev,
        { id: prev.length + 1, text: "", completed: false }
      ]);
      return;
    }

    if (tasks.length > BASE_COUNT && filledCount < BASE_COUNT) {
      setTasks(prev => prev.slice(0, BASE_COUNT));
    }
  };

  const handleBlur = () => applyTaskRules();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Проверка: сегодня?
  const nowMoscow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" })
  );

  const isToday =
    nowMoscow.getDate() === date.getDate() &&
    nowMoscow.getMonth() === date.getMonth() &&
    nowMoscow.getFullYear() === date.getFullYear();


  const saveTaskFromModal = (updated: Task) => {
    setTasks(prev =>
      prev.map(t => (t.id === updated.id ? updated : t))
    );
    setActiveTask(updated);
  };

  const deleteTask = (id: number) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, text: "", completed: false } : t
      )
    );
    setActiveTask(null);
  };  

  return (
    <div className={`day-card ${isToday ? "today-highlight" : ""}`}>
      <div className="day-card-header">
        <p className="data-number">
          {date.getDate()} {date.toLocaleString("ru-RU", { month: "short" })}
        </p>
        <p className="data-day">
          {date.toLocaleString("ru-RU", { weekday: "short" })}
        </p>
      </div>

      <div className="day-card-body">
        {tasks.map(task => (
          <div
            key={task.id}
            className={`task-row ${task.text.trim() === "" ? "empty-task" : ""}`}
            onClick={() => task.text.trim() && setActiveTask(task)}
          >
            <input
              className={`task-input ${task.completed ? "completed-text" : ""}`}
              type="text"
              value={task.text}
              onChange={e => updateTaskText(task.id, e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />

            {task.text.trim() !== "" && (
              <div className="checkbox-wrapper fade-in">
                <input
                  id={`check-${cardId}-${task.id}`}
                  type="checkbox"
                  className="checkbox-real"
                  checked={task.completed}
                  onChange={() => toggleTaskCompleted(task.id)}
                />

                <label htmlFor={`check-${cardId}-${task.id}`} className="checkbox-fake">
                  <svg viewBox="0 0 24 24" className="checkbox-icon">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      {activeTask && (
        <TaskModal
          task={activeTask}
          date={date}
          onClose={() => setActiveTask(null)}
          onSave={saveTaskFromModal}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}

