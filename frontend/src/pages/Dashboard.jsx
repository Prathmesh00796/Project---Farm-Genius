import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Droplets, Leaf, Store, TrendingUp, Wind } from "lucide-react";
import { api } from "../api/client";
import { useLang } from "../context/LangContext";

const CITIES = [
  "Pune",
  "Nagpur",
  "Nashik",
  "Chhatrapati Sambhajinagar",
  "Kolhapur",
  "Sangli",
  "Ahilyanagar",
  "Solapur",
  "Jalgaon",
];

function Card({ icon: Icon, title, subtitle, tint, href }) {
  const body = (
    <div className={`flex flex-col rounded-3xl bg-white p-5 shadow-xl shadow-emerald-100/60 ring-1 ring-emerald-100 ${tint}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Icon size={24} strokeWidth={2} />
        </span>
        <div className="text-left">
          <div className="text-lg font-extrabold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600">{subtitle}</div>
        </div>
      </div>
    </div>
  );
  return href ? <Link to={href}>{body}</Link> : body;
}

export function Dashboard() {
  const { t, lang } = useLang();
  const [city, setCity] = useState(CITIES[0]);
  const [wx, setWx] = useState(null);
  const [wxErr, setWxErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setWxErr("");
      try {
        const { data } = await api.get("/weather", { params: { city } });
        if (!data.ok) throw new Error("Weather failed");
        setWx(data);
      } catch (e) {
        setWxErr(e.message || "Weather error");
        setWx(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [city]);

  const data = wx?.mock ? wx.data : wx;

  const tipText =
    lang === "mr"
      ? data?.farmer_tip_mr || data?.farmer_tip_en || ""
      : data?.farmer_tip_en || data?.farmer_tip_mr || "";

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-emerald-500 to-teal-500 px-6 py-10 text-left text-white shadow-2xl shadow-emerald-300/60 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-100">{t.hero_badge}</p>
        <h1 className="mt-3 text-balance text-3xl font-black leading-snug sm:text-4xl md:text-[2.85rem]">
          {t.tagline}
        </h1>
        <p className="mt-5 max-w-3xl text-pretty text-sm leading-relaxed text-emerald-50/98 sm:text-base">
          {t.hero_sub}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          icon={Leaf}
          href="/disease"
          title={t.home_leaf}
          subtitle={t.home_leaf_hint}
          tint="hover:-translate-y-1 transition hover:shadow-xl"
        />
        <Card
          icon={TrendingUp}
          href="/recommend"
          title={t.home_soil}
          subtitle={t.home_soil_hint}
          tint="hover:-translate-y-1 transition hover:shadow-xl"
        />
        <Card
          icon={Boxes}
          href="/yield"
          title={t.home_yield}
          subtitle={t.home_yield_hint}
          tint="hover:-translate-y-1 transition hover:shadow-xl"
        />
        <Card
          icon={Store}
          href="/market"
          title={t.home_market}
          subtitle={t.home_market_hint}
          tint="hover:-translate-y-1 transition hover:shadow-xl md:col-span-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-sky-100/80 ring-1 ring-sky-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Droplets className="text-sky-500" />
              <div>
                <div className="text-lg font-extrabold">{t.weather_title}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.city}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data?.live === true ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-800">
                  {t.weather_live}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-900">
                  {t.weather_demo}
                </span>
              )}
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 shadow-inner"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">{t.weather_loading}</div>
          ) : wxErr ? (
            <div className="py-16 text-center text-sm text-red-600">{wxErr}</div>
          ) : data ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-sky-600">°C</div>
                  <div className="text-3xl font-black text-slate-900">
                    {data.temperature_c ?? "–"}°C
                  </div>
                  <div className="text-sm text-slate-600">{data.description}</div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-white p-4 ring-1 ring-violet-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
                    {t.weather_feels}
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {data.feels_like_c ?? data.temperature_c ?? "–"}°C
                  </div>
                  <div className="text-xs text-slate-500">
                    {data.temp_min_c != null && data.temp_max_c != null
                      ? `${data.temp_min_c}–${data.temp_max_c} °C`
                      : ""}
                  </div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-4 ring-1 ring-emerald-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    {t.weather_humidity}
                  </div>
                  <div className="text-3xl font-black text-slate-900">{data.humidity_percent ?? "–"}%</div>
                  <div className="text-xs text-slate-500">
                    {data.pressure_hpa != null ? `${data.pressure_hpa} hPa` : ""}
                  </div>
                </div>
                <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Wind className="text-slate-500" size={22} />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {t.weather_wind}
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {data.wind_speed_ms ?? "–"} m/s
                      </div>
                    </div>
                  </div>
                  {data.cloudiness_percent != null && (
                    <div className="mt-2 text-xs text-slate-500">Clouds ~ {data.cloudiness_percent}%</div>
                  )}
                </div>
              </div>

              {tipText && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm leading-relaxed text-emerald-950">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    {t.weather_advice_label}
                  </div>
                  {tipText}
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">{t.weather_rain}</div>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 text-center text-sm">
                  {(data.rain_forecast_daily_mm || []).map((r, i) => (
                    <div key={`d-${i}`} className="rounded-xl bg-white p-3 shadow-inner ring-1 ring-slate-100">
                      <div className="text-[10px] text-slate-400">+{i + 1}d</div>
                      <div className="text-lg font-extrabold text-sky-700">{r ?? 0}</div>
                      <div className="text-[9px] text-slate-500">mm</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-3xl bg-gradient-to-br from-lime-50 via-white to-amber-50 p-6 shadow-xl ring-1 ring-lime-100">
          <div className="text-lg font-extrabold text-slate-900">{t.nav_dash}</div>
          <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              {t.dash_remind_1}
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              {t.dash_remind_2}
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
              {t.dash_remind_3}
            </li>
          </ul>
          <p className="rounded-2xl bg-white/90 p-4 text-xs text-slate-600 ring-1 ring-lime-100">{t.disease_note_jargon}</p>
        </div>
      </div>
    </div>
  );
}
