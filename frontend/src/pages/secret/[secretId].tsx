import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import CryptoJS from "crypto-js";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

interface WindowWithVanta extends Window {
  VANTA?: {
    NET?: (options: Record<string, unknown>) => { destroy?: () => void };
  };
  THREE?: unknown;
}

export default function SecretViewer() {
  const router = useRouter();
  const { secretId } = router.query;
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const vantaRef = useRef<HTMLDivElement>(null);

  // Background Effect (Vanta.js)
  useEffect(() => {
    let vantaEffect: { destroy?: () => void } | null = null;
    if (typeof window !== "undefined" && vantaRef.current) {
      const win = window as WindowWithVanta;
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

  const handleReveal = async () => {
    if (!secretId) return;

    // Check hash existence
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setError("Missing decryption key in URL.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/secret/${secretId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Secret not found or expired");

      // CASE 1: Password Required
      if (data.passwordRequired) {
        setPasswordRequired(true);
        setLoading(false);
        return;
      }

      // CASE 2: Immediate Success
      decryptAndShow(data.ciphertext, data.iv);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load secret.");
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/secret/${secretId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid Password");

      decryptAndShow(data.ciphertext, data.iv);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const decryptAndShow = (ciphertext: string, ivHex: string) => {
    try {
      const hash = window.location.hash.slice(1);
      const key = CryptoJS.enc.Base64.parse(hash);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv }).toString(
        CryptoJS.enc.Utf8
      );

      if (!decrypted) throw new Error("Failed to decrypt (Invalid Key)");

      setSecret(decrypted);
      setPasswordRequired(false);
    } catch (e) {
      setError("Decryption failed. The link might be broken.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      ref={vantaRef}
      className="min-h-screen w-full bg-[#0a0a0a] text-white px-8 py-12 flex items-center justify-center relative"
    >
      <div className="absolute inset-0 z-0" />
      <motion.div
        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl max-w-xl w-full z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold mb-6 text-center font-sans">
          Secret
        </h2>

        {error && (
          <p className="text-red-400 font-bold text-lg text-center mb-4">
            {error}
          </p>
        )}

        {/* State 1: Ready to Reveal */}
        {!secret && !error && !passwordRequired && (
          <div className="text-center">
            <p className="text-gray-300 mb-6">
              This secret is safe. Click below to reveal and destroy it.
            </p>
            <button
              onClick={handleReveal}
              disabled={loading}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500 text-white"
              }`}
            >
              {loading ? "Checking..." : "Reveal Secret"}
            </button>
          </div>
        )}

        {/* State 2: Password Required */}
        {passwordRequired && !secret && (
          <div className="flex flex-col gap-4">
            <p className="text-center text-yellow-400 font-semibold">
              Password Protected
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter Password..."
              className="p-3 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handlePasswordSubmit}
              disabled={loading}
              className="bg-purple-600 px-6 py-3 rounded font-bold text-white hover:bg-purple-500 transition"
            >
              {loading ? "Unlocking..." : "Unlock & View"}
            </button>
          </div>
        )}

        {/* State 3: Secret Revealed */}
        {secret && (
          <>
            <pre className="bg-gray-700 p-6 rounded-lg text-lg break-words text-green-300 shadow-inner">
              {secret}
            </pre>
            <p className="mt-4 text-sm text-gray-300 text-center">
              This secret has now been deleted and cannot be viewed again.
            </p>
            <button
              className="mt-4 w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition"
              onClick={handleCopy}
            >
              📋 {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
