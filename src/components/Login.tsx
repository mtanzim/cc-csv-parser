"use client";
import { useRouter } from "next/navigation";
import { MouseEventHandler, useState } from "react";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const router = useRouter();
  const handleSubmit: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrMsg(null);

    try {
      const res = await fetch(`/api/login`, {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
      });
      if (res.ok) {
        router.push("/");
        return;
      }
      throw new Error("failed to login");
    } catch (err) {
      console.log(err);
      setErrMsg("Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-sm md:w-full items-center">
      <h1 className="text-4xl">Welcome</h1>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="input input-bordered input-primary w-full max-w-xs mt-4"
        type="username"
        placeholder="Username"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input input-bordered input-primary w-full max-w-xs mt-4"
        type="password"
        placeholder="Password"
      />
      {errMsg && <p className="text-error mt-2">{errMsg}</p>}
      {isLoading && <p className="text-slate-400 animate-pulse">Loading...</p>}
      <button
        className="btn btn-primary mt-6"
        type="submit"
        onClick={handleSubmit}
      >
        Login
      </button>
    </div>
  );
}
