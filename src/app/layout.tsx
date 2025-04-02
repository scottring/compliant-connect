import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { QuestionBankProvider } from '@/context/QuestionBankContext';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppProvider>
            <QuestionBankProvider>
              {children}
            </QuestionBankProvider>
          </AppProvider>
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
} 