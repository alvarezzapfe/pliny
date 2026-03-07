import dynamic from "next/dynamic";
const CreditScoreDemo = dynamic(() => import("@/components/CreditScore"), { ssr: false });
export default function Page() { return <CreditScoreDemo />; }
