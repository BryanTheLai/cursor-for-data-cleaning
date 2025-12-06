"use client";

import { create } from "zustand";
import { DEFAULT_RULE_CONFIG, type RuleConfig } from "@/lib/rulesEngine";

type RuleStore = {
  rules: RuleConfig[];
  setRules: (rules: RuleConfig[]) => void;
  resetRules: () => void;
};

const storageKey = "dwmtcd-rules";

function loadRules(): RuleConfig[] {
  if (typeof window === "undefined") return DEFAULT_RULE_CONFIG;
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return DEFAULT_RULE_CONFIG;
  try {
    const parsed = JSON.parse(saved) as RuleConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_RULE_CONFIG;
    return parsed;
  } catch {
    return DEFAULT_RULE_CONFIG;
  }
}

export const useRuleStore = create<RuleStore>((set) => ({
  rules: loadRules(),
  setRules: (rules) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(rules));
    }
    set({ rules });
  },
  resetRules: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
    set({ rules: DEFAULT_RULE_CONFIG });
  },
}));
