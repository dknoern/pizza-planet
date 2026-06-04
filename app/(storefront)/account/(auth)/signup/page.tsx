import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { SignInWithAmazonButton } from "../../../components/SignInWithAmazonButton";
import { SignupForm } from "./SignupForm";

export default async function SignupPage(props: { searchParams: Promise<{ next?: string }> }) {
  const auth = await resolveCustomer();
  if (auth) redirect("/account/orders");
  const { next } = await props.searchParams;
  return (
    <div className="section" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <SignInWithAmazonButton next={next ?? "/account/orders"} />
        <SignupForm />
        <p
          className="mono muted"
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Already have an account?{" "}
          <Link href="/account/login" style={{ color: "var(--text-secondary)" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
