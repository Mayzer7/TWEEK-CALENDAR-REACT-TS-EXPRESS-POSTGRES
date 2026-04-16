import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import "../components/Auth/auth.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Введите email");
      return;
    }
    if (!isValidEmail(normalized)) {
      setError("Введите корректный email");
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPassword(normalized);
      setSuccess(res.message || "На вашу почту направлено письмо о восстановлении");
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
          <p className="auth-subtitle">Восстановление пароля</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
            <label htmlFor="email" className="form-label">
              Email
            </label>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Загрузка..." : "Отправить письмо"}
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

