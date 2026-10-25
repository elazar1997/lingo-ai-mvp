import { ButtonLink, Logo } from "@/components/ui";
import { Avatar } from "@/components/avatar";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col justify-between gap-10">
      <header className="pt-2">
        <Logo />
      </header>

      <section className="flex flex-col items-center gap-6 text-center">
        <div className="flex gap-4">
          <Avatar persona="lucia" state="idle" size={112} />
          <Avatar persona="vale" state="laughing" size={112} />
        </div>
        <h1 className="text-[34px] font-bold leading-tight">
          מדברים ספרדית
          <br />
          <span className="text-neon-purple">מהיום הראשון</span>
        </h1>
        <p className="text-muted">
          שיחה קולית אמיתית עם לוסיה, המורה הסבלנית, או עם ואלה, החברה מהעיר הגדולה. בלי שינון, בלי לחץ.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <ButtonLink href="/signup" tone="green" glow>
          יש לי קוד הזמנה
        </ButtonLink>
        <ButtonLink href="/login" tone="ghost">
          כבר יש חשבון? התחברות
        </ButtonLink>
        <p className="text-center text-small text-muted">הבטא פתוחה למוזמנים בלבד, מגיל 18 ומעלה.</p>
      </div>
    </div>
  );
}
