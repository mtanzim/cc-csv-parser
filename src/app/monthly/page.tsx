"use client";

import { Navbar } from "@/components/Nav";
import { PageContainer } from "@/components/PageContainer";
import Link from "next/link";
import { useEffect, useState } from "react";

const listMonths = async () => {
  return fetch(`/api/persist`, {
    method: "GET",
  }).then((res) => res.json());
};

// TODO: fix templating around auth
export default function Page() {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listMonths()
      .then((d) => setData(d.months))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <Navbar onLogout={() => null} />
      <PageContainer>
        {data.length === 0 && <h1 className="text-xl">No data found</h1>}
        {data.length > 0 && (
          <div>
            <h1 className="text-xl">Months</h1>
            <div className="flex gap-4 mt-2">
              {data.map((month) => (
                <Link
                  key={month}
                  className="btn btn-wide btn-secondary"
                  href={`/monthly/${month}`}
                >
                  {month}
                </Link>
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
