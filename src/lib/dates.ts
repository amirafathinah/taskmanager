export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function offsetDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

export function friendlyDate(value: string) {
  if (value === offsetDate(0)) return "Today";
  if (value === offsetDate(1)) return "Tomorrow";
  if (value === offsetDate(-1)) return "Yesterday";
  return localDate(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime(value: string | null) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
