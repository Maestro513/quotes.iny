import Link from "next/link";

export default function Nav() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="https://insurancenyou.com" className="flex items-center">
          <span className="text-xl font-bold text-[#3d1f5e]">
            Insurance&nbsp;<span className="text-[#22c55e]">'n</span> You
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          <Link href="/under-65" className="hover:text-[#3d1f5e] transition-colors">
            Under 65
          </Link>
          <Link href="/medicare" className="hover:text-[#3d1f5e] transition-colors">
            Medicare
          </Link>
          <Link href="/life" className="hover:text-[#3d1f5e] transition-colors">
            Life Insurance
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <a
            href="tel:844-467-6968"
            className="hidden sm:block font-semibold text-gray-700 hover:text-[#3d1f5e] transition-colors"
          >
            844-467-6968
          </a>
          <button className="border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 hover:border-[#3d1f5e] hover:text-[#3d1f5e] text-sm transition-colors">
            Login
          </button>
        </div>
      </div>
    </nav>
  );
}
