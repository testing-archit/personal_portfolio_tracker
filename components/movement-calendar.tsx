"use client";

import { useMemo, useState } from "react";
import type { DailyMovement } from "@/lib/types";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_MONTHS = 6;

export function MovementCalendar({ movements }: { movements: DailyMovement[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byDate = useMemo(() => new Map(movements.map((movement) => [movement.date, movement.change])), [movements]);
  const maxAbs = useMemo(() => Math.max(1, ...movements.map((movement) => Math.abs(movement.change))), [movements]);

  const months = useMemo(() => {
    if (movements.length === 0) return [];
    const first = new Date(`${movements[0].date}T12:00:00`);
    const last = new Date(`${movements.at(-1)!.date}T12:00:00`);
    const list: { year: number; month: number }[] = [];
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date(last.getFullYear(), last.getMonth(), 1);
    while (cursor <= end) {
      list.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return list.slice(-MAX_MONTHS);
  }, [movements]);

  return (
    <article className="calendar-card" id="calendar">
      <div className="calendar-head">
        <div>
          <p className="eyebrow">DAILY MOVEMENT</p>
          <h2>Movement calendar</h2>
        </div>
        {months.length ? (
          <div className="calendar-legend">
            <span><i style={{ background: "var(--bad-fg)" }} /> Down</span>
            <span><i style={{ background: "var(--surface-2)" }} /> Flat</span>
            <span><i style={{ background: "var(--good-fg)" }} /> Up</span>
          </div>
        ) : null}
      </div>
      {months.length === 0 ? (
        <p className="rebalance-intro">Once your portfolio has a few days of price history, daily gains and losses will show up here.</p>
      ) : (
        <div className="calendar-months">
          {months.map(({ year, month }) => {
            const label = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstWeekday = new Date(year, month, 1).getDay();
            const dates = Array.from({ length: daysInMonth }, (_, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`);

            return (
              <div className="calendar-month" key={`${year}-${month}`}>
                <span>{label}</span>
                <div className="calendar-grid">
                  {DOW.map((day, index) => <div className="calendar-dow" key={index}>{day}</div>)}
                  {Array.from({ length: firstWeekday }, (_, index) => <div className="calendar-cell empty" key={`lead-${index}`} />)}
                  {dates.map((date) => {
                    const change = byDate.get(date);
                    const day = Number(date.slice(-2));
                    if (change === undefined) return <div className="calendar-cell" key={date}>{day}</div>;
                    const intensity = Math.min(90, Math.max(20, (Math.abs(change) / maxAbs) * 90));
                    return (
                      <div
                        key={date}
                        className="calendar-cell"
                        data-move={change >= 0 ? "up" : "down"}
                        style={{ "--intensity": `${intensity}%` } as React.CSSProperties}
                        onMouseEnter={() => setHovered(date)}
                        onMouseLeave={() => setHovered((current) => (current === date ? null : current))}
                      >
                        {day}
                        {hovered === date ? (
                          <div className="calendar-tooltip">
                            <strong>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</strong>
                            {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
