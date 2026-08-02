import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRightCircle } from "lucide-react";
import { api } from "../api/client";
import { Spinner } from "../components/Spinner";
import { useLang } from "../context/LangContext";

export function AuthLogin() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/login", form);
      if (!data.ok || !data.token) throw new Error(data.error || "Login failed");
      localStorage.setItem("fg_token", data.token);
      localStorage.setItem("fg_user", JSON.stringify(data.user));
      navigate("/");
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-[2rem] bg-white p-10 shadow-2xl shadow-emerald-200 ring-1 ring-emerald-50">
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900">{t.nav_login}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">{t.login_subtitle}</p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-left">
          <span className="text-xs font-black uppercase text-slate-500">Email</span>
          <input
            type="email"
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold outline-none ring-4 ring-transparent focus:border-emerald-400 focus:bg-white focus:ring-emerald-50"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="block text-left">
          <span className="text-xs font-black uppercase text-slate-500">Password</span>
          <input
            type="password"
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold outline-none ring-4 ring-transparent focus:border-emerald-400 focus:bg-white focus:ring-emerald-50"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        {err && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{err}</div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-lime-500 py-4 text-lg font-black text-white shadow-lg shadow-emerald-200 hover:brightness-105 disabled:opacity-50"
        >
          Enter Farm Genius <ArrowRightCircle />
        </button>
      </form>
      <p className="text-center text-xs text-slate-500">
        New here?{" "}
        <Link className="font-bold text-emerald-700 underline" to="/register">
          {t.nav_register}
        </Link>
      </p>
      {busy ? <Spinner /> : null}
    </div>
  );
}
