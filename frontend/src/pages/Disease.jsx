import { useRef, useState } from "react";
import { ImagePlus, Leaf, FlaskConical, Sprout } from "lucide-react";
import { api } from "../api/client";
import { ConfidenceBar } from "../components/ConfidenceBar";
import { Spinner } from "../components/Spinner";
import { useLang } from "../context/LangContext";

const CROPS = ["Cotton", "Sugarcane", "Rice", "Maize", "Wheat", "Soybean"];

function SectionCard({ icon: Icon, title, children, tone }) {
  const ring =
    tone === "organic"
      ? "ring-green-100 bg-green-50/60"
      : tone === "chemical"
        ? "ring-amber-100 bg-amber-50/50"
        : tone === "now"
          ? "ring-sky-100 bg-sky-50/60"
          : "ring-slate-100 bg-white";
  return (
    <div className={`rounded-3xl p-5 shadow-inner ${ring} ring-1`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-600">
        {Icon ? <Icon size={18} className="text-emerald-700" /> : null}
        {title}
      </div>
      <div className="text-sm leading-relaxed text-slate-800">{children}</div>
    </div>
  );
}

export function DiseasePage() {
  const { lang, t } = useLang();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  const [cropPick, setCropPick] = useState("");

  const onPick = (e) => {
    const f = e.target.files?.[0];
    setErr("");
    setRes(null);
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const predict = async () => {
    if (!cropPick) {
      setErr(lang === "mr" ? "आधी तुमचे पीक निवडा — भात/ऊस/कापूस इत्यादी एकमेकांशी गोंधळ होणार नाही." : "Pick your crop first so rice, sugarcane, cotton, etc. are not mixed up.");
      return;
    }
    if (!file) {
      setErr(lang === "mr" ? "आधी फोटो निवडा" : "Choose a photo first");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("crop", cropPick);
      // Never set Content-Type manually for FormData — axios must add the boundary or Flask drops fields like `crop`.
      const { data } = await api.post("/predict-disease", fd, {
        params: { lang, crop: cropPick },
      });
      if (!data.ok) throw new Error((lang === "mr" ? data.error_mr : null) || data.error || "Prediction failed");
      setRes(data);
    } catch (e) {
      const d = e.response?.data;
      setErr((lang === "mr" ? d?.error_mr : null) || d?.error || e.message || "Prediction failed");
    } finally {
      setBusy(false);
    }
  };

  const titleMain =
    res &&
    (lang === "mr"
      ? res.disease_mr || res.disease_en || res.disease
      : res.disease_en || res.disease_mr || res.disease);
  const organic = lang === "mr" ? res?.organic_mr : res?.organic_en;
  const chemical = lang === "mr" ? res?.inorganic_mr : res?.inorganic_en;
  const now = lang === "mr" ? res?.immediate_mr : res?.immediate_en;
  const summary = lang === "mr" ? res?.summary_mr : res?.summary_en;
  const accNote = lang === "mr" ? res?.accuracy_note_mr : res?.accuracy_note_en;
  const improve = lang === "mr" ? res?.how_to_improve_accuracy_mr : res?.how_to_improve_accuracy_en;
  const lowWarn = lang === "mr" ? res?.low_confidence_warning_mr : res?.low_confidence_warning_en;
  const cropFocusNote = lang === "mr" ? res?.crop_focus_note_mr : res?.crop_focus_note_en;
  const topPred = Array.isArray(res?.top_predictions) ? res.top_predictions : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,1.05fr]">
      <div className="space-y-4 rounded-[2rem] bg-white p-8 shadow-xl shadow-emerald-100 ring-1 ring-emerald-100">
        <h2 className="text-left text-2xl font-black text-slate-900">{t.nav_disease}</h2>
        <p className="text-left text-sm text-slate-600">{t.upload_hint}</p>

        <label className="block rounded-3xl bg-emerald-50/80 p-4 ring-1 ring-emerald-100">
          <div className="text-xs font-black uppercase tracking-widest text-emerald-800">{t.disease_crop_label}</div>
          <select
            className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2.5 text-base font-bold text-slate-900 outline-none ring-2 ring-transparent focus:border-emerald-500 focus:ring-emerald-100"
            value={cropPick}
            onChange={(e) => {
              setCropPick(e.target.value);
              setErr("");
            }}
          >
            <option value="">{t.disease_crop_placeholder}</option>
            {CROPS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-2 text-left text-xs leading-relaxed text-emerald-900/85">{t.disease_crop_hint}</p>
        </label>

        <div
          role="presentation"
          onClick={() => inputRef.current?.click()}
          className="group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 px-8 py-12 text-center transition hover:border-emerald-500 hover:bg-emerald-50"
        >
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
          <ImagePlus className="mb-3 text-emerald-600 transition group-hover:scale-105" />
          <div className="text-sm font-bold text-emerald-900">
            {lang === "mr" ? "फोटो टॅप करून निवडा" : "Tap to choose a photo"}
          </div>
        </div>

        {preview && (
          <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-100">
            <img src={preview} alt="preview" className="mx-auto max-h-72 w-full object-contain sm:max-h-80" />
          </div>
        )}

        <button
          type="button"
          onClick={predict}
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-lime-500 py-3 text-center text-lg font-black text-white shadow-lg shadow-emerald-200 hover:brightness-105 disabled:opacity-50"
        >
          {busy ? t.loading : t.predict}
        </button>

        {err && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
            {String(err)}
          </div>
        )}

        <p className="text-left text-xs leading-relaxed text-slate-500">{t.disease_note_jargon}</p>
      </div>

      <div className="space-y-4">
        {!res ? (
          <div className="rounded-[2rem] bg-slate-50 p-8 text-center text-sm text-slate-500 shadow-inner ring-1 ring-slate-100">
            {lang === "mr"
              ? "फोटो अपलोड केल्यावर येथे रोगाचे नाव आतील — जैविक, रासायनिक आणि तात्काळ पावले वेगळे दाखवू."
              : "After upload you will see the disease name plus organic vs chemical pathways and urgent steps."}
          </div>
        ) : (
          <div className="space-y-4 rounded-[2rem] bg-white p-7 shadow-2xl shadow-emerald-200/60 ring-1 ring-emerald-100 sm:p-8">
            {accNote && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
                {accNote}
              </div>
            )}

            {lowWarn && (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-relaxed text-red-950">
                <span className="mr-2 rounded-md bg-red-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-900">
                  {t.low_confidence_banner}
                </span>
                {lowWarn}
              </div>
            )}

            {cropFocusNote && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-950">
                {cropFocusNote}
              </div>
            )}

            <div className="text-left">
              <div className="flex items-start gap-2">
                <Leaf className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                    {lang === "mr" ? "ग्रामीण भाषेत निदान" : "Diagnosis headline"}
                  </div>
                  <div className="mt-2 text-pretty text-2xl font-black text-slate-900">{titleMain}</div>
                  {lang === "mr" && res.disease_en && res.disease_en !== titleMain && (
                    <div className="mt-2 text-xs text-slate-500">({res.disease_en})</div>
                  )}
                  {lang === "en" && res.disease_mr && (
                    <div className="mt-2 text-xs font-medium text-slate-600">{res.disease_mr}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-white to-emerald-50 p-5 ring-1 ring-emerald-100">
              <ConfidenceBar value={res.confidence} label={t.conf_bar} />
            </div>

            <SectionCard icon={Sprout} title={t.section_summary}>
              <p>{summary || res.treatment || (lang === "mr" ? "सारांश उपलब्ध नाही — खालील उपाय बघा." : "No summary — see steps below.")}</p>
            </SectionCard>

            <SectionCard icon={Sprout} title={t.section_organic} tone="organic">
              {organic || (lang === "mr" ? "जैविक उपाय लोड होत नाहीत — पृष्ठ रिफ्रेश करून पुन्हा प्रयत्न करा." : "Organic advice missing — refresh and retry.")}
            </SectionCard>
            <SectionCard icon={FlaskConical} title={t.section_chemical} tone="chemical">
              {chemical ||
                (lang === "mr"
                  ? "रासायनिक मार्गदर्शन लोड होत नाही — केव्हीकेला विचारा."
                  : "Chemical guidance missing — ask KVK.")}
            </SectionCard>
            <SectionCard title={t.section_now} tone="now">
              {now ||
                (lang === "mr"
                  ? "१) आजच नमुना घेऊन केव्हीकेला दाखवा। २) स्पष्ट फोटो पुन्हा घ्या।"
                  : "1) Take samples to KVK today. 2) Retake a sharp photo.")}
            </SectionCard>

            {topPred.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-600">{t.top_three_title}</div>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">
                  {topPred.map((row) => (
                    <li key={row.class_key}>
                      <span className="font-bold">{lang === "mr" ? row.title_mr : row.title_en}</span>
                      <span className="text-slate-500"> — {row.confidence}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {improve && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm leading-relaxed text-sky-950">
                <div className="mb-1 text-[11px] font-black uppercase tracking-widest text-sky-800">{t.improve_title}</div>
                {improve}
              </div>
            )}

            {res.alternate && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.section_second}</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {lang === "mr" ? res.alternate.title_mr : res.alternate.title_en} — {res.alternate.confidence}%
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {busy ? <Spinner /> : null}
    </div>
  );
}
