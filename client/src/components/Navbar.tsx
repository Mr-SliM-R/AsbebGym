import { LogOut, Menu, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";
import { UserAvatar } from "./UserAvatar";

type NavbarProps = {
  onMenuClick: () => void;
};

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <button className="icon-button lg:hidden" type="button" onClick={onMenuClick} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rival-green text-ink-950 shadow-neon">
              <Trophy className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-black text-white">Gym Rival</span>
              <span className="block text-xs font-semibold text-rival-cyan">{t("Slim vs Adel vs Saber")}</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <UserAvatar avatar={user.avatar} name={user.username} size="sm" />
              <div className="text-right">
                <div className="text-sm font-bold text-white">{user.username}</div>
                <div className="text-xs text-slate-500">{t(user.favoriteMuscleGroup)} {t("focus")}</div>
              </div>
            </div>
          ) : null}
          <button className="icon-button" type="button" onClick={logout} aria-label={t("Log out")}>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
