import { useState, useEffect, useMemo, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { api, storage } from "../../services/api";
import { type Task } from "../Calendar/DayCard";
import "./search.css";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onNavigate: (taskId: string, date: string) => void;
}

export default function SearchModal({ open, onClose, onSearch, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const fetchAllTasks = async () => {
        const token = storage.getToken();
        if (!token) return;
        setIsLoading(true);
        try {
          const tasks = await api.getTasks(token);
          setAllTasks(tasks);
        } catch (error) {
          console.error("Failed to fetch tasks for search:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAllTasks();
      setQuery("");
      // Small timeout to ensure input is rendered before focusing
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filteredTasks = useMemo(() => {
    let result = [...allTasks];
    
    // Search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      result = result.filter(task => 
        task.text.toLowerCase().includes(lowerQuery) || 
        task.date.includes(lowerQuery)
      );
    }

    // Sort by created_at (newest first)
    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      // Fallback to task date if created_at is the same or missing
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [allTasks, query]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      onClose();
    }
  };

  const handleTaskClick = (task: Task) => {
    onNavigate(task.id, task.date);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="search-overlay" />
        <Dialog.Content className="search-content">
          <div className="search-header">
            <form onSubmit={handleSubmit} className="search-form">
              <MagnifyingGlassIcon className="search-icon" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                className="search-input"
                placeholder="Поиск по заметкам, дате..."
              />
              <Dialog.Close asChild>
                <button type="button" className="search-close" aria-label="Close">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </form>
          </div>

          <div className="search-results-container">
            {isLoading ? (
              <div className="search-status">Загрузка заметок...</div>
            ) : filteredTasks.length > 0 ? (
              <div className="search-results-list">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="search-result-item"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="search-result-content">
                      <span className={`search-result-text ${task.completed ? "completed" : ""}`}>
                        {task.text}
                      </span>
                      <span className="search-result-date">
                        {formatDate(task.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="search-status">
                {query.trim() ? "Ничего не найдено" : "Нет заметок"}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
