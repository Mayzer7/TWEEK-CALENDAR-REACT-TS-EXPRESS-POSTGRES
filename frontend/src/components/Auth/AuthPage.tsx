import { useState } from "react";
import { api, storage } from "../../services/api";
import "./auth.css";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await api.login(email, password);
      } else {
        if (!name.trim()) {
          setError("Введите имя");
          setLoading(false);
          return;
        }
        response = await api.register(email, password, name);
      }

      storage.setToken(response.token);
      storage.setUser(response.user);
      onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
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

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder=" "
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
              <label htmlFor="name" className="form-label">Имя</label>
            </div>
          )}

          <div className="form-group">
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="email" className="form-label">Email</label>
          </div>

          <div className="form-group">
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="password" className="form-label">Пароль</label>
          </div>

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
