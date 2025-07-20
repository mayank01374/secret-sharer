import { useState } from "react";
import SecretLinkBox from "./SecretLinkBox";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { generateKey, encryptMessage, exportKey } from "../utils/encryption";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function SecretForm() {
  const [content, setContent] = useState("");
  const [expiresIn, setExpiresIn] = useState(60);
  const [secretUrl, setSecretUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSecretUrl("");

    try {
      // 1. Generate key and encrypt message
      const key = await generateKey();
      const { ciphertext, iv } = await encryptMessage(content, key);
      const keyString = await exportKey(key);

      // 2. Send only ciphertext and iv to backend
      const res = await fetch(`${BACKEND_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ciphertext, iv, expiresIn }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create secret");

      // 3. Build short URL with hash
      const finalUrl = `${data.shortUrl}#${keyString}`;
      setSecretUrl(finalUrl);
      setSubmitted(true);
      toast.success("Secret created and encrypted!");
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-12">
      <motion.form
        onSubmit={handleSubmit}
        className="md:w-1/2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl space-y-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-semibold text-white font-sans">
          Create a Secret
        </h2>
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Your Secret
          </label>
          <textarea
            rows={4}
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans"
            placeholder="Enter your secret message, password, token..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Expire After
          </label>
          <select
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans"
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
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed font-sans"
        >
          {loading
            ? "Creating Secret..."
            : submitted
            ? "Secret Created"
            : "Create Secret"}
        </button>
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-400 text-center font-sans">{error}</p>
          </div>
        )}
      </motion.form>
      <div className="md:w-1/2">
        {secretUrl && <SecretLinkBox secretUrl={secretUrl} />}
      </div>
    </div>
  );
}
