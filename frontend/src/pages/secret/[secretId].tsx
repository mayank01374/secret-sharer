import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function SecretViewer() {
  const router = useRouter();
  const { secretId } = router.query;
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!secretId) return;
    fetch(`${BACKEND_URL}/secret/${secretId}`).then(async (res) => {
      if (res.status === 410) {
        setError("⚠️ THE INTENDED USER HAS ALREADY SEEN THE SECRET");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.content) {
        setSecret(data.content);
      } else if (data.requiresPassword) {
        setRequiresPassword(true);
      } else {
        setError(
          data.error || data.message || "Secret not found or already accessed."
        );
      }
      setLoading(false);
    });
  }, [secretId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // First, verify the password with POST
    const verifyRes = await fetch(`${BACKEND_URL}/secret/${secretId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!verifyRes.ok) {
      const data = await verifyRes.json();
      setError(data.error || "Invalid password or secret not found.");
      setLoading(false);
      return;
    }
    // If password is correct, fetch the secret with the password as a query param
    fetch(
      `${BACKEND_URL}/secret/${secretId}?password=${encodeURIComponent(
        password
      )}`
    ).then(async (res) => {
      if (res.status === 410) {
        setError("⚠️ THE INTENDED USER HAS ALREADY SEEN THE SECRET");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.content) {
        setSecret(data.content);
        setRequiresPassword(false);
      } else {
        setError(
          data.error || data.message || "Invalid password or secret not found."
        );
      }
      setLoading(false);
    });
  };

  const handleCopy = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <p className="text-center text-white">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-xl max-w-xl w-full">
        <h2 className="text-2xl font-bold mb-4">🔐 Secret</h2>
        {requiresPassword ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <label className="block text-sm font-medium">
              Password Required
            </label>
            <input
              type="password"
              className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter password to view secret"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold transition"
            >
              View Secret
            </button>
            {error && (
              <p className="text-red-400 font-bold text-lg text-center">
                {error}
              </p>
            )}
          </form>
        ) : error ? (
          <p className="text-red-400 font-bold text-lg text-center">{error}</p>
        ) : (
          <>
            <pre className="bg-gray-700 p-4 rounded text-lg break-words">
              {secret}
            </pre>
            <p className="mt-4 text-sm text-gray-300">
              ✅ This secret has now been deleted and cannot be viewed again.
            </p>
            <button
              className="mt-4 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
              onClick={handleCopy}
            >
              📋 {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
