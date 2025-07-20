import { useState } from "react";
import SecretLinkBox from "./SecretLinkBox";
import toast from "react-hot-toast";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export default function SecretForm() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
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
          password: usePassword ? password : undefined,
          expiresIn,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSecretUrl(data.secretUrl);
      setSubmitted(true);
      toast.success("Secret created successfully!");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("An unknown error occurred.");
        toast.error("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-12">
      <form
        onSubmit={handleSubmit}
        className="md:w-1/2 space-y-4 bg-gray-800 p-6 rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold text-white">Create a Secret</h2>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Your Secret
          </label>
          <textarea
            rows={4}
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter your secret message, password, token..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="inline-flex items-center gap-2 text-white">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={usePassword}
              onChange={() => setUsePassword(!usePassword)}
            />
            Add Password Protection
          </label>
          {usePassword && (
            <input
              type="password"
              className="mt-2 w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Expire After
          </label>
          <select
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Creating Secret..."
            : submitted
            ? "Secret Created"
            : "Create Secret"}
        </button>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}
      </form>

      <div className="md:w-1/2">
        {secretUrl && <SecretLinkBox secretUrl={secretUrl} />}
      </div>
    </div>
  );
}
