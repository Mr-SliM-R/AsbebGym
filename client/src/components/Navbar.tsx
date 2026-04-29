import { LogOut, Menu, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";

type NavbarProps = {
  onMenuClick: () => void;
};

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();

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
              <span className="block text-xs font-semibold text-rival-cyan">Slim vs Friend</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rival-cyan/15 text-sm font-black text-rival-cyan">
                {user.avatar}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{user.username}</div>
                <div className="text-xs text-slate-500">{user.favoriteMuscleGroup} focus</div>
              </div>
            </div>
          ) : null}
          <button className="icon-button" type="button" onClick={logout} aria-label="Log out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
