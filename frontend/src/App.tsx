import { useState, useEffect, useCallback, useRef } from "react";
import "/src/assets/styles/main.css";
import { Routes, Route, Navigate } from "react-router-dom";

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

  const fetchTasks = useCallback(() => {
    if (!isAuthenticated) return;
    const token = storage.getToken();
    if (!token) return;

    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    api.getTasks(token, formatDate(startDate), formatDate(endDate))
      .then((tasks: Task[]) => {
        console.log("Raw tasks from API:", tasks);
        const grouped: DayTasks = {};
        tasks.forEach((task: Task) => {
          const taskDate = parseDateToString(task.date);
          console.log("Task date:", taskDate, "for task:", task.text);
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
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentYear, currentMonth + direction, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const dates: Date[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    dates.push(new Date(currentYear, currentMonth, i + 1));
  }

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

  const MONTH_FULL = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const MONTH_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const MONTH_PATTERN = MONTH_FULL.concat(MONTH_SHORT).join("|");

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

              <div className="day-cards">
                {dates.map((date, i) => {
                  const dateStr = formatDateStr(date);
                  const dayTasks = tasksByDate[dateStr] || [];

                  return (
                    <DayCard
                      key={dateStr}
                      cardId={i + 1}
                      date={date}
                      dateStr={dateStr}
                      tasks={dayTasks}
                      highlightedTaskId={highlightedTaskId}
                      onUpdateTask={(taskId, text) =>
                        updateTaskText(dateStr, taskId, text)
                      }
                      onSetTaskCompleted={(taskId, completed) =>
                        setTaskCompleted(dateStr, taskId, completed)
                      }
                      onAddTask={(text) => addTask(dateStr, text)}
                      onDeleteTask={(taskId) => deleteTask(dateStr, taskId)}
                    />
                  );
                })}
              </div>
            </div>
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
