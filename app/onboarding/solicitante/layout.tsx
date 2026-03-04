export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F0F7F4", fontFamily:"'Geist',sans-serif" }}>
      {children}
    </div>
  );
}
