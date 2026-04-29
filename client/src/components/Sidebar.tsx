import {
  Activity,
  Dumbbell,
  Flame,
  LayoutDashboard,
  Medal,
  Trophy,
  UserCircle
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exercises", label: "Exercises", icon: Dumbbell },
  { to: "/tracker", label: "Tracker", icon: Activity },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/challenges", label: "Challenges", icon: Flame },
  { to: "/profile", label: "Profile", icon: UserCircle }
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-ink-950 p-4 transition-transform lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center gap-3 px-2 lg:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rival-green text-ink-950">
            <Medal className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-black text-white">Gym Rival</div>
            <div className="text-xs text-slate-500">Two-player arena</div>
          </div>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                    isActive
                      ? "border border-rival-green/30 bg-rival-green/15 text-rival-green"
                      : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
