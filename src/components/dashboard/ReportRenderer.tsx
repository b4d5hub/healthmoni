import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { motion } from 'framer-motion';
import {
  Heart, Thermometer, Activity, AlertTriangle, CheckCircle2,
  ClipboardList, Lightbulb, ShieldAlert, TrendingUp, BarChart3,
  Stethoscope, FileText,
} from 'lucide-react';

const sectionIcons: Record<string, React.ReactNode> = {
  'heart rate': <Heart className="h-5 w-5 text-destructive" />,
  'temperature': <Thermometer className="h-5 w-5 text-secondary" />,
  'hrv': <Activity className="h-5 w-5 text-success" />,
  'variability': <Activity className="h-5 w-5 text-success" />,
  'overview': <BarChart3 className="h-5 w-5 text-primary" />,
  'summary': <ClipboardList className="h-5 w-5 text-primary" />,
  'findings': <TrendingUp className="h-5 w-5 text-warning" />,
  'recommendation': <Lightbulb className="h-5 w-5 text-warning" />,
  'disclaimer': <ShieldAlert className="h-5 w-5 text-muted-foreground" />,
  'analysis': <Stethoscope className="h-5 w-5 text-primary" />,
};

function getIconForHeading(text: string): React.ReactNode {
  const lower = text.toLowerCase();
  for (const [key, icon] of Object.entries(sectionIcons)) {
    if (lower.includes(key)) return icon;
  }
  return <FileText className="h-5 w-5 text-primary" />;
}

function isStatusLine(text: string) {
  return /^[✅⚠️📊❤️🌡️💓✓⚠]/.test(text.trim());
}

const components: Components = {
  h1: ({ children }) => (
    <div className="mb-6 pb-4 border-b-2 border-primary/20">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shrink-0">
          <ClipboardList className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <span>{children}</span>
      </h1>
    </div>
  ),
  h2: ({ children }) => {
    const text = typeof children === 'string' ? children : String(children);
    const icon = getIconForHeading(text);
    const isDisclaimer = text.toLowerCase().includes('disclaimer');
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={`mt-8 mb-4 flex items-center gap-3 ${isDisclaimer ? '' : 'border-l-4 border-primary/30 pl-4'}`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${isDisclaimer ? 'bg-muted' : 'bg-primary/10'}`}>
          {icon}
        </div>
        <h2 className="text-lg font-bold text-foreground tracking-tight">{children}</h2>
      </motion.div>
    );
  },
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => {
    const text = typeof children === 'string' ? children : '';
    const isDisclaimer = text.toLowerCase().includes('informational purposes') || text.toLowerCase().includes('medical advice');
    if (isDisclaimer) {
      return (
        <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed italic">{children}</p>
        </div>
      );
    }
    if (isStatusLine(text)) {
      const isPositive = text.startsWith('✅') || text.startsWith('✓');
      const isWarning = text.startsWith('⚠');
      return (
        <div className={`my-1.5 flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm ${
          isPositive ? 'bg-success/5 text-success' : isWarning ? 'bg-warning/5 text-warning' : 'text-foreground'
        }`}>
          {isPositive && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
          {isWarning && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
          <span className="leading-relaxed">{children}</span>
        </div>
      );
    }
    return <p className="mb-3 text-sm leading-relaxed text-foreground/85">{children}</p>;
  },
  ul: ({ children }) => (
    <ul className="my-3 space-y-1.5 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 space-y-2 pl-1 counter-reset-item">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    const ordered = (props as any).ordered;
    const index = (props as any).index;
    if (ordered) {
      return (
        <li className="flex items-start gap-3 text-sm text-foreground/85 leading-relaxed">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary font-mono-num">
            {(index ?? 0) + 1}
          </span>
          <span className="pt-0.5">{children}</span>
        </li>
      );
    }
    return (
      <li className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
        <span>{children}</span>
      </li>
    );
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-foreground/70 not-italic font-medium">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-xl border-l-4 border-primary/30 bg-primary/5 py-3 px-4 text-sm text-foreground/80 italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <div className="h-1.5 w-1.5 rounded-full bg-primary/30" />
      <div className="h-px flex-1 bg-border" />
    </div>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-border px-4 py-2.5 text-foreground/85">{children}</td>
  ),
};

interface ReportRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function ReportRenderer({ content, isStreaming }: ReportRendererProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="report-content"
    >
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
      {isStreaming && (
        <div className="mt-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-primary/30 animate-pulse [animation-delay:300ms]" />
        </div>
      )}
    </motion.div>
  );
}
