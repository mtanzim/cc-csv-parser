import React, { ReactNode } from "react";

export const PageContainer = ({ children }: { children: ReactNode }) => (
  <div className="m-12 flex flex-row gap-12 max-h-fit">{children}</div>
);
