"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fakeListMonths = async () => {
  return Promise.resolve({
    months: [
      "01-2025",
      "02-2025",
      "03-2025",
      "04-2025",
      "05-2025",
      "06-2025",
      "07-2025",
      "12-2024",
    ],
  });
};

const listMonths = async () => {
  return fetch(`/api/persist`, {
    method: "GET",
  }).then((res) => res.json());
};

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
      {data.length === 0 && <h1 className="text-xl">No data found</h1>}
      {data.length > 0 && (
        <div>
          {Object.entries(
            Object.groupBy(data, (m) => m?.split("-")?.at(-1) ?? "unknown"),
          )
            .toSorted((entryB, entryA) => {
              const [yearA] = entryA;
              const [yearB] = entryB;
              return Number(yearA) - Number(yearB);
            })
            .map((entry) => {
              const [year, months] = entry;
              return (
                <>
                  <h1 className="text-xl my-4">{year}</h1>
                  <div className="flex gap-4 mt-2">
                    {months
                      ?.toSorted(
                        (b, a) =>
                          Number(a?.split("-").at(0)) -
                          Number(b?.split("-").at(0)),
                      )
                      .map((month) => {
                        return (
                          <Link
                            key={month}
                            className="btn btn-wide btn-secondary"
                            href={`/monthly/${month}`}
                          >
                            {month}
                          </Link>
                        );
                      })}
                  </div>
                </>
              );
            })}
        </div>
      )}
      <div />
    </div>
  );
}
