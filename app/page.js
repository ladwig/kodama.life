import Image from "next/image";
import styles from "./page.module.css";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabase";
import HomeClient from "./HomeClient";

async function getBuyerTickets(email) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tickets")
    .select(
      "id, ticket_code, holder_name, orders(price_per_ticket, total_price, event_date, quantity)"
    )
    .eq("orders.buyer_email", email)
    .eq("orders.status", "paid");
  return data || [];
}

export default async function Home() {
  const cookieStore = await cookies();
  const ticketToken = cookieStore.get("ticket_token")?.value;

  let buyer = null;
  let tickets = [];

  if (ticketToken) {
    const payload = await verifyJWT(ticketToken);
    if (payload?.buyer_email) {
      buyer = { email: payload.buyer_email, name: payload.buyer_name };
      tickets = await getBuyerTickets(payload.buyer_email);
    }
  }

  return <HomeClient buyer={buyer} tickets={tickets} />;
}
