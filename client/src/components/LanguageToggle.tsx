import { Languages } from "lucide-react";
import { useI18n, type Language } from "../i18n";

const options: Array<{ value: Language; label: string }> = [
  { value: "en", label: "ENG" },
  { value: "fr", label: "FR" }
];

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.045] p-1">
      <Languages className="ml-2 h-4 w-4 text-rival-cyan" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLanguage(option.value)}
          className={`min-h-8 rounded-md px-3 text-xs font-black transition ${
            language === option.value
              ? "bg-rival-green text-ink-950 shadow-neon"
              : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
          }`}
          aria-pressed={language === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
