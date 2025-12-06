"use client";

import { Header } from "@/components/header";
import { DataGrid } from "@/components/grid";
import { Sidebar } from "@/components/sidebar";

export default function DemoPage() {
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



