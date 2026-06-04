import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { SignInWithAmazonButton } from "../components/SignInWithAmazonButton";
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
      {auth ? null : (
        <div style={{ maxWidth: 460, margin: "16px 0" }}>
          <SignInWithAmazonButton next="/checkout" />
        </div>
      )}
      <CheckoutForm signedIn={!!auth} />
    </div>
  );
}
