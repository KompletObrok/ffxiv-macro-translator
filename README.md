# FFXIV Macro Translator

A modern web app for translating FFXIV macros between English, German, and French. Built with React, TypeScript, and Vite.

ffxivmacrofy.netlify.app

## Features

- **Multi-language Support** – Translate action/skill names between EN, DE, and FR
- **Smart Parsing** – Preserves macro structure, wait times, and target placeholders
- **Copy to Clipboard** – One-click copy for translated macros
- **Keyboard Shortcut** – Press `⌘/Ctrl + Enter` to translate
- **Modern UI** – Glassmorphic design with animated backgrounds
- **Responsive** – Works on desktop and mobile

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ffxiv-macro-translator.git
cd ffxiv-macro-translator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Usage

1. Paste your FFXIV macro in the left text area
2. Select your target language (EN, DE, or FR)
3. Click the translate button or press `⌘/Ctrl + Enter`
4. Copy the translated macro from the right text area

### Example

**Input (English):**
```
/ac "Stone" <t>
/ac "Fire" <t>
/wait 2
/ac "Cure" <me>
```

**Output (French):**
```
/ac "Géite" <t>
/ac "Feu" <t>
/wait 2
/ac "Soin" <me>
```

## Dictionary

The translator uses a JSON dictionary file located in `public/dictionary.json`. Each entry contains translations for all three languages:

```json
[
  { "en": "Stone", "de": "Stein", "fr": "Géite" },
  { "en": "Fire", "de": "Feuer", "fr": "Feu" }
]
```

### Adding New Entries

Simply add new objects to the dictionary array with `en`, `de`, and `fr` keys.

## Tech Stack

- **React 18** – UI framework
- **TypeScript** – Type safety
- **Vite** – Build tool & dev server
- **CSS3** – Custom styling with animations

## Project Structure

```
src/
├── components/
│   ├── Translator.tsx    # Main translator component
│   └── Translator.css    # Component styles
├── App.tsx               # App wrapper
├── main.tsx              # Entry point
└── index.css             # Global styles & animations
```

## Contributing

Contributions are welcome! Feel free to:

- Add missing skill/action translations
- Report bugs or suggest features
- Improve the UI/UX

## License

MIT License – feel free to use this project however you like.

---

**Crafted by Marko**
