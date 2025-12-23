import React from 'react';
import Head from 'next/head';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Head>
        <title>Crypto Trading Bot</title>
        <meta name="description" content="Advanced cryptocurrency trading bot" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gray-900">
        {children}
      </main>
    </>
  );
} 