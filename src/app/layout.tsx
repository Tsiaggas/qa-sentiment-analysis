import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from '@/lib/supabase/server'; // Server client
import LogoutButton from '@/components/LogoutButton'; // Logout button component
import Link from 'next/link';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QA Evaluation App", // Updated title
  description: "Admin interface for QA evaluations", // Updated description
};

// Make the layout an async component to fetch user data
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        {user && (
          <header className="bg-gray-800 text-white p-4 shadow-md dark:bg-gray-950">
            <div className="container mx-auto flex justify-between items-center">
              <span className="text-sm">Logged in as: {user.email}</span>
              <nav className="flex items-center space-x-4">
                 <Link href="/" className="text-sm hover:text-gray-300">Evaluations</Link>
                 <Link href="/metrics" className="text-sm hover:text-gray-300">Metrics</Link>
                 <Link href="/users" className="text-sm hover:text-gray-300">User Management</Link>
                 <Link href="/reviews" className="text-sm hover:text-gray-300">Κριτικές Πελατών</Link>
                 <Link href="/reviews/new" className="text-sm hover:text-gray-300">Νέα Κριτική</Link>
                 <Link href="/metrics/sentiment" className="text-sm hover:text-gray-300">Ανάλυση Συναισθήματος</Link>
                 <LogoutButton />
              </nav>
            </div>
          </header>
        )}
        <main className="flex-grow container mx-auto p-4 md:p-6">
          {children}
        </main>
        {/* Optional Footer can go here */}
      </body>
    </html>
  );
}
