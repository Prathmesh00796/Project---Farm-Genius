import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Boxes, Droplets, Leaf, Store, TrendingUp, Wind, Volume2, VolumeX } from "lucide-react";
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
    <div className={`flex flex-col rounded-3xl bg-white/95 backdrop-blur-md p-6 shadow-xl shadow-emerald-950/5 ring-1 ring-emerald-200/70 hover:ring-emerald-400 hover:shadow-2xl transition-all duration-300 ${tint}`}>
      <div className="mb-2 flex items-center gap-3.5">
        <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-lime-100 text-emerald-800 shadow-xs ring-1 ring-emerald-200">
          <Icon size={26} strokeWidth={2.2} />
        </span>
        <div className="text-left">
          <div className="text-lg font-black text-slate-900 tracking-tight">{title}</div>
          <div className="text-xs font-medium text-emerald-800/80 mt-0.5">{subtitle}</div>
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
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

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
      {/* Hero Section with Looping Video */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-10 text-white shadow-2xl shadow-emerald-400/30">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Left Hero Content */}
          <div className="space-y-5 text-left lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/25 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-200 backdrop-blur-md ring-1 ring-emerald-300/30">
              <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse"></span>
              {t.hero_badge}
            </div>

            <h1 className="text-balance text-3xl font-black leading-tight sm:text-4xl md:text-[2.65rem]">
              {t.tagline}
            </h1>

            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-emerald-100/95 sm:text-base">
              {t.hero_sub}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/disease"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-emerald-900 shadow-lg hover:bg-emerald-50 transition hover:scale-105"
              >
                <Leaf size={18} className="text-emerald-600" />
                {t.home_leaf}
              </Link>
              <Link
                to="/recommend"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600/40 border border-emerald-300/40 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-600/60 transition backdrop-blur-md"
              >
                <TrendingUp size={18} className="text-lime-300" />
                {t.home_soil}
              </Link>
            </div>
          </div>

          {/* Right Video Container */}
          <div className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-3xl border-2 border-emerald-400/40 bg-black/40 shadow-2xl backdrop-blur-xs aspect-video sm:aspect-[16/10] lg:aspect-square flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
                <source src="/hero-video.mp4" type="video/mp4" />
                <source src="/hero-video.webm" type="video/webm" />
              </video>

              {/* Video Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-emerald-200 backdrop-blur-md border border-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-ping"></span>
                <span>🌾 Farm Genius Live</span>
              </div>

              {/* Mute/Unmute audio button */}
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white/90 backdrop-blur-md transition hover:bg-black/80 hover:text-white cursor-pointer"
                title={isMuted ? "आवाज चालू करा (Unmute)" : "आवाज बंद करा (Mute)"}
              >
                {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
            </div>
          </div>
        </div>
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
        <div className="rounded-3xl bg-white/95 backdrop-blur-md p-6 shadow-xl shadow-emerald-950/5 ring-1 ring-emerald-200/70">
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

        <div className="space-y-4 rounded-3xl bg-white/95 backdrop-blur-md p-6 shadow-xl shadow-emerald-950/5 ring-1 ring-emerald-200/70">
          <div className="text-lg font-black text-slate-900 tracking-tight">{t.nav_dash}</div>
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
