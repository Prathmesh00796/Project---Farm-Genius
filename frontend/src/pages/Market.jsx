import { useEffect, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { api } from "../api/client";
import { Spinner } from "../components/Spinner";
import { useLang } from "../context/LangContext";

const WHITELIST = ["cotton", "sugarcane", "rice", "maize", "wheat", "soybean"];

export function MarketPage() {
  const { t } = useLang();
  const user = JSON.parse(localStorage.getItem("fg_user") || "null");
  const [listings, setListings] = useState([]);
  const [listingLoad, setListingLoad] = useState(false);
  const [form, setForm] = useState({
    crop_name: "rice",
    quantity_kg: 500,
    price_per_kg: 42,
    village_or_town: "",
    district: "",
    notes: "",
  });
  const [msg, setMsg] = useState("");
  const [dealMsg, setDealMsg] = useState("");
  const [dealBusyId, setDealBusyId] = useState(null);

  const load = async () => {
    setListingLoad(true);
    try {
      const { data } = await api.get("/marketplace");
      setListings(data.listings || []);
    } finally {
      setListingLoad(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitListing = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const payload = {
        crop_name: form.crop_name,
        quantity_kg: Number(form.quantity_kg),
        price_per_kg: Number(form.price_per_kg),
        village_or_town: form.village_or_town,
        district: form.district,
        notes: form.notes,
      };
      const { data } = await api.post("/add-crop", payload);
      if (!data.ok) throw new Error(data.error || "Failed");
      setMsg("Listed successfully ✅");
      setForm({ ...form, quantity_kg: 0, notes: "", price_per_kg: form.price_per_kg });
      load();
    } catch (e2) {
      setMsg(String(e2.response?.data?.error || e2.message || "Unable to list crop"));
    }
  };

  const acceptDeal = async (listingId) => {
    setDealMsg("");
    setDealBusyId(listingId);
    try {
      const { data } = await api.post("/accept-deal", { listing_id: listingId });
      if (!data.ok) throw new Error(data.error || "Could not accept");
      const c = data.farmer_contact || {};
      const text = `Deal accepted. Contact farmer: ${c.name || "-"} | ${c.phone_number || "-"} | ${c.email || "-"}`;
      setDealMsg(text);
      await load();
    } catch (e) {
      setDealMsg(String(e.response?.data?.error || e.message || "Could not accept deal"));
    } finally {
      setDealBusyId(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] bg-white p-8 shadow-xl shadow-emerald-100 ring-1 ring-emerald-50">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-50 text-amber-700 shadow-inner ring-1 ring-amber-100">
            <ShoppingBasket size={30} />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-black text-slate-900">{t.nav_market}</h2>
            <p className="text-sm text-slate-600">
              Maharashtra-only SKUs ({WHITELIST.join(", ")}). Farmers post lots; authorised dealers scout fair prices before physical pickup/mandi routes.
            </p>
          </div>
        </div>
      </div>

      {user?.role === "farmer" && (
        <form
          onSubmit={submitListing}
          className="grid gap-4 rounded-[2rem] bg-gradient-to-br from-white to-emerald-50 p-8 shadow-xl ring-1 ring-emerald-100 md:grid-cols-2"
        >
          <div className="md:col-span-2 flex items-center justify-between gap-4">
            <div className="text-lg font-extrabold text-emerald-900">{t.add_listing}</div>
            <select
              className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-900"
              value={form.crop_name}
              onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
            >
              {WHITELIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label className="rounded-3xl bg-white p-4 shadow-inner ring-1 ring-emerald-100">
            <div className="text-xs font-semibold uppercase text-slate-500">Qty (kg)</div>
            <input
              type="number"
              className="mt-2 w-full rounded-2xl border border-transparent bg-slate-50 px-3 py-2 text-lg font-bold outline-none focus:border-emerald-400"
              value={form.quantity_kg}
              onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
            />
          </label>
          <label className="rounded-3xl bg-white p-4 shadow-inner ring-1 ring-emerald-100">
            <div className="text-xs font-semibold uppercase text-slate-500">₹ / kg</div>
            <input
              type="number"
              className="mt-2 w-full rounded-2xl border border-transparent bg-slate-50 px-3 py-2 text-lg font-bold outline-none focus:border-emerald-400"
              value={form.price_per_kg}
              onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })}
            />
          </label>
          <label className="rounded-3xl bg-white p-4 shadow-inner ring-1 ring-emerald-100">
            <div className="text-xs font-semibold uppercase text-slate-500">Taluka/Village</div>
            <input
              className="mt-2 w-full rounded-2xl border border-transparent bg-slate-50 px-3 py-2 outline-none focus:border-emerald-400"
              value={form.village_or_town}
              onChange={(e) => setForm({ ...form, village_or_town: e.target.value })}
            />
          </label>
          <label className="rounded-3xl bg-white p-4 shadow-inner ring-1 ring-emerald-100">
            <div className="text-xs font-semibold uppercase text-slate-500">District</div>
            <input
              className="mt-2 w-full rounded-2xl border border-transparent bg-slate-50 px-3 py-2 outline-none focus:border-emerald-400"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />
          </label>
          <label className="md:col-span-2 rounded-3xl bg-white p-4 shadow-inner ring-1 ring-emerald-100">
            <div className="text-xs font-semibold uppercase text-slate-500">Lot notes · grade / moisture</div>
            <textarea
              rows={2}
              className="mt-2 w-full rounded-2xl border border-transparent bg-slate-50 px-3 py-2 outline-none focus:border-emerald-400"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <button className="md:col-span-2 rounded-2xl bg-emerald-600 py-3 text-lg font-black text-white shadow-lg shadow-emerald-200 hover:brightness-105">
            Publish listing
          </button>
          {msg && (
            <div className="md:col-span-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800">
              {msg}
            </div>
          )}
        </form>
      )}

      {user?.role === "dealer" && (
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-center text-sm font-semibold text-slate-600 shadow-inner">
          {t.buy_notice}
        </div>
      )}
      {dealMsg && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center text-sm font-semibold text-emerald-900">
          {dealMsg}
        </div>
      )}

      {!user && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm font-semibold text-amber-900">
          Log in as a farmer to publish lots. Dealers browse freely.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {(listings || []).map((it) => (
          <article
            key={it.id}
            className="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xl shadow-emerald-100 ring-1 ring-emerald-100"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white">
                  {String(it.crop_name || "").toUpperCase()}
                </div>
                <div className="mt-4 text-xl font-black text-slate-900">{it.farmer_name}</div>
                <div className="text-xs font-semibold text-slate-500">{it.farmer_email}</div>
              </div>
              <div className="text-right text-sm font-semibold text-slate-500">
                {new Date(it.created_at || Date.now()).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm font-semibold text-slate-700">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                Quantity
                <div className="text-lg font-black text-emerald-800">{Number(it.quantity_kg).toFixed(1)} kg</div>
              </div>
              <div className="rounded-2xl bg-lime-50 px-4 py-3 ring-1 ring-lime-100">
                ₹/kg ask
                <div className="text-lg font-black text-emerald-900">{Number(it.price_per_kg).toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">{it.village_or_town} · {it.district}</div>
            {it.notes && (
              <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-100">{it.notes}</p>
            )}
            <button
              type="button"
              disabled={dealBusyId === it.id}
              className="mt-6 w-full rounded-2xl border border-emerald-200 bg-white py-3 text-center text-sm font-black text-emerald-800 hover:border-emerald-400"
              onClick={() => {
                if (user?.role !== "dealer") {
                  setDealMsg("Login as dealer to accept deal and view contact details.");
                  return;
                }
                acceptDeal(it.id);
              }}
            >
              {dealBusyId === it.id ? "Accepting..." : "Interest / Buy"}
            </button>
          </article>
        ))}
      </div>
      {!listings?.length && !listingLoad && (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-14 text-center text-sm text-slate-500">
          No batches yet · farmers can seed the marketplace from this page.
        </div>
      )}
      {listingLoad ? (
        <div className="fixed bottom-8 right-8 flex items-center gap-3 rounded-full bg-white px-5 py-2 text-xs font-bold text-emerald-800 shadow-xl ring-1 ring-emerald-100">
          <Spinner inline />
          Syncing marketplace…
        </div>
      ) : null}
    </div>
  );
}
