"use client";

import { useState } from "react";
import type { StoredApplication } from "@/lib/applications/store";
import { ApplicationTable } from "./application-table";
import { ApplicationDrawer } from "./application-drawer";

export function AdminWorkspace({ rows }: { rows: StoredApplication[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <ApplicationTable rows={rows} onOpen={(row) => setOpenId(row.id)} />
      {openId && <ApplicationDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
