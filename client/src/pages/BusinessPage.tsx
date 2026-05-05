import { Activity, CreditCard, Download, Link as LinkIcon, MailCheck, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { ErrorState, LoadingState } from "../components/PageState";
import { UserAvatar } from "../components/UserAvatar";
import { useI18n } from "../i18n";
import type { BusinessData } from "../types";

export function BusinessPage() {
  const { user, account, organization, logout } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<BusinessData | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!user) return;
    setError(null);
    api.business(user.id).then(setData).catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setMessage(null);
    try {
      const invite = await api.createInvite(user.id, inviteEmail);
      setInviteEmail("");
      setMessage(`${t("Invite link")}: ${window.location.origin}${invite.inviteLink}`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? t(err.message) : t("Invite could not be created."));
    }
  }

  async function handleCheckout() {
    if (!user) return;
    const result = await api.startCheckout(user.id);
    if (result.url) {
      window.location.href = result.url;
      return;
    }
    setMessage(t(result.message));
  }

  async function handleExport() {
    if (!user) return;
    const result = await api.exportAccount(user.id);
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gym-rival-account-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!user || !confirm(t("Delete this account and its training data?"))) return;
    await api.deleteAccount(user.id);
    logout();
  }

  if (error) return <ErrorState message={t(error)} />;
  if (!data) return <LoadingState label={t("Loading business controls")} />;

  const activeOrganization = data.organization ?? organization;

  return (
    <div className="space-y-6">
      <section className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">{t("Business Setup")}</h1>
            <p className="mt-2 text-sm text-slate-400">{t("Groups, billing, legal controls, and beta proof for selling the app.")}</p>
          </div>
          <span className="chip">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-rival-green" />
            {account ? t(account.role) : t("Demo mode")}
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">{t("Group")}</div>
          <div className="mt-2 text-xl font-black text-white">{activeOrganization?.name ?? t("Demo arena")}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">{activeOrganization?.slug ?? "demo"}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">{t("Plan")}</div>
          <div className="mt-2 text-xl font-black text-rival-green">{data.billing?.plan ?? "demo"}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">{data.billing?.status ?? t("Not billable")}</div>
        </div>
        <div className="surface-panel p-4">
          <div className="text-sm text-slate-500">{t("Beta target")}</div>
          <div className="mt-2 text-xl font-black text-white">{data.beta.waitlistGroupsTarget} {t("groups")}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">{t("Pilot proof before paid launch")}</div>
        </div>
      </section>

      {data.admin ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="surface-panel p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rival-green/15 text-rival-green">
              <Activity className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-white">{data.admin.weeklyActiveRate}%</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">{t("Weekly active rate")}</div>
          </div>
          <div className="surface-panel p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rival-cyan/15 text-rival-cyan">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-white">{data.admin.workoutsPerActiveMember}</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">{t("Workouts per active member")}</div>
          </div>
          <div className="surface-panel p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rival-amber/15 text-rival-amber">
              <MailCheck className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-white">{data.admin.inviteConversionRate}%</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">{t("Invite conversion")}</div>
          </div>
          <div className="surface-panel p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rival-rose/15 text-rival-rose">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-2xl font-black text-white">{data.admin.clientErrors}</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">{t("Tracked errors")}</div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="surface-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">{t("Members")}</h2>
            <Users className="h-5 w-5 text-rival-cyan" />
          </div>
          <div className="mt-5 space-y-3">
            {data.members.length > 0 ? (
              data.members.map((member) => (
                <div key={member.accountId} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar avatar={member.user.avatar} name={member.user.username} size="sm" />
                    <div>
                      <div className="font-bold text-white">{member.user.username}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                  </div>
                  <span className="chip">{t(member.role)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">{t("Create an account to manage members and groups.")}</p>
            )}
          </div>
        </div>

        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Invite Links")}</h2>
          <form onSubmit={handleInvite} className="mt-5 flex gap-2">
            <input className="field" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="member@email.com" />
            <button className="neon-button" type="submit">
              <Plus className="h-4 w-4" />
              {t("Invite")}
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {data.invites.map((invite) => (
              <div key={invite.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
                <div className="font-bold text-white">{invite.email}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-rival-cyan">
                  <LinkIcon className="h-3.5 w-3.5" />
                  {invite.inviteLink}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="chip">{t(invite.deliveryStatus)}</span>
                  {invite.acceptedAt ? <span className="chip text-rival-green">{t("Accepted")}</span> : null}
                </div>
                {invite.deliveryError ? <div className="mt-2 text-xs text-rival-rose">{invite.deliveryError}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Billing")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{t("Stripe checkout is ready for environment-key connection and plan enforcement.")}</p>
          <button className="neon-button mt-5 w-full" type="button" onClick={handleCheckout}>
            <CreditCard className="h-4 w-4" />
            {t("Start checkout")}
          </button>
        </div>
        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Privacy")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{t("Users can export or delete their account data for privacy readiness.")}</p>
          <div className="mt-5 grid gap-2">
            <button className="ghost-button" type="button" onClick={handleExport}>
              <Download className="h-4 w-4" />
              {t("Export data")}
            </button>
            <button className="ghost-button border-rival-rose/25 text-rival-rose" type="button" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              {t("Delete account")}
            </button>
          </div>
        </div>
        <div className="surface-panel p-5">
          <h2 className="text-xl font-black text-white">{t("Beta Proof")}</h2>
          <div className="mt-4 space-y-2">
            {data.beta.suggestedPilotCriteria.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] p-2 text-sm font-semibold text-slate-300">
                {t(item)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {message ? <div className="rounded-lg border border-rival-cyan/25 bg-rival-cyan/10 p-4 text-sm font-bold text-rival-cyan">{message}</div> : null}
    </div>
  );
}
