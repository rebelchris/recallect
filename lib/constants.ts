export const CONTACT_FREQUENCIES = {
  weekly: { label: "Weekly", days: 7 },
  biweekly: { label: "Every 2 weeks", days: 14 },
  monthly: { label: "Monthly", days: 30 },
  quarterly: { label: "Quarterly", days: 90 },
  yearly: { label: "Yearly", days: 365 },
} as const;

export type ContactFrequency = keyof typeof CONTACT_FREQUENCIES;

export const INTERACTION_TYPES = {
  call: { label: "Call", icon: "Phone" },
  text: { label: "Text", icon: "MessageSquare" },
  email: { label: "Email", icon: "Mail" },
  coffee: { label: "Coffee", icon: "Coffee" },
  dinner: { label: "Dinner", icon: "UtensilsCrossed" },
  hangout: { label: "Hangout", icon: "Users" },
  meeting: { label: "Meeting", icon: "Briefcase" },
  whatsapp: { label: "WhatsApp", icon: "MessageCircle" },
  other: { label: "Other", icon: "MessageCircle" },
} as const;

export type InteractionType = keyof typeof INTERACTION_TYPES;

export const IMPORTANT_DATE_LABELS = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  custom: "Custom",
} as const;

export type ImportantDateLabel = keyof typeof IMPORTANT_DATE_LABELS;

export function getStaleness(
  daysSince: number,
  frequencyDays: number
): "green" | "yellow" | "red" {
  const ratio = daysSince / frequencyDays;
  if (ratio >= 2) return "red";
  if (ratio >= 1) return "yellow";
  if (ratio >= 0.8) return "yellow";
  return "green";
}
