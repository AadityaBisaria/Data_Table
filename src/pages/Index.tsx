import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DataTable } from "@/components/data-table/DataTable";
import { ApiConfig } from "@/components/ApiConfig";
import { DEFAULT_API_URL } from "@/lib/api";

const Index = () => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Data Explorer</h2>
              <p className="text-muted-foreground">
                Explore and analyze data with advanced filtering, sorting, and pagination capabilities.
              </p>
            </div>
            <ApiConfig currentUrl={apiUrl} onUrlChange={setApiUrl} />
          </div>
          
          <DataTable apiUrl={apiUrl} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
