import { keyframes } from "@mui/system";

// Gentle glow pulse for headers
export const glowPulse = keyframes`
  0% { text-shadow: 0 0 6px #00d0ff, 0 0 12px #00d0ff; }
  50% { text-shadow: 0 0 12px #00d0ff, 0 0 24px #00d0ff; }
  100% { text-shadow: 0 0 6px #00d0ff, 0 0 12px #00d0ff; }
`;

// Shimmer sweep for buttons
export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Subtle twinkle for footer text
export const twinkle = keyframes`
  0%, 90% { opacity: 0.8; }
  95% { opacity: 1; text-shadow: 0 0 6px #fff; }
  100% { opacity: 0.8; }
`;
