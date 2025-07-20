import { useState } from "react";
import SecretLinkBox from "./SecretLinkBox";
import QRCode from "react-qr-code";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function SecretForm() {
  const [content, setContent] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState(60);
  const [secretUrl, setSecretUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const expiryOptions = [
    { value: 10, label: "10 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 180, label: "3 hours" },
    { value: 360, label: "6 hours" },
    { value: 720, label: "12 hours" },
    { value: 1440, label: "24 hours" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    setLoading(true);
    setError("");
    setSecretUrl("");

    try {
      const res = await fetch(`${BACKEND_URL}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          password: usePassword ? password : undefined,
          expiresIn,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setSecretUrl(data.secretUrl);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto p-4">
      {/* Left: Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-800 p-6 rounded-xl shadow-xl"
      >
        <h2 className="text-xl font-bold text-white mb-4">
          🔐 Create a Secret
        </h2>
        <textarea
          rows={4}
          className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Enter your secret message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          autoFocus
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={() => setUsePassword(!usePassword)}
          />
          <label className="text-white">Protect with password</label>
        </div>

        {usePassword && (
          <input
            type="password"
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-white">
            Expires In
          </label>
          <select
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={expiresIn}
            onChange={(e) => setExpiresIn(Number(e.target.value))}
          >
            {expiryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || submitted}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold text-white transition disabled:opacity-50"
        >
          {loading ? "Creating..." : submitted ? "Created" : "Create Secret"}
        </button>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}
      </form>

      {/* Right: Output */}
      <div className="bg-gray-900 text-white p-6 rounded-xl shadow-xl flex flex-col items-center justify-center">
        {secretUrl ? (
          <>
            <p className="text-lg text-green-400 font-semibold mb-2">
              ✅ Secret created successfully!
            </p>
            <SecretLinkBox secretUrl={secretUrl} />
            <div className="mt-4">
              <QRCode
                value={secretUrl}
                size={128}
                bgColor="#1f2937"
                fgColor="#ffffff"
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center">
            Your generated secret will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
