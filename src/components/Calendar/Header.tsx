import "/src/assets/styles/header.css";

interface HeaderProps {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
}

const MONTHS = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
];

export default function Header({ month, year, onPrev, onNext }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-content">
        <div className="header-left-side">
          <h1 className="header-data">
            {MONTHS[month]} {year}
          </h1>
        </div>

        <div className="header-right-side">
          <button className="profile">
              <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="42" height="42" rx="21" fill="#DCE1FD"/>
                <path d="M30 27C30 24.7908 27.9854 23 25.5 23H16.5C14.0147 23 12 24.7908 12 27V31H30V27Z" fill="black"/>
                <path d="M21 20C23.7614 20 26 17.7614 26 15C26 12.2386 23.7614 10 21 10C18.2386 10 16 12.2386 16 15C16 17.7614 18.2386 20 21 20Z" fill="black"/>
              </svg>
          </button>

          <button className="more-btn">
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="42" height="42" rx="21" fill="#BE9CF3"/>
              <circle cx="19" cy="19" r="7" stroke="black" stroke-width="2"/>
              <line x1="24.41" y1="23.8915" x2="29.8915" y2="28.59" stroke="black" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <div className="navigation-buttons">
            <button className="left-btn" onClick={onPrev}>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.318945 5.29394L5.19386 0.444337C5.42238 0.19043 5.80323 0.19043 6.05713 0.444337C6.28564 0.672852 6.28564 1.05371 6.05713 1.28223L1.58845 5.72559L6.03174 10.1943C6.28564 10.4228 6.28564 10.8037 6.03174 11.0322C5.80323 11.2861 5.42238 11.2861 5.19386 11.0322L0.318945 6.15723C0.0650392 5.92871 0.0650392 5.54785 0.318945 5.29394Z" fill="white"/>
              </svg>
            </button>

            <button className="right-btn" onClick={onNext}>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.68115 5.29394L1.80615 0.444337C1.57763 0.19043 1.19677 0.19043 0.942871 0.444337C0.714356 0.672852 0.714356 1.05371 0.942871 1.28223L5.41162 5.72559L0.968262 10.1943C0.714356 10.4228 0.714356 10.8037 0.968262 11.0322C1.19677 11.2861 1.57763 11.2861 1.80615 11.0322L6.68115 6.15723C6.93506 5.92871 6.93506 5.54785 6.68115 5.29394Z" fill="white"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}