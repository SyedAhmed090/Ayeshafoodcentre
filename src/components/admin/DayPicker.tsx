import Link from "next/link";
import { btnOutline, input } from "@/components/admin/ui";
import { karachiDate, shiftDay } from "@/lib/time";

/** ‹ day › arrows and a date box; plain links and a GET form, so it works without JavaScript. */
export function DayPicker({ day, path }: { day: string; path: string }) {
  const today = karachiDate();
  return (
    <form method="get" action={path} className="flex items-center gap-2">
      <Link href={`${path}?day=${shiftDay(day, -1)}`} aria-label="Day before" className={`${btnOutline} px-3`}>
        ‹
      </Link>
      <input type="date" name="day" defaultValue={day} max={today} aria-label="Day" className={`${input} w-auto`} />
      <button type="submit" className={btnOutline}>
        Show
      </button>
      {day < today && (
        <Link href={`${path}?day=${shiftDay(day, 1)}`} aria-label="Day after" className={`${btnOutline} px-3`}>
          ›
        </Link>
      )}
    </form>
  );
}
