import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { verifyJWT } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabase";
import HomeClient from "./HomeClient";

async function getBuyerData(email) {
  const supabase = getSupabaseAdmin();

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, quantity, price_per_ticket, total_price, created_at, status")
    .eq("buyer_email", email)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (ordersError) console.error("[getBuyerData] orders error:", ordersError.message);
  if (!orders || orders.length === 0) return { orders: [], tickets: [] };

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, ticket_code, holder_name, order_id")
    .in("order_id", orders.map((o) => o.id));

  if (ticketsError) console.error("[getBuyerData] tickets error:", ticketsError.message);
  return { orders, tickets: tickets || [] };
}

export default async function Home() {
  const cookieStore = await cookies();

  const pwSession = cookieStore.get("pw_session")?.value;
  const validPasswords = (process.env.SITE_PASSWORD || '').split(',').map(p => p.trim()).filter(Boolean);
  const isLoggedIn = validPasswords.some(p =>
    createHash("sha256").update(p).digest("hex") === pwSession
  );

  let buyer = null;
  let orders = [];
  let tickets = [];

  const ticketToken = cookieStore.get("ticket_token")?.value;
  if (ticketToken) {
    const payload = await verifyJWT(ticketToken);
    if (payload?.buyer_email) {
      buyer = { email: payload.buyer_email, name: payload.buyer_name };
      // Skip real DB calls in dev when Supabase isn't configured
      if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("fake")) {
        ({ orders, tickets } = await getBuyerData(payload.buyer_email));
      }
    }
  }

  // Require either pw_session or a valid ticket_token to access
  if (!isLoggedIn && !buyer) redirect("/login");

  return <HomeClient buyer={buyer} orders={orders} tickets={tickets} />;
}
