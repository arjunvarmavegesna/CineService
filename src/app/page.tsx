import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#14142A] text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="w-16 h-16 bg-[#E03455] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-black text-2xl">C</span>
        </div>

        <h1 className="text-4xl font-bold mb-3">CineServe</h1>
        <p className="text-white/60 text-lg mb-8">
          Order food and drinks delivered directly to your cinema seat
        </p>

        <Link
          href="/order"
          className="block w-full bg-[#E03455] hover:bg-[#FF4060] text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          Start Ordering 🍿
        </Link>

        <p className="text-white/30 text-sm mt-6">
          Scan the QR code at your seat or tap above to begin
        </p>
      </div>
    </main>
  );
}