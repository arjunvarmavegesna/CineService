import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-[#F4F4F9] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">
          Your account is not authorized to access the admin panel.
          Contact the administrator if you believe this is a mistake.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#E03455] hover:bg-[#C82040] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Go to customer site
        </Link>
      </div>
    </main>
  );
}
