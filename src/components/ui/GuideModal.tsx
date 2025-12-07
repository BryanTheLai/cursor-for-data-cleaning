"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!isOpen || !hasMounted) return null;

  const content = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl border border-gray-200 overflow-hidden rounded-lg animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0000e6] via-[#00ddd7] to-[#fb73ff] text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-[#0000e6] uppercase tracking-wide">Ryt Flow Guide</div>
              <div className="text-base font-semibold text-gray-900">How RytFlow fixes bulk payments and onboarding</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-200 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 bg-white">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ArrowRight className="h-4 w-4 text-[#fb73ff]" />
                The old way: bulk payments
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <p>When you need to pay in bulk with a normal bank, you have to:</p>
                <ul className="space-y-1 text-gray-800">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Open the transfer page.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Type the account number and amount.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Approve.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Repeat this 50–100 times depending on how many people you need to pay.</li>
                </ul>
                <p className="text-gray-600">If anything is wrong, you find out only after wasting the time.</p>
              </div>
            </div>

            <div className="space-y-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ArrowRight className="h-4 w-4 text-[#fb73ff]" />
                The old way: onboarding data
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <ul className="space-y-1 text-gray-800">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Clean messy CSVs in Python and hope the script doesn’t crack.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Fight Excel errors until your wrist hurts.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Email people one by one for missing phone numbers, account numbers, and IDs.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Wait days for replies before payroll can start.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ArrowRight className="h-4 w-4 text-[#0000e6]" />
                The RytFlow way
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <ul className="space-y-1 text-gray-800">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#0000e6] mt-[2px]" />Import your CSV once; RytFlow auto-maps to the schema.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#0000e6] mt-[2px]" />Every dirty or inconsistent cell gets an AI suggestion.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#0000e6] mt-[2px]" />Press Tab to accept suggestions and jump to the next issue.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#0000e6] mt-[2px]" />Stay in the grid; no more hunting through Excel errors.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3 border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ArrowRight className="h-4 w-4 text-[#0000e6]" />
                Handling missing data
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="text-gray-700">For missing values, AI can’t make something up.</p>
                <ul className="space-y-1 text-gray-800">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#fb73ff] mt-[2px]" />RytFlow prepares a WhatsApp form link for the person in that row.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#fb73ff] mt-[2px]" />You send them the link; they fill the missing details themselves.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#fb73ff] mt-[2px]" />The data comes straight back into this grid instantly.</li>
                </ul>
                <p className="text-gray-600">No chasing emails. No guessing. The data owner fixes their own record.</p>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ArrowRight className="h-4 w-4 text-[#fb73ff]" />
                After the cleanup
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <ul className="space-y-1 text-gray-800">
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Export to other bank formats.</li>
                  <li className="flex items-start gap-2"><Check className="h-4 w-4 text-[#00ddd7] mt-[2px]" />Or pay directly from RytFlow and send notifications via WhatsApp.</li>
                </ul>
                <p className="text-gray-700 font-medium">No more 32 hours of cleaning Excel every week. Import, Tab through fixes, collect missing data via WhatsApp, and pay.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-100 bg-white">
          <div className="text-sm text-gray-600">Ready to clean faster? Import a CSV and press Tab to accept suggestions.</div>
          <Button onClick={onClose} className="bg-[#0000e6] hover:bg-[#0000cc] text-white">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
