import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const auth = await resolveCustomer();
  return (
    <div className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">04 / Checkout</div>
          <h2>Prepare for launch</h2>
          {auth ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Signed in as {auth.customer.email}.
            </p>
          ) : (
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Checking out as a guest. Sign in to save this order to your travel log.
            </p>
          )}
        </div>
      </div>
      <CheckoutForm signedIn={!!auth} />
    </div>
  );
}
