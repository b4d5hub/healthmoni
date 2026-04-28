import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { FileText, Loader2, Download, RefreshCw, FileDown, Calendar, User, Clock, History, Trash2, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import ReportRenderer from '@/components/dashboard/ReportRenderer';
import ReportCharts, { ReportChartsHandle } from '@/components/dashboard/ReportCharts';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDevice } from '@/lib/device-context';
import { useAuth } from '@/lib/auth-context';
import { streamFromEdgeFunction } from '@/lib/ai-stream';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SavedReport {
  id: string;
  period: string;
  report_content: string;
  vitals_summary: Record<string, unknown>;
  created_at: string;
}

export default function AIReports() {
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState('24h');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeVitals, setActiveVitals] = useState<Record<string, unknown> | null>(null);
  const { readings, latestReading } = useDevice();
  const { user } = useAuth();
  const { toast } = useToast();
  const chartsRef = useRef<ReportChartsHandle>(null);

  const vitalsData = useMemo(() => {
    if (!readings.length) return null;
    const now = Date.now();
    const periodMs = period === '24h' ? 86400000 : period === '7d' ? 604800000 : 2592000000;
    const filtered = readings.filter(r => r.timestamp > now - periodMs);
    if (!filtered.length) return null;

    const hrs = filtered.map(r => r.heartRate);
    const temps = filtered.map(r => r.temperature);
    const hrvs = filtered.map(r => r.hrv);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const nightReadings = filtered.filter(r => {
      const h = new Date(r.timestamp).getHours();
      return h >= 22 || h < 6;
    });

    return {
      period: period === '24h' ? 'Last 24 Hours' : period === '7d' ? 'Last 7 Days' : 'Last 30 Days',
      totalReadings: filtered.length,
      heartRate: { avg: Math.round(avg(hrs)), min: Math.min(...hrs), max: Math.max(...hrs) },
      temperature: { avg: parseFloat(avg(temps).toFixed(1)), min: Math.min(...temps), max: Math.max(...temps), feverEpisodes: filtered.filter(r => r.temperature >= 38).length },
      hrv: { avg: Math.round(avg(hrvs)), min: Math.min(...hrvs), max: Math.max(...hrvs) },
      restingHr: nightReadings.length ? Math.round(avg(nightReadings.map(r => r.heartRate))) : null,
      latestReading: latestReading ? { hr: latestReading.heartRate, temp: latestReading.temperature, hrv: latestReading.hrv } : null,
    };
  }, [readings, latestReading, period]);

  // The vitals to display — from active saved report or live data
  const displayVitals = activeVitals || vitalsData;

  const loadReports = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('health_reports')
      .select('id, period, report_content, vitals_summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error loading reports:', error);
      return;
    }
    if (data) setSavedReports(data as SavedReport[]);
  }, [user]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const saveReport = async (content: string) => {
    if (!user || !vitalsData) return;
    const { data, error } = await supabase
      .from('health_reports')
      .insert({ 
        user_id: user.id, 
        period: vitalsData.period, 
        report_content: content, 
        vitals_summary: vitalsData as any 
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving report:', error);
      return;
    }
    if (data) {
      setActiveReportId(data.id);
      setActiveVitals(vitalsData);
      loadReports();
    }
  };

  const deleteReport = async (id: string) => {
    await supabase.from('health_reports').delete().eq('id', id);
    if (activeReportId === id) {
      setReport('');
      setActiveReportId(null);
      setActiveVitals(null);
    }
    loadReports();
    toast({ title: 'Report deleted' });
  };

  const loadSavedReport = (r: SavedReport) => {
    setReport(r.report_content);
    setActiveReportId(r.id);
    setActiveVitals(r.vitals_summary);
    setShowHistory(false);
  };

  const generateReport = async () => {
    if (!vitalsData) {
      toast({ title: 'No data', description: 'Pair a device to generate reports.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setReport('');
    setActiveReportId(null);
    setActiveVitals(null);
    let content = '';
    await streamFromEdgeFunction({
      functionName: 'generate-report',
      body: { vitalsData, period: vitalsData.period, userName: user?.name },
      onDelta: (chunk) => { content += chunk; setReport(content); },
      onDone: () => {
        setIsLoading(false);
        saveReport(content);
      },
      onError: (error) => { setIsLoading(false); toast({ title: 'Report Error', description: error, variant: 'destructive' }); },
    });
  };

  // ── Export functions ──
  const getExportVitals = () => displayVitals;

  const exportPDF = async () => {
    const v = getExportVitals();
    if (!report) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      doc.setFillColor(26, 54, 80);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('LifePulse Health Report', margin, 26);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  •  Period: ${v?.period || period}  •  Patient: ${user?.name || 'N/A'}`, margin, 35);
      y = 50;

      if (v) {
        const data = v as any;
        doc.setTextColor(26, 54, 80);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Vitals Summary', margin, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Average', 'Min', 'Max', 'Status']],
          body: [
            ['Heart Rate (BPM)', data.heartRate.avg, data.heartRate.min, data.heartRate.max, data.heartRate.avg >= 60 && data.heartRate.avg <= 100 ? '✓ Normal' : '⚠ Review'],
            ['Temperature (°C)', data.temperature.avg, data.temperature.min, data.temperature.max, data.temperature.avg < 38 ? '✓ Normal' : '⚠ Elevated'],
            ['HRV (ms)', data.hrv.avg, data.hrv.min, data.hrv.max, data.hrv.avg >= 20 ? '✓ Good' : '⚠ Low'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [0, 150, 143], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 4: { fontStyle: 'bold' } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 12;
      }

      // Embed charts
      try {
        const canvases = await chartsRef.current?.getChartsAsCanvas();
        if (canvases && canvases.length > 0) {
          doc.setTextColor(26, 54, 80);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Vitals Charts', margin, y);
          y += 6;
          const chartW = (maxWidth - 6) / 2;
          const chartH = 50;
          for (let i = 0; i < canvases.length; i++) {
            const col = i % 2;
            if (col === 0 && i > 0) y += chartH + 6;
            if (y + chartH > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
            const x = margin + col * (chartW + 6);
            const imgData = canvases[i].toDataURL('image/png');
            doc.addImage(imgData, 'PNG', x, y, chartW, chartH);
          }
          y += chartH + 12;
        }
      } catch (chartErr) {
        console.warn('Chart export skipped:', chartErr);
      }

      doc.setTextColor(40, 40, 40);
      const lines = report.split('\n');
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
        const clean = line.replace(/[#*_`]/g, '').trim();
        if (!clean) { y += 4; continue; }
        if (line.startsWith('# ')) { doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 54, 80); }
        else if (line.startsWith('## ')) { doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 150, 143); }
        else if (line.startsWith('### ')) { doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40); }
        else { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); }
        const wrapped = doc.splitTextToSize(clean, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * (doc.getFontSize() * 0.5) + 3;
      }

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`LifePulse Report — Page ${i} of ${pages} — This report is for informational purposes only.`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      }
      doc.save(`lifepulse-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: 'PDF exported successfully' });
    } catch (e) {
      toast({ title: 'Export failed', description: String(e), variant: 'destructive' });
    }
  };


  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Health Reports</h1>
              <p className="text-xs text-muted-foreground">AI-generated summaries with multi-format export</p>
            </div>
          </div>
          <Button
            variant={showHistory ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="relative"
          >
            <History className="mr-2 h-4 w-4" />
            History
            {savedReports.length > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {savedReports.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="mb-4 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <h2 className="text-lg font-semibold text-foreground">Report History</h2>
            </div>

            {savedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
                <History className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No saved reports yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Generate your first report to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedReports.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group cursor-pointer rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-card-hover ${activeReportId === r.id ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}
                    onClick={() => loadSavedReport(r)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {r.period}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.report_content.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || 'Health Report'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {r.report_content.split('\n').filter(l => l && !l.startsWith('#')).slice(0, 2).join(' ').replace(/[*_`]/g, '').slice(0, 120)}...
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {r.vitals_summary && (
                      <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground font-mono-num">
                        <span>HR: {(r.vitals_summary as any).heartRate?.avg} BPM</span>
                        <span>Temp: {(r.vitals_summary as any).temperature?.avg}°C</span>
                        <span>HRV: {(r.vitals_summary as any).hrv?.avg} ms</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Controls */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generateReport} disabled={isLoading || !vitalsData}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {report ? 'Regenerate' : 'Generate'} Report
              </Button>
              {report && !isLoading && (
                <Button variant="outline" onClick={exportPDF}>
                  <FileDown className="mr-2 h-4 w-4" /> Export PDF
                </Button>
              )}
            </div>

            {/* Vitals Summary Cards — Row 1 */}
            {displayVitals && (
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Heart Rate', value: `${(displayVitals as any).heartRate.avg} BPM`, range: `${(displayVitals as any).heartRate.min}–${(displayVitals as any).heartRate.max}`, color: 'text-primary' },
                  { label: 'Temperature', value: `${(displayVitals as any).temperature.avg}°C`, range: `${(displayVitals as any).temperature.min}–${(displayVitals as any).temperature.max}`, color: 'text-secondary' },
                  { label: 'HRV', value: `${(displayVitals as any).hrv.avg} ms`, range: `${(displayVitals as any).hrv.min}–${(displayVitals as any).hrv.max}`, color: 'text-success' },
                ].map((card) => (
                  <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
                    <p className={`mt-1 text-2xl font-bold font-mono-num ${card.color}`}>{card.value}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Range: {card.range}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Row 2: Charts */}
            {readings.length > 0 && (
              <ReportCharts ref={chartsRef} readings={readings} period={period} />
            )}

            {/* Report */}
            {report ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                <div className="gradient-primary px-6 py-5">
                  <h2 className="text-lg font-bold text-primary-foreground">Health Analysis Report</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-primary-foreground/70">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{(displayVitals as any)?.period}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {user?.name && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{user.name}</span>}
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <ReportRenderer content={report} isStreaming={isLoading} />
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
                <FileText className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No report generated yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Select a time period and click Generate</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
