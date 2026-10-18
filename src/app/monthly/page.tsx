"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const listMonths = async () => {
  return fetch(`/api/persist`, {
    method: "GET",
  }).then((res) => res.json());
};

const monthMap = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [
    `${String(i + 1).padStart(2, "0")}`,
    new Date(0, i).toLocaleString("en", { month: "long" }),
  ]),
);

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
                <div className="m-4 mb-36" key={year}>
                  <Link
                    className="btn btn-primary btn-outline btn-wide"
                    href={`/yearly/${year}`}
                  >
                    {year}
                  </Link>
                  <span className="divider"></span>
                  <div className="flex gap-4 mt-2 flex-wrap">
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
                            className="btn btn-lg btn-secondary"
                            href={`/monthly/${month}`}
                          >
                            {monthMap[month.split("-")[0]]}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      <div />
    </div>
  );
}
