import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";
import SecretLinkBox from "./SecretLinkBox";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function ShortenForm() {
  const [content, setContent] = useState("");
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
      // 1. Generate AES Key
      const key = CryptoJS.lib.WordArray.random(32);
      // 2. Encrypt the message
      const encrypted = CryptoJS.AES.encrypt(content, key);
      const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
      const iv = encrypted.iv.toString(CryptoJS.enc.Hex);
      // 3. Send ciphertext and iv to backend
      const res = await fetch(`${BACKEND_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext, iv, expiresIn }),
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
