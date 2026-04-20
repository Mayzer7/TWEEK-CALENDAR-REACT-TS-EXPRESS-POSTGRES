import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "/src/assets/styles/main.css";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import Header from "./components/Calendar/Header";
import DayCard, { type Task } from "./components/Calendar/DayCard";
import AuthPage from "./components/Auth/AuthPage";
import ProfileModal from "./components/Auth/ProfileModal";
import SearchModal from "./components/Modals/SearchModal";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { storage, api } from "./services/api";

interface DayTasks {
  [date: string]: Task[];
}

type MonthEdgeDirection = "prev" | "next";
const MONTH_FULL = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTH_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTH_PATTERN = MONTH_FULL.concat(MONTH_SHORT).join("|");

interface MonthEdgeDropZoneProps {
  id: string;
  direction: MonthEdgeDirection;
  visible: boolean;
  highlighted: boolean;
}

function MonthEdgeDropZone({ id, direction, visible, highlighted }: MonthEdgeDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type: "month-edge", direction },
  });

  return (
    <div
      ref={setNodeRef}
      className={`month-edge-drop month-edge-drop-${direction} ${visible ? "visible" : ""} ${isOver || highlighted ? "hovered" : ""}`}
      aria-hidden={!visible}
    >
      <div className="month-edge-drop-indicator">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          {direction === "prev" ? (
            <path d="M10.75 4.5L6.25 9L10.75 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M7.25 4.5L11.75 9L7.25 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateToString(value: unknown): string {
  if (typeof value === "string") {
    return value.split("T")[0];
  }
  if (value instanceof Date) {
    return formatDate(value);
  }
  return String(value);
}

export default function App() {
  const MONTH_EDGE_PREV_ID = "month-edge-prev";
  const MONTH_EDGE_NEXT_ID = "month-edge-next";
  const AUTO_MONTH_SWITCH_DELAY_MS = 650;
  const AUTO_MONTH_SWITCH_REPEAT_MS = 1000;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(storage.getUser());
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const hasScrolledRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (highlightedTaskId) {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedTaskId(null);
      }, 3000);
    }
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [highlightedTaskId]);
  
  useEffect(() => {
    const token = storage.getToken();
    if (token) {
      setIsAuthenticated(true);
      setUser(storage.getUser());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || hasScrolledRef.current) return;
    
    const scrollToToday = () => {
      const todayCard = document.querySelector(".today-highlight");
      if (todayCard) {
        todayCard.scrollIntoView({ behavior: "instant", block: "center" });
        hasScrolledRef.current = true;
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToToday);
    });
  }, [isAuthenticated]);

  const nowMoscow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" })
  );

  const [currentMonth, setCurrentMonth] = useState<number>(nowMoscow.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(nowMoscow.getFullYear());
  const [tasksByDate, setTasksByDate] = useState<DayTasks>({});
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [edgeHoverDirection, setEdgeHoverDirection] = useState<MonthEdgeDirection | null>(null);
  const [isDragInProgress, setIsDragInProgress] = useState(false);
  const edgeSwitchTimeoutRef = useRef<number | null>(null);
  const edgeSwitchIntervalRef = useRef<number | null>(null);
  const edgeHoverDirectionRef = useRef<MonthEdgeDirection | null>(null);
  const currentMonthRef = useRef(nowMoscow.getMonth());
  const currentYearRef = useRef(nowMoscow.getFullYear());
  const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null);
  const latestFetchRequestIdRef = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const monthEdgeCollision = pointerCollisions.find((collision) => {
        const collisionId = String(collision.id);
        return collisionId === MONTH_EDGE_PREV_ID || collisionId === MONTH_EDGE_NEXT_ID;
      });
      if (monthEdgeCollision) {
        return [monthEdgeCollision];
      }
      return pointerCollisions;
    }
    return closestCenter(args);
  }, [MONTH_EDGE_NEXT_ID, MONTH_EDGE_PREV_ID]);

  const fetchTasks = useCallback(() => {
    if (!isAuthenticated) return;
    const token = storage.getToken();
    if (!token) return;

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    const requestId = ++latestFetchRequestIdRef.current;

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    api.getTasks(token, formatDate(startDate), formatDate(endDate))
      .then((tasks: Task[]) => {
        if (requestId !== latestFetchRequestIdRef.current) {
          return;
        }
        const grouped: DayTasks = {};
        tasks.forEach((task: Task) => {
          const taskDate = parseDateToString(task.date);
          if (!grouped[taskDate]) {
            grouped[taskDate] = [];
          }
          grouped[taskDate].push(task);
        });
        setTasksByDate(grouped);
      })
      .catch(() => {
      });
  }, [isAuthenticated, currentMonth, currentYear]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setUser(storage.getUser());
    hasScrolledRef.current = false;
  };

  const handleUserUpdate = () => {
    setUser(storage.getUser());
  };

  const handleLogout = () => {
    storage.clear();
    setIsAuthenticated(false);
    setUser(null);
    setTasksByDate({});
    latestFetchRequestIdRef.current += 1;
  };

  const changeMonth = useCallback((direction: number) => {
    const newDate = new Date(currentYearRef.current, currentMonthRef.current + direction, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  }, []);

  useEffect(() => {
    currentMonthRef.current = currentMonth;
    currentYearRef.current = currentYear;
  }, [currentMonth, currentYear]);

  const clearEdgeSwitchTimer = useCallback(() => {
    if (edgeSwitchTimeoutRef.current) {
      window.clearTimeout(edgeSwitchTimeoutRef.current);
      edgeSwitchTimeoutRef.current = null;
    }
    if (edgeSwitchIntervalRef.current) {
      window.clearInterval(edgeSwitchIntervalRef.current);
      edgeSwitchIntervalRef.current = null;
    }
  }, []);

  const resetDragEdgeState = useCallback(() => {
    clearEdgeSwitchTimer();
    edgeHoverDirectionRef.current = null;
    setEdgeHoverDirection(null);
    setIsDragInProgress(false);
  }, [clearEdgeSwitchTimer]);

  const daysInMonth = useMemo(() => new Date(currentYear, currentMonth + 1, 0).getDate(), [currentYear, currentMonth]);

  const dates = useMemo<Date[]>(() => {
    const nextDates: Date[] = [];
    for (let i = 0; i < daysInMonth; i++) {
      nextDates.push(new Date(currentYear, currentMonth, i + 1));
    }
    return nextDates;
  }, [currentYear, currentMonth, daysInMonth]);

  const formatDateStr = (date: Date) => formatDate(date);

  const updateTaskText = useCallback((dateStr: string, taskId: string, text: string) => {
    const token = storage.getToken();
    if (!token) return;

    setTasksByDate(prev => {
      const dayTasks = prev[dateStr] || [];
      const task = dayTasks.find(t => t.id === taskId);
      if (!task) return prev;

      api.updateTask(token, taskId, { text }).catch(console.error);

      return {
        ...prev,
        [dateStr]: dayTasks.map(t =>
          t.id === taskId ? { ...t, text } : t
        ),
      };
    });
  }, []);

  const setTaskCompleted = useCallback((dateStr: string, taskId: string, completed: boolean) => {
    const token = storage.getToken();
    if (!token) return;

    console.log("App setTaskCompleted:", { dateStr, taskId, completed });
    api.updateTask(token, taskId, { completed }).catch(console.error);

    setTasksByDate(prev => {
      const dayTasks = prev[dateStr] || [];
      return {
        ...prev,
        [dateStr]: dayTasks.map(t =>
          t.id === taskId ? { ...t, completed } : t
        ),
      };
    });
  }, []);

  const addTask = useCallback((dateStr: string, text: string) => {
    const token = storage.getToken();
    if (!token) return;

    api.createTask(token, dateStr, text)
      .then((newTask: Task) => {
        setTasksByDate(prev => ({
          ...prev,
          [dateStr]: [...(prev[dateStr] || []), newTask],
        }));
        setLastAddedTaskId(newTask.id);
      })
      .catch(console.error);
  }, []);

  const deleteTask = useCallback((dateStr: string, taskId: string) => {
    const token = storage.getToken();
    if (!token) return;

    api.deleteTask(token, taskId)
      .catch(console.error);

    setTasksByDate(prev => {
      const dayTasks = prev[dateStr] || [];
      return {
        ...prev,
        [dateStr]: dayTasks.filter(t => t.id !== taskId),
      };
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragInProgress(true);
    const activeId = String(event.active.id);

    const activeData = event.active.data.current as { dateStr?: string } | undefined;
    const sourceDate = activeData?.dateStr ? parseDateToString(activeData.dateStr) : null;
    if (sourceDate) {
      const sourceTasks = tasksByDate[sourceDate] || [];
      const sourceTask = sourceTasks.find((item) => item.id === activeId);
      if (sourceTask) {
        setActiveDragTask({ ...sourceTask, date: sourceDate });
        return;
      }
    }

    for (const [day, dayTasks] of Object.entries(tasksByDate)) {
      const task = dayTasks.find((item) => item.id === activeId);
      if (task) {
        setActiveDragTask({ ...task, date: day });
        return;
      }
    }
  }, [tasksByDate]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;

    let nextEdgeDirection: MonthEdgeDirection | null = null;
    if (overId === MONTH_EDGE_PREV_ID) {
      nextEdgeDirection = "prev";
    } else if (overId === MONTH_EDGE_NEXT_ID) {
      nextEdgeDirection = "next";
    }

    if (!nextEdgeDirection) {
      clearEdgeSwitchTimer();
      edgeHoverDirectionRef.current = null;
      setEdgeHoverDirection(null);
      return;
    }

    setEdgeHoverDirection(nextEdgeDirection);

    const isAlreadyRunningForDirection =
      edgeHoverDirectionRef.current === nextEdgeDirection &&
      (edgeSwitchTimeoutRef.current !== null || edgeSwitchIntervalRef.current !== null);
    if (isAlreadyRunningForDirection) {
      return;
    }

    clearEdgeSwitchTimer();
    edgeHoverDirectionRef.current = nextEdgeDirection;

    const moveDirection = nextEdgeDirection === "prev" ? -1 : 1;
    edgeSwitchTimeoutRef.current = window.setTimeout(() => {
      edgeSwitchTimeoutRef.current = null;
      if (edgeHoverDirectionRef.current !== nextEdgeDirection) return;

      changeMonth(moveDirection);

      edgeSwitchIntervalRef.current = window.setInterval(() => {
        if (edgeHoverDirectionRef.current !== nextEdgeDirection) return;
        changeMonth(moveDirection);
      }, AUTO_MONTH_SWITCH_REPEAT_MS);
    }, AUTO_MONTH_SWITCH_DELAY_MS);
  }, [AUTO_MONTH_SWITCH_DELAY_MS, AUTO_MONTH_SWITCH_REPEAT_MS, MONTH_EDGE_NEXT_ID, MONTH_EDGE_PREV_ID, changeMonth, clearEdgeSwitchTimer]);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveDragTask(null);
    resetDragEdgeState();
  }, [resetDragEdgeState]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const token = storage.getToken();
    resetDragEdgeState();
    setActiveDragTask(null);

    const { active, over } = event;
    if (!over || !token) return;

    const activeId = String(active.id);
    const activeData = active.data.current as { type?: string; dateStr?: string } | undefined;
    const overData = over.data.current as { type?: string; dateStr?: string } | undefined;
    if (overData?.type === "month-edge") return;

    const sourceDateRaw = activeData?.dateStr || activeDragTask?.date;
    if (!sourceDateRaw) return;
    const sourceDate = parseDateToString(sourceDateRaw);

    const targetDateRaw = overData?.dateStr || sourceDate;
    const targetDate = parseDateToString(targetDateRaw);
    const overId = String(over.id);

    const sourceTasks = tasksByDate[sourceDate] || [];
    const activeTask = sourceTasks.find((task) => task.id === activeId)
      || (activeDragTask && activeDragTask.id === activeId ? activeDragTask : null);
    if (!activeTask) return;

    const targetTasks = tasksByDate[targetDate] || [];
    const sourceIndex = sourceTasks.findIndex((task) => task.id === activeId);
    if (sourceIndex < 0 && sourceDate === targetDate) return;

    let nextTasksByDate = tasksByDate;
    let updates: Array<{ id: string; date: string; position: number }> = [];

    if (sourceDate === targetDate) {
      const overIndex = targetTasks.findIndex((task) => task.id === overId);
      const destinationIndex = overData?.type === "day" || overIndex < 0 ? targetTasks.length - 1 : overIndex;

      if (sourceIndex === destinationIndex) return;

      const reordered = arrayMove(sourceTasks, sourceIndex, destinationIndex).map((task, index) => ({
        ...task,
        position: index,
        date: sourceDate,
      }));

      nextTasksByDate = {
        ...tasksByDate,
        [sourceDate]: reordered,
      };

      updates = reordered.map((task, index) => ({
        id: task.id,
        date: sourceDate,
        position: index,
      }));
    } else {
      const sourceIsInCurrentView = sourceIndex >= 0;
      const sourceWithoutTask = sourceIsInCurrentView
        ? sourceTasks.filter((task) => task.id !== activeId)
        : sourceTasks;
      const overIndex = targetTasks.findIndex((task) => task.id === overId);
      const destinationIndex = overData?.type === "day" || overIndex < 0 ? targetTasks.length : overIndex;

      const nextTargetTasks = [...targetTasks];
      nextTargetTasks.splice(destinationIndex, 0, { ...activeTask, date: targetDate });

      const normalizedTarget = nextTargetTasks.map((task, index) => ({
        ...task,
        position: index,
        date: targetDate,
      }));

      if (sourceIsInCurrentView) {
        const normalizedSource = sourceWithoutTask.map((task, index) => ({
          ...task,
          position: index,
          date: sourceDate,
        }));

        nextTasksByDate = {
          ...tasksByDate,
          [sourceDate]: normalizedSource,
          [targetDate]: normalizedTarget,
        };

        updates = [
          ...normalizedSource.map((task, index) => ({
            id: task.id,
            date: sourceDate,
            position: index,
          })),
          ...normalizedTarget.map((task, index) => ({
            id: task.id,
            date: targetDate,
            position: index,
          })),
        ];
      } else {
        nextTasksByDate = {
          ...tasksByDate,
          [targetDate]: normalizedTarget,
        };

        updates = normalizedTarget.map((task, index) => ({
          id: task.id,
          date: targetDate,
          position: index,
        }));
      }
    }

    const previousTasksByDate = tasksByDate;
    setTasksByDate(nextTasksByDate);

    const isCrossMonthMove = sourceDate !== targetDate;
    if (isCrossMonthMove) {
      api.reorderTasks(token, updates)
        .catch((error) => {
          console.error("Cross-month move failed:", error);
          setTasksByDate(previousTasksByDate);
          fetchTasks();
        });
      return;
    }

    api.reorderTasks(token, updates).catch((error) => {
      console.error("Reorder failed:", error);
      setTasksByDate(previousTasksByDate);
      fetchTasks();
    });
  }, [tasksByDate, activeDragTask, fetchTasks, resetDragEdgeState]);

  const handleSearch = useCallback(async (query: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    const token = storage.getToken();
    if (!token) return;
    
    const dayMatch = normalizedQuery.match(/^(\d{1,2})\s*(?:число|числа|числу)?$/);
    const datePattern = new RegExp(`^(\\d{1,2})\\s+(${MONTH_PATTERN})(?:\\s+(\\d{4}))?$`, 'i');
    const dateMatch = normalizedQuery.match(datePattern);
    
    if (dayMatch || dateMatch) {
      let targetDay: number;
      let targetMonth = currentMonth;
      let targetYear = currentYear;
      
      if (dateMatch) {
        targetDay = parseInt(dateMatch[1]);
        const monthStr = dateMatch[2].toLowerCase();
        let monthIndex = MONTH_FULL.findIndex(m => monthStr.includes(m));
        if (monthIndex === -1) {
          monthIndex = MONTH_SHORT.findIndex(m => monthStr.includes(m));
        }
        if (monthIndex !== -1) {
          targetMonth = monthIndex;
        }
        if (dateMatch[3]) {
          targetYear = parseInt(dateMatch[3]);
        }
      } else {
        if (!dayMatch) return;
        targetDay = parseInt(dayMatch[1]);
      }
      
      if (targetMonth >= 0 && targetMonth <= 11) {
        const container = scrollContainerRef.current;
        if (container) {
          const targetDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
          
          if (targetYear !== currentYear || targetMonth !== currentMonth) {
            setCurrentYear(targetYear);
            setCurrentMonth(targetMonth);
          }
          
          setTimeout(() => {
            const dayCard = document.querySelector(`[data-date="${targetDateStr}"]`);
            if (dayCard && container) {
              container.scrollTo({
                top: dayCard.getBoundingClientRect().top + container.scrollTop - 80,
                behavior: 'smooth'
              });
            }
          }, 100);
          return;
        }
      }
    }
    
    try {
      const searchResults = await api.searchTasks(token, normalizedQuery);
      
      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        const resultDate = firstResult.date;
        
        const [year, month] = resultDate.split('-');
        const targetYear = parseInt(year);
        const targetMonth = parseInt(month) - 1;
        
        if (targetYear !== currentYear || targetMonth !== currentMonth) {
          setCurrentYear(targetYear);
          setCurrentMonth(targetMonth);
        }
        
        setHighlightedTaskId(firstResult.id);
        
        setTimeout(() => {
          const taskRow = document.querySelector(`[data-task-id="${firstResult.id}"]`);
          const container = scrollContainerRef.current;
          if (taskRow && container) {
            container.scrollTo({
              top: taskRow.getBoundingClientRect().top + container.scrollTop - 80,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    } catch (err) {
      console.error("Search failed:", err);
    }
  }, [currentMonth, currentYear]);

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p style={{ textAlign: "center" }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/forgot-password"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <ForgotPasswordPage />
        }
      />
      <Route
        path="/reset-password"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <ResetPasswordPage />
        }
      />
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          ) : (
            <div
              className="container"
              ref={scrollContainerRef}
              onScroll={() => {
                if (scrollTimeoutRef.current) {
                  window.clearTimeout(scrollTimeoutRef.current);
                }
                scrollTimeoutRef.current = window.setTimeout(() => {
                  hasScrolledRef.current = true;
                }, 100);
              }}
            >
               <Header
                 month={currentMonth}
                 year={currentYear}
                 currentRealMonth={nowMoscow.getMonth()}
                 currentRealYear={nowMoscow.getFullYear()}
                 onPrev={() => changeMonth(-1)}
                 onNext={() => changeMonth(1)}
                 onProfileClick={() => setProfileOpen(true)}
                 onSearchClick={() => setSearchOpen(true)}
                 avatar={user?.avatar}
               />

               <ProfileModal
                 open={profileOpen}
                 onClose={() => setProfileOpen(false)}
                 onLogout={handleLogout}
                 onUserUpdate={handleUserUpdate}
               />


              <SearchModal
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSearch={handleSearch}
              />

              <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragCancel={handleDragCancel}
                onDragEnd={handleDragEnd}
              >
                <MonthEdgeDropZone
                  id={MONTH_EDGE_PREV_ID}
                  direction="prev"
                  visible={isDragInProgress}
                  highlighted={edgeHoverDirection === "prev"}
                />
                <MonthEdgeDropZone
                  id={MONTH_EDGE_NEXT_ID}
                  direction="next"
                  visible={isDragInProgress}
                  highlighted={edgeHoverDirection === "next"}
                />
                <div className="day-cards">
                  {(() => {
                    const maxTasksPerDay = dates.reduce((max, date) => {
                      const dateStr = formatDateStr(date);
                      const count = (tasksByDate[dateStr] || []).length;
                      return Math.max(max, count);
                    }, 0);
                    const minRows = Math.max(7, maxTasksPerDay + 1);

                    return dates.map((date, i) => {
                      const dateStr = formatDateStr(date);
                      const dayTasks = tasksByDate[dateStr] || [];

                      return (
                        <DayCard
                          key={dateStr}
                          cardId={i + 1}
                          date={date}
                          dateStr={dateStr}
                          tasks={dayTasks}
                          minRows={minRows}
                          lastAddedTaskId={lastAddedTaskId}
                          highlightedTaskId={highlightedTaskId}
                          onUpdateTask={updateTaskText}
                          onSetTaskCompleted={setTaskCompleted}
                          onAddTask={addTask}
                          onDeleteTask={deleteTask}
                        />
                      );
                    });
                  })()}
                </div>

                <DragOverlay>
                  {activeDragTask ? (
                    <div className="task-row task-row-overlay">
                      <div className="task-drag-handle" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 14 14">
  <circle cx="7" cy="7" r="2" fill="currentColor" />
</svg>
                      </div>
                      <input
                        className={`task-input ${activeDragTask.completed ? "completed-text" : ""}`}
                        type="text"
                        readOnly
                        value={activeDragTask.text}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
