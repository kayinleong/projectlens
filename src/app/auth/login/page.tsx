"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  loginWithEmailAndPassword,
  setAuthCookies,
} from "@/lib/firebase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const userCredential = await loginWithEmailAndPassword(email, password);
      await setAuthCookies(userCredential.user);
      router.push("/dashboard");
    } catch {
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ProjectLens</h1>
                <p className="text-sm text-gray-500">CelcomDigi Enterprise</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
              Employee Login
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center p-4 pt-16 pb-24 min-h-[calc(100vh-120px)]">
        <div className="w-full max-w-md">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-sm">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 text-sm">
              Sign in to access your project management dashboard
            </p>
          </div>

          {/* Login Card */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold text-center text-gray-900">
                Employee Login
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                Enter your CelcomDigi credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert
                    variant="destructive"
                    className="bg-red-50 border-red-200"
                  >
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@celcomdigi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-700 font-medium"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Sign In</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              © {new Date().getFullYear()} CelcomDigi Enterprise. All rights
              reserved.
            </div>
            <div className="flex space-x-4"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
