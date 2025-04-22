import { Suspense } from "react";
import TokenReport from "@/components/token/TokenReport";
import RiskIndicator from "@/components/token/RiskIndicator";
import Spinner from "@/components/ui/Spinner";

interface TokenPageProps {
  params: {
    address: string;
  };
}

export default function TokenPage({ params }: TokenPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Token Analysis</h1>
        <p className="text-gray-600 mt-2">Address: {params.address}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Risk Assessment</h2>
          <Suspense fallback={<Spinner />}>
            <RiskIndicator address={params.address} />
          </Suspense>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Report</h2>
          <Suspense fallback={<Spinner />}>
            <TokenReport address={params.address} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
