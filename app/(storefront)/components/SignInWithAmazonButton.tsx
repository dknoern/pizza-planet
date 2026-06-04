type Props = {
  next?: string;
};

export function SignInWithAmazonButton({ next }: Props) {
  if (!process.env.LWA_CLIENT_ID) return null;

  const href = next
    ? `/api/auth/amazon/start?next=${encodeURIComponent(next)}`
    : "/api/auth/amazon/start";

  return (
    <>
      <a
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "10px 16px",
          background: "#ff9900",
          color: "#111",
          border: "1px solid #e88f00",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="#111"
            d="M3.5 16.2c2.4 1.7 5.4 2.5 8.5 2.5 3 0 6-.8 8.5-2.5.2-.1.4.1.3.3-2.1 2.4-5.4 3.6-8.8 3.6-3.4 0-6.7-1.2-8.8-3.6-.2-.2.1-.4.3-.3zm15.7-1.9c-.3-.3-1.7-.1-2.4 0-.2 0-.2-.2-.1-.3 1.1-.8 3-.5 3.2-.3.2.2 0 2.1-1 3-.2.1-.3 0-.2-.1.3-.7.8-2 .5-2.3zm-1.5-9.7C16.4 3.4 14.4 3 12.3 3c-3 0-5.7 1.4-7.7 3.7-.2.2 0 .4.2.3 2.5-2 6.1-2.7 9.5-1.4l1.1.5c.2 0 .3-.1.3-.2v-1.3zm-7.6 8c1.4 0 2.7-.7 3.4-1.9.4-.7.6-1.5.6-2.4 0-2.4-1.6-3.7-3.8-3.7-2.3 0-3.9 1.4-3.9 3.7 0 2.4 1.5 4.3 3.7 4.3z"
          />
        </svg>
        <span>Sign in with Amazon</span>
      </a>
      <div
        className="mono muted"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "16px 0",
          fontSize: 11,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--border, #2a2a2a)" }} />
        <span>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--border, #2a2a2a)" }} />
      </div>
    </>
  );
}
