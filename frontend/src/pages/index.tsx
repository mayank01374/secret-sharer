import { useState, useEffect, useRef } from "react";
import SecretLinkBox from "@/components/SecretLinkBox";
import CryptoJS from "crypto-js";
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

// Custom type for window with VANTA and THREE
interface WindowWithVanta extends Window {
  VANTA?: {
    NET?: (options: Record<string, unknown>) => { destroy?: () => void };
  };
  THREE?: unknown;
}

export default function HomePage() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState(60);
  const [secretUrl, setSecretUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const vantaRef = useRef<HTMLDivElement>(null);

  // Reset submitted state when content changes
  useEffect(() => {
    setSubmitted(false);
  }, [content]);

  useEffect(() => {
    let vantaEffect: { destroy?: () => void } | null = null;
    if (typeof window !== "undefined" && vantaRef.current) {
      const win = window as WindowWithVanta;
      // Dynamically load VANTA and THREE from CDN
      const loadVanta = async () => {
        if (!win.THREE) {
          await new Promise((resolve) => {
            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
            script.onload = resolve;
            document.body.appendChild(script);
          });
        }
        if (!win.VANTA || !win.VANTA.NET) {
          await new Promise((resolve) => {
            const script = document.createElement("script");
            script.src =
              "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js";
            script.onload = resolve;
            document.body.appendChild(script);
          });
        }
        if (win.VANTA && win.VANTA.NET) {
          vantaEffect = win.VANTA.NET({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0x18e320,
            backgroundColor: 0x9091f,
            points: 10,
            maxDistance: 20,
            spacing: 15,
            showDots: true,
          });
        }
      };
      loadVanta();
    }
    return () => {
      if (vantaEffect && typeof vantaEffect.destroy === "function") {
        vantaEffect.destroy();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    setLoading(true);
    setError("");
    setSecretUrl("");

    try {
      // Validate content before encryption
      if (!content || content.trim().length === 0) {
        setError("Please enter a secret.");
        setLoading(false);
        return;
      }

      // Validate content type
      if (typeof content !== "string") {
        setError("Secret content must be a string.");
        setLoading(false);
        return;
      }

      // Use CryptoJS for encryption, matching ShortenForm
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const key = CryptoJS.enc.Hex.parse(
        Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );

      // Validate key
      if (!key || typeof key !== "object") {
        throw new Error("Encryption key generation failed.");
      }

      // Debug logging
      console.log("🔐 content:", content);
      console.log("🔐 key (typeof):", typeof key);
      console.log("🔐 key.toString():", key?.toString());
      console.log("🔐 key constructor:", key?.constructor?.name);

      const encrypted = CryptoJS.AES.encrypt(content, key);
      const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      const iv = encrypted.iv.toString(CryptoJS.enc.Hex);
      const res = await fetch(`${BACKEND_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ciphertext, iv, expiresIn }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid JSON response from backend");
      }

      if (!res.ok || !data.secretUrl) {
        console.error("Backend error:", data);
        throw new Error(data?.error || "Failed to generate secret URL");
      }

      setSecretUrl(`${data.secretUrl}#${key.toString(CryptoJS.enc.Base64)}`);
      setSubmitted(true);
    } catch (err) {
      console.error("Frontend error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={vantaRef}
      id="vanta-bg"
      className="min-h-screen w-full bg-[#0a0a0a] text-white px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 relative"
    >
      <div className="absolute inset-0 z-0" />
      {/* Form Section */}
      <div className="flex flex-col justify-center z-10">
        <h1 className="text-4xl font-bold mb-6">Create a One-Time Secret</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Secret
            </label>
            <textarea
              rows={4}
              className="w-full p-4 rounded-lg bg-[#1a1a1a] border border-gray-700 focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your secret message, password, token..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password Protection{" "}
              <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="password"
              className="w-full p-4 rounded-lg bg-[#1a1a1a] border border-gray-700 focus:ring-2 focus:ring-purple-500"
              placeholder="Set password to protect your secret"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Expires In</label>
            <select
              className="w-full p-4 rounded-lg bg-[#1a1a1a] border border-gray-700 focus:ring-2 focus:ring-purple-500"
              value={expiresIn}
              onChange={(e) => setExpiresIn(Number(e.target.value))}
            >
              <option value={10}>10 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={180}>3 hours</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || submitted}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading
              ? "Creating Secret..."
              : submitted
              ? "Secret Created"
              : "Create Secret"}
          </button>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* Output Section */}
      <div className="flex flex-col justify-center z-10">
        {secretUrl ? (
          <SecretLinkBox secretUrl={secretUrl} />
        ) : (
          <div className="text-gray-500 text-center md:text-left">
            <p className="text-lg">Generated link will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
