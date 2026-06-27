import { useState } from "react";

import { Boxes } from "lucide-react";

import { api } from "../api/client";

import { Spinner } from "../components/Spinner";

import { useLang } from "../context/LangContext";

const CROPS = ["Cotton", "Sugarcane", "Rice", "Maize", "Wheat", "Soybean"];

export function YieldPage() {
  const { t, lang } = useLang();
  const parseNumber = (raw, fallback) => {
    const v = Number(raw);
    return Number.isFinite(v) ? v : fallback;
  };

  const [form, setForm] = useState({
    crop: "Cotton",

    N: 95,

    P: 52,

    K: 60,

    pH: 7.2,

    rain_mm: 950,

    area_ha: 2,
  });

  const [busy, setBusy] = useState(false);

  const [res, setRes] = useState(null);

  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    setBusy(true);

    setErr("");

    try {
      const { data } = await api.post("/predict-yield", form);

      if (!data.ok) throw new Error(data.error || "Failed");

      setRes(data);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message || "Failed");

      setRes(null);
    } finally {
      setBusy(false);
    }
  };

  const fmtInr = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",

          currency: "INR",

          maximumFractionDigits: 0,
        }).format(n)
      : "";


  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-[2rem] bg-white p-8 shadow-2xl shadow-lime-100 ring-1 ring-lime-100">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-50 text-lime-700 shadow-inner ring-1 ring-lime-100">
          <Boxes size={28} />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">{t.nav_yield}</h2>

          <p className="text-sm leading-relaxed text-slate-600">
            {t.yield_detail}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            {t.yield_crop_label}
          </div>

          <select
            className="mt-2 w-full rounded-2xl border border-transparent bg-white px-3 py-2 text-lg font-semibold outline-none ring-2 ring-transparent focus:border-lime-500 focus:ring-lime-200"
            value={form.crop}
            onChange={(e) => setForm({ ...form, crop: e.target.value })}
          >
            {CROPS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        {[
          ["N", "N"],

          ["P", "P"],

          ["K", "K"],

          ["pH", "pH"],

          [
            "rain_mm",
            lang === "mr" ? "पाऊस (मिमी, हंगाम)" : "Season rain (mm)",
          ],

          ["area_ha", lang === "mr" ? "क्षेत्र (हेक्टर)" : "Area (ha)"],
        ].map(([k, label]) => (
          <label
            key={k}
            className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100"
          >
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">
              {label}
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
          <button className="w-full rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-600 py-4 text-lg font-black text-white shadow-lg shadow-emerald-200 hover:brightness-105">
            {t.yield_run}
          </button>
        </div>
      </form>

      {err && (
        <div className="rounded-3xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {err}
        </div>
      )}

      {res && (
  <div className="space-y-6 rounded-3xl bg-gradient-to-br from-white to-emerald-50 p-8 ring-2 ring-emerald-100 shadow-inner">

    <div className="text-center">
      <div className="text-xs font-black uppercase tracking-widest text-emerald-600">
        Prediction Result
      </div>

      <div className="mt-2 text-lg font-semibold text-slate-900">
        Crop · <span className="font-black text-emerald-800">{res.crop}</span>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">

      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-emerald-100">
        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
          Yield / Hectare
        </div>

        <div className="mt-2 text-3xl font-black text-emerald-700">
          {res.yield_quintals_per_hectare}
        </div>

        <div className="text-xs text-slate-500">
          Quintal / Ha
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-emerald-100">
        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
          Total Production
        </div>

        <div className="mt-2 text-3xl font-black text-teal-700">
          {res.estimated_total_quintals_for_farm}
        </div>

        <div className="text-xs text-slate-500">
          {res.estimated_total_kg_for_farm} kg
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-blue-100">
        <div className="text-xs font-black uppercase tracking-widest text-blue-700">
          Market Price
        </div>

        <div className="mt-2 text-3xl font-black text-blue-700">
          {fmtInr(res.market_price?.average_price_per_kg)}
        </div>

        <div className="text-xs text-slate-500">
          Average / Kg
        </div>
      </div>

    </div>

    <div className="grid gap-4 sm:grid-cols-3">

      <div className="rounded-2xl bg-green-50 p-5 text-center">
        <div className="text-xs font-black uppercase tracking-widest text-green-700">
          Gross Income
        </div>

        <div className="mt-2 text-2xl font-black text-green-800">
          {fmtInr(res.gross_income)}
        </div>
      </div>

      <div className="rounded-2xl bg-orange-50 p-5 text-center">
        <div className="text-xs font-black uppercase tracking-widest text-orange-700">
          Tractor Cost
        </div>

        <div className="mt-2 text-2xl font-black text-orange-800">
          {fmtInr(res.tractor_cost)}
        </div>
      </div>

      <div className="rounded-2xl bg-red-50 p-5 text-center">
        <div className="text-xs font-black uppercase tracking-widest text-red-700">
          Labour Cost
        </div>

        <div className="mt-2 text-2xl font-black text-red-800">
          {fmtInr(res.labour_cost)}
        </div>
      </div>

    </div>

    <div className="rounded-3xl bg-gradient-to-r from-emerald-500 to-green-600 p-8 text-center text-white">

      <div className="text-sm font-black uppercase tracking-widest">
        Estimated Net Profit
      </div>

      <div className="mt-3 text-5xl font-black">
        {fmtInr(res.estimated_net_profit)}
      </div>

    </div>

  </div>
)}

      {busy ? <Spinner /> : null}
    </div>
  );
}
