"use client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
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
    <div className="w-11/12 max-w-sm md:w-full items-center">
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="mt-4"
        type="username"
        placeholder="Username"
      />
      <Input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-4"
        type="password"
        placeholder="Password"
      />
      {errMsg && <p className="text-red-500">{errMsg}</p>}
      {isLoading && <p className="text-slate-400 animate-pulse">Loading...</p>}
      <button
        className="mt-4 w-1/4 float-end"
        type="submit"
        onClick={handleSubmit}
      >
        Login
      </button>
    </div>
  );
}
