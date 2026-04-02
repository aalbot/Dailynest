import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ref as dbRef, get, set, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Palette,
  ImageIcon,
  Hash,
  Lock,
  Type,
} from "lucide-react";

const DEFAULT_HEADLINE = "Get Fresh Grocery";
const DEFAULT_BG = "#ff4d4d";
const DEFAULT_ASSET = "#facc15";
const DEFAULT_TEXT = "#ffffff";
const PLACEHOLDER_IMG = "https://via.placeholder.com/100?text=Icon";

/** Each banner slot lives at `root/ads/{index}` (index is the display slot key). */
export const bannerAdsSlotPath = (index: number) => `root/ads/${index}`;

const STORAGE_ADS_PREFIX = "root/ads";

export type BannerAdPayload = {
  headline: string;
  bgColor: string;
  assetColor: string;
  /** Headline / primary text on the banner card */
  textColor: string;
  imageUrl: string;
  index: number;
  updatedAt: number;
};

type BannerVariant = "wide" | "medium" | "compact";
type PreviewDevice = "desktop" | "tablet" | "mobile";

const SLOT_PRESETS = [0, 1, 2, 3, 4, 5];
const DEBOUNCE_MS = 650;

function LiveBanner({
  headline,
  bgColor,
  assetColor,
  textColor,
  imageSrc,
  variant,
}: {
  headline: string;
  bgColor: string;
  assetColor: string;
  textColor: string;
  imageSrc: string;
  variant: BannerVariant;
}) {
  const text = headline.trim() || DEFAULT_HEADLINE;
  const titleStyle = { color: textColor } as const;

  if (variant === "wide") {
    return (
      <div
        className="relative flex flex-row items-center justify-between gap-4 overflow-hidden rounded-2xl px-6 py-5 shadow-inner sm:px-8 sm:py-6"
        style={{ backgroundColor: bgColor }}
      >
        <div className="z-[2] min-w-0 flex-1">
          <p
            className="text-xl font-extrabold leading-tight tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] sm:text-2xl md:text-3xl"
            style={titleStyle}
          >
            {text}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-white px-4 py-1.5 text-xs font-extrabold text-emerald-600 shadow-sm sm:text-sm">
            BUY NOW
          </span>
        </div>
        <div
          className="z-[1] flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl shadow-md sm:h-24 sm:w-24"
          style={{ backgroundColor: assetColor }}
        >
          <img src={imageSrc} alt="" className="h-[85%] w-[85%] rounded-xl object-contain" key={imageSrc} />
        </div>
      </div>
    );
  }

  if (variant === "medium") {
    return (
      <div
        className="relative flex flex-row items-center justify-between gap-3 overflow-hidden rounded-[22px] px-5 py-4"
        style={{ backgroundColor: bgColor }}
      >
        <div className="z-[2] min-w-0 flex-1">
          <p
            className="text-base font-extrabold leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] sm:text-lg"
            style={titleStyle}
          >
            {text}
          </p>
          <span className="mt-2.5 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-emerald-600">
            BUY NOW
          </span>
        </div>
        <div
          className="z-[1] flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: assetColor }}
        >
          <img src={imageSrc} alt="" className="h-[82%] w-[82%] rounded-[14px] object-contain" key={imageSrc} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto flex min-h-[88px] flex-col justify-center overflow-hidden rounded-[22px] px-4 py-3"
      style={{ backgroundColor: bgColor }}
    >
      <p
        className="z-[2] w-[58%] pr-1 text-[15px] font-extrabold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        style={titleStyle}
      >
        {text}
      </p>
      <span className="z-[2] mt-2.5 inline-flex w-fit rounded-full bg-white px-3 py-1 text-[10px] font-extrabold text-emerald-500">
        BUY NOW
      </span>
      <div
        className="absolute right-2 top-1/2 z-[1] flex h-[68px] w-[68px] -translate-y-1/2 items-center justify-center rounded-[16px]"
        style={{ backgroundColor: assetColor }}
      >
        <img src={imageSrc} alt="" className="h-[88%] w-[88%] rounded-[14px] object-contain" key={imageSrc} />
      </div>
    </div>
  );
}

const DEVICE_PREVIEW_OPTIONS: { id: PreviewDevice; icon: typeof Monitor; title: string }[] = [
  { id: "desktop", icon: Monitor, title: "Desktop" },
  { id: "tablet", icon: Tablet, title: "Tablet" },
  { id: "mobile", icon: Smartphone, title: "Mobile" },
];

function applyPayloadToForm(
  data: Partial<BannerAdPayload> | null,
  setters: {
    setHeadline: (v: string) => void;
    setBgColor: (v: string) => void;
    setAssetColor: (v: string) => void;
    setTextColor: (v: string) => void;
    setPreviewImageSrc: (v: string) => void;
    setPersistedImageUrl: (v: string | null) => void;
  }
) {
  if (!data || typeof data !== "object") {
    setters.setHeadline(DEFAULT_HEADLINE);
    setters.setBgColor(DEFAULT_BG);
    setters.setAssetColor(DEFAULT_ASSET);
    setters.setTextColor(DEFAULT_TEXT);
    setters.setPreviewImageSrc(PLACEHOLDER_IMG);
    setters.setPersistedImageUrl(null);
    return;
  }
  setters.setHeadline(typeof data.headline === "string" ? data.headline : DEFAULT_HEADLINE);
  setters.setBgColor(typeof data.bgColor === "string" ? data.bgColor : DEFAULT_BG);
  setters.setAssetColor(typeof data.assetColor === "string" ? data.assetColor : DEFAULT_ASSET);
  setters.setTextColor(typeof data.textColor === "string" ? data.textColor : DEFAULT_TEXT);
  if (typeof data.imageUrl === "string" && data.imageUrl.length > 0) {
    setters.setPersistedImageUrl(data.imageUrl);
    setters.setPreviewImageSrc(data.imageUrl);
  } else {
    setters.setPersistedImageUrl(null);
    setters.setPreviewImageSrc(PLACEHOLDER_IMG);
  }
}

const BannerManage = () => {
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE);
  const [bgColor, setBgColor] = useState(DEFAULT_BG);
  const [assetColor, setAssetColor] = useState(DEFAULT_ASSET);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT);
  const [displayIndex, setDisplayIndex] = useState(1);
  const [slotHasSavedData, setSlotHasSavedData] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState(PLACEHOLDER_IMG);
  const [persistedImageUrl, setPersistedImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activePreview, setActivePreview] = useState<PreviewDevice>("desktop");
  const previewBlobRef = useRef<string | null>(null);

  const revokePreviewBlob = useCallback(() => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
  }, []);

  const loadSlot = useCallback(async (index: number) => {
    const snap = await get(dbRef(db, bannerAdsSlotPath(index)));
    const raw = snap.val() as Partial<BannerAdPayload> | null;
    const hasData =
      raw != null &&
      typeof raw === "object" &&
      Object.keys(raw).length > 0 &&
      Boolean(raw.headline || raw.imageUrl || raw.bgColor || raw.updatedAt);
    setSlotHasSavedData(hasData);
    applyPayloadToForm(hasData ? raw : null, {
      setHeadline,
      setBgColor,
      setAssetColor,
      setTextColor,
      setPreviewImageSrc,
      setPersistedImageUrl,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSlotLoading(true);
      revokePreviewBlob();
      setFile(null);
      try {
        await loadSlot(displayIndex);
      } catch (e) {
        console.error(e);
        if (!cancelled) toast.error("Could not load this banner slot");
      } finally {
        if (!cancelled) {
          setSlotLoading(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [displayIndex, loadSlot, revokePreviewBlob]);

  useEffect(() => {
    return () => revokePreviewBlob();
  }, [revokePreviewBlob]);

  /* Debounced merge into root/ads/{displayIndex} */
  useEffect(() => {
    if (loading || slotLoading) return;

    const t = setTimeout(async () => {
      try {
        const path = bannerAdsSlotPath(displayIndex);
        const patch: Record<string, string | number> = {
          headline: headline.trim() || DEFAULT_HEADLINE,
          bgColor,
          assetColor,
          textColor,
          index: displayIndex,
          updatedAt: Date.now(),
        };
        if (persistedImageUrl) patch.imageUrl = persistedImageUrl;

        await update(dbRef(db, path), patch);
        setSlotHasSavedData(true);
      } catch (e) {
        console.error(e);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [headline, bgColor, assetColor, textColor, displayIndex, persistedImageUrl, loading, slotLoading]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    revokePreviewBlob();
    const url = URL.createObjectURL(f);
    previewBlobRef.current = url;
    setFile(f);
    setPreviewImageSrc(url);
  };

  const handlePublish = async () => {
    const trimmed = headline.trim();
    if (!trimmed) {
      toast.error("Please enter a headline");
      return;
    }
    if (!file && !persistedImageUrl) {
      toast.error("Please choose a banner image");
      return;
    }

    setPublishing(true);
    try {
      let imageUrl = persistedImageUrl || "";
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const cleanName = trimmed.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "banner";
        const path = `${STORAGE_ADS_PREFIX}/slot_${displayIndex}/${cleanName}.${ext}`;
        const sRef = storageRef(storage, path);
        const snapshot = await uploadBytes(sRef, file);
        imageUrl = await getDownloadURL(snapshot.ref);
        setPersistedImageUrl(imageUrl);
        setFile(null);
      }

      const payload: BannerAdPayload = {
        headline: trimmed,
        bgColor,
        assetColor,
        textColor,
        imageUrl,
        index: Number.isFinite(displayIndex) ? displayIndex : 1,
        updatedAt: Date.now(),
      };

      await set(dbRef(db, bannerAdsSlotPath(displayIndex)), payload);
      setPreviewImageSrc(imageUrl);
      setSlotHasSavedData(true);
      revokePreviewBlob();
      toast.success(`Banner saved to root/ads/${displayIndex}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const bannerProps = {
    headline,
    bgColor,
    assetColor,
    textColor,
    imageSrc: previewImageSrc,
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 font-sans dark:from-[#050a08] dark:via-[#0a0f0d] dark:to-[#0c1814]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-30%,rgba(16,185,129,0.18),transparent)] dark:bg-[radial-gradient(ellipse_100%_60%_at_50%_-30%,rgba(16,185,129,0.14),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M36 0L36 72M0 36L72 36' stroke='%230f4c3a' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="mb-10">
          <BackButton />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-1.5 text-xs font-bold text-emerald-900 shadow-sm dark:border-emerald-800/50 dark:from-emerald-950/80 dark:to-teal-950/80 dark:text-emerald-200">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Daily Club · Banner studio
          </div>
          <h1 className="mt-4 max-w-xl text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            <span className="bg-gradient-to-r from-emerald-800 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-teal-300 dark:to-cyan-300">
              Design &amp; deploy
            </span>
            <br />
            <span className="text-slate-800 dark:text-slate-100">in every size</span>
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/60 bg-white/70 py-32 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Opening banner studio…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 xl:grid-cols-12 xl:gap-12">
            <aside className="xl:col-span-4">
              <div className="sticky top-28 space-y-6 overflow-hidden rounded-[1.75rem] border border-slate-200/60 bg-white/95 p-6 shadow-[0_25px_50px_-12px_rgba(15,76,58,0.12)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/95 dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] sm:p-7">
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/20 to-transparent blur-2xl" />
                <div className="relative flex items-center gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30">
                    <Palette className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Creative controls</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Slot {displayIndex}</p>
                  </div>
                </div>

                <div className="relative space-y-5">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Banner slot (index)</Label>
                    <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      Data path:{" "}
                      <code className="rounded bg-slate-100 px-1 font-mono text-[10px] dark:bg-slate-800">
                        root/ads/{displayIndex}
                      </code>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SLOT_PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDisplayIndex(n)}
                          className={cn(
                            "min-h-[40px] min-w-[44px] rounded-xl border-2 px-3 text-sm font-bold transition-all",
                            displayIndex === n
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-emerald-700"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Hash className="h-4 w-4 shrink-0 text-emerald-600" />
                      <Input
                        type="number"
                        min={0}
                        value={displayIndex}
                        onChange={(e) => setDisplayIndex(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="h-10 max-w-[6rem] rounded-xl border-slate-200 font-mono text-sm dark:border-slate-700"
                      />
                    </div>

                    <div
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-[11px] font-medium leading-snug",
                        slotLoading && "opacity-60",
                        slotHasSavedData
                          ? "border-emerald-200/90 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-100"
                          : "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-100"
                      )}
                    >
                      {slotLoading
                        ? "Loading this slot from Firebase…"
                        : slotHasSavedData
                          ? `Showing the saved banner for slot ${displayIndex} in the previews →`
                          : `Slot ${displayIndex} is empty — previews use template defaults until you publish.`}
                    </div>

                    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-3 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950/90">
                      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Current slot (mobile)
                      </p>
                      {slotLoading ? (
                        <div className="flex h-28 items-center justify-center">
                          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                        </div>
                      ) : (
                        <div
                          className="mx-auto max-w-[210px] origin-top scale-[0.95] transition-opacity duration-300"
                          key={`peek-${displayIndex}-${previewImageSrc}`}
                        >
                          <LiveBanner {...bannerProps} variant="compact" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adText">Headline</Label>
                    <Input
                      id="adText"
                      maxLength={30}
                      placeholder="Get Fresh Grocery"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      disabled={slotLoading}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-950/50"
                    />
                    <p className="text-[11px] text-slate-400">{headline.length}/30</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Background</Label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-2 dark:border-slate-700 dark:bg-slate-950/50">
                        <input
                          type="color"
                          aria-label="Background"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                        <Input readOnly value={bgColor.toUpperCase()} className="h-9 border-0 bg-transparent p-0 font-mono text-[11px]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Asset</Label>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-2 dark:border-slate-700 dark:bg-slate-950/50">
                        <input
                          type="color"
                          aria-label="Asset"
                          value={assetColor}
                          onChange={(e) => setAssetColor(e.target.value)}
                          className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Type className="h-4 w-4 text-emerald-600" />
                      Headline text color
                    </Label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-2 dark:border-slate-700 dark:bg-slate-950/50">
                      <input
                        type="color"
                        aria-label="Headline text color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                      />
                      <Input
                        readOnly
                        value={textColor.toUpperCase()}
                        className="h-9 flex-1 border-0 bg-transparent p-0 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adFile" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-emerald-600" />
                      Image (publish to upload)
                    </Label>
                    <Input
                      id="adFile"
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      className="cursor-pointer rounded-xl border-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-emerald-600 file:to-teal-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white dark:border-slate-700"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing || slotLoading}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-700 via-teal-600 to-cyan-600 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:brightness-110"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing…
                      </>
                    ) : (
                      "Publish image & confirm"
                    )}
                  </Button>
                </div>
              </div>
            </aside>

            <div className="xl:col-span-8">
              <div
                className={cn(
                  "relative min-h-[420px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-b from-slate-100/90 to-white p-6 shadow-inner dark:border-slate-700/80 dark:from-slate-900/90 dark:to-slate-950 sm:p-10",
                  slotLoading && "pointer-events-none opacity-60"
                )}
              >
                {slotLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                )}

                <div className="flex min-h-[360px] items-center justify-center transition-all duration-500 ease-out">
                  {activePreview === "desktop" && (
                    <div
                      className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-300"
                      key={`desktop-${displayIndex}-${previewImageSrc}`}
                    >
                      <div className="overflow-hidden rounded-t-2xl border border-b-0 border-slate-300/90 bg-gradient-to-b from-slate-200 to-slate-300/90 dark:border-slate-600 dark:from-slate-800 dark:to-slate-800/90">
                        <div className="flex items-center gap-2 px-4 py-3">
                          <div className="flex gap-1.5 pl-1">
                            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                          </div>
                          <div className="ml-2 flex flex-1 items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-[11px] text-slate-500 shadow-sm dark:bg-slate-900/95 dark:text-slate-400">
                            <Lock className="h-3.5 w-3.5 shrink-0 opacity-50" />
                            <span className="truncate font-medium">dailyclub.app / home</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-b-2xl border border-t-0 border-slate-300/90 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-900/90">
                        <div className="mb-4 h-2.5 w-28 rounded-full bg-slate-300/90 dark:bg-slate-700" />
                        <LiveBanner {...bannerProps} variant="wide" />
                      </div>
                    </div>
                  )}

                  {activePreview === "tablet" && (
                    <div
                      className="w-full max-w-[300px] animate-in fade-in zoom-in-95 duration-300"
                      key={`tablet-${displayIndex}-${previewImageSrc}`}
                    >
                      <div className="rounded-[2rem] border-[11px] border-slate-800 bg-slate-800 p-1 shadow-2xl dark:border-slate-950">
                        <div className="overflow-hidden rounded-[1.4rem] bg-slate-100 dark:bg-slate-900">
                          <div className="flex h-8 items-center justify-center bg-slate-200/90 dark:bg-slate-800/90">
                            <div className="h-1.5 w-20 rounded-full bg-slate-400/90 dark:bg-slate-600" />
                          </div>
                          <div className="space-y-3 p-3">
                            <div className="flex gap-2">
                              <div className="h-9 flex-1 rounded-xl bg-white shadow dark:bg-slate-800" />
                              <div className="h-9 w-9 rounded-xl bg-white shadow dark:bg-slate-800" />
                            </div>
                            <LiveBanner {...bannerProps} variant="medium" />
                            <div className="h-20 rounded-xl bg-white/90 dark:bg-slate-800/90" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePreview === "mobile" && (
                    <div
                      className="w-full max-w-[220px] animate-in fade-in zoom-in-95 duration-300"
                      key={`mobile-${displayIndex}-${previewImageSrc}`}
                    >
                      <div className="rounded-[2.5rem] border-[11px] border-slate-800 bg-slate-800 shadow-2xl dark:border-slate-950">
                        <div className="relative overflow-hidden rounded-[1.6rem] bg-slate-100 dark:bg-slate-900">
                          <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-900 dark:bg-black" />
                          <div className="px-3 pb-8 pt-14">
                            <div className="mb-4 flex gap-2">
                              <div className="h-2 flex-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <div className="h-2 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
                            </div>
                            <LiveBanner {...bannerProps} variant="compact" />
                            <div className="mt-4 space-y-2.5">
                              <div className="h-16 rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
                              <div className="h-16 rounded-2xl bg-white shadow-sm dark:bg-slate-800" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-center gap-3 border-t border-slate-200/80 pt-6 dark:border-slate-800">
                  {DEVICE_PREVIEW_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setActivePreview(opt.id)}
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all",
                          activePreview === opt.id
                            ? "scale-110 border-emerald-500 bg-emerald-500 text-white shadow-lg"
                            : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
                        )}
                        title={opt.title}
                        aria-label={`${opt.title} preview`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BannerManage;
