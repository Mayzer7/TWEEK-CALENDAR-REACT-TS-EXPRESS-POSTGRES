import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import "./search.css";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export default function SearchModal({ open, onClose, onSearch }: SearchModalProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("search") as string;
    if (query.trim()) {
      onSearch(query.trim());
      onClose();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="search-overlay" />
        <Dialog.Content className="search-content">
          <form onSubmit={handleSubmit} className="search-form">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              name="search"
              type="text"
              className="search-input"
              placeholder="Поиск по заметкам, дате..."
              autoFocus
            />
            <Dialog.Close asChild>
              <button type="button" className="search-close">
                <Cross2Icon />
              </button>
            </Dialog.Close>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
