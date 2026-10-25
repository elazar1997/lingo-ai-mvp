// Hebrew text for API error codes shown to the user.
export const ERROR_HE: Record<string, string> = {
  UNAUTHENTICATED: "צריך להתחבר מחדש.",
  FORBIDDEN: "אין לך גישה לזה.",
  BAD_REQUEST: "משהו בפרטים לא תקין. כדאי לבדוק ולנסות שוב.",
  INVALID_INVITE: "קוד ההזמנה לא תקף, כבר נוצל, או שייך לאימייל אחר.",
  SESSION_ACTIVE: "כבר יש לך שיחה פתוחה. סיים אותה קודם.",
  SESSION_NOT_ACTIVE: "השיחה כבר הסתיימה.",
  DAILY_LIMIT: "ניצלת את 15 דקות השיחה של היום. נתראה מחר!",
  EMAIL_RATE_LIMIT: "נשלחו יותר מדי מיילים בזמן קצר. הקוד שלך עדיין תקף, נסה שוב בעוד שעה.",
  BUDGET_LIMIT: "השיחות מושהות זמנית בבטא. נסה שוב מאוחר יותר.",
  PROFILE_MISSING: "הפרופיל שלך לא הושלם.",
  UPSTREAM_ERROR: "שירות הקול לא זמין כרגע. נסה שוב בעוד רגע.",
  INTERNAL: "משהו השתבש. נסה שוב.",
};

export function errorHe(code: string | undefined) {
  return ERROR_HE[code ?? "INTERNAL"] ?? ERROR_HE.INTERNAL;
}
