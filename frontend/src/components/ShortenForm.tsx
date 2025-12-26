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
      if (!content || content.trim().length === 0) {
        setError("Please enter a secret.");
        setLoading(false);
        return;
      }

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const key = CryptoJS.enc.Hex.parse(
        Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );
      const ivBytes = crypto.getRandomValues(new Uint8Array(16));
      const iv = CryptoJS.enc.Hex.parse(
        Array.from(ivBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );

      const encrypted = CryptoJS.AES.encrypt(content, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      const ivHex = iv.toString(CryptoJS.enc.Hex);

      const res = await fetch(`${BACKEND_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext,
          iv: ivHex,
          expiresIn,
          password: password || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.secretUrl) {
        throw new Error(data?.error || "Failed to generate secret URL");
      }

      const fullUrl = `${data.secretUrl}#${key.toString(CryptoJS.enc.Base64)}`;
      setSecretUrl(fullUrl);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter your secret"
        required
        className="bg-gray-700 text-white p-3 rounded w-full border border-gray-600 focus:outline-none focus:border-purple-500"
      />

      <div className="mt-4">
        <label className="text-gray-300 block mb-1">
          Password Protection (Optional)
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter a password to lock this secret"
          className="bg-gray-700 text-white p-3 rounded w-full border border-gray-600 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="mt-4">
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
        disabled={loading}
        className="mt-6 w-full bg-purple-600 px-4 py-3 rounded text-white font-bold hover:bg-purple-500 transition"
      >
        {loading ? "Encrypting..." : "Generate Secret Link"}
      </button>
      {error && <p className="text-red-400 mt-2">{error}</p>}
      {secretUrl && <SecretLinkBox secretUrl={secretUrl} />}
    </form>
  );
}
