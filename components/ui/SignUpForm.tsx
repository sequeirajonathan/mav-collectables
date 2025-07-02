"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { PhoneInput } from "@components/ui/PhoneInput";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useSignUp, useUser } from "@clerk/nextjs";
import { UserRole } from "@interfaces/roles";
import { useUserMetadata } from "@hooks/useUserMetadata";
import { toast } from "react-hot-toast";
import axios from "axios";

interface SignupFormProps {
  hideLoginLink?: boolean;
}

interface SquareCustomer {
  id: string;
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  phoneNumber?: string;
}

export function SignupForm({ hideLoginLink = false }: SignupFormProps) {
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [phoneValue, setPhoneValue] = useState("");
  const { user } = useUser();
  const { setUserRole } = useUserMetadata(user?.id || '');
  const [cooldown, setCooldown] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [existingCustomer, setExistingCustomer] = useState<SquareCustomer | null>(null);
  const [needsNameInput, setNeedsNameInput] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCustomerSetup = useCallback(async (firstName: string, lastName: string) => {
    try {
      const phoneNumber = signUp?.phoneNumber;
      if (!phoneNumber) {
        toast.error("Phone number is required");
        return;
      }

      console.log('Setting up customer with:', {
        firstName,
        lastName,
        email: signUp?.emailAddress,
        phone: phoneNumber
      });

      // Check if we have an existing customer from state
      if (existingCustomer) {
        // Update existing customer
        await axios.put(`/api/v1/update-square-customer/${existingCustomer.id}`, {
          emailAddress: signUp?.emailAddress,
          givenName: firstName,
          familyName: lastName,
        });
      } else {
        // Create new Square customer
        await axios.post("/api/v1/create-square-customer", {
          emailAddress: signUp?.emailAddress,
          givenName: firstName,
          familyName: lastName,
          phoneNumber: phoneNumber.replace(/\D/g, "").slice(-10),
          address: {
            country: "US",
            firstName: firstName,
            lastName: lastName,
            addressLine1: "Pending",
            locality: "Pending",
            postalCode: "00000",
          },
          referenceId: user?.id,
        });
      }

      // Set user role
      const result = await setUserRole(UserRole.USER);
      if (!result.success) {
        toast.error(result.error || "Failed to set user role");
      }

      // Update Clerk metadata with first and last name
      try {
        await user?.update({
          unsafeMetadata: {
            firstName: firstName,
            lastName: lastName,
            role: UserRole.USER
          }
        });
        console.log('Updated Clerk unsafe metadata with name and role');
      } catch (error) {
        console.error('Failed to update Clerk metadata:', error);
      }

      // Mark setup as complete
      setNeedsNameInput(false);
    } catch (error) {
      console.error("Error handling Square customer:", error);
      toast.error("Failed to process customer information");
    }
  }, [signUp, user, setUserRole]);

  // Check for existing Square customer and handle role setting
  useEffect(() => {
    const handleSquareCustomer = async () => {
      if (
        signUpLoaded &&
        signUp?.status === "complete" &&
        user?.id &&
        !(user?.unsafeMetadata as Record<string, unknown>)?.role
      ) {
        try {
          const phoneNumber = signUp.phoneNumber;
          if (!phoneNumber) {
            toast.error("Phone number is required");
            return;
          }

          console.log('Checking for existing Square customer with user ID:', user.id);

          // First, search by reference ID (user ID) to prevent duplicates
          const referenceIdSearchResponse = await axios.post(
            "/api/v1/search-square-customer",
            {
              referenceId: user.id,
            }
          );

          if (referenceIdSearchResponse.data.customers?.length > 0) {
            // Customer already exists with this user ID, just set role
            const customer = referenceIdSearchResponse.data.customers[0];
            console.log('Found existing customer by reference ID:', customer.id);
            setExistingCustomer(customer);
            setFirstName(customer.givenName || "");
            setLastName(customer.familyName || "");
            
            // Set user role without creating/updating customer
            const result = await setUserRole(UserRole.USER);
            if (!result.success) {
              toast.error(result.error || "Failed to set user role");
            }

            // Update Clerk metadata
            try {
              await user?.update({
                unsafeMetadata: {
                  firstName: customer.givenName || "",
                  lastName: customer.familyName || "",
                  role: UserRole.USER
                }
              });
              console.log('Updated Clerk unsafe metadata with existing customer info');
            } catch (error) {
              console.error('Failed to update Clerk metadata:', error);
            }

            setNeedsNameInput(false);
            return;
          }

          // If no customer found by reference ID, search by phone number
          const phoneSearchResponse = await axios.post(
            "/api/v1/search-square-customer",
            {
              phoneNumber: phoneNumber.replace(/\D/g, "").slice(-10),
            }
          );

          if (phoneSearchResponse.data.customers?.length > 0) {
            // Customer exists by phone, update with reference ID and use their info
            const customer = phoneSearchResponse.data.customers[0];
            console.log('Found existing customer by phone, updating reference ID:', customer.id);
            setExistingCustomer(customer);
            setFirstName(customer.givenName || "");
            setLastName(customer.familyName || "");
            
            // Update existing customer with reference ID
            await axios.put(`/api/v1/update-square-customer/${customer.id}`, {
              referenceId: user.id,
              emailAddress: signUp?.emailAddress,
            });

            // Set user role
            const result = await setUserRole(UserRole.USER);
            if (!result.success) {
              toast.error(result.error || "Failed to set user role");
            }

            // Update Clerk metadata
            try {
              await user?.update({
                unsafeMetadata: {
                  firstName: customer.givenName || "",
                  lastName: customer.familyName || "",
                  role: UserRole.USER
                }
              });
              console.log('Updated Clerk unsafe metadata with existing customer info');
            } catch (error) {
              console.error('Failed to update Clerk metadata:', error);
            }

            setNeedsNameInput(false);
          } else {
            // New customer, require name input
            console.log('No existing customer found, requiring name input');
            setNeedsNameInput(true);
          }
        } catch (error) {
          console.error("Error checking Square customer:", error);
          // If search fails, require name input as fallback
          setNeedsNameInput(true);
        }
      }
    };

    handleSquareCustomer();
  }, [signUp, user, signUpLoaded, setUserRole]);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <Image
          src="/mav_collectibles.png"
          alt="MAV Collectibles Logo"
          width={200}
          height={80}
          className="w-auto h-auto"
        />
      </div>
      <SignUp.Root>
        <SignUp.Step name="start">
          <h1 className="text-2xl font-bold mb-6 text-center text-[#E6B325]">
            Sign Up
          </h1>
          <div className="space-y-4">
            <Clerk.Field name="username">
              <Clerk.Label asChild>
                <Label htmlFor="username">Username</Label>
              </Clerk.Label>
              <Clerk.Input
                asChild
                className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
              >
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  required
                />
              </Clerk.Input>
              <Clerk.FieldError />
            </Clerk.Field>

            <Clerk.Field name="emailAddress">
              <Clerk.Label asChild>
                <Label htmlFor="email">Email</Label>
              </Clerk.Label>
              <Clerk.Input
                asChild
                className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
              </Clerk.Input>
              <Clerk.FieldError />
            </Clerk.Field>

            <Clerk.Field name="phoneNumber">
              <Clerk.Label asChild>
                <Label htmlFor="phoneNumber">Phone Number (US Only)</Label>
              </Clerk.Label>
              <Clerk.Input
                asChild
                className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
              >
                <PhoneInput
                  id="phoneNumber"
                  type="tel"
                  placeholder="(555) 123-4567"
                  required
                  value={phoneValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPhoneValue(value);
                    
                    // Format the value for Clerk (E.164 format)
                    const digits = value.replace(/\D/g, '');
                    const e164Value = `+1${digits}`;
                    
                    // Update the input value directly
                    e.target.value = e164Value;
                  }}
                />
              </Clerk.Input>
              <Clerk.FieldError />
            </Clerk.Field>

            <Clerk.Field name="password">
              <Clerk.Label asChild>
                <Label htmlFor="password">Password</Label>
              </Clerk.Label>
              <Clerk.Input
                asChild
                className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
              >
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  required
                />
              </Clerk.Input>
              <Clerk.FieldError />
            </Clerk.Field>

            <Clerk.Field name="confirmPassword">
              <Clerk.Label asChild>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
              </Clerk.Label>
              <Clerk.Input
                asChild
                className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  required
                />
              </Clerk.Input>
              <Clerk.FieldError />
            </Clerk.Field>

            <div
              id="clerk-captcha"
              data-cl-theme="dark"
              data-cl-size="normal"
              data-cl-language="en-US"
              className="mt-4"
            />

            <SignUp.Action submit asChild>
              <Button type="submit" className="w-full" variant="gold">
                Sign Up
              </Button>
            </SignUp.Action>
          </div>

          <div className="my-6 flex items-center gap-4">
            <hr className="flex-1 border-[#E6B325] opacity-40" />
            <span className="text-[#E6B325] text-sm font-semibold">
              Or continue with
            </span>
            <hr className="flex-1 border-[#E6B325] opacity-40" />
          </div>

          <div className="flex flex-col gap-2">
            <Clerk.Connection name="google" asChild>
              <Button
                variant="outline"
                className="w-full border-[#E6B325] text-[#E6B325] hover:bg-[#E6B325] hover:text-white"
              >
                Google
              </Button>
            </Clerk.Connection>

            <Clerk.Connection name="facebook" asChild>
              <Button
                variant="outline"
                className="w-full border-[#E6B325] text-[#E6B325] hover:bg-[#E6B325] hover:text-white"
              >
                Facebook
              </Button>
            </Clerk.Connection>
          </div>

          {!hideLoginLink && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-[#E6B325] hover:underline">
                Log in
              </Link>
            </p>
          )}
        </SignUp.Step>

        <SignUp.Step name="verifications">
          <SignUp.Strategy name="phone_code">
            <h1 className="text-2xl font-bold mb-6 text-center text-[#E6B325]">
              Verify your phone
            </h1>

            <p className="text-center mb-4 text-gray-400">
              We&apos;ve sent a verification code to{" "}
              <span className="text-[#E6B325] font-medium">
                {signUp?.phoneNumber}
              </span>
            </p>

            <Clerk.Field name="code">
              <Clerk.Label asChild>
                <Label>Phone verification code</Label>
              </Clerk.Label>
              <Clerk.Input
                asChild
                className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
              >
                <Input placeholder="Enter code" />
              </Clerk.Input>
              <Clerk.FieldError />
            </Clerk.Field>

            <div className="mt-4 space-y-4">
              <SignUp.Action
                resend
                className="w-full text-[#E6B325] hover:text-[#FFD966] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                fallback={({ resendableAfter }) => (
                  <button
                    type="button"
                    disabled
                    className="w-full text-[#E6B325]/50 text-sm cursor-not-allowed"
                  >
                    Resend code in {resendableAfter} seconds
                  </button>
                )}
              >
                Didn&apos;t receive the code? Resend
              </SignUp.Action>

              <SignUp.Action
                navigate={signUp?.createdSessionId ? "previous" : "start"}
                className="w-full text-gray-400 hover:text-white text-sm"
              >
                Need to change your phone number?
              </SignUp.Action>
            </div>

            <SignUp.Action submit asChild>
              <Button type="submit" className="w-full mt-4" variant="gold">
                Verify Phone
              </Button>
            </SignUp.Action>
          </SignUp.Strategy>

          <SignUp.Strategy name="email_code">
            <h1 className="text-2xl font-bold mb-6 text-center text-[#E6B325]">
              Confirm your email
            </h1>

            <p className="text-center mb-4 text-gray-400">
              We&apos;ve sent a verification code to{" "}
              <span className="text-[#E6B325] font-medium">
                {signUp?.emailAddress}
              </span>
            </p>

            <Clerk.Field name="code">
              <Clerk.Label asChild>
                <Label>Email verification code</Label>
              </Clerk.Label>
              <Clerk.Input
                asChild
                className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
              >
                <Input placeholder="Enter code" />
              </Clerk.Input>
              <Clerk.FieldError />
            </Clerk.Field>

            <div className="mt-4 space-y-4">
              <SignUp.Action
                resend
                className="w-full text-[#E6B325] hover:text-[#FFD966] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                fallback={({ resendableAfter }) => (
                  <button
                    type="button"
                    disabled
                    className="w-full text-[#E6B325]/50 text-sm cursor-not-allowed"
                  >
                    Resend code in {resendableAfter} seconds
                  </button>
                )}
              >
                Didn&apos;t receive the code? Resend
              </SignUp.Action>

              <SignUp.Action
                navigate="start"
                className="w-full text-gray-400 hover:text-white text-sm"
              >
                Need to change your email?
              </SignUp.Action>
            </div>

            <SignUp.Action submit asChild>
              <Button type="submit" className="w-full mt-4" variant="gold">
                Confirm Email
              </Button>
            </SignUp.Action>
          </SignUp.Strategy>
        </SignUp.Step>

        <SignUp.Step name="continue">
          <h1 className="text-2xl font-bold mb-6 text-center text-[#E6B325]">
            Complete your profile
          </h1>
          <div className="space-y-4">
            {needsNameInput ? (
              <>
                <p className="text-center text-gray-400 mb-4">
                  Please provide your name to complete your profile.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="border-2 border-[#E6B325] bg-[#181d29] text-white focus:border-[#FFD966]"
                      required
                    />
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    if (!firstName || !lastName) {
                      toast.error("Please provide both first and last name");
                      return;
                    }
                    await handleCustomerSetup(firstName, lastName);
                  }}
                  className="w-full mt-4" 
                  variant="gold"
                >
                  Complete Setup
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-gray-400 mb-4">
                  Your account has been created successfully! You can now access your dashboard.
                </p>
                <SignUp.Action submit asChild>
                  <Button type="submit" className="w-full mt-4" variant="gold">
                    Go to Dashboard
                  </Button>
                </SignUp.Action>
              </>
            )}
          </div>
        </SignUp.Step>
      </SignUp.Root>
    </div>
  );
}
