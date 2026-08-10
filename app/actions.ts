"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const initialFunds = [
  { scheme_code: 120586, name: "ICICI Prudential Large Cap Fund (erstwhile Bluechip Fund) - Direct Plan - Growth", short_name: "ICICI Prudential Large Cap", category: "Large Cap", invested_amount: 15000 },
  { scheme_code: 152939, name: "TRUSTMF SMALL CAP FUND -DIRECT PLAN-GROWTH", short_name: "TRUSTMF Small Cap", category: "Small Cap", invested_amount: 35000 },
  { scheme_code: 150584, name: "WhiteOak Capital Mid Cap Fund Direct Plan Growth", short_name: "WhiteOak Capital Mid Cap", category: "Mid Cap", invested_amount: 20000 },
  { scheme_code: 151895, name: "Bajaj Finserv Flexi Cap Fund-Direct Plan-Growth", short_name: "Bajaj Finserv Flexi Cap", category: "Flexi Cap", invested_amount: 20000 },
];

export async function seedPortfolio() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const rows = initialFunds.map((fund) => ({ ...fund, user_id: user.id, purchase_date: "2026-08-04" }));
  const { error } = await supabase.from("funds").upsert(rows, { onConflict: "user_id,scheme_code,purchase_date" });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function addFund(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const row = {
    user_id: user.id,
    scheme_code: Number(formData.get("scheme_code")),
    name: String(formData.get("name")),
    short_name: String(formData.get("short_name")),
    category: String(formData.get("category")),
    invested_amount: Number(formData.get("invested_amount")),
    purchase_date: String(formData.get("purchase_date")),
    units: formData.get("units") ? Number(formData.get("units")) : null,
    purchase_nav: formData.get("purchase_nav") ? Number(formData.get("purchase_nav")) : null,
  };
  const { error } = await supabase.from("funds").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function addEtf(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const quantity = Number(formData.get("quantity"));
  const avgPrice = Number(formData.get("avg_price"));
  if (!(quantity > 0) || !(avgPrice > 0)) throw new Error("Valid quantity and average price are required.");
  const investedInput = formData.get("invested_amount");
  const row = {
    user_id: user.id,
    symbol: String(formData.get("symbol")).trim().toUpperCase(),
    exchange: "NSE",
    name: String(formData.get("name")),
    short_name: String(formData.get("short_name")),
    category: String(formData.get("category")),
    quantity,
    avg_price: avgPrice,
    invested_amount: investedInput ? Number(investedInput) : quantity * avgPrice,
  };
  const { error } = await supabase.from("etfs").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateEtfHolding(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const symbol = String(formData.get("symbol")).trim().toUpperCase();
  const quantity = Number(formData.get("quantity"));
  const avgPrice = Number(formData.get("avg_price"));
  if (!id || !symbol || !(quantity > 0) || !(avgPrice > 0)) throw new Error("Valid symbol, quantity, and average price are required.");
  const { error } = await supabase
    .from("etfs")
    .update({ symbol, quantity, avg_price: avgPrice, invested_amount: quantity * avgPrice, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteHolding(id: string, instrumentType: "mutual_fund" | "etf") {
  const supabase = await createClient();
  const { error } = await supabase.from(instrumentType === "etf" ? "etfs" : "funds").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateAllotment(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const units = Number(formData.get("units"));
  const purchaseNav = Number(formData.get("purchase_nav"));
  if (!id || units <= 0 || purchaseNav <= 0) throw new Error("Valid units and purchase NAV are required.");
  const { error } = await supabase
    .from("funds")
    .update({ units, purchase_nav: purchaseNav, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
