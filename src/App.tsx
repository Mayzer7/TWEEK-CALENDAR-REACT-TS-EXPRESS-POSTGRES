import { useState } from "react";
import "/src/assets/styles/main.css";

import Header from "./components/Calendar/Header";
import DayCard from "./components/Calendar/DayCard";

export default function App() {
  const nowMoscow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" })
  );

  const [currentMonth, setCurrentMonth] = useState<number>(nowMoscow.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(nowMoscow.getFullYear());

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

  return (
    <div className="container">
      <Header
        month={currentMonth}
        year={currentYear}
        currentRealMonth={nowMoscow.getMonth()}
        currentRealYear={nowMoscow.getFullYear()}
        onPrev={() => changeMonth(-1)}
        onNext={() => changeMonth(1)}
      />

      <div className="day-cards">
        {dates.map((date, i) => (
          <DayCard key={i} cardId={i + 1} date={date} />
        ))}
      </div>
    </div>
  );
}
