import React from "react";
import {
  Sparkles,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  Compass,
} from "lucide-react";
import { useAgentGuide } from "../context/AgentGuideContext";
import { useLang } from "../context/LangContext";

export function AgentTourCard() {
  const { lang } = useLang();
  const {
    activeTour,
    currentStep,
    nextStep,
    prevStep,
    endTour,
    isVoiceEnabled,
    setIsVoiceEnabled,
  } = useAgentGuide();

  if (!activeTour) return null;

  const current = activeTour.steps[currentStep];
  const total = activeTour.steps.length;
  const isLast = currentStep === total - 1;

  const tourTitle =
    activeTour.title[lang] || activeTour.title.mr || activeTour.title.en;
  const stepTitle =
    current.title[lang] || current.title.mr || current.title.en;
  const stepDesc =
    current.desc[lang] || current.desc.mr || current.desc.en;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-lg animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-900/95 via-emerald-800/95 to-teal-900/95 p-5 text-white shadow-2xl backdrop-blur-xl ring-4 ring-emerald-500/20">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-400 text-emerald-950 font-bold text-sm shadow-md animate-bounce">
              🤖
            </span>
            <div className="text-left">
              <div className="text-xs font-black uppercase tracking-wider text-lime-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lime-400 animate-ping"></span>
                AI शेतकरी मार्गदर्शक (Live Co-Pilot)
              </div>
              <div className="text-sm font-extrabold text-white truncate max-w-[260px] sm:max-w-xs">
                {tourTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Voice Narration Toggle */}
            <button
              type="button"
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              title={
                isVoiceEnabled
                  ? "आवाज बंद करा (Mute Voice)"
                  : "आवाज चालू करा (Voice Narration)"
              }
              className={`rounded-xl p-2 transition cursor-pointer ${
                isVoiceEnabled
                  ? "bg-lime-400 text-emerald-950 shadow-xs"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Close Tour */}
            <button
              type="button"
              onClick={endTour}
              title="मार्गदर्शन बंद करा (End Tour)"
              className="rounded-xl p-2 text-emerald-200 hover:bg-white/20 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Step Body */}
        <div className="py-4 text-left">
          {/* Step Indicator Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700/70 px-3 py-1 text-[11px] font-bold text-lime-300 border border-emerald-600 mb-2">
            <span>पायरी {currentStep + 1} / {total}</span>
            <div className="flex gap-1 ml-1">
              {activeTour.steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep
                      ? "w-4 bg-lime-400"
                      : idx < currentStep
                      ? "w-1.5 bg-emerald-400"
                      : "w-1.5 bg-emerald-700"
                  }`}
                />
              ))}
            </div>
          </div>

          <h4 className="text-base font-black text-white leading-snug">
            {stepTitle}
          </h4>
          <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/95 leading-relaxed">
            {stepDesc}
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-emerald-700/60 pt-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="inline-flex items-center gap-1 rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft size={15} /> मागे
          </button>

          <div className="text-[11px] text-emerald-300 hidden sm:block">
            स्क्रीनवरील सूचनांचे पालन करा
          </div>

          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-300 px-4 py-2 text-xs font-black text-emerald-950 shadow-lg shadow-lime-400/20 transition hover:brightness-110 cursor-pointer"
          >
            {isLast ? (
              <>
                <CheckCircle2 size={15} />
                समजले, धन्यवाद!
              </>
            ) : (
              <>
                पुढील पायरी <ChevronRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
