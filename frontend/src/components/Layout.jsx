import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Boxes,
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  Sprout,
  Store,
  UserPlus,
} from "lucide-react";
import { useLang } from "../context/LangContext";
import { ChatbotWidget } from "./ChatbotWidget";
import { AgentTourCard } from "./AgentTourCard";

function NavBtn({ children, icon: Icon }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={17} strokeWidth={2} />
      {children}
    </span>
  );
}

export function Layout({ children }) {
  const { t, lang, setLang } = useLang();
  const nav = ({ isActive }) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold transition ${
      isActive
        ? "bg-emerald-600 text-white shadow-md"
        : "text-slate-600 hover:bg-white/80 hover:shadow-sm"
    }`;

  const user = JSON.parse(localStorage.getItem("fg_user") || "null");
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("fg_token");
    localStorage.removeItem("fg_user");
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen bg-agro-pattern text-slate-800 overflow-x-hidden">
      {/* Soft Agricultural Ambient Lighting */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-emerald-400/20 via-teal-300/10 to-transparent blur-[130px]" />
      <div className="pointer-events-none fixed top-1/3 -right-40 h-[580px] w-[580px] rounded-full bg-gradient-to-bl from-amber-400/15 via-lime-400/12 to-transparent blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-emerald-500/15 via-lime-500/10 to-transparent blur-[130px]" />

      <header className="sticky top-0 z-50 border-b border-emerald-200/60 bg-white/85 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-lime-600 text-xl shadow-lg shadow-emerald-500/25 ring-2 ring-white">
              🌾
            </div>
            <div className="text-left leading-tight">
              <div className="text-lg font-extrabold text-slate-900">{t.brand}</div>
              <div className="hidden text-[11px] font-medium text-emerald-700 sm:block">
                {t.tagline}
              </div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/" className={nav} end>
              <NavBtn icon={LayoutDashboard}>{t.nav_dash}</NavBtn>
            </NavLink>
            <NavLink to="/disease" className={nav}>
              <NavBtn icon={Leaf}>{t.nav_disease}</NavBtn>
            </NavLink>
            <NavLink to="/recommend" className={nav}>
              <NavBtn icon={Sprout}>{t.nav_recommend}</NavBtn>
            </NavLink>
            <NavLink to="/yield" className={nav}>
              <NavBtn icon={Boxes}>{t.nav_yield}</NavBtn>
            </NavLink>
            <NavLink to="/market" className={nav}>
              <NavBtn icon={Store}>{t.nav_market}</NavBtn>
            </NavLink>
            {!user ? (
              <>
                <NavLink to="/login" className={nav}>
                  <NavBtn icon={LogIn}>{t.nav_login}</NavBtn>
                </NavLink>
                <NavLink to="/register" className={nav}>
                  <NavBtn icon={UserPlus}>{t.nav_register}</NavBtn>
                </NavLink>
              </>
            ) : (
              <>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {user.full_name}{" "}
                  <span className="rounded-md bg-emerald-100 px-1.5 text-emerald-800">
                    ({user.role})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <LogOut size={16} /> {t.nav_logout}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "mr" : "en")}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-sm font-bold text-emerald-800 shadow-sm hover:border-emerald-400"
            >
              {t.marathi_toggle}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      
      {/* Rich Grounded Agricultural Footer */}
      <footer className="relative mt-16 border-t border-emerald-900/10 bg-gradient-to-b from-emerald-900 to-emerald-950 text-emerald-100 py-10 shadow-2xl">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <span className="text-2xl">🌾</span>
            <span className="font-extrabold text-white text-lg tracking-wide">{t.brand}</span>
            <span className="text-xs bg-emerald-800/80 text-emerald-200 px-3 py-0.5 rounded-full border border-emerald-700/60 font-semibold">
              महाराष्ट्र कृषी मंच
            </span>
          </div>
          <p className="mx-auto max-w-3xl text-xs leading-relaxed text-emerald-200/90 font-medium">
            {t.footer_line}
          </p>
          <div className="mt-5 pt-4 border-t border-emerald-800/60 text-[11px] text-emerald-400/80 flex flex-wrap items-center justify-between gap-2">
            <span>© Farm Genius • समृद्ध शेतकरी, प्रगत महाराष्ट्र</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse"></span>
              सहा प्रमुख पिकांचे (कापूस, ऊस, भात, मका, गहू, सोयाबीन) डिजिटल कृषी सहाय्य
            </span>
          </div>
        </div>
      </footer>

      <AgentTourCard />
      <ChatbotWidget />
    </div>
  );
}
