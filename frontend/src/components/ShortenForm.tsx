import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import SecretLinkBox from "./SecretLinkBox";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function ShortenForm() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState(60);
  const [secretUrl, setSecretUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset submitted state when content changes
  useEffect(() => {
    if (content !== "") {
      setSecretUrl("");
      setError("");
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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

      // 1. Generate AES Key
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const key = CryptoJS.enc.Hex.parse(
        Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );

      // Generate explicit IV
      const ivBytes = crypto.getRandomValues(new Uint8Array(16));
      const iv = CryptoJS.enc.Hex.parse(
        Array.from(ivBytes)
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

      // 2. Encrypt the message
      const encrypted = CryptoJS.AES.encrypt(content, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      const ivHex = iv.toString(CryptoJS.enc.Hex);
      // 3. Send ciphertext and iv to backend
      const res = await fetch(`${BACKEND_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext,
          iv: ivHex,
          expiresIn,
          password: password || undefined, // Send password if it exists
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid JSON response from backend");
      }

      if (!res.ok || !data.secretUrl) {
        throw new Error(data?.error || "Failed to generate secret URL");
      }

      // 4. Append encryption key in #fragment (Base64)
      const fullUrl = `${data.secretUrl}#${key.toString(CryptoJS.enc.Base64)}`;
      setSecretUrl(fullUrl);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };
  //gfdgd
  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter your secret"
        required
        className="bg-gray-700 text-white p-3 rounded w-full"
      />
      {/* Add Password Input */}
      <div className="mt-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Optional Password"
          className="bg-gray-700 text-white p-3 rounded w-full border border-gray-600 focus:outline-none focus:border-purple-500"
        />
      </div>
      <div className="mt-2">
        <label className="text-white mr-2">Expires In:</label>
        <select
          value={expiresIn}
          onChange={(e) => setExpiresIn(Number(e.target.value))}
          className="bg-gray-700 text-white p-2 rounded"
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
        className="mt-2 bg-purple-600 px-4 py-2 rounded text-white"
      >
        {loading ? "Encrypting..." : "Generate Secret"}
      </button>
      {error && <p className="text-red-400 mt-2">{error}</p>}
      {secretUrl && <SecretLinkBox secretUrl={secretUrl} />}
    </form>
  );
}
