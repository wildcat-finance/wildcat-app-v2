import { AppLayout } from "@/components/AppLayout"

export default function BorrowerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
