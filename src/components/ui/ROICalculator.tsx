"use client";

import { useMemo, useState } from "react";
import { Calculator, Clock, DollarSign, Users, Zap, TrendingDown } from "lucide-react";

interface ROIInputs {
  hoursPerMonth: number;
  hourlyRate: number;
  timeReductionPct: number;
  ticketsPerMonth: number;
  ticketCost: number;
  ticketReductionPct: number;
  duplicateLossPerMonth: number;
  duplicateReductionPct: number;
  teams: number;
}

const DEFAULT_INPUTS: ROIInputs = {
  hoursPerMonth: 80,
  hourlyRate: 25,
  timeReductionPct: 90,
  ticketsPerMonth: 8,
  ticketCost: 50,
  ticketReductionPct: 50,
  duplicateLossPerMonth: 10000,
  duplicateReductionPct: 50,
  teams: 1,
};

export function ROICalculator() {
  const [inputs, setInputs] = useState<ROIInputs>(DEFAULT_INPUTS);
  const [showInputs, setShowInputs] = useState(false);

  const calculations = useMemo(() => {
    const laborHoursSaved = inputs.hoursPerMonth * (inputs.timeReductionPct / 100);
    const laborCostSaved = laborHoursSaved * inputs.hourlyRate;

    const ticketsAvoided = inputs.ticketsPerMonth * (inputs.ticketReductionPct / 100);
    const supportCostSaved = ticketsAvoided * inputs.ticketCost;

    const duplicateLossAvoided = inputs.duplicateLossPerMonth * (inputs.duplicateReductionPct / 100);

    const monthlySavings = laborCostSaved + supportCostSaved + duplicateLossAvoided;
    const annualSavings = monthlySavings * 12;

    const scaledMonthlySavings = monthlySavings * inputs.teams;
    const scaledAnnualSavings = annualSavings * inputs.teams;

    return {
      laborHoursSaved: Math.round(laborHoursSaved),
      laborCostSaved: Math.round(laborCostSaved),
      ticketsAvoided: Math.round(ticketsAvoided),
      supportCostSaved: Math.round(supportCostSaved),
      duplicateLossAvoided: Math.round(duplicateLossAvoided),
      monthlySavings: Math.round(monthlySavings),
      annualSavings: Math.round(annualSavings),
      scaledMonthlySavings: Math.round(scaledMonthlySavings),
      scaledAnnualSavings: Math.round(scaledAnnualSavings),
    };
  }, [inputs]);

  const update = (key: keyof ROIInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const equation = `You spend ${inputs.hoursPerMonth}h × RM ${inputs.hourlyRate}/h × ${inputs.timeReductionPct}% = ${formatCurrency(
    calculations.laborCostSaved
  )} labor saved monthly`;

  return (
    <div className="bg-gradient-to-br from-[#0000e6] to-[#0000b3] border border-[#0000e6]/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00ddd7]/20 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-[#00ddd7]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">ROI Calculator</h3>
            <p className="text-sm text-gray-400">Man-hours × rate, plus avoided tickets and duplicates</p>
          </div>
        </div>
        <button
          onClick={() => setShowInputs(!showInputs)}
          className="text-sm text-[#00ddd7] hover:text-[#00f5ee] transition-colors"
        >
          {showInputs ? "Hide inputs" : "Adjust inputs"}
        </button>
      </div>

      <div className="px-6 py-4 border-b border-white/10 bg-[#0000e6]/60 text-xs text-gray-300 grid md:grid-cols-3 gap-3">
        <div className="font-semibold text-white">Simple formula</div>
        <div className="text-white/70">
          Monthly savings = (hours × rate × time cut) + (tickets × cost × deflection) + (dup loss × avoidance)
        </div>
        <div className="text-[#00ddd7] font-mono text-[11px]">
          {equation}
        </div>
      </div>

      {showInputs && (
        <div className="px-6 py-4 border-b border-white/10 bg-[#0000cc]/50 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputSlider
            label="Hours/Month spent cleaning"
            value={inputs.hoursPerMonth}
            min={10}
            max={200}
            step={5}
            onChange={(v) => update("hoursPerMonth", v)}
            icon={<Clock className="w-4 h-4" />}
          />
          <InputSlider
            label="Hourly Rate (RM)"
            value={inputs.hourlyRate}
            min={10}
            max={200}
            step={5}
            onChange={(v) => update("hourlyRate", v)}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <InputSlider
            label="Time Reduction %"
            value={inputs.timeReductionPct}
            min={10}
            max={100}
            step={5}
            onChange={(v) => update("timeReductionPct", v)}
            icon={<TrendingDown className="w-4 h-4" />}
          />
          <InputSlider
            label="Tickets/Month"
            value={inputs.ticketsPerMonth}
            min={0}
            max={50}
            step={1}
            onChange={(v) => update("ticketsPerMonth", v)}
            icon={<Users className="w-4 h-4" />}
          />
          <InputSlider
            label="Ticket Cost (RM)"
            value={inputs.ticketCost}
            min={10}
            max={500}
            step={10}
            onChange={(v) => update("ticketCost", v)}
          />
          <InputSlider
            label="Ticket Deflection %"
            value={inputs.ticketReductionPct}
            min={10}
            max={100}
            step={5}
            onChange={(v) => update("ticketReductionPct", v)}
          />
          <InputSlider
            label="Duplicate Loss/Month (RM)"
            value={inputs.duplicateLossPerMonth}
            min={0}
            max={200000}
            step={5000}
            onChange={(v) => update("duplicateLossPerMonth", v)}
            icon={<Zap className="w-4 h-4" />}
          />
          <InputSlider
            label="Dup Avoidance %"
            value={inputs.duplicateReductionPct}
            min={0}
            max={100}
            step={5}
            onChange={(v) => update("duplicateReductionPct", v)}
          />
          <InputSlider
            label="Teams using RytFlow"
            value={inputs.teams}
            min={1}
            max={50}
            step={1}
            onChange={(v) => update("teams", v)}
          />
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Labor Saved"
            value={formatCurrency(calculations.laborCostSaved)}
            subtext={`${calculations.laborHoursSaved}h/month`}
            icon={<Clock className="w-5 h-5 text-[#00ddd7]" />}
            color="cyan"
          />
          <MetricCard
            label="Support Saved"
            value={formatCurrency(calculations.supportCostSaved)}
            subtext={`${calculations.ticketsAvoided} tickets avoided`}
            icon={<Users className="w-5 h-5 text-[#fb73ff]" />}
            color="pink"
          />
          <MetricCard
            label="Duplicates Avoided"
            value={formatCurrency(calculations.duplicateLossAvoided)}
            subtext="monthly loss avoided"
            icon={<Zap className="w-5 h-5 text-[#00ddd7]" />}
            color="cyan"
          />
          <MetricCard
            label="Teams Scale"
            value={`${inputs.teams}x`}
            subtext={formatCurrency(calculations.scaledMonthlySavings) + " per month"}
            icon={<Calculator className="w-5 h-5 text-white" />}
            color="white"
          />
        </div>

        <div className="bg-gradient-to-r from-[#00ddd7]/20 to-[#fb73ff]/20 border border-[#00ddd7]/30 rounded-xl p-6 text-center">
          <p className="text-sm text-[#00ddd7] mb-1">Total Annual Savings (scaled)</p>
          <p className="text-4xl md:text-5xl font-bold text-white mb-1">
            {formatCurrency(calculations.scaledAnnualSavings)}
          </p>
          <p className="text-sm text-gray-400">
            {formatCurrency(calculations.scaledMonthlySavings)} per month across {inputs.teams} team{inputs.teams > 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-[#0000cc]/40 border border-white/10 rounded-lg p-4 text-sm text-gray-300 space-y-2">
          <div className="text-[#00ddd7] font-semibold">Assumptions</div>
          <div className="grid md:grid-cols-3 gap-3 text-xs text-gray-400">
            <span>Time cut by {inputs.timeReductionPct}%</span>
            <span>{inputs.ticketReductionPct}% of {inputs.ticketsPerMonth} tickets deflected</span>
            <span>{inputs.duplicateReductionPct}% of RM {inputs.duplicateLossPerMonth.toLocaleString()} duplicate losses avoided</span>
          </div>
          <div className="text-xs text-gray-400">{equation}</div>
        </div>
      </div>
    </div>
  );
}

function InputSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400 flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-white font-medium tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:bg-[#00ddd7]
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:hover:bg-[#00f5ee]"
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  color: "cyan" | "pink" | "white";
}) {
  const bgColors = {
    cyan: "bg-[#00ddd7]/10",
    pink: "bg-[#fb73ff]/10",
    white: "bg-white/10",
  };

  return (
    <div className={`${bgColors[color]} rounded-lg p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{subtext}</p>
    </div>
  );
}
