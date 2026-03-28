"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");

  const isAccessDenied = error === "AccessDenied";

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="max-w-md w-full mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold text-stone-900 mb-3">
          {isAccessDenied ? "Access Restricted" : "Sign-in Error"}
        </h1>
        <p className="text-stone-600 mb-6">
          {isAccessDenied
            ? "This app is currently invite-only. If you'd like access, contact the person who sent you here."
            : "Something went wrong during sign-in. Please try again."}
        </p>
        <a
          href="/api/auth/signin"
          className="inline-block px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded hover:bg-stone-700 transition-colors"
        >
          Back to Sign In
        </a>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
