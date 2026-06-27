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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50">
      <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-500 text-xl shadow-lg shadow-emerald-200">
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
      <footer className="border-t border-emerald-100 bg-white/80 py-6 text-center text-xs leading-relaxed text-slate-500">
        <span className="mx-auto block max-w-3xl">{t.footer_line}</span>
      </footer>
    </div>
  );
}
