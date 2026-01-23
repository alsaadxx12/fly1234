import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  FileText, 
  Save, 
  RotateCcw, 
  Printer, 
  Code, 
  Eye,
  ChevronRight,
  Copy,
  Check,
  Search,
  X,
  Maximize2,
  Minimize2,
  WrapText,
  ZoomIn,
  ZoomOut,
  Palette,
  RefreshCw
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { generateStatementHTML, StatementData } from '../utils/statementTemplateEngine';

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Statement of Account</title>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-weight: 700;
    }

    html {
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      max-height: none !important;
    }

    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #fff;
      color: #111;
      font-size: 11px;
      padding: 22px 26px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      max-height: none !important;
    }

    /* ================= HEADER ================= */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 16px;
      width: 100%;
      max-width: 100%;
      overflow: visible;
    }

    .header-left {
      width: 40%;
      min-width: 300px;
      max-width: 40%;
      flex-shrink: 0;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .logo-section img {
      height: 34px;
      object-fit: contain;
    }

    /* ✅ نزّل بيانات TO للأسفل شوي */
    .to-section {
      margin-top: 8px;
    }

    .to-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .6px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .to-info {
      line-height: 1.5;
      font-weight: 600;
    }

    .to-info div {
      margin: 2px 0;
    }

    .to-label {
      font-weight: 700;
    }

    .header-right {
      width: 58%;
      max-width: 58%;
      padding-left: 20px;
      position: relative;
      flex-shrink: 0;
      overflow: visible;
      display: flex;
      flex-direction: column;
    }

    .accent-line {
      position: absolute;
      left: 0;
      top: 2px;
      bottom: 2px;
      width: 4px;
      background: #9ca3af;
    }

    .title {
      font-size: 28px;
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: .8px;
      margin-bottom: 12px;
      flex-shrink: 0;
    }

    .title span {
      display: block;
    }

    .summary-box {
      border: 1px solid #d1d5db;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      background: #fff;
      box-sizing: border-box;
      flex-shrink: 0;
      overflow: visible;
    }

    .summary-title {
      background: #d1d5db;
      font-size: 12px;
      font-weight: 800;
      padding: 6px 10px;
    }

    .summary-body {
      padding: 8px 10px 10px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px;
      font-weight: 600;
    }

    .summary-row:first-child {
      font-weight: 700;
    }

    .summary-row:last-child {
      border-bottom: none;
      font-weight: 800;
    }

    .summary-value {
      font-weight: 800;
      white-space: nowrap;
    }

    /* ================= DATE ================= */
    .date-section {
      margin: 12px 0 14px;
      font-size: 11px;
    }

    /* ================= TABLE ================= */
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
    }

    th {
      background: #d1d5db !important; /* light gray like the reference */
      color: #111827 !important;      /* dark text */
      font-size: 10px;
      padding: 8px;
      text-transform: uppercase;
      letter-spacing: .5px;
      border: 1px solid #e5e7eb;
    }

    /* Default white background for all td */
    tbody tr td {
      background: #fff !important;
      padding: 8px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
      font-size: 11px;
    }

    /* Gray background only for DT-ISSUE rows */
    tbody tr.dt-issue td {
      background: #e5e7eb !important; /* medium light gray rows */
    }
    
    /* Center specific columns */
    td:nth-child(2), /* Date column */
    td:nth-child(5), /* Debit column */
    td:nth-child(6), /* Credit column */
    td:nth-child(7) { /* Balance column */
      text-align: center;
    }
    
    th:nth-child(2), /* Date header */
    th:nth-child(5), /* Debit header */
    th:nth-child(6), /* Credit header */
    th:nth-child(7) { /* Balance header */
      text-align: center;
    }

    /* ================= FOOTER ================= */
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 10px;
      color: #6b7280;
    }

    /* ================= PRINT ================= */
    @media print {
      @page {
        size: A4;
        margin: 1cm;
        margin-top: 0.5cm;
        margin-bottom: 0.5cm;
      }
      
      @page {
        @top-center { content: ""; }
        @top-left { content: ""; }
        @top-right { content: ""; }
        @bottom-center { content: ""; }
        @bottom-left { content: ""; }
        @bottom-right { content: ""; }
      }
      
      body {
        padding: 0;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      
      * {
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      th {
        background: #d1d5db !important;
        color: #111827 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      td {
        background: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      tr.dt-issue td {
        background: #e5e7eb !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Center specific columns in print */
      td:nth-child(2), /* Date column */
      td:nth-child(5), /* Debit column */
      td:nth-child(6), /* Credit column */
      td:nth-child(7) { /* Balance column */
        text-align: center !important;
      }
      
      th:nth-child(2), /* Date header */
      th:nth-child(5), /* Debit header */
      th:nth-child(6), /* Credit header */
      th:nth-child(7) { /* Balance header */
        text-align: center !important;
      }
    }
  </style>
</head>

<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="logo-section">
        <img src="{{company.logoUrl}}" alt="Company Logo">
      </div>

      <div class="to-section">
        <div class="to-title">TO:</div>
        <div class="to-info">
          <div>{{user.name}}</div>
          <div><span class="to-label">Address:</span> {{#if user.address}}{{user.address}}{{else}}iraq - karbala{{/if}}</div>
          <div><span class="to-label">Mobile:</span> {{#if user.mobile}}{{user.mobile}}{{else}}-{{/if}}</div>
          <div><span class="to-label">Site:</span> -</div>
          <div><span class="to-label">Email:</span> {{#if user.email}}{{user.email}}{{else}}-{{/if}}</div>
        </div>
      </div>
    </div>

    <div class="header-right">
      <div class="accent-line"></div>

      <div class="title">
        <span>STATEMENT</span>
        <span>OF ACCOUNT</span>
      </div>

      <div class="summary-box">
        <div class="summary-title">Account summary</div>
        <div class="summary-body">
          <div class="summary-row">
            <span>{{summary.from}} to {{summary.to}}</span>
            <span></span>
          </div>
          <div class="summary-row">
            <span>Previous Balance:</span>
            <span class="summary-value">{{summary.currency}} {{summary.previousBalance}}</span>
          </div>
          <div class="summary-row">
            <span>Total credit / amount paid :</span>
            <span class="summary-value">{{summary.currency}} {{summary.totalCredit}}</span>
          </div>
          <div class="summary-row">
            <span>Total debit / invoiced amount :</span>
            <span class="summary-value">{{summary.currency}} {{summary.totalDebit}}</span>
          </div>
          <div class="summary-row">
            <span>Balance due (Debit) :</span>
            <span class="summary-value">{{summary.balanceDue}}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- DATE -->
  <div class="date-section">
    <strong>Date:</strong> <span id="current-date"></span>
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th>No.</th>
        <th>Date</th>
        <th>Details</th>
        <th>Type</th>
        <th>Debit</th>
        <th>Credit</th>
        <th>Balance</th>
      </tr>
    </thead>
    <tbody>
      {{#each transactions}}
      <tr class="{{#if (eq type 'DT-ISSUE')}}dt-issue{{/if}}">
        <td>{{no}}</td>
        <td>{{date}}</td>
        <td>{{#if pnr}}{{#if (eq pnr '-')}}{{else}}PNR: {{pnr}}<br>{{/if}}{{/if}}{{details}}</td>
        <td>{{type}}</td>
        <td>{{#if debit_iqd}}{{#if (eq debit_iqd '-')}}-{{else}}{{debit_iqd}}{{#if debit_usd}}{{#if (eq debit_usd '-')}}{{else}}<br>{{debit_usd}} USD{{/if}}{{/if}}{{/if}}{{else}}-{{/if}}</td>
        <td>{{#if credit_iqd}}{{#if (eq credit_iqd '-')}}-{{else}}{{credit_iqd}}{{#if credit_usd}}{{#if (eq credit_usd '-')}}{{else}}<br>{{credit_usd}} USD{{/if}}{{/if}}{{/if}}{{else}}-{{/if}}</td>
        <td>{{balance_iqd}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    Page 1 of 1
  </div>

  <script>
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
      dateElement.textContent = dateStr + ' - ' + timeStr;
    }
  </script>

</body>
</html>`;

const SAMPLE_DATA: StatementData = {
  summary: {
    from: '2024-01-01',
    to: '2024-12-31',
    previousBalance: '1,000,000',
    totalCredit: '5,000,000',
    totalDebit: '3,500,000',
    balanceDue: '2,500,000',
    currency: 'IQD'
  },
  user: {
    name: 'شركة تجريبية للسياحة',
    email: 'test@example.com',
    mobile: '07701234567'
  },
  company: {
    logoUrl: 'https://image.winudf.com/v2/image1/Y29tLmZseTRhbGwuYXBwX2ljb25fMTc0MTM3NDI5Ml8wODk/icon.webp?w=140&fakeurl=1&type=.webp',
    name: 'شركة الروضتين للسفر والسياحة',
    address: '9647730308111 - 964771800033 | كربلاء - شارع الإسكان'
  },
  transactions: [
    {
      no: '1',
      date: '2024-01-15',
      pnr: 'ABC123',
      booking_id: 'BK001',
      details: 'تذاكر طيران',
      type: 'DT-ISSUE',
      debit_iqd: '500,000',
      debit_usd: '-',
      credit_iqd: '-',
      credit_usd: '-',
      balance_iqd: '1,500,000',
      invoice_no: 'INV-001'
    },
    {
      no: '2',
      date: '2024-01-20',
      pnr: 'XYZ789',
      booking_id: 'BK002',
      details: 'دفعة',
      type: 'PAYMENT',
      debit_iqd: '-',
      debit_usd: '-',
      credit_iqd: '1,000,000',
      credit_usd: '-',
      balance_iqd: '500,000',
      invoice_no: '-'
    }
  ]
};

const AVAILABLE_VARIABLES = [
  { category: 'Summary', vars: [
    '{{summary.from}}',
    '{{summary.to}}',
    '{{summary.previousBalance}}',
    '{{summary.totalCredit}}',
    '{{summary.totalDebit}}',
    '{{summary.balanceDue}}',
    '{{summary.currency}}'
  ]},
  { category: 'User', vars: [
    '{{user.name}}',
    '{{user.email}}',
    '{{user.mobile}}'
  ]},
  { category: 'Company', vars: [
    '{{company.logoUrl}}',
    '{{company.name}}',
    '{{company.address}}'
  ]},
  { category: 'Transactions Loop', vars: [
    '{{#each transactions}}...{{/each}}',
    '{{@index}}',
    '{{no}}',
    '{{date}}',
    '{{pnr}}',
    '{{booking_id}}',
    '{{details}}',
    '{{type}}',
    '{{debit_iqd}}',
    '{{credit_iqd}}',
    '{{balance_iqd}}',
    '{{invoice_no}}'
  ]},
  { category: 'Conditionals', vars: [
    '{{#if variable}}...{{/if}}'
  ]}
];

export default function StatementTemplateEditor() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colors, setColors] = useState({
    headerBackground: '#d1d5db',
    headerText: '#111827',
    dtIssueBackground: '#e5e7eb',
    normalRowBackground: '#ffffff',
    borderColor: '#e5e7eb',
    textColor: '#111827'
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplate();
    loadColors();
  }, []);

  useEffect(() => {
    updatePreview();
  }, [template, customLogoUrl, colors]);

  const loadTemplate = async () => {
    try {
      const templateRef = doc(db, 'settings', 'statementTemplate');
      const docSnap = await getDoc(templateRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.html) {
          // Check if template contains old yellow colors and replace them
          let templateHtml = data.html;
          // Replace any yellow colors with gray
          templateHtml = templateHtml.replace(/#fef3c7/g, '#f3f4f6');
          templateHtml = templateHtml.replace(/#fde68a/g, '#e5e7eb');
          templateHtml = templateHtml.replace(/fef3c7/g, 'f3f4f6');
          templateHtml = templateHtml.replace(/fde68a/g, 'e5e7eb');
          
          // Check if template needs update (missing new CSS rules)
          // Check for the new CSS rules that we added
          const hasNewCenterRules = templateHtml.includes('td:nth-child(2)') && 
                                    templateHtml.includes('td:nth-child(5)');
          const hasNewBackgroundRules = templateHtml.includes('tbody tr.dt-issue td') || 
                                        templateHtml.includes('tr.dt-issue td');
          const hasWhiteBackground = templateHtml.includes('background: #fff !important') ||
                                     templateHtml.includes('tbody tr td');
          const hasGrayHeader = templateHtml.includes('th') && 
                               (templateHtml.includes('background: #d1d5db') || 
                                templateHtml.includes('background: #9ca3af'));
          
          // If template is missing any of the new rules, use the updated default template
          if (!hasNewCenterRules || !hasNewBackgroundRules || !hasWhiteBackground || !hasGrayHeader) {
            // Use the updated default template but preserve custom logo URL if exists
            const customLogo = data.logoUrl;
            templateHtml = DEFAULT_TEMPLATE;
            if (customLogo) {
              setCustomLogoUrl(customLogo);
            }
          }
          
          setTemplate(templateHtml);
          
          // If logo URL exists, load it
          if (data.logoUrl) {
            setCustomLogoUrl(data.logoUrl);
          }
          
          // Load saved colors if they exist
          if (data.colors) {
            setColors(data.colors);
          }
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const applyColorsToTemplate = (templateHtml: string): string => {
    // Apply custom colors to the template
    let coloredTemplate = templateHtml;
    
    // Replace header background color in th rules (both in main CSS and print)
    coloredTemplate = coloredTemplate.replace(
      /(th\s*\{[^}]*?)background:\s*[^;!]+(!important\s*)?/g,
      `$1background: ${colors.headerBackground} !important `
    );
    
    // Replace header text color in th rules
    coloredTemplate = coloredTemplate.replace(
      /(th\s*\{[^}]*?)color:\s*[^;!]+(!important\s*)?/g,
      `$1color: ${colors.headerText} !important `
    );
    
    // Replace DT-ISSUE background color (tbody tr.dt-issue td and tr.dt-issue td)
    coloredTemplate = coloredTemplate.replace(
      /(tbody\s+tr\.dt-issue\s+td\s*\{[^}]*?)background:\s*[^;!]+(!important\s*)?/g,
      `$1background: ${colors.dtIssueBackground} !important `
    );
    coloredTemplate = coloredTemplate.replace(
      /(tr\.dt-issue\s+td\s*\{[^}]*?)background:\s*[^;!]+(!important\s*)?/g,
      `$1background: ${colors.dtIssueBackground} !important `
    );
    
    // Replace normal row background color
    coloredTemplate = coloredTemplate.replace(
      /(tbody\s+tr\s+td\s*\{[^}]*?)background:\s*[^;!]+(!important\s*)?/g,
      `$1background: ${colors.normalRowBackground} !important `
    );
    
    // Replace border colors (1px solid)
    coloredTemplate = coloredTemplate.replace(
      /border:\s*1px\s+solid\s+#[a-fA-F0-9]{3,6}/g,
      `border: 1px solid ${colors.borderColor}`
    );
    coloredTemplate = coloredTemplate.replace(
      /border:\s*1px\s+solid\s+[^;]+/g,
      `border: 1px solid ${colors.borderColor}`
    );
    
    return coloredTemplate;
  };

  const updatePreview = () => {
    try {
      // Replace logo URL in template for preview
      let previewTemplate = template;
      if (customLogoUrl) {
        previewTemplate = previewTemplate.replace(/\{\{company\.logoUrl\}\}/g, customLogoUrl);
      }
      
      // Apply custom colors
      previewTemplate = applyColorsToTemplate(previewTemplate);
      
      const html = generateStatementHTML(previewTemplate, SAMPLE_DATA);
      setPreviewHtml(html);
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewHtml('<div style="padding: 20px; color: red;">خطأ في معالجة القالب</div>');
    }
  };
  
  const loadColors = async () => {
    try {
      const templateRef = doc(db, 'settings', 'statementTemplate');
      const docSnap = await getDoc(templateRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.colors) {
          setColors(data.colors);
        }
      }
    } catch (error) {
      console.error('Error loading colors:', error);
    }
  };
  
  const handleResetColors = () => {
    setColors({
      headerBackground: '#d1d5db',
      headerText: '#111827',
      dtIssueBackground: '#e5e7eb',
      normalRowBackground: '#ffffff',
      borderColor: '#e5e7eb',
      textColor: '#111827'
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Apply colors to template before saving
      let templateToSave = applyColorsToTemplate(template);
      
      await setDoc(doc(db, 'settings', 'statementTemplate'), {
        html: templateToSave,
        logoUrl: customLogoUrl,
        colors: colors,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('فشل حفظ القالب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين القالب إلى القالب الافتراضي؟')) {
      setTemplate(DEFAULT_TEMPLATE);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = template;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setTemplate(before + variable + after);
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(previewHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToLine = (lineNumber: number) => {
    if (textareaRef.current) {
      const lines = template.split('\n');
      let position = 0;
      for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
        position += lines[i].length + 1;
      }
      textareaRef.current.setSelectionRange(position, position);
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      textareaRef.current.focus();
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTemplate(e.target.value);
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleEditorScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const getLineCount = () => {
    return template.split('\n').length;
  };

  const renderLineNumbers = () => {
    const lines = getLineCount();
    return Array.from({ length: lines }, (_, i) => (
      <div key={i + 1} className={`text-xs font-mono text-right px-2 py-0.5 ${
        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
      } ${searchResults.includes(i + 1) ? 'bg-yellow-500/20' : ''}`}>
        {i + 1}
      </div>
    ));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const lines = template.split('\n');
    const results: number[] = [];
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        results.push(index + 1);
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [template]);

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, handleSearch]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${
        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            theme === 'dark' ? 'bg-indigo-900/50' : 'bg-indigo-100'
          }`}>
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-800 dark:text-white">
              قالب طباعة كشف الحساب
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              بناء وتخصيص قالب HTML لطباعة كشف الحساب
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={copyTemplate}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'تم النسخ' : 'نسخ'}
          </button>
          <button
            onClick={handleReset}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            إعادة تعيين
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-bold"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
              <Check className="w-4 h-4" />
              تم الحفظ
            </div>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className={`flex items-center gap-2 p-2 rounded-lg border ${
        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <button
          onClick={() => setActiveView('editor')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
            activeView === 'editor'
              ? 'bg-blue-600 text-white'
              : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Code className="w-4 h-4" />
          المحرر
        </button>
        <button
          onClick={() => setActiveView('preview')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
            activeView === 'preview'
              ? 'bg-blue-600 text-white'
              : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Eye className="w-4 h-4" />
          المعاينة
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </button>
      </div>

      {/* Color Customization Panel */}
      <div className={`p-5 rounded-2xl border shadow-lg ${
        theme === 'dark' ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            تخصيص الألوان
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                showColorPicker
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showColorPicker ? 'إخفاء' : 'إظهار'}
            </button>
            <button
              onClick={handleResetColors}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"
              title="إعادة تعيين الألوان"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {showColorPicker && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {/* Header Background */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                خلفية رأس الجدول
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.headerBackground}
                  onChange={(e) => setColors({...colors, headerBackground: e.target.value})}
                  className="w-16 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.headerBackground}
                  onChange={(e) => setColors({...colors, headerBackground: e.target.value})}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="#d1d5db"
                />
              </div>
              <div className="mt-2 h-8 rounded-lg" style={{ backgroundColor: colors.headerBackground }} />
            </div>

            {/* Header Text */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                لون نص رأس الجدول
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.headerText}
                  onChange={(e) => setColors({...colors, headerText: e.target.value})}
                  className="w-16 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.headerText}
                  onChange={(e) => setColors({...colors, headerText: e.target.value})}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="#111827"
                />
              </div>
              <div className="mt-2 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: colors.headerText, color: colors.headerBackground }}>
                نص تجريبي
              </div>
            </div>

            {/* DT-ISSUE Background */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                خلفية صفوف DT-ISSUE
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.dtIssueBackground}
                  onChange={(e) => setColors({...colors, dtIssueBackground: e.target.value})}
                  className="w-16 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.dtIssueBackground}
                  onChange={(e) => setColors({...colors, dtIssueBackground: e.target.value})}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="#e5e7eb"
                />
              </div>
              <div className="mt-2 h-8 rounded-lg" style={{ backgroundColor: colors.dtIssueBackground }} />
            </div>

            {/* Normal Row Background */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                خلفية الصفوف العادية
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.normalRowBackground}
                  onChange={(e) => setColors({...colors, normalRowBackground: e.target.value})}
                  className="w-16 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.normalRowBackground}
                  onChange={(e) => setColors({...colors, normalRowBackground: e.target.value})}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="#ffffff"
                />
              </div>
              <div className="mt-2 h-8 rounded-lg border-2 border-gray-300" style={{ backgroundColor: colors.normalRowBackground }} />
            </div>

            {/* Border Color */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                لون الحدود
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.borderColor}
                  onChange={(e) => setColors({...colors, borderColor: e.target.value})}
                  className="w-16 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.borderColor}
                  onChange={(e) => setColors({...colors, borderColor: e.target.value})}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="#e5e7eb"
                />
              </div>
              <div className="mt-2 h-8 rounded-lg border-4" style={{ borderColor: colors.borderColor, backgroundColor: colors.normalRowBackground }} />
            </div>

            {/* Text Color */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                لون النص
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors.textColor}
                  onChange={(e) => setColors({...colors, textColor: e.target.value})}
                  className="w-16 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.textColor}
                  onChange={(e) => setColors({...colors, textColor: e.target.value})}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="#111827"
                />
              </div>
              <div className="mt-2 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: colors.normalRowBackground, color: colors.textColor }}>
                نص تجريبي
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logo Customization */}
      <div className={`p-4 rounded-xl border ${
        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className="text-sm font-black text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          تخصيص الشعار
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              رابط الشعار (URL)
            </label>
            <input
              type="text"
              value={customLogoUrl}
              onChange={(e) => setCustomLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className={`w-full px-3 py-2 rounded-lg text-sm border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          {customLogoUrl && (
            <div className="flex items-center gap-3">
              <img 
                src={customLogoUrl} 
                alt="Logo Preview" 
                className="max-h-16 max-w-32 object-contain border border-gray-200 dark:border-gray-700 rounded p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                معاينة الشعار
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Variables Panel */}
        <div className={`lg:col-span-1 p-4 rounded-xl border ${
          theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className="text-sm font-black text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            المتغيرات المتاحة
          </h3>
          <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
            {AVAILABLE_VARIABLES.map((group, idx) => (
              <div key={idx}>
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                  {group.category}
                </h4>
                <div className="space-y-1">
                  {group.vars.map((variable, varIdx) => (
                    <button
                      key={varIdx}
                      onClick={() => insertVariable(variable)}
                      className={`w-full text-right px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                        theme === 'dark'
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor/Preview Area */}
        <div className={`lg:col-span-4 rounded-xl border overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
        } ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
          {activeView === 'editor' ? (
            <div className="flex flex-col h-[calc(100vh-300px)]">
              {/* Editor Toolbar */}
              <div className={`flex items-center justify-between p-2 border-b ${
                theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className={`p-2 rounded-lg transition-colors ${
                      showSearch ? (theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700') :
                      (theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600')
                    }`}
                    title="بحث (Ctrl+F)"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setWordWrap(!wordWrap)}
                    className={`p-2 rounded-lg transition-colors ${
                      wordWrap ? (theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700') : 
                      (theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600')
                    }`}
                    title="تفعيل/إلغاء التفاف النص"
                  >
                    <WrapText className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1 border-l pl-2 ml-2">
                    <button
                      onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                      className={`p-1.5 rounded transition-colors ${
                        theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-xs font-bold px-2 min-w-[3rem] text-center ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {fontSize}px
                    </span>
                    <button
                      onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                      className={`p-1.5 rounded transition-colors ${
                        theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {getLineCount()} سطر
                  </span>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700 text-gray-300' 
                        : 'hover:bg-gray-200 text-gray-600'
                    }`}
                    title="ملء الشاشة"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              {showSearch && (
                <div className={`p-2 border-b ${
                  theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <Search className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث في القالب..."
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      autoFocus
                    />
                    {searchResults.length > 0 && (
                      <span className={`text-xs font-bold px-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {currentSearchIndex + 1} / {searchResults.length}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (searchResults.length > 0) {
                          const nextIndex = (currentSearchIndex + 1) % searchResults.length;
                          setCurrentSearchIndex(nextIndex);
                          scrollToLine(searchResults[nextIndex]);
                        }
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                      }`}
                      disabled={searchResults.length === 0}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Editor with Line Numbers */}
              <div className="flex-1 relative overflow-hidden flex">
                {/* Line Numbers */}
                <div
                  ref={lineNumbersRef}
                  className={`flex-shrink-0 overflow-y-auto overflow-x-hidden border-r ${
                    theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
                  }`}
                  style={{ width: '50px', maxHeight: '100%' }}
                >
                  {renderLineNumbers()}
                </div>
                
                {/* Code Editor */}
                <div className="flex-1 relative overflow-auto" ref={editorContainerRef}>
                  <textarea
                    ref={textareaRef}
                    value={template}
                    onChange={handleTemplateChange}
                    onScroll={handleEditorScroll}
                    className={`w-full h-full p-4 font-mono resize-none outline-none ${
                      theme === 'dark' 
                        ? 'bg-gray-900 text-gray-100' 
                        : 'bg-white text-gray-900'
                    }`}
                    style={{ 
                      direction: 'ltr', 
                      fontFamily: 'monospace',
                      fontSize: `${fontSize}px`,
                      lineHeight: '1.6',
                      whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                      tabSize: 2
                    }}
                    spellCheck={false}
                    wrap={wordWrap ? 'soft' : 'off'}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-300px)] overflow-auto">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-none"
                title="Statement Preview"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
