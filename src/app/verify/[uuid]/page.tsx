"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Shield, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormData {
  requestId: string;
  recipientName: string;
  workspaceName: string;
  existingData: Record<string, string>;
  missingFields: string[];
  targetColumns: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

const BANK_OPTIONS = [
  { value: "MBB", label: "Maybank (MBB)" },
  { value: "CIMB", label: "CIMB Bank" },
  { value: "PBB", label: "Public Bank (PBB)" },
  { value: "RHB", label: "RHB Bank" },
  { value: "HLB", label: "Hong Leong Bank" },
  { value: "AMB", label: "AmBank" },
  { value: "BIMB", label: "Bank Islam" },
  { value: "BSN", label: "BSN" },
];

export default function VerifyPage() {
  const params = useParams();
  const uuid = params.uuid as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchFormData = async () => {
      console.log("[VERIFY] Fetching form data for:", uuid);

      try {
        const response = await fetch(`/api/form/${uuid}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Form not found");
        }

        const data: FormData = await response.json();
        console.log("[VERIFY] Form data received:", {
          recipientName: data.recipientName,
          missingFields: data.missingFields,
        });

        setFormData(data);

        const initialValues: Record<string, string> = {};
        data.missingFields.forEach((field) => {
          initialValues[field] = "";
        });
        setFieldValues(initialValues);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load form";
        console.error("[VERIFY] Error:", message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormData();
  }, [uuid]);

  const handleFieldChange = (field: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emptyRequired = formData?.missingFields.some((field) => {
      const col = formData.targetColumns.find((c) => c.key === field);
      return col?.required && !fieldValues[field]?.trim();
    });

    if (emptyRequired) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    console.log("[VERIFY] Submitting form:", fieldValues);

    try {
      const response = await fetch(`/api/form/${uuid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: fieldValues }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Submission failed");
      }

      console.log("[VERIFY] Form submitted successfully");
      setIsSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      console.error("[VERIFY] Submit error:", message);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldLabel = (fieldKey: string): string => {
    const col = formData?.targetColumns.find((c) => c.key === fieldKey);
    return col?.label || fieldKey.replace(/([A-Z])/g, " $1").trim();
  };

  const getFieldType = (fieldKey: string): string => {
    const col = formData?.targetColumns.find((c) => c.key === fieldKey);
    return col?.type || "string";
  };

  const isFieldRequired = (fieldKey: string): boolean => {
    const col = formData?.targetColumns.find((c) => c.key === fieldKey);
    return col?.required || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white  shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100  flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Link Invalid</h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            This verification link may have expired or already been used.
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white  shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100  flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Thank You!</h1>
          <p className="text-gray-600 mt-2">
            Your information has been submitted securely.
          </p>
          <p className="text-sm text-gray-500 mt-4">You can close this page now.</p>
        </div>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-semibold text-[#0000e6]">
              Ryt Flow Verification
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            Please provide the missing information for your payment
          </p>
        </div>

        <div className="bg-white  shadow-lg overflow-hidden">
          <div className="bg-blue-50 p-4 border-b border-blue-100">
            <p className="text-sm text-blue-700">Data Request</p>
            <p className="text-lg font-semibold text-blue-900 mt-1">
              {formData.workspaceName || "Payroll Batch"}
            </p>
            <p className="text-sm text-blue-600 mt-1">For: {formData.recipientName}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {Object.entries(formData.existingData || {}).map(([key, value]) => {
              if (formData.missingFields.includes(key)) return null;
              if (!value) return null;

              return (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">
                    {getFieldLabel(key)}
                  </Label>
                  <Input value={value} disabled className="bg-gray-50 text-gray-600" />
                </div>
              );
            })}

            {formData.missingFields.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                  Please fill in the following
                </p>
              </div>
            )}

            {formData.missingFields.map((field) => {
              const fieldType = getFieldType(field);
              const required = isFieldRequired(field);

              return (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    {getFieldLabel(field)}
                    {required && <span className="text-red-500">*</span>}
                  </Label>

                  {field === "bank" ? (
                    <select
                      value={fieldValues[field] || ""}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      className={cn(
                        "flex h-10 w-full  border border-input bg-background px-3 py-2 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        !fieldValues[field] && "text-gray-400"
                      )}
                      required={required}
                    >
                      <option value="">Select your bank</option>
                      {BANK_OPTIONS.map((bank) => (
                        <option key={bank.value} value={bank.value}>
                          {bank.label}
                        </option>
                      ))}
                    </select>
                  ) : fieldType === "date" ? (
                    <Input
                      type="date"
                      value={fieldValues[field] || ""}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      required={required}
                      className="border-blue-200 focus:border-blue-500"
                    />
                  ) : fieldType === "number" ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={fieldValues[field] || ""}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`}
                      required={required}
                      className="border-blue-200 focus:border-blue-500"
                    />
                  ) : fieldType === "phone" ? (
                    <Input
                      type="tel"
                      value={fieldValues[field] || ""}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      placeholder="+60123456789"
                      required={required}
                      className="border-blue-200 focus:border-blue-500"
                    />
                  ) : (
                    <Input
                      type="text"
                      value={fieldValues[field] || ""}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`}
                      required={required}
                      className="border-blue-200 focus:border-blue-500"
                    />
                  )}
                </div>
              );
            })}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200  text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Securely"
              )}
            </Button>
          </form>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Your data is encrypted and secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
