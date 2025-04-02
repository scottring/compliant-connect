import { AuthCleaner } from './AuthCleaner'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthCleaner />
      {/* Rest of your layout code */}
      {children}
    </>
  )
}   