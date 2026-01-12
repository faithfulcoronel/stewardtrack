"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Lock,
  Church,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { decodeTenantToken } from "@/lib/tokens/shortUrlTokens";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface TenantInfo {
  id: string;
  name: string;
  denomination?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  confirmPassword: string;
}

interface PageProps {
  params: Promise<{ tenantToken: string }>;
}

interface AuthenticatedUser {
  email: string;
  firstName?: string;
  lastName?: string;
}

function MemberRegistrationContent({ tenantToken }: { tenantToken: string }) {
  const router = useRouter();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  // Expand all sections by default so members can see all fields
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "personal",
    "contact",
    "account",
  ]);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    preferredName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndLoadTenant() {
      const supabase = createSupabaseBrowserClient();

      try {
        // Check if user is already authenticated
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setAuthenticatedUser({
            email: user.email || "",
            firstName: user.user_metadata?.first_name,
            lastName: user.user_metadata?.last_name,
          });
        }

        // Decode tenant token to get tenant ID
        const tenantId = decodeTenantToken(tenantToken);

        if (!tenantId) {
          toast.error("Invalid registration link");
          router.push("/");
          return;
        }

        // Fetch tenant info from API
        const response = await fetch(`/api/public/tenant-info?tenantId=${tenantId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setTenant(result.data);
        } else {
          toast.error("Unable to load church information");
          router.push("/");
        }
      } catch (error) {
        console.error("Error loading page:", error);
        toast.error("Unable to load registration page");
        router.push("/");
      } finally {
        setIsLoadingTenant(false);
      }
    }

    checkAuthAndLoadTenant();
  }, [tenantToken, router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      setAuthenticatedUser(null);
      toast.success("Signed out successfully. You can now register.");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleGoToDashboard() {
    router.push("/admin");
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Turnstile validation
    if (!turnstileToken) {
      newErrors.turnstile = "Please complete the security check";
    }

    setErrors(newErrors);

    // Expand sections with errors
    const sectionsWithErrors: string[] = [];
    if (newErrors.firstName || newErrors.lastName || newErrors.preferredName) {
      sectionsWithErrors.push("personal");
    }
    if (newErrors.email || newErrors.phone || newErrors.address) {
      sectionsWithErrors.push("contact");
    }
    if (newErrors.password || newErrors.confirmPassword) {
      sectionsWithErrors.push("account");
    }
    if (sectionsWithErrors.length > 0) {
      setExpandedSections(sectionsWithErrors);
    }

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    if (!tenant) {
      toast.error("Church information not loaded");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/member-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantToken,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          preferredName: formData.preferredName.trim() || undefined,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          address: formData.address.trim() || undefined,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          turnstileToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSuccess(true);
        toast.success("Registration successful!");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred during registration");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleInputChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  if (isLoadingTenant) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  // Show prompt if user is already authenticated
  if (authenticatedUser && !isLoadingTenant) {
    const displayName = authenticatedUser.firstName
      ? `${authenticatedUser.firstName}${authenticatedUser.lastName ? ` ${authenticatedUser.lastName}` : ""}`
      : authenticatedUser.email;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E] flex items-center justify-center p-4">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="rounded-full bg-amber-100 p-4 w-fit mx-auto mb-6">
            <User className="h-12 w-12 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Already Signed In
          </h1>
          <p className="text-gray-600 mb-2">
            You are currently signed in as:
          </p>
          <p className="font-semibold text-gray-900 mb-6">
            {displayName}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you want to register as a new member, please sign out first.
            Otherwise, you can go to your dashboard.
          </p>
          <div className="space-y-3">
            <Button
              onClick={handleGoToDashboard}
              className="w-full h-11"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full h-11"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out & Register New Account
                </>
              )}
            </Button>
          </div>
          {tenant && (
            <p className="text-xs text-gray-400 mt-6">
              Registering for: {tenant.name}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="rounded-full bg-green-100 p-4 w-fit mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to {tenant?.name}!
          </h1>
          <p className="text-gray-600 mb-6">
            Your member account has been created successfully. You can now log in
            to access your member dashboard.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full h-11">
              <Link href="/login">Sign In</Link>
            </Button>
            <p className="text-sm text-gray-500">
              Check your email for a confirmation link.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />

      <div className="relative z-10 px-4 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center rounded-full bg-white/20 p-3 mb-4">
              <Church className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Join {tenant?.name}
            </h1>
            <p className="text-white/80">
              Register as a member of our church community
            </p>
          </motion.div>

          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                <Accordion
                  type="multiple"
                  value={expandedSections}
                  onValueChange={setExpandedSections}
                  className="divide-y divide-gray-100"
                >
                  {/* Personal Information */}
                  <AccordionItem value="personal" className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-[#179a65]/10 p-2">
                          <User className="h-4 w-4 text-[#179a65]" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          Personal Information
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label
                              htmlFor="firstName"
                              className="block text-sm font-medium text-gray-700"
                            >
                              First Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                              id="firstName"
                              type="text"
                              placeholder="John"
                              value={formData.firstName}
                              onChange={(e) =>
                                handleInputChange("firstName", e.target.value)
                              }
                              disabled={isSubmitting}
                              className={`h-11 ${
                                errors.firstName ? "border-red-500" : ""
                              }`}
                            />
                            {errors.firstName && (
                              <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.firstName}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor="lastName"
                              className="block text-sm font-medium text-gray-700"
                            >
                              Last Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                              id="lastName"
                              type="text"
                              placeholder="Doe"
                              value={formData.lastName}
                              onChange={(e) =>
                                handleInputChange("lastName", e.target.value)
                              }
                              disabled={isSubmitting}
                              className={`h-11 ${
                                errors.lastName ? "border-red-500" : ""
                              }`}
                            />
                            {errors.lastName && (
                              <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="preferredName"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Preferred Name{" "}
                            <span className="text-gray-400">(optional)</span>
                          </label>
                          <Input
                            id="preferredName"
                            type="text"
                            placeholder="What should we call you?"
                            value={formData.preferredName}
                            onChange={(e) =>
                              handleInputChange("preferredName", e.target.value)
                            }
                            disabled={isSubmitting}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Contact Information */}
                  <AccordionItem value="contact" className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-[#179a65]/10 p-2">
                          <Mail className="h-4 w-4 text-[#179a65]" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          Contact Information
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Email <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            disabled={isSubmitting}
                            className={`h-11 ${
                              errors.email ? "border-red-500" : ""
                            }`}
                          />
                          {errors.email && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.email}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="phone"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+63 912 345 6789"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            disabled={isSubmitting}
                            className={`h-11 ${
                              errors.phone ? "border-red-500" : ""
                            }`}
                          />
                          {errors.phone && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.phone}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="address"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Address{" "}
                            <span className="text-gray-400">(optional)</span>
                          </label>
                          <Input
                            id="address"
                            type="text"
                            placeholder="Street, City, Province"
                            value={formData.address}
                            onChange={(e) =>
                              handleInputChange("address", e.target.value)
                            }
                            disabled={isSubmitting}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Account Setup */}
                  <AccordionItem value="account" className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-[#179a65]/10 p-2">
                          <Lock className="h-4 w-4 text-[#179a65]" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          Account Setup
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6 pt-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Password <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={formData.password}
                            onChange={(e) =>
                              handleInputChange("password", e.target.value)
                            }
                            disabled={isSubmitting}
                            className={`h-11 ${
                              errors.password ? "border-red-500" : ""
                            }`}
                          />
                          {errors.password && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.password}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-gray-700"
                          >
                            Confirm Password{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Re-enter your password"
                            value={formData.confirmPassword}
                            onChange={(e) =>
                              handleInputChange("confirmPassword", e.target.value)
                            }
                            disabled={isSubmitting}
                            className={`h-11 ${
                              errors.confirmPassword ? "border-red-500" : ""
                            }`}
                          />
                          {errors.confirmPassword && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.confirmPassword}
                            </p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Cloudflare Turnstile CAPTCHA */}
                <div className="px-6 py-4 border-t border-gray-100">
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                      onSuccess={(token) => {
                        setTurnstileToken(token);
                        if (errors.turnstile) {
                          setErrors({ ...errors, turnstile: "" });
                        }
                      }}
                      onError={() => {
                        setTurnstileToken(null);
                        setErrors({
                          ...errors,
                          turnstile: "Security check failed. Please try again.",
                        });
                      }}
                      onExpire={() => {
                        setTurnstileToken(null);
                      }}
                      options={{
                        theme: "light",
                        size: "normal",
                      }}
                    />
                  </div>
                  {errors.turnstile && (
                    <p className="text-sm text-red-500 flex items-center justify-center gap-1 mt-2">
                      <AlertCircle className="h-3 w-3" />
                      {errors.turnstile}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                  <p className="text-xs text-center text-gray-500 mt-4">
                    By registering, you agree to our{" "}
                    <Link
                      href="/terms"
                      className="underline hover:text-gray-700"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="underline hover:text-gray-700"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </div>
            </form>

            {/* Already have an account */}
            <p className="text-center text-white/80 text-sm mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-white hover:underline"
              >
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return <MemberRegistrationContent tenantToken={resolvedParams.tenantToken} />;
}
