import { validatePhotoFile } from "@/lib/image-validate";
import { useUiText } from "@/hooks/useUiText";
import WardPreview from "@/components/WardPreview";
import { photoUrlFor } from "@/lib/photo-url";
import { invokeFunction } from "@/lib/invoke-function";
import { useState, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  MapPin,
  Send,
  Trash2,
  Droplets,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Lightbulb,
  Building,
  Volume2,
  MoreHorizontal,
  Pipette,
  Clock,
  Image,
  X,
  Copy,
  Check,
  Sparkles,
  Locate,
  History,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  ClipboardCheck,
  Pencil,
  EyeOff,
} from "lucide-react";
import { useNavigate, Link } from "@/lib/router-compat";
import { CATEGORY_CONFIG, CATEGORY_LABEL_HI, ComplaintCategory } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PermissionPrompt from "@/components/PermissionPrompt";
import MapThumbnail from "@/components/MapThumbnail";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import VoiceDictate from "@/components/VoiceDictate";
import { DEFAULT_CITY } from "@/lib/cities";
import { reverseGeocode } from "@/lib/reverse-geocode";
import {
  getRecentLocations,
  pushRecentLocation,
  type RecentLocation,
} from "@/lib/recent-locations";
import { loadDraft, saveDraft, clearDraft, fileToDataUrl, dataUrlToFile } from "@/lib/draft";
import { useCityWards, wardLabel, insertComplaintWithWard } from "@/lib/wards";

const LocationMapPicker = lazy(() => import("@/components/LocationMapPicker"));

const ICON_MAP: Record<string, React.ElementType> = {
  Trash2,
  Droplets,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Lightbulb,
  Pipette,
  Building,
  Volume2,
  MoreHorizontal,
};

const inputCls =
  "w-full rounded-2xl border border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/40 focus:border-primary";

const STEPS = [
  { key: "photo", en: "Photo", hi: "फ़ोटो", icon: Camera },
  { key: "location", en: "Location", hi: "जगह", icon: MapPin },
  { key: "details", en: "Details", hi: "विवरण", icon: FileText },
  { key: "review", en: "Review", hi: "जाँचें", icon: ClipboardCheck },
] as const;

export default function ReportFlow() {
  const tx = useUiText();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const hi = language === "hi";
  const navigate = useNavigate();

  // Restore draft on mount (one-shot)
  const initialDraft = useMemo(() => loadDraft() || {}, []);

  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | "">(
    (initialDraft.category as ComplaintCategory) || "",
  );
  const [title, setTitle] = useState(initialDraft.title || "");
  const [description, setDescription] = useState(initialDraft.description || "");
  const [location, setLocation] = useState(initialDraft.location || "");
  const [manualLat, setManualLat] = useState(initialDraft.manualLat || "");
  const [manualLng, setManualLng] = useState(initialDraft.manualLng || "");
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [priority, setPriority] = useState<string>(initialDraft.priority || "medium");
  const [city, setCity] = useState<string>(() => localStorage.getItem("ct_city") || DEFAULT_CITY);
  const [cityFromProfile, setCityFromProfile] = useState(false);
  const [anonymous, setAnonymous] = useState(initialDraft.anonymous ?? false);
  const [reportedWard, setReportedWard] = useState<string>(initialDraft.ward || "");
  const { data: cityWards = [] } = useCityWards(city);
  const [photo, setPhoto] = useState<File | null>(() => {
    if (initialDraft.photoDataUrl && initialDraft.photoName && initialDraft.photoType) {
      return dataUrlToFile(
        initialDraft.photoDataUrl,
        initialDraft.photoName,
        initialDraft.photoType,
      );
    }
    return null;
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialDraft.photoDataUrl || null,
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    initialDraft.photoDataUrl || null,
  );
  const [photoName, setPhotoName] = useState<string | null>(initialDraft.photoName || null);
  const [photoType, setPhotoType] = useState<string | null>(initialDraft.photoType || null);
  const [submitting, setSubmitting] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "queued" | "failed" | "sent">("idle");
  const [isOnline, setIsOnline] = useState(true);
  const pendingSubmitRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => {
      setIsOnline(true);
      if (pendingSubmitRef.current) {
        pendingSubmitRef.current = false;
        toast.info(tx("Back online — sending your saved complaint…"));
        formRef.current?.requestSubmit();
      }
    };
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [submittedId, setSubmittedId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [cityAutoDetecting, setCityAutoDetecting] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [recentLocs, setRecentLocs] = useState<RecentLocation[]>(() => getRecentLocations());
  const [coordsCopied, setCoordsCopied] = useState(false);
  const [draftRestored, setDraftRestored] = useState(
    Boolean(initialDraft.title || initialDraft.description || initialDraft.photoDataUrl),
  );
  const [classifyingPhoto, setClassifyingPhoto] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    category: ComplaintCategory | null;
    confidence: number;
    department: string | null;
  } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ count: number; ids: string[] } | null>(
    null,
  );

  // Auto-save draft (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft({
        title,
        description,
        category: selectedCategory,
        priority,
        location,
        manualLat,
        manualLng,
        anonymous,
        ward: reportedWard,
        photoDataUrl: photoDataUrl ?? undefined,
        photoName: photoName ?? undefined,
        photoType: photoType ?? undefined,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [
    title,
    description,
    selectedCategory,
    priority,
    location,
    manualLat,
    manualLng,
    anonymous,
    reportedWard,
    photoDataUrl,
    photoName,
    photoType,
  ]);

  // Load user's home city from profile
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("home_city")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const hc = (data as { home_city?: string | null } | null)?.home_city;
      if (hc && hc.trim()) {
        setCity(hc.trim());
        setCityFromProfile(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-update City + Location via reverse geocoding when coordinates change
  useEffect(() => {
    const latStr = manualLat || (detectedLat !== null ? String(detectedLat) : "");
    const lngStr = manualLng || (detectedLng !== null ? String(detectedLng) : "");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCityAutoDetecting(true);
      const { city: matchedCity, address } = await reverseGeocode(lat, lng, controller.signal);
      setCityAutoDetecting(false);
      if (matchedCity && matchedCity !== city && !cityFromProfile) setCity(matchedCity);
      if (address) {
        setDetectedAddress(address);
        const trimmed = location.trim();
        const looksLikeCoords = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed);
        if (!trimmed || looksLikeCoords) setLocation(address);
      }
    }, 600);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualLat, manualLng, detectedLat, detectedLng]);

  const setPhotoFromFile = async (file: File) => {
    setPhoto(file);
    if (photoPreview && photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoPreview(dataUrl);
      setPhotoDataUrl(dataUrl);
      setPhotoName(file.name);
      setPhotoType(file.type);
    } catch {
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await setPhotoFromFile(file);
      classifyPhoto(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoDataUrl(null);
    setPhotoName(null);
    setPhotoType(null);
    setAiSuggestion(null);
  };

  // AI: classify photo → suggest category (the citizen must accept it)
  const classifyPhoto = async (file: File) => {
    if (selectedCategory) return;
    try {
      setClassifyingPhoto(true);
      const dataUrl = await fileToDataUrl(file);
      const { data, error } = await invokeFunction("analyze-image", {
        body: { imageUrl: dataUrl },
      });
      if (error) throw error;
      const cat = (data as { category?: string; confidence?: number })?.category;
      const conf = Number((data as { confidence?: number })?.confidence ?? 0);
      if (cat && cat in CATEGORY_CONFIG && conf >= 0.5) {
        let dept: string | null = null;
        const { data: r } = await supabase
          .from("city_category_routing")
          .select("departments(name)")
          .ilike("city", city)
          .eq("category", cat)
          .maybeSingle();
        dept = (r as { departments?: { name?: string } | null } | null)?.departments?.name ?? null;
        if (!dept) {
          const { data: f } = await supabase
            .from("category_routing")
            .select("departments(name)")
            .eq("category", cat)
            .maybeSingle();
          dept =
            (f as { departments?: { name?: string } | null } | null)?.departments?.name ?? null;
        }
        setAiSuggestion({ category: cat as ComplaintCategory, confidence: conf, department: dept });
      } else {
        setAiSuggestion({ category: null, confidence: conf, department: null });
      }
    } catch (err) {
      console.error("classify-image error:", err);
      setAiSuggestion({ category: null, confidence: 0, department: null });
    } finally {
      setClassifyingPhoto(false);
    }
  };

  // Duplicate detection: same category, ~300m radius, within last 7 days
  const checkDuplicates = async (lat: number | null, lng: number | null) => {
    if (!lat || !lng || !selectedCategory) {
      setDuplicateWarning(null);
      return;
    }
    const { data } = await supabase.rpc("find_nearby_duplicates", {
      _lat: lat,
      _lng: lng,
      _category: selectedCategory,
      _radius_m: 300,
      _days: 7,
    });
    if (data && data.length > 0)
      setDuplicateWarning({ count: data.length, ids: data.map((r) => r.complaint_id) });
    else setDuplicateWarning(null);
  };

  useEffect(() => {
    const lat = manualLat ? parseFloat(manualLat) : detectedLat;
    const lng = manualLng ? parseFloat(manualLng) : detectedLng;
    checkDuplicates(
      Number.isFinite(lat as number) ? (lat as number) : null,
      Number.isFinite(lng as number) ? (lng as number) : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, manualLat, manualLng, detectedLat, detectedLng]);

  const resolveCoords = (): { lat: number | null; lng: number | null } => {
    let lat: number | null = null;
    let lng: number | null = null;
    if (manualLat && manualLng) {
      const pLat = parseFloat(manualLat);
      const pLng = parseFloat(manualLng);
      if (
        Number.isFinite(pLat) &&
        Number.isFinite(pLng) &&
        pLat >= -90 &&
        pLat <= 90 &&
        pLng >= -180 &&
        pLng <= 180
      ) {
        lat = pLat;
        lng = pLng;
      }
    }
    if (lat === null && detectedLat !== null && detectedLng !== null) {
      lat = detectedLat;
      lng = detectedLng;
    }
    if (lat === null) {
      const nums = location.match(/-?\d+(?:\.\d+)?/g);
      if (nums && nums.length >= 2) {
        const a = Number.parseFloat(nums[0]);
        const b = Number.parseFloat(nums[1]);
        if (
          Number.isFinite(a) &&
          a >= -90 &&
          a <= 90 &&
          Number.isFinite(b) &&
          b >= -180 &&
          b <= 180
        ) {
          lat = a;
          lng = b;
        }
      }
    }
    return { lat, lng };
  };

  const stepValid = [
    true,
    Boolean(location.trim()),
    Boolean(title.trim() && selectedCategory && description.trim()),
    Boolean(location.trim() && title.trim() && selectedCategory && description.trim()),
  ];

  const goTo = (i: number) => {
    setStep(i);
    requestAnimationFrame(() =>
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enter key on earlier steps moves forward instead of submitting
    if (step < STEPS.length - 1) {
      if (stepValid[step]) goTo(step + 1);
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!selectedCategory || !description || !location || !title) return;

    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        const checked = await validatePhotoFile(photo);
        if ("error" in checked) {
          toast.error(tx(checked.error));
          setSubmitting(false);
          return;
        }
        const filePath = `${user.id}/${Date.now()}.${checked.ext}`;
        const { error: uploadError } = await supabase.storage
          .from("complaint-photos")
          .upload(filePath, photo, { contentType: checked.mime });
        if (!uploadError) photoUrl = photoUrlFor(filePath);
      }

      const { lat, lng } = resolveCoords();

      const payload = {
        user_id: user.id,
        title,
        description,
        category: selectedCategory,
        priority,
        photo_url: photoUrl,
        location,
        anonymous,
        city,
        latitude: lat,
        longitude: lng,
        submitted_by: anonymous ? "Anonymous" : user.user_metadata?.full_name || user.email || "Citizen",
      };
      const { data, error } = await insertComplaintWithWard<{ id: string; complaint_id: string }>(
        async (row) =>
          await supabase
            .from("complaints")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(row as any)
            .select("id, complaint_id")
            .single(),
        payload,
        /^\d+$/.test(reportedWard) ? `Ward ${reportedWard}` : reportedWard,
      );

      if (error || !data) throw error ?? new Error("Insert failed");

      if (lat !== null && lng !== null) {
        pushRecentLocation({ label: location, lat, lng });
        setRecentLocs(getRecentLocations());
      }

      // AI summary runs in the background and never blocks reporting
      invokeFunction("generate-summary", {
        body: {
          complaint_id: data.id,
          title,
          description,
          category: selectedCategory,
          location,
          priority,
        },
      }).catch((err) => console.error("AI summary error:", err));

      setSyncState("sent");
      setSubmittedId(data.complaint_id);
      setTitle("");
      setDescription("");
      setLocation("");
      setSelectedCategory("");
      setManualLat("");
      setManualLng("");
      setDetectedLat(null);
      setDetectedLng(null);
      setDetectedAddress(null);
      setPriority("medium");
      setAnonymous(false);
      setReportedWard("");
      removePhoto();
      setDuplicateWarning(null);
      setDraftRestored(false);
      clearDraft();
      localStorage.setItem("ct_city", city);
      setStep(0);
    } catch (err) {
      console.error("Submit error:", err);
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      const networkish =
        offline ||
        err instanceof TypeError ||
        /fetch|network/i.test(String((err as Error)?.message ?? err));
      if (networkish) {
        pendingSubmitRef.current = true;
        setSyncState("queued");
        toast.warning(
          tx(
            "You're offline. Your complaint is saved on this phone and will be sent automatically when you're back online.",
          ),
        );
      } else {
        setSyncState("failed");
        toast.error(tx("Could not submit complaint. Your draft is saved — please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyCoords = async () => {
    const lat = manualLat || (detectedLat !== null ? String(detectedLat) : "");
    const lng = manualLng || (detectedLng !== null ? String(detectedLng) : "");
    if (!lat || !lng) return;
    try {
      await navigator.clipboard.writeText(
        `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`,
      );
      setCoordsCopied(true);
      toast.success(tx("Coordinates copied"));
      setTimeout(() => setCoordsCopied(false), 2000);
    } catch {
      toast.error(tx("Could not copy coordinates"));
    }
  };

  const applyRecentLocation = (r: RecentLocation) => {
    setLocation(r.label);
    setManualLat(r.lat.toFixed(6));
    setManualLng(r.lng.toFixed(6));
    setDetectedLat(r.lat);
    setDetectedLng(r.lng);
    toast.success(tx("Recent location applied"));
  };

  const discardDraft = () => {
    clearDraft();
    setTitle("");
    setDescription("");
    setLocation("");
    setSelectedCategory("");
    setManualLat("");
    setManualLng("");
    setPriority("medium");
    setAnonymous(false);
    setReportedWard("");
    removePhoto();
    setDraftRestored(false);
    setStep(0);
    toast.success(tx("Draft discarded"));
  };

  const [gettingLocation, setGettingLocation] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showCameraPrompt, setShowCameraPrompt] = useState(false);

  // Auto-detect location on mount when permission was already granted
  useEffect(() => {
    if (location) return;
    if (!navigator.geolocation) return;
    (async () => {
      try {
        if (navigator.permissions) {
          const status = await navigator.permissions.query({ name: "geolocation" });
          if (status.state === "granted") requestLocation();
        }
      } catch {
        /* ignore */
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAndRequestLocation = async () => {
    if (gettingLocation) return;
    if (!navigator.geolocation) {
      toast.error(tx("Geolocation is not supported by your browser"));
      return;
    }
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (status.state === "denied" || status.state === "prompt") {
          setShowLocationPrompt(true);
          return;
        }
        requestLocation();
        return;
      }
    } catch {
      /* ignore */
    }
    setShowLocationPrompt(true);
  };

  const requestLocation = () => {
    setShowLocationPrompt(false);
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDetectedLat(lat);
        setDetectedLng(lng);
        setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        setGettingLocation(false);
        toast.success(tx("📍 Location detected!"));
      },
      () => {
        setGettingLocation(false);
        setShowLocationPrompt(true);
      },
      { timeout: 15000, maximumAge: 300000, enableHighAccuracy: true },
    );
  };

  const checkAndRequestCamera = async () => {
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (status.state === "denied" || status.state === "prompt") {
          setShowCameraPrompt(true);
          return;
        }
        openCamera();
        return;
      }
    } catch {
      /* ignore */
    }
    setShowCameraPrompt(true);
  };

  const openCamera = async () => {
    setShowCameraPrompt(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
          setShowCameraPrompt(true);
        else toast.error(`Could not access camera: ${error.message}`);
      }
    }
  };

  const handleCloseCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          await setPhotoFromFile(file);
          handleCloseCamera();
          classifyPhoto(file);
          toast.success(tx("📸 Photo captured!"));
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  const coords = resolveCoords();
  const catLabel = (c: ComplaintCategory) => (hi ? CATEGORY_LABEL_HI[c] : CATEGORY_CONFIG[c].label);
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-20">
      {submittedId && syncState === "sent" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          role="status"
          className="mb-6 rounded-2xl border border-success/30 bg-success/10 p-5"
        >
          <p className="font-display text-lg font-bold text-success">
            ✅ {t("form.complaintSubmitted")} <span className="font-mono">#{submittedId}</span>
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            {hi
              ? "विभाग और समय सीमा अपने आप तय हो गई है। आप इसे लाइव ट्रैक कर सकते हैं।"
              : "It has been routed to a department with a deadline. You can track it live."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={`/complaints/${submittedId}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {hi ? "शिकायत देखें" : "Track this complaint"} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setSyncState("idle")}
              className="inline-flex min-h-11 items-center rounded-full border-2 border-primary/25 px-4 text-sm font-semibold text-primary"
            >
              {hi ? "एक और शिकायत" : "Report another"}
            </button>
          </div>
        </motion.div>
      )}

      {(!isOnline || syncState === "queued" || syncState === "failed") && (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
        >
          {!isOnline ? tx("Offline — your draft is saved on this device. ") : ""}
          {syncState === "queued"
            ? tx(
                "Waiting to send: your complaint will upload automatically when the connection returns.",
              )
            : syncState === "failed"
              ? tx("Last attempt failed. Your draft is safe — tap Submit to retry.")
              : tx("You can keep filling the form.")}
        </div>
      )}

      {draftRestored && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-info/30 bg-info/10 p-3 text-sm text-foreground">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-info" aria-hidden="true" />
            {tx(" Draft restored from your last session ")}
          </span>
          <button
            type="button"
            onClick={discardDraft}
            className="min-h-11 rounded-full px-3 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
          >
            {tx(" Discard ")}
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border">
        <ol className="grid grid-cols-4 gap-1" aria-label={hi ? "शिकायत के चरण" : "Report steps"}>
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            const reachable = i <= step || stepValid.slice(0, i).every(Boolean);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(i)}
                  aria-current={current ? "step" : undefined}
                  className="flex w-full min-h-11 flex-col items-center gap-1 rounded-xl text-[11px] font-semibold disabled:cursor-not-allowed"
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors ${
                      done
                        ? "border-success bg-success text-success-foreground"
                        : current
                          ? "border-secondary bg-secondary text-secondary-foreground"
                          : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={current ? "text-foreground" : "text-muted-foreground"}>
                    {hi ? s.hi : s.en}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label={
            hi ? `चरण ${step + 1} / ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`
          }
        >
          <div
            className="h-full rounded-full bg-secondary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate={step < STEPS.length - 1}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* STEP 1 — PHOTO */}
            {step === 0 && (
              <section aria-labelledby="st-photo" className="space-y-4">
                <div>
                  <h2
                    id="st-photo"
                    className="font-display text-2xl font-extrabold text-foreground"
                  >
                    {hi ? "समस्या की फ़ोटो लें" : "Take a photo of the problem"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hi
                      ? "फ़ोटो से विभाग जल्दी समझता है। AI श्रेणी सुझा सकता है — आप तय करेंगे।"
                      : "A photo helps the department act faster. AI can suggest a category — you decide."}
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />

                {showCamera && (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-secondary bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-72 w-full object-cover"
                    />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-secondary px-6 font-bold text-secondary-foreground shadow-elevated"
                      >
                        <Camera className="h-5 w-5" /> {t("form.capture")}
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseCamera}
                        aria-label={hi ? "कैमरा बंद करें" : "Close camera"}
                        className="grid h-12 w-12 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-elevated"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {photoPreview ? (
                  <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
                    <img
                      src={photoPreview}
                      alt={tx("Preview")}
                      className="h-64 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      aria-label={hi ? "फ़ोटो हटाएं" : "Remove photo"}
                      className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-md"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    {classifyingPhoto && (
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md backdrop-blur-sm">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        {tx(" AI suggesting category… ")}
                      </div>
                    )}
                  </div>
                ) : (
                  !showCamera && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={checkAndRequestCamera}
                        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-accent/50 p-6 text-primary transition hover:border-secondary hover:bg-secondary/10"
                      >
                        <Camera className="h-10 w-10" aria-hidden="true" />
                        <span className="text-sm font-bold">{t("form.takeLivePhoto")}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("form.openCamera")}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-foreground transition hover:border-secondary hover:bg-secondary/10"
                      >
                        <Image className="h-10 w-10" aria-hidden="true" />
                        <span className="text-sm font-bold">{t("form.chooseGallery")}</span>
                        <span className="text-xs text-muted-foreground">{t("form.jpgPng")}</span>
                      </button>
                    </div>
                  )
                )}

                {photoPreview && aiSuggestion && !selectedCategory && (
                  <div className="rounded-2xl border border-primary/25 bg-accent p-4 text-sm">
                    {aiSuggestion.category ? (
                      <>
                        <p className="text-foreground">
                          <Sparkles
                            className="mr-1 inline h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                          {tx(" AI suggests ")}
                          <b>{catLabel(aiSuggestion.category)}</b> (
                          {Math.round(aiSuggestion.confidence * 100)}
                          {tx("% sure) ")}
                          {aiSuggestion.department && <> → {tx(aiSuggestion.department)}</>}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(aiSuggestion.category!);
                              setAiSuggestion(null);
                            }}
                            className="min-h-11 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
                          >
                            {tx("Accept")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiSuggestion(null)}
                            className="min-h-11 rounded-full border-2 border-primary/25 px-4 text-xs font-semibold text-primary"
                          >
                            {tx("I'll choose myself")}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        {tx(
                          "Couldn't identify the issue from the photo — please choose a category below.",
                        )}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* STEP 2 — LOCATION / WARD */}
            {step === 1 && (
              <section aria-labelledby="st-loc" className="space-y-4">
                <div>
                  <h2 id="st-loc" className="font-display text-2xl font-extrabold text-foreground">
                    {hi ? "समस्या कहाँ है?" : "Where is the problem?"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hi
                      ? "GPS से जगह और वार्ड अपने आप पता चलता है।"
                      : "GPS finds the spot and ward automatically."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={checkAndRequestLocation}
                  disabled={gettingLocation}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {gettingLocation ? (
                    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <Locate className="h-5 w-5" aria-hidden="true" />
                  )}
                  {tx(" Use my location ")}
                </button>

                <div>
                  <label
                    htmlFor="nn-location"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    {t("form.location")} *
                  </label>
                  <AddressAutocomplete
                    id="nn-location"
                    value={location}
                    onChange={(v) => {
                      setLocation(v);
                      setDetectedLat(null);
                      setDetectedLng(null);
                    }}
                    onPick={(s) => {
                      setLocation(s.short_name || s.display_name);
                      setManualLat(s.lat.toFixed(6));
                      setManualLng(s.lng.toFixed(6));
                      setDetectedLat(s.lat);
                      setDetectedLng(s.lng);
                      toast.success(tx("Address picked"));
                    }}
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${showMapPicker ? "border-primary bg-accent text-primary" : "border-primary/20 text-foreground hover:border-primary"}`}
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {tx(" Pick on map ")}
                  </button>
                  {(manualLat || detectedLat !== null) && (
                    <button
                      type="button"
                      onClick={copyCoords}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-primary/20 px-4 text-sm font-semibold text-foreground hover:border-primary"
                    >
                      {coordsCopied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {coordsCopied ? tx("Copied") : tx("Copy coords")}
                    </button>
                  )}
                </div>

                {cityAutoDetecting && (
                  <p className="text-xs text-muted-foreground">
                    {tx("Detecting city from coordinates…")}
                  </p>
                )}

                {recentLocs.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden="true" /> {tx(" Recent locations ")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {recentLocs.map((r, i) => (
                        <button
                          key={`${r.lat},${r.lng},${i}`}
                          type="button"
                          onClick={() => applyRecentLocation(r)}
                          title={r.label}
                          className="min-h-11 max-w-[220px] truncate rounded-full border border-border bg-muted px-3 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          📍 {r.label.split(",")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showMapPicker && (
                  <div className="w-full max-w-full overflow-hidden rounded-2xl">
                    <Suspense fallback={null}>
                      <LocationMapPicker
                        lat={manualLat}
                        lng={manualLng}
                        onSelect={(lat, lng) => {
                          setManualLat(lat);
                          setManualLng(lng);
                          setLocation(
                            `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
                          );
                          setShowMapPicker(false);
                        }}
                        onClose={() => setShowMapPicker(false)}
                      />
                    </Suspense>
                  </div>
                )}

                <WardPreview
                  lat={manualLat ? parseFloat(manualLat) : detectedLat}
                  lng={manualLng ? parseFloat(manualLng) : detectedLng}
                />

                {/* Ward / zone — the official ward is still set by the server from GPS */}
                <div className="rounded-2xl border border-border bg-card p-4">
                  <label htmlFor="nn-ward" className="block text-sm font-semibold text-foreground">
                    {hi ? "वार्ड" : "Ward"}{" "}
                    <span className="font-normal text-muted-foreground">
                      {hi ? "(वैकल्पिक — पता हो तो चुनें)" : "(optional — choose if you know it)"}
                    </span>
                  </label>
                  {cityWards.length > 0 ? (
                    <select
                      id="nn-ward"
                      value={reportedWard}
                      onChange={(e) => setReportedWard(e.target.value)}
                      className={inputCls + " mt-2 min-h-11"}
                    >
                      <option value="">{hi ? "पता नहीं — GPS से तय करें" : "Not sure — use GPS"}</option>
                      {cityWards.map((w) => {
                        const label = wardLabel(w, hi);
                        return (
                          <option key={w.id} value={wardLabel(w)}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      id="nn-ward"
                      inputMode="numeric"
                      value={reportedWard}
                      onChange={(e) => setReportedWard(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                      placeholder={hi ? "वार्ड नंबर, जैसे 12" : "Ward number, e.g. 12"}
                      className={inputCls + " mt-2"}
                    />
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {hi
                      ? "आधिकारिक वार्ड GPS से अपने आप तय होता है; आपका चुना वार्ड अधिकारी को मदद करता है।"
                      : "The official ward is set automatically from GPS; your choice helps the officer confirm it."}
                  </p>
                </div>

                {detectedAddress && location.trim() !== detectedAddress && (
                  <button
                    type="button"
                    onClick={() => setLocation(detectedAddress)}
                    className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {tx(" ↩ Reset to detected address ")}
                  </button>
                )}

                {!showMapPicker && coords.lat !== null && coords.lng !== null && (
                  <MapThumbnail
                    lat={coords.lat}
                    lng={coords.lng}
                    onClick={() => setShowMapPicker(true)}
                  />
                )}

                <details className="rounded-2xl border border-border bg-muted/50 p-3">
                  <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-foreground">
                    {tx("Coordinates ")}
                    <span className="font-normal text-muted-foreground">{tx("(optional)")}</span>
                  </summary>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder={tx("Latitude (e.g. 24.6018)")}
                      aria-label={hi ? "अक्षांश" : "Latitude"}
                      type="number"
                      step="any"
                      className={inputCls}
                    />
                    <input
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      placeholder={tx("Longitude (e.g. 77.2931)")}
                      aria-label={hi ? "देशांतर" : "Longitude"}
                      type="number"
                      step="any"
                      className={inputCls}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tx("Enter manually (city updates automatically).")}
                  </p>
                </details>
              </section>
            )}

            {/* STEP 3 — DETAILS */}
            {step === 2 && (
              <section aria-labelledby="st-details" className="space-y-5">
                <div>
                  <h2
                    id="st-details"
                    className="font-display text-2xl font-extrabold text-foreground"
                  >
                    {hi ? "समस्या बताइए" : "Tell us about it"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hi
                      ? "बोलकर भी लिख सकते हैं — माइक दबाएं।"
                      : "You can also speak — tap the mic."}
                  </p>
                </div>

                <fieldset>
                  <legend className="mb-2 block text-sm font-semibold text-foreground">
                    {t("form.category")} *
                  </legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                      const Icon = ICON_MAP[config.icon] || MoreHorizontal;
                      const active = selectedCategory === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedCategory(key as ComplaintCategory)}
                          className={`flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 text-left text-sm font-semibold transition-all ${active ? "border-secondary bg-secondary/15 text-foreground shadow-card" : "border-border bg-card text-muted-foreground hover:border-secondary/60"}`}
                        >
                          <Icon
                            className="h-5 w-5 shrink-0"
                            style={{ color: config.color }}
                            aria-hidden="true"
                          />
                          {catLabel(key as ComplaintCategory)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="nn-title"
                    className="mb-2 block text-sm font-semibold text-foreground"
                  >
                    {t("form.title")} *
                  </label>
                  <input
                    id="nn-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("form.titlePlaceholder")}
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="nn-desc"
                      className="block text-sm font-semibold text-foreground"
                    >
                      {t("form.description")} *
                    </label>
                    <VoiceDictate
                      onTranscribed={(text) =>
                        setDescription((prev) => (prev ? `${prev.trim()} ${text}` : text))
                      }
                    />
                  </div>
                  <textarea
                    id="nn-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder={t("form.descPlaceholder")}
                    className={inputCls + " resize-none"}
                    required
                  />
                </div>

                <fieldset>
                  <legend className="mb-2 block text-sm font-semibold text-foreground">
                    {t("form.priority")}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(["low", "medium", "high", "emergency"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={priority === p}
                        onClick={() => setPriority(p)}
                        className={`min-h-11 rounded-full border-2 px-4 text-xs font-bold capitalize transition-all ${priority === p ? (p === "emergency" ? "border-destructive bg-destructive/10 text-destructive" : p === "high" ? "border-warning bg-warning/10 text-warning" : "border-primary bg-accent text-primary") : "border-border bg-card text-muted-foreground"}`}
                      >
                        {tx(p)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-muted/50 px-4">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="h-5 w-5 rounded border-input accent-[hsl(var(--primary))]"
                  />
                  <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-foreground">{t("form.anonymous")}</span>
                </label>
              </section>
            )}

            {/* STEP 4 — REVIEW */}
            {step === 3 && (
              <section aria-labelledby="st-review" className="space-y-4">
                <h2 id="st-review" className="font-display text-2xl font-extrabold text-foreground">
                  {hi ? "एक बार जाँच लें" : "Check and send"}
                </h2>
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt={tx("Preview")}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <dl className="divide-y divide-border text-sm">
                    {[
                      { label: hi ? "शीर्षक" : "Title", value: title, step: 2 },
                      {
                        label: t("form.category"),
                        value: selectedCategory ? catLabel(selectedCategory) : "—",
                        step: 2,
                      },
                      { label: t("form.description"), value: description, step: 2 },
                      { label: t("form.location"), value: location, step: 1 },
                      { label: hi ? "शहर" : "City", value: city, step: 1 },
                      {
                        label: hi ? "वार्ड" : "Ward",
                        value: reportedWard
                          ? /^\d+$/.test(reportedWard)
                            ? `${hi ? "वार्ड" : "Ward"} ${reportedWard}`
                            : reportedWard
                          : hi
                            ? "GPS से तय होगा"
                            : "Set from GPS",
                        step: 1,
                      },
                      { label: t("form.priority"), value: tx(priority), step: 2 },
                      {
                        label: hi ? "पहचान" : "Identity",
                        value: anonymous
                          ? hi
                            ? "गुमनाम"
                            : "Anonymous"
                          : hi
                            ? "आपका नाम दिखेगा"
                            : "Your name is shown",
                        step: 2,
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                        <dt className="w-24 shrink-0 font-semibold text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="min-w-0 flex-1 break-words text-foreground">
                          {row.value || "—"}
                        </dd>
                        <button
                          type="button"
                          onClick={() => goTo(row.step)}
                          aria-label={`${hi ? "बदलें" : "Edit"} ${row.label}`}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </dl>
                </div>
                <WardPreview lat={coords.lat} lng={coords.lng} />
                {duplicateWarning && (
                  <div className="flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-warning">{tx("Possible duplicate")}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {duplicateWarning.count} {tx(" similar ")}
                        {selectedCategory && catLabel(selectedCategory as ComplaintCategory)}{" "}
                        {tx(" complaint")}
                        {language === "en" && duplicateWarning.count > 1 ? "s" : ""}{" "}
                        {tx(" reported nearby in the last 7 days ")}
                        {duplicateWarning.ids.length > 0 && (
                          <>
                            {" "}
                            (
                            {duplicateWarning.ids
                              .slice(0, 2)
                              .map((id) => `#${id}`)
                              .join(", ")}
                            )
                          </>
                        )}
                        {tx(". Please check before submitting. ")}
                      </p>
                    </div>
                  </div>
                )}
                {!user && (
                  <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
                    {t("form.signInToSubmit")}
                  </p>
                )}
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Duplicate warning also visible while editing details/location */}
        {duplicateWarning && (step === 1 || step === 2) && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-foreground">
              <b className="text-warning">{tx("Possible duplicate")}</b> · {duplicateWarning.count}{" "}
              {tx(" reported nearby in the last 7 days ")}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-full border-2 border-primary/25 px-5 text-sm font-bold text-primary hover:border-primary hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {hi ? "पीछे" : "Back"}
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!stepValid[step]}
              onClick={() => goTo(step + 1)}
              className="ml-auto inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary px-6 text-base font-bold text-secondary-foreground shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50 sm:flex-none"
            >
              {step === 0 && !photo
                ? hi
                  ? "फ़ोटो के बिना आगे"
                  : "Skip photo"
                : hi
                  ? "आगे"
                  : "Next"}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!stepValid[3] || submitting}
              className="ml-auto inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-secondary px-6 text-base font-bold text-secondary-foreground shadow-elevated transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              {submitting ? t("form.submitting") : user ? t("form.submit") : t("form.signInSubmit")}
            </button>
          )}
        </div>
        {step === 1 && !stepValid[1] && (
          <p className="mt-2 text-xs text-muted-foreground">
            {hi ? "आगे बढ़ने के लिए जगह भरें।" : "Add a location to continue."}
          </p>
        )}
        {step === 2 && !stepValid[2] && (
          <p className="mt-2 text-xs text-muted-foreground">
            {hi
              ? "श्रेणी, शीर्षक और विवरण भरें।"
              : "Choose a category and add a title and description."}
          </p>
        )}
      </form>

      <PermissionPrompt
        type="camera"
        visible={showCameraPrompt}
        onAllow={openCamera}
        onDismiss={() => setShowCameraPrompt(false)}
      />
      <PermissionPrompt
        type="location"
        visible={showLocationPrompt}
        onAllow={requestLocation}
        onDismiss={() => setShowLocationPrompt(false)}
      />
    </div>
  );
}
