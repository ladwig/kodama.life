import styles from "./page.module.css";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabase";
import HomeClient from "./HomeClient";

async function getBuyerData(email) {
  const supabase = getSupabaseAdmin();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, quantity, price_per_ticket, total_price, event_date, created_at, status")
    .eq("buyer_email", email)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (!orders || orders.length === 0) return { orders: [], tickets: [] };

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_code, holder_name, order_id")
    .in("order_id", orders.map((o) => o.id));

  return { orders, tickets: tickets || [] };
}

export default async function Home() {
  const cookieStore = await cookies();
  const ticketToken = cookieStore.get("ticket_token")?.value;

  let buyer = null;
  let orders = [];
  let tickets = [];

  if (ticketToken) {
    const payload = await verifyJWT(ticketToken);
    if (payload?.buyer_email) {
      buyer = { email: payload.buyer_email, name: payload.buyer_name };
      ({ orders, tickets } = await getBuyerData(payload.buyer_email));
    }
  }

  return <HomeClient buyer={buyer} orders={orders} tickets={tickets} />;
}
