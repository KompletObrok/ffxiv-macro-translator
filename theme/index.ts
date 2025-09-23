import { createTheme } from "@mui/material/styles";
import palette from "./palette";
import typography from "./typography";

const theme = createTheme({
  palette,
  typography,
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "rgba(0, 20, 40, 0.6)",
            borderRadius: "12px",
            border: "2px solid rgba(0, 198, 255, 0.4)",
            color: "#e0e6ff",
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: "#00c6ff",
              boxShadow: "0 0 12px #00c6ff",
            },
            "&.Mui-focused": {
              borderColor: "#00ffff",
              boxShadow: "0 0 20px #00ffff",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#a0b3d6",
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(20, 30, 60, 0.85)", // darker so it stands out
          borderRadius: "10px",
          border: "2px solid rgba(255, 215, 0, 0.6)", // gold accent
          color: "#ffeaa7",
          fontWeight: "bold",
          minWidth: "140px",
          transition: "all 0.3s ease",
          "&:hover": {
            borderColor: "#ffd700",
            boxShadow: "0 0 10px #ffd700",
          },
          "&.Mui-focused": {
            borderColor: "#ffec8b",
            boxShadow: "0 0 16px #ffec8b",
          },
        },
        icon: {
          color: "#ffd700", // dropdown arrow gold
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          textTransform: "none",
          fontWeight: "bold",
          padding: "8px 20px",
          color: "#fff",
          background: "linear-gradient(90deg, #0072ff, #00c6ff)",
          boxShadow: "0 0 8px rgba(0,198,255,0.6)",
          transition: "all 0.3s ease",
          "&:hover": {
            background: "linear-gradient(90deg, #00c6ff, #00ffff)",
            boxShadow: "0 0 18px rgba(0,255,255,0.9)",
          },
          "&:active": {
            transform: "scale(0.97)",
          },
        },
      },
    },
  },
});

export default theme;
