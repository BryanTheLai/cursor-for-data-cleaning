"use client";

import { useState, useEffect } from "react";
import { X, Settings2, Check, Trash2, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RuleConfig {
  id: string;
  key: string;
  label: string;
  type: "string" | "number" | "date" | "phone" | "enum";
  required: boolean;
  enabled: boolean;
  format?: string;
  options?: { value: string; label: string }[];
}

const DEFAULT_RULES: RuleConfig[] = [
  { id: "1", key: "name", label: "Payee Name", type: "string", required: true, enabled: true, format: "Title Case" },
  { id: "2", key: "amount", label: "Amount (RM)", type: "number", required: true, enabled: true, format: "0000.00 (no currency)" },
  { id: "3", key: "accountNumber", label: "Account Number", type: "string", required: true, enabled: true, format: "Digits only (no dashes)" },
  { id: "4", key: "bank", label: "Bank Code", type: "enum", required: false, enabled: true, format: "3-letter code (MBB, PBB)" },
  { id: "5", key: "phone", label: "Phone Number", type: "phone", required: false, enabled: true, format: "+60XXXXXXXXX" },
  { id: "6", key: "date", label: "Date", type: "date", required: false, enabled: true, format: "YYYY-MM-DD" },
];

interface RulesSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (rules: RuleConfig[]) => void;
}

export function RulesSettings({ isOpen, onClose, onSave }: RulesSettingsProps) {
  const [rules, setRules] = useState<RuleConfig[]>(DEFAULT_RULES);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dwmtcd-rules");
    if (saved) {
      try {
        setRules(JSON.parse(saved));
      } catch {
        setRules(DEFAULT_RULES);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleToggleRequired = (id: string) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, required: !r.required } : r
    ));
    setHasChanges(true);
  };

  const handleToggleEnabled = (id: string) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
    setHasChanges(true);
  };

  const handleUpdateFormat = (id: string, format: string) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, format } : r
    ));
    setHasChanges(true);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setHasChanges(true);
  };

  const handleAddRule = () => {
    const newRule: RuleConfig = {
      id: Date.now().toString(),
      key: `custom_${Date.now()}`,
      label: "New Field",
      type: "string",
      required: false,
      enabled: true,
      format: "",
    };
    setRules(prev => [...prev, newRule]);
    setEditingRule(newRule.id);
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem("dwmtcd-rules", JSON.stringify(rules));
    onSave?.(rules);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setRules(DEFAULT_RULES);
    localStorage.removeItem("dwmtcd-rules");
    setHasChanges(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Rules Settings</h2>
              <p className="text-xs text-gray-500">Configure data validation and transformation rules</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div
                key={rule.id}
                className={cn(
                  "border p-4 transition-all",
                  rule.enabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1 cursor-grab text-gray-300">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {editingRule === rule.id ? (
                        <input
                          type="text"
                          value={rule.label}
                          onChange={(e) => {
                            setRules(prev => prev.map(r => 
                              r.id === rule.id ? { ...r, label: e.target.value } : r
                            ));
                            setHasChanges(true);
                          }}
                          className="text-sm font-semibold text-gray-900 border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                          onBlur={() => setEditingRule(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingRule(null)}
                        />
                      ) : (
                        <span 
                          className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-emerald-600"
                          onClick={() => setEditingRule(rule.id)}
                        >
                          {rule.label}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 font-mono">
                        {rule.type}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {rule.key}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.required}
                          onChange={() => handleToggleRequired(rule.id)}
                          className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-gray-600">Required</span>
                      </label>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleEnabled(rule.id)}
                          className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="text-gray-600">Enabled</span>
                      </label>
                    </div>

                    {rule.format && (
                      <div className="mt-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide">Format</label>
                        <input
                          type="text"
                          value={rule.format}
                          onChange={(e) => handleUpdateFormat(rule.id, e.target.value)}
                          className="w-full mt-1 text-xs border border-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          placeholder="Format pattern..."
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddRule}
            className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Custom Rule
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Reset to defaults
          </button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save Rules
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

