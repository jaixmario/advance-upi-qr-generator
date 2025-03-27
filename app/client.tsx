"use client"

import dynamic from "next/dynamic"

// Dynamically import the client page with no SSR
const ClientPage = dynamic(() => import("./client-page"), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto py-8 px-4 text-center">
      <h1 className="text-3xl font-bold text-center mb-8">UPI QR Code Generator</h1>
      <div className="animate-pulse">
        <p>Loading UPI QR Generator...</p>
      </div>
    </div>
  ),
})

export default function Client() {
  return <ClientPage />
}

