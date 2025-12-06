"use client";

import { useEffect } from "react";
import { Header } from "@/components/header";
import { DataGrid } from "@/components/grid";
import { Sidebar } from "@/components/sidebar";
import { useGridStore } from "@/store/useGridStore";

export default function DemoPage() {
  const resetDemo = useGridStore((state) => state.resetDemo);

  useEffect(() => {
    // Reset client-side state
    resetDemo();
    // Reset server-side demo store (fire and forget)
    fetch('/api/demo/reset', { method: 'POST' }).catch(() => {});
  }, [resetDemo]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-4 overflow-auto">
          <div className="w-full">
            <DataGrid />
          </div>
        </main>

        <Sidebar />
      </div>
    </div>
  );
}




