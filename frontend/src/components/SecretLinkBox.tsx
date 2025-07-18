import { useState } from "react";

export default function SecretLinkBox({ secretUrl }: { secretUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(secretUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Secret Link",
          text: "Here's your one-time secret link",
          url: secretUrl,
        });
      } catch (err) {
        // Share canceled or failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-gray-800 p-4 mt-6 rounded-lg text-white">
      <p className="mb-2">🔗 Your secret link:</p>
      <div className="flex items-center justify-between gap-2 flex-wrap bg-gray-700 rounded p-2">
        <span className="break-all text-sm">{secretUrl}</span>
        <div className="flex gap-2 mt-2 sm:mt-0">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-600 rounded"
            title="Copy to clipboard"
          >
            {copied ? "✅" : "📋"}
          </button>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-gray-600 rounded"
            title="Share"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  );
}
