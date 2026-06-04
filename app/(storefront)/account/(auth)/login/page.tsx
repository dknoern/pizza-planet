import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { SignInWithAmazonButton } from "../../../components/SignInWithAmazonButton";
import { LoginForm } from "./LoginForm";

export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const auth = await resolveCustomer();
  if (auth) redirect("/account/orders");
  const { next } = await props.searchParams;
  return (
    <div className="section" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <SignInWithAmazonButton next={next ?? "/account/orders"} />
        <LoginForm />
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
          New here?{" "}
          <Link href="/account/signup" style={{ color: "var(--text-secondary)" }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
