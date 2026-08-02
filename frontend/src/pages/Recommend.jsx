import { useState } from "react";

import { Sprout } from "lucide-react";

import { api } from "../api/client";

import { Spinner } from "../components/Spinner";

import { useLang } from "../context/LangContext";

const CITIES = [
  "Pune",

  "Kolhapur",

  "Sangli",

  "Solapur",

  "Satara",
];

export function RecommendPage() {
  const { t, lang } = useLang();
  const parseNumber = (raw, fallback) => {
    const v = Number(raw);
    return Number.isFinite(v) ? v : fallback;
  };

  const [form, setForm] = useState({
    city: "Pune",

    N: 90,

    P: 45,

    K: 60,

    pH: 6.9,

    moisture: 38,
  });

  const [busy, setBusy] = useState(false);

  const [res, setRes] = useState(null);

  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    setBusy(true);

    setErr("");

    try {
      const { data } = await api.post("/recommend-crop", form);

      if (!data.ok) throw new Error(data.error || "Failed");

      setRes(data);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message || "Failed");

      setRes(null);
    } finally {
      setBusy(false);
    }
  };

  const steps = Array.isArray(res?.farming_steps_mr)
    ? res.farming_steps_mr
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-[2rem] bg-white p-8 shadow-2xl shadow-emerald-100 ring-1 ring-emerald-100">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-inner ring-1 ring-emerald-100">
          <Sprout size={28} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {t.nav_recommend}
          </h2>

          <p className="text-sm leading-relaxed text-slate-600">
            {t.recommend_detail}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:col-span-2">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            {t.recommend_city}
          </div>

          <select
            className="mt-2 w-full rounded-2xl border border-transparent bg-white px-3 py-2 text-lg font-semibold outline-none ring-2 ring-transparent focus:border-emerald-400 focus:ring-emerald-200"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {["N", "P", "K", "pH", "moisture"].map((k) => (
          <label
            key={k}
            className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100"
          >
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">
              {k}
            </div>

            <input
              type="number"
              step="any"
              className="mt-2 w-full rounded-2xl border border-transparent bg-white px-3 py-2 text-lg font-semibold outline-none ring-2 ring-transparent focus:border-emerald-400 focus:ring-emerald-200"
              value={form[k]}
              onChange={(e) =>
                setForm({ ...form, [k]: parseNumber(e.target.value, form[k]) })
              }
            />
          </label>
        ))}

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-black text-white shadow-lg shadow-emerald-200 hover:brightness-105"
          >
            {t.recommend_run}
          </button>
        </div>
      </form>

      {err && (
        <div className="rounded-3xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {err}
        </div>
      )}

      {res && (
        <div className="space-y-4 rounded-[1.75rem] bg-gradient-to-br from-white to-emerald-50 p-6 ring-1 ring-emerald-100">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="text-center text-xl font-black text-emerald-800">
              {res.recommended_crop}
            </div>

            {res.weather_live ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                {t.weather_live}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950">
                {t.weather_demo}
              </span>
            )}
          </div>

          <div className="mx-auto mt-4 grid max-w-md gap-2">
            {(res.maharashtra_candidates || []).map((item) => (
              <div
                key={`${item.crop}-${item.probability}`}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner ring-1 ring-slate-100"
              >
                <span>{item.crop}</span>

                <span className="text-emerald-700">
                  {(item.probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 ring-1 ring-emerald-50">
            <div className="text-[11px] font-black uppercase tracking-widest text-emerald-800">
              {t.recommend_steps_title}
            </div>

            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-emerald-950">
              {steps.map((s, i) => (
                <li key={`st-${i}`}>{s}</li>
              ))}
            </ol>
          </div>



    <h3>Recommended Fertilizer</h3>
<p>{res.recommended_fertilizer}</p>

<h3>Organic Solution</h3>
<p>
  {lang === "mr"
    ? res.organic_solution_mr
    : res.organic_solution_en}
</p>
          <div className="text-center text-xs text-slate-600">
            {lang === "mr" ? res.hint_mr : res.hint_en}
          </div>
        </div>
      )}



      {busy ? <Spinner /> : null}

      
    </div>
  );
}
