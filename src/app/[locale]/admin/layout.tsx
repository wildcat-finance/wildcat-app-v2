import { AppLayout } from "@/components/AppLayout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
