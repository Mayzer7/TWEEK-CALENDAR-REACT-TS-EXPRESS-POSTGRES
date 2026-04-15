import { useState, useEffect, useCallback, useRef } from "react";
import "/src/assets/styles/main.css";

import Header from "./components/Calendar/Header";
import DayCard, { type Task } from "./components/Calendar/DayCard";
import AuthPage from "./components/Auth/AuthPage";
import ProfileModal from "./components/Auth/ProfileModal";
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
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const hasScrolledRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const token = storage.getToken();
    if (token) {
      setIsAuthenticated(true);
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
  const [tasksLoading, setTasksLoading] = useState(true);

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
        setTasksLoading(false);
      })
      .catch(() => {
        setTasksLoading(false);
      });
  }, [isAuthenticated, currentMonth, currentYear]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    hasScrolledRef.current = false;
  };

  const handleLogout = () => {
    storage.clear();
    setIsAuthenticated(false);
    setTasksByDate({});
    setTasksLoading(true);
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentYear, currentMonth + direction, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
    setTasksLoading(true);
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

  const toggleTaskCompleted = useCallback((dateStr: string, taskId: string) => {
    const token = storage.getToken();
    if (!token) return;

    setTasksByDate(prev => {
      const dayTasks = prev[dateStr] || [];
      const task = dayTasks.find(t => t.id === taskId);
      if (!task) return prev;

      const newCompleted = !task.completed;
      console.log("App toggleTaskCompleted:", { dateStr, taskId, oldCompleted: task.completed, newCompleted });
      api.updateTask(token, taskId, { completed: newCompleted }).catch(console.error);

      return {
        ...prev,
        [dateStr]: dayTasks.map(t =>
          t.id === taskId ? { ...t, completed: newCompleted } : t
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

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p style={{ textAlign: "center" }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
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
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
      />

      <div className="day-cards">
        {tasksLoading && (
          <div style={{ 
            position: 'fixed', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '20px 40px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 2000
          }}>
            Загрузка заметок...
          </div>
        )}
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
              onUpdateTask={(taskId, text) => updateTaskText(dateStr, taskId, text)}
              onToggleTask={(taskId) => toggleTaskCompleted(dateStr, taskId)}
              onSetTaskCompleted={(taskId, completed) => setTaskCompleted(dateStr, taskId, completed)}
              onAddTask={(text) => addTask(dateStr, text)}
              onDeleteTask={(taskId) => deleteTask(dateStr, taskId)}
            />
          );
        })}
      </div>
    </div>
  );
}
