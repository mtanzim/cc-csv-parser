"use client";

import { useEffect, useState } from "react";

const getMonthData = async (month: string) => {
  return fetch(`/api/persist?month=${month}`, {
    method: "GET",
  }).then((res) => res.json());
};

export default function Page({ params }: { params: { month: string } }) {
  const slug = params.month;
  const [data, setData] = useState(null);
  useEffect(() => {
    getMonthData(slug).then(setData);
  }, [slug]);

  return (
    <div>
      <h1>Current Month: {slug}</h1>
      <code>{JSON.stringify(data)}</code>
    </div>
  );
}
