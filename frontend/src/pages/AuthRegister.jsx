import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserRoundPlus } from "lucide-react";
import { api } from "../api/client";
import { Spinner } from "../components/Spinner";
import { useLang } from "../context/LangContext";

export function AuthRegister() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone_number: "",
    role: "farmer",
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/register", form);
      if (!data.ok || !data.token) throw new Error(data.error || "Register failed");
      localStorage.setItem("fg_token", data.token);
      localStorage.setItem("fg_user", JSON.stringify(data.user));
      navigate("/market");
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message || "Register failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-[2rem] bg-white p-10 shadow-2xl shadow-lime-200 ring-1 ring-lime-100">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-lime-100 text-lime-700 shadow-inner">
          <UserRoundPlus size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-900">{t.nav_register}</h2>
        <p className="text-sm text-slate-600">Separate flows for Maharashtra farmers vs grain/procurement dealers.</p>
      </div>
      <form onSubmit={submit} className="grid gap-4">
        <label className="text-left">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Full name</span>
          <input
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-4 ring-transparent focus:border-lime-500 focus:bg-white focus:ring-lime-50"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </label>
        <label className="text-left">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Phone number</span>
          <input
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-4 ring-transparent focus:border-lime-500 focus:bg-white focus:ring-lime-50"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          />
        </label>
        <label className="text-left">
          <span className="text-xs font-black uppercase text-slate-500">Role</span>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-800 outline-none ring-4 ring-transparent focus:border-lime-500 focus:ring-lime-50"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="farmer">{t.farmer}</option>
            <option value="dealer">{t.dealer}</option>
          </select>
        </label>
        <label className="text-left">
          <span className="text-xs font-black uppercase text-slate-500">Email</span>
          <input
            type="email"
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-4 ring-transparent focus:border-lime-500 focus:bg-white focus:ring-lime-50"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="text-left">
          <span className="text-xs font-black uppercase text-slate-500">Password (min 6)</span>
          <input
            type="password"
            minLength={6}
            required
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-4 ring-transparent focus:border-lime-500 focus:bg-white focus:ring-lime-50"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        {err && <div className="rounded-3xl bg-red-50 px-5 py-3 text-sm font-bold text-red-700">{err}</div>}
        <button className="rounded-2xl bg-gradient-to-r from-emerald-600 to-lime-500 py-4 text-lg font-black text-white shadow-lg shadow-emerald-200 hover:brightness-105">
          Create account
        </button>
      </form>
      <p className="text-center text-xs text-slate-500">
        Already onboard?{" "}
        <Link className="font-bold text-emerald-700 underline" to="/login">
          {t.nav_login}
        </Link>
      </p>
      {busy ? <Spinner /> : null}
    </div>
  );
}
