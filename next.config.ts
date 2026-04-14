import type { NextConfig } from "next"

// ── Content Security Policy ───────────────────────────────────────────────────
// Strict policy aligned with the WAF rules in infrastructure/terraform/security.tf.
// Nonces are not used here (added at request time via middleware if needed).
const CSP = [
  "default-src 'self'",
  // Scripts: self + Next.js inline scripts (hashed at build) + Stripe.js + Razorpay
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.razorpay.com",
  // Styles: self + inline (Tailwind CSS-in-JS)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: Google Fonts CDN
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + S3 presigned URLs + Google avatars + data URIs (grain SVG)
  "img-src 'self' data: https://*.amazonaws.com https://lh3.googleusercontent.com",
  // Frames: Stripe hosted UI + Daily.co video call iframe
  "frame-src https://js.stripe.com https://*.daily.co",
  // Connect: self + Stripe API + Pusher (realtime) + Razorpay
  "connect-src 'self' https://api.stripe.com https://sockjs-*.pusher.com wss://*.pusher.com https://api.razorpay.com",
  // Media: camera/mic for video calls (Daily.co handles inside iframe)
  "media-src 'self'",
  // No plugins, no object embeds
  "object-src 'none'",
  // Base URI locked to self — prevents base tag injection
  "base-uri 'self'",
  // All form submissions must go to self
  "form-action 'self'",
  // Opt in to HTTPS-only for this origin
  "upgrade-insecure-requests",
].join("; ")

// ── Security headers ──────────────────────────────────────────────────────────
// CloudFront already sets HSTS (preload) and the security headers policy
// defined in infrastructure/terraform/security.tf. These headers are a
// defense-in-depth layer for local dev and direct App Runner access.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options",    value: "nosniff"          },
  { key: "X-Frame-Options",           value: "DENY"             },
  { key: "X-XSS-Protection",          value: "1; mode=block"    },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  {
    key:   "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: CSP },
]

const nextConfig: NextConfig = {
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.amazonaws.com"           },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source:  "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ]
  },

  // Disable the X-Powered-By header — no reason to advertise the framework
  poweredByHeader: false,

  // Strict mode catches double-invocation bugs in React components
  reactStrictMode: true,
}

export default nextConfig
