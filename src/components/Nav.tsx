"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export const Navbar = () => {
  const router = useRouter();
  const logout = async () => {
    const res = await fetch("/api/logout", {
      method: "POST",
    });
    if (res.ok) {
      return router.push("/login");
    }
    console.error("failed to logout");
  };
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
        <button onClick={logout} className="btn btn-ghost">
          Logout
        </button>
      </div>
    </div>
  );
};
