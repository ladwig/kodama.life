import { redirect } from 'next/navigation';

// Sales are closed — the event is over. Restore the previous version of this
// file (git history) to reopen checkout.
export default function TicketsPage() {
    redirect('/');
}
