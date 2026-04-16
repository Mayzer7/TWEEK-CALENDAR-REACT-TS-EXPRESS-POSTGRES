import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "../components/Auth/auth.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!token) return "Ссылка для восстановления недействительна";
    if (!password) return "Введите новый пароль";
    if (password.length < 6) return "Пароль должен быть минимум 6 символов";
    if (!confirmPassword) return "Повторите новый пароль";
    if (password !== confirmPassword) return "Пароли не совпадают";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(token, password);
      setSuccess(res.message || "Пароль обновлён");
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Calendar</h1>
          <p className="auth-subtitle">Новый пароль</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <label htmlFor="password" className="form-label">
              Новый пароль
            </label>
          </div>

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
            <label htmlFor="confirmPassword" className="form-label">
              Повтор нового пароля
            </label>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Загрузка..." : "Сохранить"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link className="auth-link" to="/">
              Вернуться ко входу
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

