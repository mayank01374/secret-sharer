import { useState } from "react";
import SecretLinkBox from "@/components/SecretLinkBox";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function HomePage() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState(60);
  const [secretUrl, setSecretUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    setLoading(true);
    setError("");
    setSecretUrl("");

    try {
      const res = await fetch(`${BACKEND_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          password: password || undefined,
          expiresIn,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSecretUrl(data.secretUrl);
      setSubmitted(true);
    } catch (err) {
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
    <div className="min-h-screen bg-[#0a0a0a] text-white px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Form Section */}
      <div className="flex flex-col justify-center">
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
      <div className="flex flex-col justify-center">
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
