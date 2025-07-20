import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Generate AES Key
      const key = CryptoJS.lib.WordArray.random(32).toString();

      // 2. Encrypt the message
      const ciphertext = CryptoJS.AES.encrypt(content, key).toString();

      // 3. Send only ciphertext to backend
      const res = await fetch(`${BACKEND_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: ciphertext, expiresIn }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to shorten URL");

      // 4. Append encryption key in #fragment
      const fullUrl = `${data.secretUrl}#${key}`;
      setSecretUrl(fullUrl);
    } catch (err: any) {
      setError(err.message);
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
        className="bg-gray-700 text-white p-3 rounded w-full"
      />
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
