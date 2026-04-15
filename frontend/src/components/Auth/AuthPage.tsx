import { useState } from "react";
import { api, storage } from "../../services/api";
import "./auth.css";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeUsername = (value: string) => value.trim().toLowerCase();
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

  const validate = () => {
    const u = normalizeUsername(username);
    if (!u) return "Введите логин";
    if (u.length < 3) return "Логин должен быть минимум 3 символа";
    if (!/^[a-z0-9._-]+$/.test(u)) {
      return "Логин может содержать только латинские буквы, цифры и символы . _ -";
    }

    if (!password) return "Введите пароль";
    if (!isLogin) {
      if (!email.trim()) return "Введите email";
      if (!isValidEmail(email)) return "Введите корректный email";
      if (password.length < 6) return "Пароль должен быть минимум 6 символов";
      if (!confirmPassword) return "Повторите пароль";
      if (password !== confirmPassword) return "Пароли не совпадают";
    }

    return null;
  };

  const toRuError = (message: string) => {
    const m = message.toLowerCase();
    if (m.includes("invalid username or password")) return "Неверный логин или пароль";
    if (m.includes("username and password are required")) return "Введите логин и пароль";
    if (m.includes("username, email and password are required")) return "Введите логин, email и пароль";
    if (m.includes("email or username already registered")) return "Email или логин уже заняты";
    if (m.includes("username must be at least 3 characters")) return "Логин должен быть минимум 3 символа";
    if (m.includes("registration failed")) return "Не удалось зарегистрироваться";
    if (m.includes("login failed")) return "Не удалось войти";
    return message || "Произошла ошибка";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await api.login(normalizeUsername(username), password);
      } else {
        response = await api.register(normalizeUsername(username), email.trim(), password);
      }

      storage.setToken(response.token);
      storage.setUser(response.user);
      onAuthSuccess();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Произошла ошибка";
      setError(toRuError(raw));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setPassword("");
    setConfirmPassword("");
    if (isLogin) {
      setEmail("");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Calendar</h1>
          <p className="auth-subtitle">
            {isLogin ? "Войдите в аккаунт" : "Создайте аккаунт"}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete={isLogin ? "username" : "new-password"}
            />
            <label htmlFor="username" className="form-label">Логин</label>
          </div>

          {!isLogin && (
            <div className="form-group">
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <label htmlFor="email" className="form-label">Email</label>
            </div>
          )}

          <div className="form-group">
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            <label htmlFor="password" className="form-label">Пароль</label>
          </div>

          {!isLogin && (
            <div className="form-group">
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <label htmlFor="confirmPassword" className="form-label">Повтор пароля</label>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}
            <button type="button" className="auth-toggle" onClick={toggleMode}>
              {isLogin ? "Зарегистрироваться" : "Войти"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
