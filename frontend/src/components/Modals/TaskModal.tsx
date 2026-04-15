import * as Dialog from "@radix-ui/react-dialog";
import {
  TrashIcon,
  Cross2Icon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";
import "/src/assets/styles/taskModal.css";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  position?: number;
};

type Props = {
  task: Task;
  date: Date;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
};

export default function TaskModal({
  task,
  date,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const toggleCompleted = () => {
    onSave({ ...task, completed: !task.completed });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-overlay" />

        <Dialog.Content className="radix-content">
          <div className="modal-header">
            <span className="modal-date">
              {date.toLocaleDateString("ru-RU", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>

            <div className="modal-actions">
              <button
                className={`icon-btn complete ${
                  task.completed ? "active" : ""
                }`}
                onClick={toggleCompleted}
                aria-pressed={task.completed}
                aria-label={
                  task.completed
                    ? "Отметить как не выполнено"
                    : "Отметить как выполнено"
                }
                type="button"
              >
                <CheckCircledIcon />
              </button>

              <button
                className="icon-btn danger"
                onClick={() => onDelete(task.id)}
                aria-label="Удалить заметку"
                type="button"
              >
                <TrashIcon />
              </button>

              <Dialog.Close asChild>
                <button className="icon-btn" aria-label="Закрыть" type="button">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </div>
          </div>
          
          <textarea
            className={`modal-textarea ${
              task.completed ? "completed" : ""
            }`}
            autoFocus
            placeholder="Введите заметку…"
            value={task.text}
            onChange={(e) =>
              onSave({ ...task, text: e.target.value })
            }
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
