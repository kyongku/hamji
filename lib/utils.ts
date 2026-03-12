import { formatDistanceToNow, differenceInDays, format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";

/** 상대 시간 표시 (예: "3분 전", "2시간 전", "3일 전") */
export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko });
}

/** D-day 계산. 오늘이면 "D-Day", 미래면 "D-3", 과거면 "D+2" */
export function dDay(dateStr: string): string {
  const diff = differenceInDays(new Date(dateStr), new Date());
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

/** 날짜 포맷. 오늘이면 시간만, 어제면 "어제", 그 외 날짜 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "어제";
  return format(d, "M/d");
}

/** 날짜 풀 포맷 */
export function formatDateFull(dateStr: string): string {
  return format(new Date(dateStr), "yyyy년 M월 d일 (EEE)", { locale: ko });
}

/** 숫자 축약 (1200 → 1.2K) */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1) + "K";
  return (n / 10000).toFixed(1) + "만";
}

/** 카테고리 색상 클래스 */
export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    free: "bg-blue-100 text-blue-700",
    question: "bg-green-100 text-green-700",
    assessment: "bg-orange-100 text-orange-700",
    counseling: "bg-purple-100 text-purple-700",
  };
  return map[category] ?? "bg-gray-100 text-gray-700";
}
