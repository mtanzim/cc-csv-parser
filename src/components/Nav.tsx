import Link from "next/link";

export const Navbar = ({ onLogout }: { onLogout?: () => void }) => {
  return (
    <div className="navbar bg-base-100">
      <div className="flex-1 gap-2">
        <Link className="btn btn-ghost text-xl" href="/">
          Expense CSV Parser
        </Link>
        <Link className="btn btn-ghost text-xl" href="/monthly">
          Monthly
        </Link>
      </div>
      <div className="flex-none">
        <button onClick={onLogout} className="btn btn-ghost">
          Logout
        </button>
      </div>
    </div>
  );
};
