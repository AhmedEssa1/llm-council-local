import { useState, useEffect, createContext, useContext, useRef } from 'react';
import './index.css';

const API_BASE = 'http://localhost:8000';

// Theme types and context
type Theme = 'light' | 'dark';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// Theme provider component
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('llm-council-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the current theme class
    root.classList.add(theme);

    // Save to localStorage
    localStorage.setItem('llm-council-theme', theme);

    // Debug logging
    console.log('Theme set to:', theme);
    console.log('Root classes:', root.className);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme-aware utility classes with maximum contrast
const themeClasses = {
  dark: {
    bg: 'bg-[#0d0d12]',
    bgCard: 'bg-gray-500/95',
    bgInput: 'bg-gray-600/60',
    border: 'border-gray-400',
    text: 'text-gray-400',
    textMuted: 'text-gray-500',
    textSecondary: 'text-gray-400',
    placeholder: 'placeholder-gray-600',
    focus: 'focus:ring-blue-400',
  },
  light: {
    bg: 'bg-gray-50',
    bgCard: 'bg-white',
    bgInput: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    textSecondary: 'text-gray-700',
    placeholder: 'placeholder-gray-400',
    focus: 'focus:ring-blue-600',
  },
};

interface CouncilMember {
  id: string;
  name: string;
  type: 'cli' | 'ollama' | 'api';
  enabled: boolean;
  command?: string;
  args?: string[];
  host?: string;
  model?: string;
  provider?: string;
  timeout?: number;  // Timeout in seconds
  supports_vision?: boolean;  // Vision capability flag
}

interface ImageData {
  data: string;      // Base64 encoded image data
  format: string;    // "jpeg", "png", "webp"
  size: number;      // File size in bytes
}

interface ModelResponse {
  model_id: string;
  model_name: string;
  content: string;
  error?: string;
  duration_ms?: number;
}

interface CouncilResult {
  prompt: string;
  chairman_response: string;
  chairman_model: string;
  individual_responses: ModelResponse[];
  images?: ImageData[];  // Include images that were analyzed
}

// Format duration to readable format
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) {
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

// Image Upload Component
function ImageUpload({ images, setImages, maxImages = 3, maxSize = 5 * 1024 * 1024 }: {
  images: ImageData[];
  setImages: React.Dispatch<React.SetStateAction<ImageData[]>>;
  maxImages?: number;
  maxSize?: number;
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = themeClasses[useTheme().theme];

  const acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!acceptedFormats.includes(file.type)) {
      return { valid: false, error: `Invalid format. Please use JPEG, PNG, or WebP.` };
    }
    if (file.size > maxSize) {
      return { valid: false, error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.` };
    }
    if (images.length >= maxImages) {
      return { valid: false, error: `Maximum ${maxImages} images allowed.` };
    }
    return { valid: true };
  };

  const processFile = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data:image/...;base64, prefix
        resolve({
          data: base64,
          format: file.type.split('/')[1],
          size: file.size
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).slice(0, maxImages - images.length);

    for (const file of validFiles) {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(`Error: ${validation.error}`);
        continue;
      }

      try {
        const imageData = await processFile(file);
        setImages(prev => [...prev, imageData]);
      } catch (error) {
        alert(`Error processing file: ${error}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setImages([]);
  };

  return (
    <div className="space-y-3">
      {/* Drag-drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : `${t.border} ${t.bgInput} hover:bg-gray-100 dark:hover:bg-gray-700`
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-3">
          <div className="flex justify-center">
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0l4.414 4.586a2 2 0 012.828 0l4.414-4.586a2 2 0 012.828 0l4.586 4.586a2 2 0 012.828 0l4.586-4.586a2 2 0 012.828 0l4.414 4.586a2 2 0 012.828 0l4.586 4.586a2 2 0 012.828 0l4.414-4.586a2 2 0 012.828 0zM16 16l4.586-4.586a2 2 0 012.828 0l4.414 4.586a2 2 0 012.828 0l4.586-4.586a2 2 0 012.828 0l4.414-4.586a2 2 0 012.828 0l4.586 4.586a2 2 0 012.828 0zM16 12l4.586-4.586a2 2 0 012.828 0l4.414 4.586a2 2 0 012.828 0l4.586-4.586a2 2 0 012.828 0l4.414-4.586a2 2 0 012.828 0l-4.586 4.586a2 2 0 012.828 0zM12 12l4.586-4.586a2 2 0 012.828 0l4.414 4.586a2 2 0 012.828 0l4.586-4.586a2 2 0 012.828 0L12 12z" />
            </svg>
          </div>
          <div>
            <p className={`text-sm font-medium ${t.text}`}>
              {dragActive ? 'Drop images here...' : 'Drag & drop images here'}
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              or click to browse
            </p>
          </div>
          <div className={`text-xs ${t.textMuted}`}>
            Max {maxImages} images • JPEG, PNG, WebP • Max {maxSize / 1024 / 1024}MB each
          </div>
        </div>
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <div className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 ${t.border} ${t.bgCard} transition-colors duration-200`}>
                <img
                  src={`data:image/${img.format};base64,${img.data}`}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => removeImage(index)}
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg`}
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clear all button */}
      {images.length > 0 && (
        <div className="flex justify-between items-center">
          <p className={`text-xs ${t.textMuted}`}>
            {images.length} of {maxImages} images selected
          </p>
          <button
            onClick={clearAll}
            className={`text-xs px-3 py-1.5 rounded-lg ${t.bgInput} hover:bg-gray-200 dark:hover:bg-gray-700 border ${t.border} ${t.text} transition-all duration-200`}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

// Get color for model type
function getTypeColor(type: string): string {
  switch (type) {
    case 'cli': return 'text-emerald-500';
    case 'ollama': return 'text-blue-500';
    case 'api': return 'text-purple-500';
    default: return 'text-gray-500';
  }
}

// Get background color for model type
function getTypeBg(type: string): string {
  switch (type) {
    case 'cli': return 'bg-emerald-500/10 dark:bg-emerald-400/10';
    case 'ollama': return 'bg-blue-500/10 dark:bg-blue-400/10';
    case 'api': return 'bg-purple-500/10 dark:bg-purple-400/10';
    default: return 'bg-gray-500/10';
  }
}

// Mask sensitive credentials in content
function maskCredentials(content: string): { masked: string; wasMasked: boolean } {
  let wasMasked = false;
  let result = content;

  // Mask URLs with embedded credentials (https://user:pass@host:port)
  const urlPattern = /(https?:\/\/)([^:\s\/]+):([^@\s\/]+)@([^\/\s]+)/gi;
  result = result.replace(urlPattern, (_match, protocol, _user, _pass, rest) => {
    wasMasked = true;
    return `${protocol}***:***@${rest}`;
  });

  // Mask common credential patterns
  // Password fields with various formats
  const passwordPatterns = [
    // password: "xxx", password: 'xxx', password: xxx
    /password\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
    // pass: xxx
    /pass\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
    // api_key: xxx
    /api[_-]?key\s*[:=]\s*["']?([^"'\s]{16,})["']?/gi,
    // token: xxx
    /(?:access[_-]?)?token\s*[:=]\s*["']?([^"'\s]{16,})["']?/gi,
    // secret: xxx
    /secret\s*[:=]\s*["']?([^"'\s]{16,})["']?/gi,
  ];

  for (const pattern of passwordPatterns) {
    result = result.replace(pattern, (match) => {
      wasMasked = true;
      const field = match.split(/\s*[:=]\s*/)[0];
      return `${field}=••••••••`;
    });
  }

  // Mask Bearer tokens
  result = result.replace(/Bearer\s+[a-zA-Z0-9_\-\.~%/]{20,}/gi, () => {
    wasMasked = true;
    return 'Bearer ••••••••';
  });

  // Mask JWT tokens (eyJ...)
  result = result.replace(/eyJ[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9_\-\.]+/g, () => {
    wasMasked = true;
    return '•••[JWT_TOKEN]•••';
  });

  return { masked: result, wasMasked };
}

// Parse content into segments (code blocks, tables, text)
interface ContentSegment {
  type: 'code' | 'table' | 'text';
  content: string;
  language?: string;
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let remaining = content;

  // Parse code blocks first
  while (remaining.includes('```')) {
    const codeStart = remaining.indexOf('```');
    const textBefore = remaining.slice(0, codeStart);

    if (textBefore.trim()) {
      segments.push({ type: 'text', content: textBefore });
    }

    remaining = remaining.slice(codeStart + 3);

    // Extract language if present
    const newlineIndex = remaining.indexOf('\n');
    let language = '';
    if (newlineIndex > 0 && !remaining.slice(0, newlineIndex).includes('```')) {
      language = remaining.slice(0, newlineIndex).trim();
      remaining = remaining.slice(newlineIndex + 1);
    }

    // Find code block end
    const codeEnd = remaining.indexOf('```');
    if (codeEnd === -1) {
      segments.push({ type: 'text', content: '```' + remaining });
      remaining = '';
      break;
    }

    const code = remaining.slice(0, codeEnd);
    segments.push({ type: 'code', content: code, language: language || 'text' });
    remaining = remaining.slice(codeEnd + 3);
  }

  // Parse tables in remaining text
  if (remaining.trim()) {
    const lines = remaining.split('\n');
    let currentText: string[] = [];
    let tableLines: string[] = [];

    const flushText = () => {
      if (currentText.length > 0) {
        const text = currentText.join('\n').trim();
        if (text) {
          segments.push({ type: 'text', content: text });
        }
        currentText = [];
      }
    };

    const flushTable = () => {
      if (tableLines.length >= 2) {
        segments.push({ type: 'table', content: tableLines.join('\n') });
      } else {
        currentText.push(...tableLines);
      }
      tableLines = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
        if (currentText.length > 0) flushText();
        tableLines.push(line);
      } else if (tableLines.length > 0 && trimmed.startsWith('|---')) {
        tableLines.push(line);
      } else {
        if (tableLines.length > 0) flushTable();
        currentText.push(line);
      }
    }

    flushText();
    flushTable();
  }

  return segments;
}

// Render code block with syntax highlighting
function CodeBlock({ content, language }: { content: string; language: string }) {
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-300 dark:bg-gray-600 transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-300 dark:bg-gray-600 border-b border-gray-300 dark:border-gray-600 transition-colors duration-200">
        <span className="text-xs font-semibold font-mono text-gray-700 dark:text-gray-400 uppercase tracking-wide">{language}</span>
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="text-xs text-gray-900 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors duration-150 font-medium"
        >
          Copy
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-gray-900 dark:text-gray-500 leading-relaxed">{content}</code>
      </pre>
    </div>
  );
}

// Render markdown table
function MarkdownTable({ content }: { content: string }) {
  const lines = content.trim().split('\n').filter(l => l.trim());
  const dataLines = lines.filter(l => !l.trim().startsWith('|---'));

  const rows = dataLines.map(line => {
    const cells = line.split('|').filter(c => c.trim() !== '');
    return cells.map(c => c.trim());
  });

  if (rows.length === 0) return null;

  const headers = rows[0];
  const bodyRows = rows.slice(1);

  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm transition-colors duration-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-200 dark:bg-gray-600/90 transition-colors duration-200">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-5 py-3.5 text-left font-semibold text-gray-900 dark:text-gray-500 border-b-2 border-gray-300 dark:border-gray-600 transition-colors duration-200">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300 dark:divide-gray-600 bg-white dark:bg-gray-600/50 transition-colors duration-200">
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors duration-150">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-5 py-3 text-gray-800 dark:text-gray-500 transition-colors duration-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Render text with markdown formatting
function FormattedText({ content }: { content: string }) {
  // Process bold text **text**
  let processed = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-500">$1</strong>');

  // Process italic text *text*
  processed = processed.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

  // Process inline code `code`
  processed = processed.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-500 rounded text-sm font-mono border border-gray-400 dark:border-gray-500">$1</code>');

  // Split by newlines and wrap in paragraph tags
  const paragraphs = processed.split('\n').filter((p, i, arr) => {
    // Keep non-empty lines
    if (p.trim()) return true;
    // Keep empty lines only if surrounded by content (creates paragraph breaks)
    if (i > 0 && i < arr.length - 1 && arr[i-1].trim() && arr[i+1].trim()) return true;
    return false;
  });

  return (
    <div className="text-gray-900 dark:text-gray-500 leading-relaxed transition-colors duration-200">
      {paragraphs.map((para, index) => (
        <p key={index} dangerouslySetInnerHTML={{ __html: para || '&nbsp;' }} />
      ))}
    </div>
  );
}

// Render content segments
function FormattedContent({ content }: { content: string }) {
  const segments = parseContent(content);
  let anyMasked = false;

  return (
    <div className="space-y-3">
      {segments.map((segment, index) => {
        const { masked: maskedContent, wasMasked } = maskCredentials(segment.content);
        if (wasMasked) anyMasked = true;

        if (segment.type === 'code') {
          return <CodeBlock key={index} content={maskedContent} language={segment.language || 'text'} />;
        } else if (segment.type === 'table') {
          return <MarkdownTable key={index} content={maskedContent} />;
        } else {
          return <FormattedText key={index} content={maskedContent} />;
        }
      })}
      {anyMasked && (
        <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-500/40 rounded-lg flex items-start gap-2 transition-colors duration-200">
          <svg className="w-5 h-5 text-yellow-800 dark:text-yellow-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Credentials Masked</p>
            <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">Sensitive information (passwords, API keys, tokens) has been automatically hidden for security.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<ImageData[]>([]);
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [chairman, setChairmanId] = useState('');
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState<'query' | 'admin'>('query');
  const [toggling, setToggling] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [maxTimeout, setMaxTimeout] = useState(0);

  useEffect(() => { loadMembers(); }, []);

  // Countdown timer effect
  useEffect(() => {
    let intervalId: number | null = null;

    if (loading && remainingTime > 0) {
      intervalId = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            if (intervalId) window.clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [loading, remainingTime]);

  const loadMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/config`);
      const data = await res.json();
      setMembers(data.council_members || []);
      if (data.chairman) setChairmanId(data.chairman);
    } catch {
      setError('Backend not running. Start it first: cd backend && python main.py');
    }
  };

  const toggleModelEnabled = async (memberId: string, currentState: boolean) => {
    setToggling(memberId);
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      setMembers(prev =>
        prev.map(m =>
          m.id === memberId ? { ...m, enabled: !currentState } : m
        )
      );

      const res = await fetch(`${API_BASE}/admin/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member: { ...member, enabled: !currentState }
        })
      });

      if (!res.ok) {
        setMembers(prev =>
          prev.map(m =>
            m.id === memberId ? { ...m, enabled: currentState } : m
          )
        );
        throw new Error('Failed to update member');
      }

      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setToggling(null);
    }
  };

  const calculateMaxTimeout = () => {
    // Default timeout values for different model types (in seconds)
    const timeoutMap: Record<string, number> = {
      'ollama-gemma4': 120,
      'ollama-gemma26b': 120,
      'lan-gemma31b': 120,
      'gemini-local': 60,
      'claude-local': 60,
      'api-gpt4': 60,
      'api-claude': 90,
    };

    // Get selected models
    const modelsToQuery = selectedModels.length > 0 ? selectedModels : members.filter(m => m.enabled).map(m => m.id);

    // Find the maximum timeout among selected models
    let maxTime = 120; // Default fallback
    modelsToQuery.forEach(modelId => {
      const timeout = timeoutMap[modelId];
      if (timeout && timeout > maxTime) {
        maxTime = timeout;
      }
    });

    // Add 10 seconds buffer for synthesis
    return maxTime + 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const maxTime = calculateMaxTimeout();
    setMaxTimeout(maxTime);
    setRemainingTime(maxTime);
    setLoading(true);
    setError('');
    setResult(null);

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setError(`Request timeout after ${maxTime} seconds. The models may be overloaded or taking too long to respond.`);
    }, maxTime * 1000);

    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          images: images.length > 0 ? images : undefined,
          models: selectedModels.length > 0 ? selectedModels : undefined,
          chairman: chairman || undefined,
          return_individual: true,
        }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setResult(await res.json());
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(`Request timeout after ${maxTime} seconds. Try using fewer models or faster models.`);
      } else {
        setError(err instanceof Error ? err.message : 'Query failed');
      }
    } finally {
      setLoading(false);
      setRemainingTime(0);
    }
  };

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const enabledMembers = members.filter(m => m.enabled);

  return (
    <ThemeProvider>
      <MainApp
        prompt={prompt}
        setPrompt={setPrompt}
        images={images}
        setImages={setImages}
        members={enabledMembers}
        allMembers={members}
        selectedModels={selectedModels}
        toggleModel={toggleModel}
        chairman={chairman}
        setChairman={setChairmanId}
        result={result}
        loading={loading}
        error={error}
        page={page}
        setPage={setPage}
        toggling={toggling}
        onToggleEnabled={toggleModelEnabled}
        onRefresh={loadMembers}
        handleSubmit={handleSubmit}
        remainingTime={remainingTime}
        maxTimeout={maxTimeout}
      />
    </ThemeProvider>
  );
}

function MainApp({ prompt, setPrompt, images, setImages, members, allMembers, selectedModels, toggleModel, chairman, setChairman, result, loading, error, page, setPage, toggling, onToggleEnabled, onRefresh, handleSubmit, remainingTime, maxTimeout }: any) {
  const { theme, toggleTheme } = useTheme();
  const t = themeClasses[theme];

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} transition-colors duration-300`}>
      {/* Header */}
      <header className={`border-b ${t.border} ${t.bg} backdrop-blur-sm sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">LLM Council</h1>
                <p className={`text-sm ${t.textMuted} transition-colors duration-300`}>Multi-model AI query system</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${t.bgCard} border ${t.border} hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Navigation */}
              <nav className="flex gap-1">
                <button
                  onClick={() => setPage('query')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    page === 'query'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : `${t.textMuted} hover:${t.text} hover:bg-gray-200 dark:hover:bg-gray-700`
                  }`}
                >
                  Query
                </button>
                <button
                  onClick={() => setPage('admin')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    page === 'admin'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : `${t.textMuted} hover:${t.text} hover:bg-gray-200 dark:hover:bg-gray-700`
                  }`}
                >
                  Admin
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg transition-colors duration-200">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {page === 'query' ? (
          <QueryPage
            prompt={prompt}
            setPrompt={setPrompt}
            images={images}
            setImages={setImages}
            members={members}
            selectedModels={selectedModels}
            toggleModel={toggleModel}
            chairman={chairman}
            setChairman={setChairman}
            result={result}
            loading={loading}
            handleSubmit={handleSubmit}
            remainingTime={remainingTime}
            maxTimeout={maxTimeout}
          />
        ) : (
          <AdminPage
            members={allMembers}
            onRefresh={onRefresh}
            onToggleEnabled={onToggleEnabled}
            toggling={toggling}
          />
        )}
      </main>
    </div>
  );
}

function QueryPage({ prompt, setPrompt, images, setImages, members, selectedModels, toggleModel, chairman, setChairman, result, loading, handleSubmit, remainingTime, maxTimeout }: any) {
  const { theme } = useTheme();
  const t = themeClasses[theme];
  const allSelected = selectedModels.length === 0 || selectedModels.length === members.length;

  return (
    <div className="space-y-8">
      {/* Empty State */}
      {!result && !loading && (
        <div className={`${t.bgCard} border-2 ${t.border} rounded-xl p-12 text-center transition-colors duration-300`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className={`text-xl font-semibold ${t.text} mb-2`}>Ask the LLM Council</h3>
          <p className={`text-sm ${t.textMuted} max-w-md mx-auto`}>
            Enter your question above and select which council members to consult. The chairman will synthesize their responses into a comprehensive answer.
          </p>
        </div>
      )}

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className={`block text-sm font-semibold ${t.text} transition-colors duration-300`}>Your Question</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={`w-full h-40 px-4 py-3 ${t.bgInput} border-2 ${t.border} rounded-xl ${t.text} ${t.placeholder} ${t.focus} focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all duration-200 placeholder:opacity-60`}
            placeholder="Ask the council anything... (e.g., 'What are the pros and cons of microservices architecture?')"
            disabled={loading}
          />
          <div className="flex justify-between items-center">
            <p className={`text-xs ${t.textMuted} transition-colors duration-300`}>
              {prompt.length} characters
            </p>
            {prompt.length > 0 && prompt.length < 10 && (
              <p className={`text-xs text-amber-600 dark:text-amber-400 transition-colors duration-200`}>
                Enter at least 10 characters for better results
              </p>
            )}
          </div>
        </div>

        {/* Image Upload Section */}
        <ImageUpload
          images={images}
          setImages={setImages}
          maxImages={3}
          maxSize={5 * 1024 * 1024}  // 5MB
        />

        {/* Model Selection */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className={`block text-sm font-medium ${t.text} transition-colors duration-300`}>
              Council Members
            </label>
            <button
              type="button"
              onClick={() => {
                if (allSelected) {
                  selectedModels.forEach((id: string) => toggleModel(id));
                } else {
                  members.forEach((m: CouncilMember) => {
                    if (!selectedModels.includes(m.id)) {
                      toggleModel(m.id);
                    }
                  });
                }
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-150 font-medium"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {members.map((m: CouncilMember) => {
              const isSelected = selectedModels.length === 0 || selectedModels.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModel(m.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? `${getTypeBg(m.type)} ${getTypeColor(m.type)} border-2 border-current shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]`
                      : `${t.bgInput} ${t.text} border-2 ${t.border} hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transform hover:scale-[1.01] active:scale-[0.99]`
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-current shadow-sm' : 'bg-gray-400'}`}></span>
                    <span>{m.name}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedModels.length > 0 && (
            <p className={`text-xs ${t.textMuted} transition-colors duration-300`}>
              {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Chairman Selection */}
        <div className="space-y-2">
          <label className={`block text-sm font-medium ${t.text} transition-colors duration-300`}>Chairman (Synthesizer)</label>
          <select
            value={chairman}
            onChange={(e) => setChairman(e.target.value)}
            className={`w-full px-4 py-3 ${t.bgInput} border ${t.border} rounded-xl ${t.text} ${t.focus} focus:border-transparent outline-none transition-all duration-200 appearance-none cursor-pointer`}
          >
            <option value="">Default (from config)</option>
            {members.map((m: CouncilMember) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="group relative w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:from-blue-500 focus:to-purple-500 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:transform-none"
        >
          {loading ? (
            <span className="flex flex-col items-center justify-center gap-2">
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-medium">Consulting Council...</span>
              </span>
              <span className="text-xs opacity-80">
                Timeout in: {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')} / {Math.floor(maxTimeout / 60)}:{(maxTimeout % 60).toString().padStart(2, '0')}
              </span>
            </span>
          ) : (
            <span className="font-medium">Ask Council</span>
          )}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Failure Warning */}
          {result.individual_responses && result.individual_responses.some((r: ModelResponse) => r.error) && (
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg flex items-start gap-3 transition-colors duration-200">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Some council members failed to respond
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  {result.individual_responses.filter((r: ModelResponse) => r.error).length} of {result.individual_responses.length} model(s) encountered errors
                </p>
              </div>
            </div>
          )}

          {/* Chairman Response */}
          <div className={`${t.bgCard} border ${t.border} rounded-xl overflow-hidden shadow-sm transition-colors duration-300`}>
            <div className={`px-6 py-4 border-b ${t.border} ${t.bgCard} transition-colors duration-300`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-lg font-semibold ${t.text} transition-colors duration-300`}>Synthesized Answer</h2>
                  <p className={`text-sm ${t.textMuted} mt-1 transition-colors duration-300`}>
                    by {result.chairman_model}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${t.textMuted}`}>Final</span>
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-6">
              <FormattedContent content={result.chairman_response} />
            </div>
          </div>

          {/* Individual Responses */}
          {result.individual_responses && result.individual_responses.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold ${t.text} mb-4 transition-colors duration-300`}>
                Individual Responses
                <span className={`text-sm font-normal ${t.textMuted} ml-2`}>
                  ({result.individual_responses.filter((r: ModelResponse) => !r.error).length} of {result.individual_responses.length} successful)
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.individual_responses.map((resp: ModelResponse, index: number) => (
                  <div key={resp.model_id} className={`response-card ${t.bgCard} border-2 ${t.border} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200`} style={{ animationDelay: `${index * 50}ms` }}>
                    <div className={`px-5 py-4 border-b ${t.border} ${t.bgCard} transition-colors duration-300`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-3 h-3 rounded-full ${resp.error ? 'bg-red-500' : 'bg-green-500'}`}></div>
                          <h4 className={`font-semibold ${t.text}`}>{resp.model_name}</h4>
                        </div>
                        {resp.duration_ms && (
                          <span className={`text-xs font-mono font-semibold ${t.textMuted} ${t.bgInput} px-2.5 py-1 rounded-md border ${t.border}`}>
                            {formatDuration(resp.duration_ms)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-5">
                      {resp.error ? (
                        <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
                          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Request Failed</p>
                            <p className="text-xs mt-1 opacity-80">{resp.error}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          <FormattedContent content={resp.content} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Member Form Component
interface MemberFormProps {
  member?: CouncilMember;
  onSave: (member: Partial<CouncilMember>) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}

function MemberForm({ member, onSave, onCancel, onDelete }: MemberFormProps) {
  const { theme } = useTheme();
  const t = themeClasses[theme];
  const isEditing = !!member;

  const [formData, setFormData] = useState<Partial<CouncilMember>>({
    id: member?.id || '',
    name: member?.name || '',
    type: member?.type || 'cli',
    enabled: member?.enabled ?? true,
    command: member?.command || '',
    args: member?.args || [],
    host: member?.host || 'localhost',
    model: member?.model || '',
    provider: member?.provider || 'openai',
    timeout: member?.timeout || 120,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CouncilMember, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${t.bgCard} rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border ${t.border}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className={`text-xl font-semibold ${t.text}`}>
                {isEditing ? 'Edit Council Member' : 'Add Council Member'}
              </h3>
              <p className={`text-sm ${t.textMuted} mt-1`}>
                {isEditing ? 'Modify existing model configuration' : 'Add a new AI model to the council'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${t.textMuted}`}
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 dark:bg-red-400/10 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${t.text} mb-1`}>ID *</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={e => updateField('id', e.target.value)}
                  disabled={isEditing}
                  required
                  placeholder="e.g., claude-local"
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${t.text} mb-1`}>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => updateField('name', e.target.value)}
                  required
                  placeholder="e.g., Claude CLI"
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${t.text} mb-1`}>Type *</label>
                <select
                  value={formData.type}
                  onChange={e => updateField('type', e.target.value)}
                  disabled={isEditing}
                  required
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} focus:outline-none focus:ring-2 ${t.focus} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="cli">CLI</option>
                  <option value="ollama">Ollama</option>
                  <option value="api">API</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium ${t.text} mb-1`}>Timeout (seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={formData.timeout}
                  onChange={e => updateField('timeout', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={e => updateField('enabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="enabled" className={`text-sm ${t.text}`}>Enabled</label>
            </div>

            {/* Type-specific fields */}
            {formData.type === 'cli' && (
              <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-600/50 rounded-lg">
                <h4 className={`text-sm font-semibold ${t.text}`}>CLI Configuration</h4>
                <div>
                  <label className={`block text-sm font-medium ${t.text} mb-1`}>Command *</label>
                  <input
                    type="text"
                    value={formData.command}
                    onChange={e => updateField('command', e.target.value)}
                    required
                    placeholder="e.g., claude"
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${t.text} mb-1`}>Arguments</label>
                  <input
                    type="text"
                    value={formData.args?.join(' ') || ''}
                    onChange={e => updateField('args', e.target.value.split(' ').filter(Boolean))}
                    placeholder="e.g., --print --fast"
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                  />
                </div>
              </div>
            )}

            {formData.type === 'ollama' && (
              <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-600/50 rounded-lg">
                <h4 className={`text-sm font-semibold ${t.text}`}>Ollama Configuration</h4>
                <div>
                  <label className={`block text-sm font-medium ${t.text} mb-1`}>Host *</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={e => updateField('host', e.target.value)}
                    required
                    placeholder="e.g., localhost or 192.168.1.100"
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${t.text} mb-1`}>Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => updateField('model', e.target.value)}
                    required
                    placeholder="e.g., gemma2:e4b"
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                  />
                </div>
              </div>
            )}

            {formData.type === 'api' && (
              <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-600/50 rounded-lg">
                <h4 className={`text-sm font-semibold ${t.text}`}>API Configuration</h4>
                <div>
                  <label className={`block text-sm font-medium ${t.text} mb-1`}>Provider *</label>
                  <select
                    value={formData.provider}
                    onChange={e => updateField('provider', e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${t.text} mb-1`}>Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => updateField('model', e.target.value)}
                    required
                    placeholder="e.g., gpt-4 or claude-3-sonnet-20240229"
                    className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.bgInput} ${t.text} ${t.placeholder} focus:outline-none focus:ring-2 ${t.focus} transition-colors`}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {saving ? 'Saving...' : isEditing ? 'Update' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className={`px-4 py-2 ${t.bgInput} hover:bg-gray-200 dark:hover:bg-gray-700 border ${t.border} rounded-lg font-medium ${t.text} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
              </div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${member?.name}"?`)) {
                      onDelete(member!.id);
                    }
                  }}
                  className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors`}
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AdminPage({ members, onRefresh, onToggleEnabled, toggling }: {
  members: CouncilMember[];
  onRefresh: () => void;
  onToggleEnabled: (id: string, current: boolean) => Promise<void>;
  toggling: string | null;
}) {
  const { theme } = useTheme();
  const t = themeClasses[theme];
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [editingMember, setEditingMember] = useState<CouncilMember | undefined>();
  const [addingMember, setAddingMember] = useState(false);

  // Auto-check availability on page load
  useEffect(() => {
    checkAvail();
  }, []);

  const checkAvail = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/admin/availability`);
      const data = await res.json();
      setAvailability(data.availability || {});
    } catch { /* ignore */ }
    setChecking(false);
  };

  const handleAddMember = async (memberData: Partial<CouncilMember>) => {
    const res = await fetch(`${API_BASE}/admin/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to add member');
    }

    setAddingMember(false);
    onRefresh();
  };

  const handleEditMember = async (memberData: Partial<CouncilMember>) => {
    const res = await fetch(`${API_BASE}/admin/members/${editingMember!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member: memberData }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to update member');
    }

    setEditingMember(undefined);
    onRefresh();
  };

  const handleDeleteMember = async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/members/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Failed to delete member');
    }

    setEditingMember(undefined);
    onRefresh();
  };

  const enabledCount = members.filter(m => m.enabled).length;
  const onlineCount = Object.values(availability).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-semibold ${t.text} transition-colors duration-300`}>Council Members</h2>
          <p className={`text-sm ${t.textMuted} mt-1 transition-colors duration-300`}>
            {enabledCount} of {members.length} enabled · {onlineCount} online
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingMember(true)}
            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors`}
          >
            + Add Member
          </button>
          <button
            onClick={checkAvail}
            disabled={checking}
            className={`px-4 py-2 ${t.bgInput} hover:bg-gray-200 dark:hover:bg-gray-700 border ${t.border} hover:border-gray-400 dark:hover:border-gray-500 rounded-lg text-sm font-medium ${t.text} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {checking ? 'Checking...' : 'Check Availability'}
          </button>
          <button
            onClick={onRefresh}
            className={`px-4 py-2 ${t.bgInput} hover:bg-gray-200 dark:hover:bg-gray-700 border ${t.border} hover:border-gray-400 dark:hover:border-gray-500 rounded-lg text-sm font-medium ${t.text} transition-all duration-200`}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(m => (
          <div
            key={m.id}
            className={`${t.bgCard} border rounded-xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md ${
              m.enabled ? t.border : 'border-gray-200 dark:border-gray-800/50 opacity-60'
            }`}
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${t.text}`}>{m.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeBg(m.type)} ${getTypeColor(m.type)}`}>
                      {m.type.toUpperCase()}
                    </span>
                  </div>
                  <p className={`text-xs ${t.textMuted} font-mono`}>{m.id}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingMember(m)}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${t.textMuted}`}
                    title="Edit member"
                  >
                    ✏️
                  </button>
                  {/* Toggle Button */}
                  <button
                    onClick={() => onToggleEnabled(m.id, m.enabled)}
                    disabled={toggling === m.id}
                    className={`relative w-14 h-7 rounded-full transition-all duration-200 ${
                      m.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    } ${toggling === m.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={m.enabled ? 'Click to disable' : 'Click to enable'}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                      m.enabled ? 'left-8' : 'left-1'
                    }`} />
                    <span className={`absolute top-1/2 -translate-y-1/2 text-xs font-semibold ${
                      m.enabled ? 'left-1.5 text-white' : 'right-1.5 text-gray-600 dark:text-gray-400'
                    }`}>
                      {m.enabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-4">
                {m.enabled ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-400/10 px-2 py-1 rounded-full transition-colors duration-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>
                    ENABLED
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-500 bg-gray-200 dark:bg-gray-600/50 px-2 py-1 rounded-full transition-colors duration-200">
                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"></span>
                    DISABLED
                  </span>
                )}
                {availability[m.id] !== undefined && (
                  <span className={`flex items-center gap-1.5 text-xs ${
                    availability[m.id] ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {availability[m.id] ? '● Online' : '○ Offline'}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className={`space-y-2 text-xs ${t.textMuted} ${t.bgCard} rounded-lg p-3 transition-colors duration-300`}>
                {/* Timeout Display - Common for all types */}
                {m.timeout || 120 !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Timeout</span>
                    <span className="font-mono text-gray-900 dark:text-gray-300">{m.timeout || 120}s</span>
                  </div>
                )}
                {m.type === 'cli' && (
                  <>
                    <div className="flex justify-between">
                      <span>Command</span>
                      <span className="font-mono text-gray-900 dark:text-gray-500">{m.command}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Args</span>
                      <span className="font-mono text-gray-900 dark:text-gray-500">{m.args?.join(' ') || 'none'}</span>
                    </div>
                  </>
                )}
                {m.type === 'ollama' && (
                  <>
                    <div className="flex justify-between">
                      <span>Model</span>
                      <span className="font-mono text-gray-900 dark:text-gray-500">{m.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Host</span>
                      <span className="font-mono text-gray-900 dark:text-gray-500">{m.host}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Timeout</span>
                      <span className="font-mono text-gray-900 dark:text-gray-400">{m.timeout || 120 || 120}s</span>
                    </div>
                    {m.timeout || 120 > 120 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Large model timeout</span>
                      </div>
                    )}
                  </>
                )}
                {m.type === 'api' && (
                  <>
                    <div className="flex justify-between">
                      <span>Provider</span>
                      <span className="font-mono text-gray-900 dark:text-gray-500">{m.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model</span>
                      <span className="font-mono text-gray-900 dark:text-gray-500">{m.model}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Timeout</span>
                      <span className="font-mono text-gray-900 dark:text-gray-400">{m.timeout || 120 || 60}s</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Help */}
      <div className={`${t.bgCard} border ${t.border} rounded-xl p-6 transition-colors duration-300`}>
        <h3 className={`font-semibold ${t.text} mb-2`}>✨ New Features</h3>
        <p className={`text-sm ${t.textSecondary} mb-4`}>
          You can now add, edit, and delete council members directly from this UI. Changes are saved automatically and will be hot-reloaded by the backend!
        </p>
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-sm ${t.text}`}>
            <span className="text-blue-500">✓</span>
            <span>Add new models with the + Add Member button</span>
          </div>
          <div className={`flex items-center gap-2 text-sm ${t.text}`}>
            <span className="text-blue-500">✓</span>
            <span>Click the ✏️ icon to edit any member</span>
          </div>
          <div className={`flex items-center gap-2 text-sm ${t.text}`}>
            <span className="text-blue-500">✓</span>
            <span>Config changes are automatically hot-reloaded</span>
          </div>
        </div>

        {/* Timeout Settings Guide */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg transition-colors duration-200">
          <h4 className={`text-sm font-semibold ${t.text} mb-2 flex items-center gap-2`}>
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0l-3 3m6-3H9" />
            </svg>
            Timeout Settings
          </h4>
          <div className={`text-xs ${t.textSecondary} space-y-1`}>
            <p><strong>Large Models (26B+):</strong> Set timeout to 300s in config file</p>
            <p><strong>Medium Models (9B-13B):</strong> Set timeout to 180s in config file</p>
            <p><strong>Small Models (under 7B):</strong> Default 120s is usually fine</p>
            <p className="mt-2 font-mono text-xs bg-white dark:bg-gray-800/50 p-2 rounded">
              timeout: 300  # Add this line to large models
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Member Modal */}
      {(addingMember || editingMember) && (
        <MemberForm
          member={editingMember}
          onSave={addingMember ? handleAddMember : handleEditMember}
          onCancel={() => {
            setAddingMember(false);
            setEditingMember(undefined);
          }}
          onDelete={editingMember ? handleDeleteMember : undefined}
        />
      )}
    </div>
  );
}

export default App;
