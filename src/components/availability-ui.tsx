"use client";

import { useEffect, useState } from "react";
import { addDays, formatDate, site } from "@/lib/site";

export function NextDates() {
  const [dates, setDates] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/availability/setups")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: { dates: string[] }) => {
        if (active) setDates(data.dates);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) return null;
  return (
    <div className="date-strip">
      <strong>Next open dates</strong>
      {dates ? (
        <ul>
          {dates.map((date) => (
            <li key={date}>{formatDate(date)}</li>
          ))}
        </ul>
      ) : (
        <p className="small muted" role="status">Checking the calendar...</p>
      )}
    </div>
  );
}

function shiftMonth(month: string, by: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  return date.toISOString().slice(0, 7);
}

export function AvailabilityCalendar({ slug }: { slug: string }) {
  const firstMonth = site.bookingsOpen.slice(0, 7);
  const [month, setMonth] = useState(firstMonth);
  const [fullDays, setFullDays] = useState<Record<string, string[]>>({});
  const loaded = fullDays[month];

  useEffect(() => {
    let active = true;
    fetch(`/api/availability/item?slug=${encodeURIComponent(slug)}&month=${month}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((data: { fullDays: string[] }) => {
        if (active) setFullDays((current) => ({ ...current, [month]: data.fullDays }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug, month]);

  const first = `${month}-01`;
  const lead = new Date(`${first}T00:00:00Z`).getUTCDay();
  const days: string[] = [];
  for (let day = first; day.startsWith(month); day = addDays(day, 1)) days.push(day);
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...days];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const title = new Date(`${first}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="calendar-wrap">
      <table className="calendar">
        <caption>{title} availability</caption>
        <thead>
          <tr>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <th key={i} scope="col">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => {
                if (!day) return <td key={`empty-${j}`} />;
                const full = loaded?.includes(day);
                return (
                  <td key={day} className={full ? "booked" : undefined}>
                    {Number(day.slice(8))}
                    {full ? <span className="sr-only"> booked</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="calendar-nav">
        <button type="button" className="link-button" disabled={month <= firstMonth} onClick={() => setMonth(shiftMonth(month, -1))}>
          Previous month
        </button>
        <button type="button" className="link-button" onClick={() => setMonth(shiftMonth(month, 1))}>
          Next month
        </button>
      </div>
    </div>
  );
}
