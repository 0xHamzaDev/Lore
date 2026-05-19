export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eeece7] px-4">
      <div className="w-full max-w-sm rounded-md border border-[#e5e7eb] bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
