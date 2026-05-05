import { ShieldCheck } from "lucide-react";
import { useI18n } from "../i18n";

const sections = [
  {
    title: "Privacy Policy",
    items: [
      "Gym Rival stores account, group, workout, challenge, invite, and profile data needed to run the service.",
      "Users can export and delete account data from Business Setup.",
      "Beta analytics are limited to product events such as signup, invites, workouts, and billing setup."
    ]
  },
  {
    title: "Terms",
    items: [
      "The app provides training tracking and educational exercise guides, not medical advice.",
      "Customers are responsible for confirming that members are healthy enough to train.",
      "Subscription billing requires Stripe environment keys before live charging is enabled."
    ]
  },
  {
    title: "Media Rights",
    items: [
      "Exercise guide images are generated in-house for this app and should be tracked as project-owned assets.",
      "Do not add third-party videos, GIFs, or images unless the license permits commercial app usage.",
      "Replace temporary guide assets with final reviewed images before paid launch."
    ]
  }
];

export function LegalPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rival-green/15 text-rival-green">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-3xl font-black text-white">{t("Legal Readiness")}</h1>
            <p className="mt-2 text-sm text-slate-400">{t("Baseline terms, privacy, and media-rights language for a beta launch.")}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {sections.map((section) => (
          <article key={section.title} className="surface-panel p-5">
            <h2 className="text-xl font-black text-white">{t(section.title)}</h2>
            <div className="mt-5 space-y-3">
              {section.items.map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-300">
                  {t(item)}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
