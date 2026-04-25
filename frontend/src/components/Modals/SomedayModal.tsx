import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircledIcon, Cross2Icon, TrashIcon } from "@radix-ui/react-icons";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, storage, type SomedayItem } from "../../services/api";
import "./someday.css";

interface SomedayModalProps {
  open: boolean;
  onClose: () => void;
}

interface SomedayRowProps {
  item: SomedayItem;
  onTextChange: (id: string, value: string) => void;
  onTextSave: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableSomedayRow({
  item,
  onTextChange,
  onTextSave,
  onToggleCompleted,
  onDelete,
}: SomedayRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`someday-item ${item.completed ? "completed" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <button
        type="button"
        className={`someday-action someday-complete ${item.completed ? "active" : ""}`}
        onClick={() => onToggleCompleted(item.id)}
        aria-label="Переключить выполнение"
      >
        <CheckCircledIcon />
      </button>

      <input
        className="someday-item-input"
        value={item.text}
        onChange={(e) => onTextChange(item.id, e.target.value)}
        onBlur={() => onTextSave(item.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onTextSave(item.id);
            e.currentTarget.blur();
          }
        }}
      />

      <button
        type="button"
        className="someday-action someday-drag"
        {...attributes}
        {...listeners}
        aria-label="Перетащить запись"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="6" cy="5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
          <circle cx="6" cy="9" r="1.5" fill="currentColor" />
          <circle cx="12" cy="9" r="1.5" fill="currentColor" />
          <circle cx="6" cy="13" r="1.5" fill="currentColor" />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>

      <button
        type="button"
        className="someday-action someday-delete"
        onClick={() => onDelete(item.id)}
        aria-label="Удалить запись"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export default function SomedayModal({ open, onClose }: SomedayModalProps) {
  const [items, setItems] = useState<SomedayItem[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (!open) {
      return;
    }

    const token = storage.getToken();
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");

    api.getSomedayItems(token)
      .then((nextItems) => {
        setItems(nextItems);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Не удалось загрузить записи");
      })
      .finally(() => {
        setLoading(false);
      });

    window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position || a.text.localeCompare(b.text)),
    [items]
  );

  const createItem = async () => {
    const token = storage.getToken();
    const text = newText.trim();
    if (!token || !text) {
      return;
    }

    setError("");
    setNewText("");

    try {
      const created = await api.createSomedayItem(token, text);
      setItems((prev) => [...prev, created]);
    } catch (err) {
      setNewText(text);
      setError(err instanceof Error ? err.message : "Не удалось добавить запись");
    }
  };

  const updateLocalText = (id: string, value: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, text: value } : item)));
  };

  const saveText = async (id: string) => {
    const token = storage.getToken();
    const current = items.find((item) => item.id === id);
    if (!token || !current) {
      return;
    }

    const trimmed = current.text.trim();
    if (!trimmed) {
      const previousItems = items;
      setItems((prev) => prev.filter((item) => item.id !== id));
      try {
        await api.deleteSomedayItem(token, id);
      } catch (err) {
        setItems(previousItems);
        setError(err instanceof Error ? err.message : "Не удалось удалить запись");
      }
      return;
    }

    if (trimmed === current.text) {
      return;
    }

    const previousItems = items;
    const nextItems = items.map((item) => (item.id === id ? { ...item, text: trimmed } : item));
    setItems(nextItems);

    try {
      await api.updateSomedayItem(token, id, { text: trimmed });
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "Не удалось сохранить запись");
    }
  };

  const toggleCompleted = async (id: string) => {
    const token = storage.getToken();
    const current = items.find((item) => item.id === id);
    if (!token || !current) {
      return;
    }

    const nextCompleted = !current.completed;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: nextCompleted } : item))
    );

    try {
      await api.updateSomedayItem(token, id, { completed: nextCompleted });
    } catch (err) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, completed: current.completed } : item))
      );
      setError(err instanceof Error ? err.message : "Не удалось обновить статус");
    }
  };

  const deleteItem = async (id: string) => {
    const token = storage.getToken();
    if (!token) {
      return;
    }

    const previousItems = items;
    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      await api.deleteSomedayItem(token, id);
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "Не удалось удалить запись");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const token = storage.getToken();
    const { active, over } = event;

    if (!token || !over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedItems.findIndex((item) => item.id === String(active.id));
    const newIndex = sortedItems.findIndex((item) => item.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousItems = items;
    const reordered = arrayMove(sortedItems, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position: index,
    }));

    setItems(reordered);

    try {
      await api.reorderSomedayItems(
        token,
        reordered.map((item) => ({ id: item.id, position: item.position }))
      );
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "Не удалось сохранить порядок");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="search-overlay" />
        <Dialog.Content className="someday-content">
          <div className="someday-header">
            <div>
              <Dialog.Title className="someday-title">Когда-нибудь</Dialog.Title>
              <p className="someday-subtitle">Идеи и задачи без привязки к дате.</p>
            </div>

            <Dialog.Close asChild>
              <button type="button" className="search-close" aria-label="Закрыть">
                <Cross2Icon />
              </button>
            </Dialog.Close>
          </div>

          <div className="someday-create">
            <input
              ref={inputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createItem();
                }
              }}
              className="someday-create-input"
              placeholder="Добавить запись на когда-нибудь..."
            />
            <button type="button" className="someday-create-button" onClick={() => void createItem()}>
              Добавить
            </button>
          </div>

          {error ? <div className="someday-feedback error">{error}</div> : null}

          {loading ? <div className="someday-status">Загрузка записей...</div> : null}

          {!loading && sortedItems.length === 0 ? (
            <div className="someday-empty">
              <p className="someday-empty-title">Пока ничего нет</p>
              <p className="someday-empty-text">
                Сохрани сюда идеи, отложенные задачи и все, к чему хочешь вернуться позже.
              </p>
            </div>
          ) : null}

          {!loading && sortedItems.length > 0 ? (
            <div className="someday-list-wrap">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  <div className="someday-list">
                    {sortedItems.map((item) => (
                      <SortableSomedayRow
                        key={item.id}
                        item={item}
                        onTextChange={updateLocalText}
                        onTextSave={(id) => void saveText(id)}
                        onToggleCompleted={(id) => void toggleCompleted(id)}
                        onDelete={(id) => void deleteItem(id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
