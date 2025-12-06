"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Play, Zap, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { ROICalculator } from "@/components/ui/ROICalculator";

const PYTHON_ERRORS = [
  'Traceback (most recent call last):',
  '  File "clean_payroll.py", line 2847, in <module>',
  '    df = pd.read_csv("payroll_march.csv", encoding="utf-8")',
  '  File "/usr/local/lib/python3.9/pandas/io/parsers.py", line 685',
  "UnicodeDecodeError: 'utf-8' codec can't decode byte 0x92 in position 847",
  '',
  'Traceback (most recent call last):',
  '  File "clean_payroll.py", line 2891, in process_row',
  '    amount = float(row["Amount"])',
  "ValueError: could not convert string to float: 'RM 5,000.00'",
  '',
  '>>> df["Employee Name"].str.title()',
  'Traceback (most recent call last):',
  '  File "clean_payroll.py", line 3012, in <module>',
  '    df["Account Number"] = df["Account Number"].astype(str)',
  "KeyError: 'Account Number'",
  '',
  'pandas.errors.ParserError: Error tokenizing data. C error:',
  'Expected 12 fields in line 847, saw 14',
  '',
  '>>> df.to_csv("output.csv")',
  'Traceback (most recent call last):',
  '  File "validate_data.py", line 156, in validate_account',
  '    if len(account) != 12:',
  'TypeError: object of type \'float\' has no len()',
  '',
  '  File "clean_payroll.py", line 3156, in fix_dates',
  '    pd.to_datetime(df["Payment Date"], format="%d/%m/%Y")',
  'ValueError: time data "03-15-2024" does not match format "%d/%m/%Y"',
  '',
  'Traceback (most recent call last):',
  '  File "dedupe_check.py", line 89, in find_duplicates',
  '    hash_val = hashlib.md5(str(row).encode()).hexdigest()',
  "UnicodeEncodeError: 'ascii' codec can't encode character '\\u2019'",
  '',
  '>>> for idx, row in df.iterrows():',
  '...     if pd.isna(row["Phone"]):',
  '...         # TODO: contact payee for missing data',
  '...         missing_data.append(row)',
  '>>> len(missing_data)',
  '847',
  '',
  'WARNING: 847 rows with missing critical fields',
  'WARNING: Manual intervention required for each row',
  'WARNING: Estimated time to fix: 3-5 business days',
  '',
  '>>> # Send emails to 847 payees...',
  '>>> for payee in missing_data:',
  '...     send_email(payee["Email"], "Missing account details")',
  '...     time.sleep(1)  # Rate limiting',
  'Sending email 1/847...',
  'Sending email 2/847...',
  'Sending email 3/847...',
  '',
  'smtplib.SMTPRecipientsRefused: {\'invalid@email\': (550, \'User not found\')}',
  '',
  'Traceback (most recent call last):',
  '  File "sanction_check.py", line 234, in screen_name',
  '    fuzzy_match(name, sanction_list)',
  'MemoryError: Unable to allocate 2.4 GiB for array',
  '',
  '>>> df["Amount"] = df["Amount"].str.replace(",", "").str.replace("RM", "")',
  '>>> df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce")',
  '>>> df["Amount"].isna().sum()',
  '156  # 156 amounts still broken',
  '',
  '>>> # Week 2: Still cleaning the same file...',
  '>>> print(f"Progress: {cleaned_rows}/{total_rows}")',
  'Progress: 1203/2847',
  '',
  '>>> # Manually fixing row 1204...',
  '>>> df.loc[1204, "Account Number"] = "7612345678"',
  '>>> df.loc[1204, "Amount"] = 5000.00',
  '>>> df.loc[1204, "Name"] = "Ahmad bin Abdullah"',
  '>>> # Only 1643 more to go...',
  '',
  'Traceback (most recent call last):',
  '  File "export_final.py", line 45, in export',
  '    validate_bank_format(df)',
  '  File "export_final.py", line 89, in validate_bank_format',
  '    assert all(df["Account Number"].str.len() == 12)',
  'AssertionError: Account numbers must be exactly 12 digits',
  '',
  '>>> # Week 3: Boss is asking for status update...',
  '>>> # Still waiting for 234 email replies',
  '>>> # 89 bounced emails',
  '>>> # 12 phone calls made, 3 answered',
  '',
  '>>> raise Exception("I hate my job")',
  'Exception: I hate my job',
  '',
];

const ERROR_DIALOGS = [
  {
    title: "Error Importing File",
    message: "Unsupported or incorrect file format",
    icon: "error",
    position: { top: "15%", left: "20%" },
    delay: 0,
  },
  {
    title: "Encoding Error",
    message: "Check and match the file encoding with the system's requirements.",
    icon: "error",
    position: { top: "10%", left: "45%" },
    delay: 0.3,
  },
  {
    title: "Error Loading File",
    message: "Required column headers are missing, or their names do not match...",
    icon: "error",
    position: { top: "35%", left: "10%" },
    delay: 0.6,
  },
  {
    title: "Matching Error",
    message: "Fields contain values that don't match the expected data types",
    icon: "error",
    position: { top: "30%", left: "35%" },
    delay: 0.9,
  },
  {
    title: "Incorrect Date or Time Format",
    message: "Format not recognized by the target system",
    icon: "error",
    position: { top: "25%", left: "55%" },
    delay: 1.2,
  },
  {
    title: "Duplicate Entry Detected",
    message: "Row 847 appears to be a duplicate of row 234",
    icon: "warning",
    position: { top: "45%", left: "25%" },
    delay: 1.5,
  },
  {
    title: "Validation Failed",
    message: "Account number format invalid: expected 12 digits",
    icon: "error",
    position: { top: "40%", left: "50%" },
    delay: 1.8,
  },
  {
    title: "Missing Required Field",
    message: "Phone number is required but 156 rows are empty",
    icon: "error",
    position: { top: "55%", left: "15%" },
    delay: 2.1,
  },
];

const SPREADSHEET_DATA = [
  ["ID", "Name", "Account No", "Amount", "Date", "Phone"],
  ["1324", "d Beㅤㅤㅤㅤ", "1987-10-03", "", "1977/01/21", "duplex"],
  ["60", "", "1998-03-16", "", "", "farmhouse"],
  ["", "ㅤㅤㅤㅤ", "1957-09-11", "", "1988/11/19", "farmhouse"],
  ["3540", "", "2004-05-17", "", "07/05/07", "ㅤㅤ"],
  ["4395", "Iremi", "", "", "", "apartment"],
  ["", "Emmerich", "", "", "2006/07/15", "villa"],
  ["4689", "", "", "", "2012/02/12", "duplex"],
  ["", "ㅤnop", "", "2855", "", "villa"],
  ["2855", "", "1949-03-24", "", "1956/09/23", "farmhouse"],
];

function WindowsErrorDialog({ 
  title, 
  message, 
  position, 
  delay,
  onClose 
}: { 
  title: string; 
  message: string; 
  position: { top: string; left: string };
  delay: number;
  onClose?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!isVisible) return null;

  return (
    <div 
      className="absolute bg-[#f0f0f0] border border-[#0078d4] shadow-lg animate-dialog-pop"
      style={{ 
        top: position.top, 
        left: position.left,
        minWidth: "280px",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "12px",
        zIndex: 50 + Math.floor(delay * 10),
      }}
    >
      <div className="bg-[#0078d4] text-white px-2 py-1 flex items-center justify-between text-xs font-normal">
        <span>{title}</span>
        <button 
          onClick={onClose}
          className="hover:bg-[#c42b1c] px-2 py-0.5 transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="p-4 flex gap-3 items-start">
        <div className="w-8 h-8 flex-shrink-0">
          <svg viewBox="0 0 32 32" className="w-full h-full">
            <circle cx="16" cy="16" r="14" fill="#c42b1c"/>
            <path d="M10 10 L22 22 M22 10 L10 22" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-[#1a1a1a] leading-relaxed">{message}</p>
      </div>
      <div className="flex justify-center pb-3 px-4">
        <button 
          onClick={onClose}
          className="bg-[#f0f0f0] border border-[#8a8a8a] px-6 py-1 text-xs hover:bg-[#e5e5e5] active:bg-[#d0d0d0] focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function TerminalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      setLines(prev => {
        const newLines = [...prev, PYTHON_ERRORS[currentIndex % PYTHON_ERRORS.length]];
        if (newLines.length > 50) {
          return newLines.slice(-50);
        }
        return newLines;
      });
      currentIndex++;
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div 
      ref={containerRef}
      className="bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs p-4 h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600"
      style={{ fontFamily: "'Cascadia Code', 'Fira Code', monospace" }}
    >
      <div className="text-green-400 mb-2">$ python clean_payroll.py payroll_march.csv</div>
      {lines.map((line, idx) => (
        <div 
          key={idx} 
          className={`whitespace-pre-wrap ${
            line.includes('Error') || line.includes('Traceback') 
              ? 'text-red-400' 
              : line.includes('WARNING') 
                ? 'text-yellow-400'
                : line.includes('>>>') 
                  ? 'text-green-400'
                  : line.includes('File') 
                    ? 'text-blue-300'
                    : 'text-gray-300'
          }`}
        >
          {line}
        </div>
      ))}
      <div className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
    </div>
  );
}

function ExcelChaos() {
  const [activeDialogs, setActiveDialogs] = useState<number[]>([]);
  const [cellEditing, setCellEditing] = useState<{row: number; col: number} | null>(null);

  useEffect(() => {
    setActiveDialogs(ERROR_DIALOGS.map((_, i) => i));
  }, []);

  useEffect(() => {
    const cells = [
      {row: 1, col: 1}, {row: 2, col: 3}, {row: 3, col: 2}, 
      {row: 4, col: 4}, {row: 5, col: 1}, {row: 6, col: 5}
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setCellEditing(cells[idx % cells.length]);
      idx++;
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const closeDialog = (index: number) => {
    setActiveDialogs(prev => prev.filter(i => i !== index));
    setTimeout(() => {
      setActiveDialogs(prev => [...prev, index]);
    }, 2000);
  };

  return (
    <div className="relative bg-white border border-gray-300 h-[400px] overflow-hidden">
      <div className="absolute inset-0 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {SPREADSHEET_DATA.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx === 0 ? "bg-gray-100 font-semibold" : ""}>
                {row.map((cell, colIdx) => (
                  <td 
                    key={colIdx}
                    className={`border border-gray-300 px-2 py-1 min-w-[80px] ${
                      cellEditing?.row === rowIdx && cellEditing?.col === colIdx
                        ? "bg-blue-100 ring-2 ring-blue-500"
                        : cell === "" && rowIdx > 0
                          ? "bg-red-50"
                          : ""
                    }`}
                  >
                    {cellEditing?.row === rowIdx && cellEditing?.col === colIdx ? (
                      <span className="flex items-center">
                        <span className="animate-pulse">{cell || "█"}</span>
                        <span className="animate-blink">|</span>
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeDialogs.map((dialogIdx) => (
        <WindowsErrorDialog
          key={dialogIdx}
          {...ERROR_DIALOGS[dialogIdx]}
          onClose={() => closeDialog(dialogIdx)}
        />
      ))}
    </div>
  );
}

function EmailChase() {
  const emails = [
    { to: "ahmad@company.com", subject: "URGENT: Missing account number", status: "sent", days: 3 },
    { to: "sarah@vendor.my", subject: "RE: Payment details needed", status: "no-reply", days: 5 },
    { to: "invalid@email", subject: "Missing phone number", status: "bounced", days: 2 },
    { to: "supplier@business.com", subject: "FW: FW: RE: Account details???", status: "sent", days: 7 },
    { to: "accounts@partner.co", subject: "3rd request - Please respond", status: "no-reply", days: 4 },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-[#0078d4] text-white px-4 py-2 text-sm font-medium flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
        Outbox - Chasing Missing Data
      </div>
      <div className="divide-y divide-gray-100">
        {emails.map((email, idx) => (
          <div key={idx} className="px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              email.status === 'bounced' ? 'bg-red-500' :
              email.status === 'no-reply' ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{email.to}</div>
              <div className="text-xs text-gray-500 truncate">{email.subject}</div>
            </div>
            <div className="text-xs text-gray-400">{email.days}d ago</div>
            <div className={`text-xs px-2 py-0.5 rounded ${
              email.status === 'bounced' ? 'bg-red-100 text-red-700' :
              email.status === 'no-reply' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {email.status === 'bounced' ? 'Bounced' : 
               email.status === 'no-reply' ? 'No Reply' : 'Waiting...'}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 flex items-center gap-2">
        <Clock className="w-3 h-3" />
        Average response time: 3-5 business days
      </div>
    </div>
  );
}

function RytFlowPreview() {
  const [currentFix, setCurrentFix] = useState(0);
  const fixes = [
    { before: "mr. ahmad bin ali", after: "Ahmad Bin Ali", type: "Name formatting" },
    { before: "rm 5,000.00", after: "5000.00", type: "Amount cleanup" },
    { before: "03-15-2024", after: "2024-03-15", type: "Date format" },
    { before: "", after: "7612345678", type: "WhatsApp response" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFix(prev => (prev + 1) % fixes.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [fixes.length]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xl">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <span className="font-semibold">RytFlow</span>
        </div>
        <div className="text-xs bg-white/20 px-2 py-1 rounded">
          Press TAB to accept
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-400 rounded" />
            <span className="text-xs text-gray-600">AI Fix Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-400 rounded" />
            <span className="text-xs text-gray-600">Fixed</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {fixes.map((fix, idx) => (
                <tr 
                  key={idx}
                  className={`transition-all duration-300 ${
                    idx === currentFix 
                      ? "bg-amber-50 border-l-4 border-l-amber-400" 
                      : idx < currentFix 
                        ? "bg-emerald-50 border-l-4 border-l-emerald-400"
                        : "bg-white"
                  }`}
                >
                  <td className="px-3 py-2 text-xs text-gray-500 w-24">{fix.type}</td>
                  <td className="px-3 py-2 font-mono">
                    {idx < currentFix ? (
                      <span className="text-emerald-700">{fix.after}</span>
                    ) : idx === currentFix ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through">{fix.before || "(empty)"}</span>
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-700 font-medium">{fix.after}</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded animate-pulse">
                          TAB
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">{fix.before || "(empty)"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>47 issues → <span className="text-emerald-600 font-semibold">30 seconds</span></span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <style jsx global>{`
        @keyframes dialog-pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-dialog-pop {
          animation: dialog-pop 0.3s ease-out forwards;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">RytFlow</span>
          </div>
          <Link 
            href="/demo"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2"
          >
            Try Demo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-amber-400 text-sm font-medium">For Payment Operations Teams</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Stop Cleaning Excel Files<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              For 32 Hours Every Week
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Sarah, Payment Ops Manager at a mid-sized bank.<br />
            47 Excel files every Monday. 2000 rows. Different formats.<br />
            <span className="text-red-400 font-medium">Last month, one duplicate slipped through. RM 180,000—gone.</span>
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              href="/demo"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-lg text-lg transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <Play className="w-5 h-5" /> See the Magic
            </Link>
            <button
              onClick={() => setShowAfter(!showAfter)}
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-4 rounded-lg text-lg transition-all border border-white/20"
            >
              {showAfter ? "Show Pain" : "Show Solution"}
            </button>
          </div>

          <div className="flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-400">47 errors → <span className="text-white font-semibold">30 seconds</span></span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-400">Save <span className="text-white font-semibold">RM 156K/year</span></span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-400"><span className="text-white font-semibold">Zero</span> duplicate payments</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {!showAfter ? (
            <>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-2 text-red-400">The Current Reality</h2>
                <p className="text-gray-500">This is what Payment Ops deals with every single week</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 mb-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-red-400 font-mono text-sm">$</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Python Script Hell</h3>
                      <p className="text-xs text-gray-500">2000+ lines of code that breaks constantly</p>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-red-500/30 shadow-lg shadow-red-500/10">
                    <TerminalScroll />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <span className="text-red-400 text-lg">⚠</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Excel Error Nightmare</h3>
                      <p className="text-xs text-gray-500">Click OK. Click OK. Click OK. Forever.</p>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-red-500/30 shadow-lg shadow-red-500/10">
                    <ExcelChaos />
                  </div>
                </div>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-400">📧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">The Email Chase</h3>
                    <p className="text-xs text-gray-500">Waiting 3-5 business days for simple data</p>
                  </div>
                </div>
                <EmailChase />
              </div>

              <div className="text-center mt-16">
                <div className="inline-block bg-red-500/10 border border-red-500/30 rounded-lg px-8 py-6">
                  <div className="text-4xl font-bold text-red-400 mb-2">3 Weeks</div>
                  <div className="text-gray-400">Average time to process one batch of payments</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-2 text-emerald-400">With RytFlow</h2>
                <p className="text-gray-500">Tab to accept. WhatsApp for missing data. Done.</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <RytFlowPreview />
                
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-3xl font-bold text-emerald-400">30s</div>
                    <div className="text-xs text-gray-500">Fix 47 errors</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-3xl font-bold text-emerald-400">15min</div>
                    <div className="text-xs text-gray-500">Missing data via WhatsApp</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-3xl font-bold text-emerald-400">100%</div>
                    <div className="text-xs text-gray-500">Duplicates caught</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Calculate Your Savings</h2>
            <p className="text-gray-400">See exactly how much time and money RytFlow can save your team</p>
          </div>
          <ROICalculator />
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-emerald-950/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Save 32 Hours Every Week?</h2>
          <p className="text-gray-400 mb-8">
            Upload your messy CSV. Watch it get fixed in seconds.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-10 py-5 rounded-lg text-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
          >
            Try RytFlow Now <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span>RytFlow</span>
          </div>
          <div>Tab to fix. WhatsApp to verify. Sleep soundly.</div>
        </div>
      </footer>
    </div>
  );
}
