import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, MenuItem, Select, TextField, Typography } from "@mui/material";

// ---------- Types ----------
type Entry = { en: string; de: string; fr: string };
type Lang = "en" | "de" | "fr";

// Commands whose lines should be left as-is (roleplay/chat/timing)
const PASS_THROUGH = new Set<string>([
  "/echo", "/p", "/party", "/s", "/say", "/y", "/yell", "/sh", "/shout",
  "/tell", "/t", "/a", "/alliance", "/fc", "/linkshell",
  "/cwls1","/cwls2","/cwls3","/cwls4","/cwls5","/cwls6","/cwls7","/cwls8",
  "/wait", "/merror", "/macroerror"
]);

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

// Extract the translatable name after the command.
// Handles: "Quoted Name"  OR  Multi Word Name  (stops before <...> tokens)
function extractName(rest: string): { name: string; consumed: number } | null {
  const start = rest.search(/\S/);
  if (start === -1) return null;
  const s = rest.slice(start);

  // 1) quoted
  const mq = s.match(/^"([^"]+)"\s*/);
  if (mq) return { name: mq[1], consumed: start + mq[0].length };

  // 2) unquoted until first angle-token or end
  const mu = s.match(/^([^<"]+?)(?=\s*<|$)/);
  if (mu) return { name: mu[1].trim(), consumed: start + mu[0].length };

  return null;
}

const quoteIfNeeded = (name: string) => (/\s/.test(name) ? `"${name}"` : name);

// ---------- Component ----------
const Translator: React.FC = () => {
  const [dictionary, setDictionary] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [target, setTarget] = useState<Lang>("fr");

  // Load dictionary (try deduped, fall back to raw)
  useEffect(() => {
    (async () => {
      try {
        const r1 = await fetch("/dictionary.deduped.json");
        if (r1.ok) {
          setDictionary(await r1.json());
          return;
        }
      } catch {}
      const r2 = await fetch("/dictionary.json");
      setDictionary(await r2.json());
    })();
  }, []);

  const lookup = useMemo(() => buildLookup(dictionary), [dictionary]);

  function translateLine(line: string): string {
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

    // Keep everything after the consumed name (including <wait.>, targets, spacing)
    const tail = rest.slice(ex.consumed);
    return `${cmd} ${replacement}${tail}`;
  }

  function translateMacro() {
    if (!dictionary.length) {
      setOutput(input);
      return;
    }
    const out = input.split("\n").map(translateLine).join("\n");
    setOutput(out);
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ background: "linear-gradient(to bottom, #0d111c, #141a29)", textAlign: "center" }}
    >
      <Box
        sx={{
          p: 4,
          borderRadius: "16px",
          background: "rgba(20, 26, 41, 0.95)",
          boxShadow: "0 0 25px rgba(0, 208, 255, 0.4)",
          width: "85%",
          maxWidth: "1200px",
        }}
      >
        {/* Title */}
        <Typography
          variant="h3"
          gutterBottom
          sx={{ fontWeight: "bold", mb: 4, color: "#00eaff", textShadow: "0 0 20px #00eaff" }}
        >
          Argonauts Macro Translator
        </Typography>

        {/* Textareas with labels ABOVE the boxes */}
        <Box display="flex" gap={4} mb={3}>
          <Box flex={1}>
            <Typography sx={{ color: "#00eaff", fontWeight: "bold", mb: 1 }}>Input Macro</Typography>
            <TextField
              multiline
              minRows={14}
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#0d111c",
                  border: "2px solid rgba(0, 208, 255, 0.6)",
                  borderRadius: "12px",
                  color: "#e0e6ff",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: "#00eaff",
                    boxShadow: "0 0 15px rgba(0, 208, 255, 0.8)",
                  },
                  "&.Mui-focused": {
                    borderColor: "#00eaff",
                    boxShadow: "0 0 20px rgba(0, 208, 255, 1)",
                  },
                },
              }}
            />
          </Box>

          <Box flex={1}>
            <Typography sx={{ color: "#00eaff", fontWeight: "bold", mb: 1 }}>Output Macro</Typography>
            <TextField
              multiline
              minRows={14}
              fullWidth
              value={output}
              InputProps={{ readOnly: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#0d111c",
                  border: "2px solid rgba(0, 208, 255, 0.6)",
                  borderRadius: "12px",
                  color: "#e0e6ff",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: "#00eaff",
                    boxShadow: "0 0 15px rgba(0, 208, 255, 0.8)",
                  },
                  "&.Mui-focused": {
                    borderColor: "#00eaff",
                    boxShadow: "0 0 20px rgba(0, 208, 255, 1)",
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Controls */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" gap={2} alignItems="center">
            <Typography>Target Language:</Typography>
            <Select
              value={target}
              onChange={(e) => setTarget(e.target.value as Lang)}
              sx={{
                minWidth: 120,
                backgroundColor: "#0d111c",
                color: "#cabf1dff",
                border: "2px solid rgba(255, 255, 255, 0.6)",
                borderRadius: "8px",
                "& .MuiSvgIcon-root": { color: "#e4d612ff" },
                "&:hover": { borderColor: "#e4d612ff", boxShadow: "0 0 15px rgba(209, 206, 17, 1)" },
              }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
              <MenuItem value="fr">Français</MenuItem>
            </Select>

            <Button
              variant="contained"
              onClick={translateMacro}
              sx={{
                background: "linear-gradient(90deg, #00eaff, #007bff)",
                color: "#fff",
                fontWeight: "bold",
                borderRadius: "12px",
                px: 3,
                boxShadow: "0 0 10px rgba(0, 208, 255, 0.7)",
                "&:hover": { boxShadow: "0 0 20px rgba(0, 208, 255, 1)" },
              }}
            >
              Translate
            </Button>
          </Box>

          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            Always Left.
          </Typography>
        </Box>

        {/* Footer */}
        <Typography variant="body2" sx={{ mt: 4, opacity: 0.6, fontStyle: "italic" }}>
          Made by Argonauts™
        </Typography>
      </Box>
    </Box>
  );
};

export default Translator;
