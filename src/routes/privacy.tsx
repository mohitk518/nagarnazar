import { createFileRoute } from "@tanstack/react-router";
import { Database, Target, Timer, Eye, Trash2, Mail, Lock } from "lucide-react";
import Layout from "@/components/Layout";
import DeleteAccountCard from "@/components/DeleteAccountCard";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — NagarNazar" },
      {
        name: "description",
        content:
          "What data NagarNazar keeps, why, for how long, who sees it, and how to delete your account.",
      },
      { property: "og:title", content: "Privacy — NagarNazar" },
      {
        property: "og:description",
        content:
          "What data NagarNazar keeps, why, for how long, who sees it, and how to delete your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

type Block = {
  icon: React.ElementType;
  en: string;
  hi: string;
  itemsEn: string[];
  itemsHi: string[];
};

const BLOCKS: Block[] = [
  {
    icon: Database,
    en: "What data we collect",
    hi: "हम कौन-सा डेटा लेते हैं",
    itemsEn: [
      "Account: email and name (for login and status updates). Sign-in with Google gives us the same.",
      "Complaint: title, description, category, photo, location (GPS or typed address), ward and an optional voice note turned into text.",
      "Phone number: only if you turn on SMS updates. It is never shown publicly.",
      "Activity: your upvotes, comments, verifications, ratings, poll votes and points.",
      "On your phone only: an unsent complaint draft (text and photo) until you send or discard it.",
    ],
    itemsHi: [
      "खाता: ईमेल और नाम (लॉगिन और अपडेट के लिए)। Google से साइन-इन करने पर भी यही।",
      "शिकायत: शीर्षक, विवरण, श्रेणी, फ़ोटो, जगह (GPS या लिखा पता), वार्ड, और बोली गई बात का टेक्स्ट।",
      "फ़ोन नंबर: सिर्फ़ तब, जब आप SMS अपडेट चालू करें। यह कभी सार्वजनिक नहीं होता।",
      "गतिविधि: आपके अपवोट, कमेंट, पुष्टि, रेटिंग, पोल वोट और पॉइंट।",
      "सिर्फ़ आपके फ़ोन पर: न भेजा गया ड्राफ़्ट (टेक्स्ट और फ़ोटो), जब तक आप भेजें या हटाएं।",
    ],
  },
  {
    icon: Target,
    en: "Why we use it",
    hi: "किसलिए",
    itemsEn: [
      "To send each complaint to the right department and ward with a deadline, and to show its public status.",
      "To prove repairs with before/after photos.",
      "AI (Google Gemini, run on our server) reads complaint text and photos to suggest a category, write a short summary and help officers. AI only suggests — you and the officers decide.",
      "We do not sell your data and do not show ads.",
    ],
    itemsHi: [
      "हर शिकायत को सही विभाग और वार्ड तक समय सीमा के साथ भेजने और उसकी सार्वजनिक स्थिति दिखाने के लिए।",
      "पहले/बाद की फ़ोटो से काम का सबूत देने के लिए।",
      "AI (Google Gemini, हमारे सर्वर पर) शिकायत का टेक्स्ट और फ़ोटो पढ़कर श्रेणी सुझाता है और छोटा सारांश बनाता है। AI सिर्फ़ सुझाव देता है — फ़ैसला आप और अधिकारी करते हैं।",
      "हम आपका डेटा बेचते नहीं और विज्ञापन नहीं दिखाते।",
    ],
  },
  {
    icon: Timer,
    en: "How long we keep it",
    hi: "कितने समय तक",
    itemsEn: [
      "Account and profile data: as long as you keep your account. When you delete it, it is erased at once.",
      "Complaints and their photos: kept as public civic records. After account deletion they stay, shown as “Deleted user” and no longer linked to you.",
      "Admin audit log: kept so that official actions stay accountable; it stores account IDs, not your profile.",
      "Draft on your phone: until you send it, discard it or clear the browser data.",
    ],
    itemsHi: [
      "खाता और प्रोफ़ाइल: जब तक आपका खाता है। खाता हटाते ही तुरंत मिटा दिया जाता है।",
      "शिकायतें और उनकी फ़ोटो: सार्वजनिक रिकॉर्ड के रूप में रहती हैं। खाता हटाने के बाद “Deleted user” नाम से, आपसे जुड़ाव के बिना।",
      "अधिकारियों का ऑडिट लॉग: जवाबदेही के लिए रखा जाता है; इसमें खाता ID होती है, आपकी प्रोफ़ाइल नहीं।",
      "फ़ोन पर ड्राफ़्ट: जब तक आप उसे भेजें, हटाएं या ब्राउज़र डेटा साफ़ करें।",
    ],
  },
  {
    icon: Eye,
    en: "Who can see it",
    hi: "कौन देख सकता है",
    itemsEn: [
      "Everyone: complaint title, description, photo, location, ward, status and timeline. Your name too, unless you report anonymously.",
      "City officers: complaints of their own city only. Field workers: only the jobs assigned to them.",
      "Nobody else sees your phone number or email. Revealing an anonymous reporter needs a written reason and is recorded in the audit log.",
    ],
    itemsHi: [
      "सभी: शिकायत का शीर्षक, विवरण, फ़ोटो, जगह, वार्ड, स्थिति और टाइमलाइन। आपका नाम भी — अगर आप गुमनाम नहीं चुनते।",
      "शहर के अधिकारी: सिर्फ़ अपने शहर की शिकायतें। फ़ील्ड कर्मचारी: सिर्फ़ उन्हें दिए गए काम।",
      "फ़ोन नंबर और ईमेल कोई और नहीं देखता। गुमनाम शिकायतकर्ता की पहचान देखने के लिए लिखित कारण चाहिए और यह ऑडिट लॉग में दर्ज होता है।",
    ],
  },
  {
    icon: Trash2,
    en: "How to delete your data",
    hi: "डेटा कैसे हटाएं",
    itemsEn: [
      "Use “Delete my account” below or on your Profile page. You confirm twice; then it happens at once, on our server.",
      "To remove only a draft, tap “Discard” on the report page.",
    ],
    itemsHi: [
      "नीचे या अपनी प्रोफ़ाइल पर “मेरा खाता हटाएं” दबाएं। दो बार पुष्टि करें; फिर यह तुरंत हमारे सर्वर पर होता है।",
      "सिर्फ़ ड्राफ़्ट हटाने के लिए रिपोर्ट पेज पर “हटाएं” दबाएं।",
    ],
  },
];

function PrivacyPage() {
  const { language } = useLanguage();
  const hi = language === "hi";
  return (
    <Layout>
      <div className="container max-w-3xl space-y-6 py-10">
        <header>
          <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> {hi ? "गोपनीयता" : "Privacy"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-foreground">
            {hi ? "आपका डेटा, आपकी मर्ज़ी" : "Your data, your choice"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {hi
              ? "NagarNazar सिर्फ़ वही डेटा रखता है जो शिकायत हल करने और काम का सबूत दिखाने के लिए ज़रूरी है।"
              : "NagarNazar keeps only what is needed to resolve complaints and prove the fixes."}
          </p>
        </header>

        {BLOCKS.map((b) => (
          <section
            key={b.en}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-card"
          >
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-foreground">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <b.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {hi ? b.hi : b.en}
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-foreground/85">
              {(hi ? b.itemsHi : b.itemsEn).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            {hi ? "संपर्क" : "Contact"}
          </h2>
          <p className="mt-3 text-sm text-foreground/85">
            {hi
              ? "गोपनीयता से जुड़े सवाल या शिकायत के लिए Team SANT को GitHub पर लिखें:"
              : "For privacy questions or requests, write to Team SANT on GitHub:"}{" "}
            <a
              href="https://github.com/mohitk518/nagarnazar/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline"
            >
              github.com/mohitk518/nagarnazar/issues
            </a>
            .{" "}
            {hi
              ? "निजी जानकारी वहाँ सार्वजनिक रूप से न लिखें।"
              : "Please don't post personal details there publicly."}
          </p>
        </section>

        <DeleteAccountCard />
      </div>
    </Layout>
  );
}
