import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./Translator.css";

// ---------- Types ----------
type Entry = { en: string; de: string; fr: string };
type Lang = "en" | "de" | "fr";

// Commands whose lines should be left as-is
const PASS_THROUGH = new Set<string>([
    "/echo", "/p", "/party", "/s", "/say", "/y", "/yell", "/sh", "/shout",
    "/tell", "/t", "/a", "/alliance", "/fc", "/linkshell",
    "/cwls1", "/cwls2", "/cwls3", "/cwls4", "/cwls5", "/cwls6", "/cwls7", "/cwls8",
    "/wait", "/merror", "/macroerror"
]);

const LANGUAGES: { code: Lang; name: string; native: string }[] = [
    { code: "en", name: "English", native: "English" },
    { code: "de", name: "German", native: "Deutsch" },
    { code: "fr", name: "French", native: "Français" },
];

// ---------- Helpers ----------
function buildLookup(dict: Entry[]): Map<string, Entry> {
    const m = new Map<string, Entry>();
    for (const e of dict) {
        if (e.en) m.set(e.en.toLowerCase(), e);
        if (e.de) m.set(e.de.toLowerCase(), e);
        if (e.fr) m.set(e.fr.toLowerCase(), e);
    }
    return m;
}

function extractName(rest: string): { name: string; consumed: number } | null {
    const start = rest.search(/\S/);
    if (start === -1) return null;
    const s = rest.slice(start);

    const mq = s.match(/^"([^"]+)"\s*/);
    if (mq) return { name: mq[1], consumed: start + mq[0].length };

    const mu = s.match(/^([^<"]+?)(?=\s*<|$)/);
    if (mu) return { name: mu[1].trim(), consumed: start + mu[0].length };

    return null;
}

const quoteIfNeeded = (name: string) => (/\s/.test(name) ? `"${name}"` : name);

// ---------- Background Component ----------
const AnimatedBackground: React.FC = () => (
    <div className="background-layer">
        <div className="gradient-mesh" />
        <div className="aurora" />
        <div className="grid-overlay" />
        <div className="particles">
            {[...Array(15)].map((_, i) => (
                <div key={i} className="particle" />
            ))}
        </div>
    </div>
);

// ---------- Copy Button Component ----------
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            className={`copy-button ${copied ? "copied" : ""}`}
            onClick={handleCopy}
            disabled={!text}
            aria-label="Copy to clipboard"
        >
            {copied ? (
                <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    <span>Copy</span>
                </>
            )}
        </button>
    );
};

// ---------- Main Component ----------
const Translator: React.FC = () => {
    const [dictionary, setDictionary] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [target, setTarget] = useState<Lang>("fr");
    const [isTranslating, setIsTranslating] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Mouse tracking for card glow effect
    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty("--mouse-x", `${x}%`);
            card.style.setProperty("--mouse-y", `${y}%`);
        };

        card.addEventListener("mousemove", handleMouseMove);
        return () => card.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Load dictionary
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const r1 = await fetch("/dictionary.deduped.json");
                if (r1.ok) {
                    setDictionary(await r1.json());
                    setLoading(false);
                    return;
                }
            } catch {}
            try {
                const r2 = await fetch("/dictionary.json");
                setDictionary(await r2.json());
            } catch {
                console.error("Failed to load dictionary");
            }
            setLoading(false);
        })();
    }, []);

    const lookup = useMemo(() => buildLookup(dictionary), [dictionary]);

    const translateLine = useCallback(
        (line: string): string => {
            const trimmed = line.trim();
            if (!trimmed.startsWith("/")) return line;

            const cmdMatch = trimmed.match(/^\/\S+/);
            if (!cmdMatch) return line;
            const cmd = cmdMatch[0];
            const rest = trimmed.slice(cmd.length);

            if (PASS_THROUGH.has(cmd.toLowerCase())) return line;

            const ex = extractName(rest);
            if (!ex || !ex.name) return line;

            const hit = lookup.get(ex.name.toLowerCase());
            if (!hit) return line;

            const translated = hit[target] || ex.name;
            const replacement = quoteIfNeeded(translated);
            const tail = rest.slice(ex.consumed);
            return `${cmd} ${replacement}${tail}`;
        },
        [lookup, target]
    );

    const translateMacro = useCallback(() => {
        if (!dictionary.length) {
            setOutput(input);
            return;
        }

        setIsTranslating(true);

        // Small delay for animation
        setTimeout(() => {
            const out = input.split("\n").map(translateLine).join("\n");
            setOutput(out);
            setIsTranslating(false);
        }, 400);
    }, [dictionary, input, translateLine]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            translateMacro();
        }
    };

    const lineCount = input.split("\n").length;
    const charCount = input.length;

    return (
        <>
            <AnimatedBackground />

            <main className="translator-container">
                <div className="translator-card" ref={cardRef}>
                    {/* Header */}
                    <header className="translator-header">
                        <div className="header-glow" />
                        <div className="logo-container">
                            <div className="logo-icon">
                                <svg viewBox="0 0 48 48" fill="none">
                                    <defs>
                                        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#00f0ff" />
                                            <stop offset="100%" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M24 4L44 14v20L24 44 4 34V14L24 4z"
                                        stroke="url(#logoGrad)"
                                        strokeWidth="2"
                                        fill="none"
                                    />
                                    <path
                                        d="M24 12L36 18v12L24 36 12 30V18L24 12z"
                                        stroke="url(#logoGrad)"
                                        strokeWidth="1.5"
                                        fill="rgba(0,240,255,0.1)"
                                    />
                                    <circle cx="24" cy="24" r="4" fill="url(#logoGrad)" />
                                </svg>
                            </div>
                            <div className="logo-text">
                                <h1>Macro Translator</h1>
                                <p className="subtitle">FFXIV Action & Skill Localization</p>
                            </div>
                        </div>

                        {/* Language Selector */}
                        <div className="language-selector">
                            <span className="selector-label">Target</span>
                            <div className="language-tabs">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        className={`lang-tab ${target === lang.code ? "active" : ""}`}
                                        onClick={() => setTarget(lang.code)}
                                        aria-pressed={target === lang.code}
                                    >
                                        <span className="lang-code">{lang.code.toUpperCase()}</span>
                                        <span className="lang-name">{lang.native}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    {/* Editor Area */}
                    <div className="editor-grid">
                        {/* Input Panel */}
                        <div className={`editor-panel input-panel ${inputFocused ? "focused" : ""}`}>
                            <div className="panel-header">
                                <div className="panel-title">
                                    <span className="panel-icon input-icon">↓</span>
                                    Input Macro
                                </div>
                                <div className="panel-stats">
                                    {lineCount} line{lineCount !== 1 ? "s" : ""} · {charCount} char
                                    {charCount !== 1 ? "s" : ""}
                                </div>
                            </div>
                            <div className="textarea-wrapper">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste your FFXIV macro here..."
                    spellCheck={false}
                    aria-label="Input macro text"
                />
                                <div className="textarea-glow" />
                            </div>
                        </div>

                        {/* Center Action */}
                        <div className="action-column">
                            <button
                                className={`translate-button ${isTranslating ? "translating" : ""}`}
                                onClick={translateMacro}
                                disabled={loading || isTranslating || !input.trim()}
                            >
                                <span className="button-bg" />
                                <span className="button-content">
                  {isTranslating ? (
                      <span className="spinner" />
                  ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                  )}
                </span>
                                <span className="button-ripple" />
                            </button>
                            <span className="shortcut-hint">⌘ + Enter</span>
                        </div>

                        {/* Output Panel */}
                        <div className={`editor-panel output-panel ${output ? "has-content" : ""}`}>
                            <div className="panel-header">
                                <div className="panel-title">
                                    <span className="panel-icon output-icon">↑</span>
                                    Output Macro
                                </div>
                                <CopyButton text={output} />
                            </div>
                            <div className="textarea-wrapper">
                <textarea
                    value={output}
                    readOnly
                    placeholder="Translated macro will appear here..."
                    aria-label="Output macro text"
                />
                                <div className="textarea-glow output-glow" />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="translator-footer">
                        <div className="footer-left">
                            {loading ? (
                                <span className="loading-indicator">
                  <span className="loading-dot" />
                  Loading dictionary...
                </span>
                            ) : (
                                <span className="dict-status">
                  <span className="status-dot online" />
                                    {dictionary.length.toLocaleString()} entries loaded
                </span>
                            )}
                        </div>
                        <div className="footer-center">
                            <span className="footer-divider">·</span>
                        </div>
                        <div className="footer-right">
              <span className="made-by">
                Crafted by <span className="author">Marko</span>
              </span>
                        </div>
                    </footer>
                </div>
            </main>
        </>
    );
};

export default Translator;