import { useState } from "react";
import QRCode from "react-qr-code";

export default function SecretLinkBox({ secretUrl }: { secretUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(secretUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  //commented for triggering new build
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Secret Link",
          text: "Here's your one-time secret link",
          url: secretUrl,
        });
      } catch {
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
      {/* QR Code with fade-in animation */}
      <div className="flex justify-center mt-6 animate-fade-in">
        {secretUrl && (
          <QRCode
            value={secretUrl}
            size={148}
            bgColor="#1a1a1a"
            fgColor="#18e320"
            style={{ borderRadius: 12, boxShadow: "0 4px 24px #18e32033" }}
          />
        )}
      </div>
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}
