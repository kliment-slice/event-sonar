"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  const callEndpoint1 = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setActiveEndpoint("endpoint1");
      
      const res = await fetch("/api/test", {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      
      const data = await res.json();
      setResponse(data.message || JSON.stringify(data));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const callEndpoint2 = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setActiveEndpoint("endpoint2");
      
      const res = await fetch("/api/toolhouse", {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      
      const data = await res.json();
      setResponse(data.message || JSON.stringify(data));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-6">AITX Hack Diagram and API</h1>
      
      <div className="flex space-x-4 mb-4">
        <button
          onClick={callEndpoint1}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {isLoading && activeEndpoint === "endpoint1" ? "Loading..." : "Endpoint 1"}
        </button>
        <button
          onClick={callEndpoint2}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {isLoading && activeEndpoint === "endpoint2" ? "Loading..." : "Endpoint 2"}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 w-full max-w-md">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}
      
      {response && (
        <div className="border text-black rounded-lg shadow-md p-6 mb-8 w-full max-w-md bg-gray-50">
          <p className="whitespace-pre-wrap break-words">{response}</p>
        </div>
      )}
      
      <div className="w-full max-w-4xl">
        <Image
          src="/aitx_hack.drawio.png"
          alt="AITX Hack Diagram"
          width={1200}
          height={800}
          priority
          className="rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
}