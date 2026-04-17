import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useState, useRef } from "react";
import { api, storage } from "../../services/api";
import "./profile.css";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUserUpdate?: () => void;
}

export default function ProfileModal({ open, onClose, onLogout, onUserUpdate }: ProfileModalProps) {
  const [user, setUser] = useState(storage.getUser());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const avatarUrl = e.target?.result as string;
      const token = storage.getToken();
      
      if (!token) return;

      try {
        await api.updateAvatar(token, avatarUrl);
        const updatedUser = { ...user, avatar: avatarUrl };
        storage.setUser(updatedUser);
        setUser(updatedUser);
        if (onUserUpdate) onUserUpdate();
      } catch (error) {
        console.error("Failed to upload avatar:", error);
        alert("Ошибка при загрузке аватара");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="profile-overlay" />

        <Dialog.Content className="profile-content">
          <div className="profile-header">
            <Dialog.Title className="profile-title">Профиль</Dialog.Title>
            <Dialog.Close asChild>
              <button className="profile-close" aria-label="Закрыть">
                <Cross2Icon />
              </button>
            </Dialog.Close>
          </div>

          <div className="profile-body">
            <div className="profile-avatar-container" onClick={() => fileInputRef.current?.click()}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-placeholder">
                  <svg width="80" height="80" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="42" height="42" rx="21" fill="#DCE1FD"/>
                    <path d="M30 27C30 24.7908 27.9854 23 25.5 23H16.5C14.0147 23 12 24.7908 12 27V31H30V27Z" fill="black"/>
                    <path d="M21 20C23.7614 20 26 17.7614 26 15C26 12.2386 23.7614 10 21 10C18.2386 10 16 12.2386 16 15C16 17.7614 18.2386 20 21 20Z" fill="black"/>
                  </svg>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="profile-avatar-overlay">Изменить фото</div>
            </div>

            <div className="profile-info">
              <div className="profile-field">
                <span className="profile-label">Логин</span>
                <span className="profile-value">{user?.username || "Не указан"}</span>
              </div>

              <div className="profile-field">
                <span className="profile-label">Email</span>
                <span className="profile-value">{user?.email || "Не указан"}</span>
              </div>
            </div>

            <button className="profile-logout" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Выйти из аккаунта
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
