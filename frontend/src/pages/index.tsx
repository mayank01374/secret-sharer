import SecretForm from "../components/ShortenForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1">🔐 Secret Sharing</h1>
          <p className="text-gray-400">
            Share sensitive information securely with one-time access and
            automatic expiry
          </p>
        </div>

        <SecretForm />
      </div>
    </div>
  );
}
