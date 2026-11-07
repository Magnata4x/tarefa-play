import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const released = await supabase.rpc("release_my_pending");
    if (released.error) throw new Error(released.error.message);
    const [profile, roles, wallet, campaigns, submissions, transactions, withdrawals, advertiserWallet, referrals, social, settings, starts] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("task_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("advertiser_wallets").select("*").eq("advertiser_id", userId).maybeSingle(),
      supabase.from("referrals").select("*").eq("referrer_id", userId).order("created_at", { ascending: false }),
      supabase.from("social_accounts").select("*").eq("user_id", userId),
      supabase.from("platform_settings").select("*").eq("id", 1).single(),
      supabase.from("task_starts").select("*").eq("user_id", userId),
    ]);
    for (const response of [profile, roles, wallet, campaigns, submissions, transactions, withdrawals, advertiserWallet, referrals, social, settings, starts]) {
      if (response.error) throw new Error(response.error.message);
    }
    return {
      userId, profile: profile.data, roles: (roles.data ?? []).map(r => r.role), wallet: wallet.data,
      campaigns: campaigns.data ?? [], submissions: submissions.data ?? [], transactions: transactions.data ?? [],
      withdrawals: withdrawals.data ?? [], advertiserWallet: advertiserWallet.data, referrals: referrals.data ?? [],
      social: social.data ?? [], settings: settings.data, starts: starts.data ?? [],
    };
  });