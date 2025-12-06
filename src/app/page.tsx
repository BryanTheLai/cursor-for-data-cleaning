"use client";

import { Header } from "@/components/header";
import { DataGrid } from "@/components/grid";
import { Sidebar } from "@/components/sidebar";

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-full">
            <DataGrid />
          </div>
        </main>

        {/* Sidebar */}
        <Sidebar />
      </div>
    </div>
  );
}
