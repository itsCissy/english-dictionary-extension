# English Dictionary Plugin - AI Development Context

## Project Overview
English-to-English dictionary browser extension for immersion learning. Users select text on any webpage to see instant English definitions, with vocabulary collection and review features.

**Project Documentation:** `~/Sigi-knowledge-base/20_Project/EnglishDictionaryPlugin.md`

**Current Phase:** Phase 2 - Enhancement & Polish (85% complete)

**Next Tasks:**
1. Add keyboard shortcut to toggle on/off
2. Cross-browser support (Firefox/Safari)

---

## Tech Stack
- **Platform:** Chrome Extension (Manifest V3)
- **Languages:** JavaScript (ES6+), HTML5, CSS3
- **API:** Free Dictionary API (https://dictionaryapi.dev/)
- **Storage:** chrome.storage.local (word book), chrome.storage.sync (settings)

---

## File Structure
```
~/Projects/products/dict-extension/
├── manifest.json       # Extension configuration (v1.2)
├── content.js          # Text selection detection & popup
├── content.css         # Popup styling
├── options.js/html/css # Settings page (font size, theme, etc.)
├── sidepanel.js/html/css  # Vocabulary collection sidepanel
├── README.md           # User documentation
└── CLAUDE.md           # This file - AI development context
```

---

## Component Architecture

### content.js - Content Script
**Purpose:** Detect text selection, fetch definitions, show popup

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `getSelectedText()` | Get user's text selection via `window.getSelection()` |
| `fetchDefinition(word)` | Call Free Dictionary API |
| `showPopup(word, data)` | Create and position popup near selection |
| `showDefinition(popup, word, data)` | Render definition with audio & save button |
| `closePopup()` | Remove popup from DOM |
| `debounce(func, wait)` | Prevent rapid API calls on fast selections |
| `playAudio(audioUrl, button)` | Play pronunciation audio |
| `saveToWordBook(entry, button)` | Save word to chrome.storage.local |

**Events:** `mouseup` (text selection), `click` (close popup), `keydown` (Esc to close)

### sidepanel.js - Vocabulary Manager
**Purpose:** Word book, review system, statistics, calendar view

**Data Structure:**
```javascript
wordBook = {
  "word": {
    word: "word",
    phonetic: "/wɜːrd/",
    meanings: [{ partOfSpeech, definitions }],
    savedAt: "2026-02-20T...",
    viewCount: 5,
    lastViewedAt: "2026-02-25T...",
    reviewCount: 0,
    mastered: false,
    tags: ["daily", "work"]
  }
}
```

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `loadWordBook()` | Load from chrome.storage.local |
| `saveWord(wordData)` | Save new word to storage |
| `renderWordList()` | Display all saved words with filters |
| `startReview()` | Enter flashcard review mode |
| `updateStats()` | Update mastery/view statistics |
| `exportWords()` | Export to CSV/JSON |
| `renderCalendar()` | Calendar view for date filtering |
| `addTag()` / `removeTag()` | Tag management |

**Views:** List, Groups (A-Z), Review (Flashcard), Stats, Calendar

### options.js - Settings Page
**Purpose:** User customization

**Settings (stored in chrome.storage.sync):**
| Setting | Type | Default |
|---------|------|---------|
| `fontSize` | number | 16 |
| `theme` | string | "purple" |

---

## API Reference

### Free Dictionary API
**Endpoint:** `https://api.dictionaryapi.dev/api/v2/entries/en/<word>`

**Response Structure:**
```json
[
  {
    "word": "hello",
    "phonetic": "/həˈləʊ/",
    "phonetics": [
      {
        "text": "/həˈləʊ/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3"
      }
    ],
    "meanings": [
      {
        "partOfSpeech": "noun",
        "definitions": [
          {
            "definition": "An utterance of 'hello'",
            "example": "a hello greeted me",
            "synonyms": ["greeting"],
            "antonyms": ["farewell"]
          }
        ]
      }
    ]
  }
]
```

**Error Handling:**
- 404: Word not found → Show "未找到该单词" message
- Network error → Show "网络错误，请稍后重试"

---

## Current Status

### Completed ✅
- Text selection detection with debounce
- Free Dictionary API integration
- Popup UI with purple gradient theme
- 🔊 Pronunciation audio playback
- 📚 Save to word book button
- Options page (font size, theme selection)
- Sidepanel: word list, search, tag filter, date filter
- Sidepanel: calendar view, statistics
- Sidepanel: review mode (flashcard), export functionality

### In Progress 🚧
- ⌨️ Keyboard shortcut to open sidepanel
- 🌐 Firefox compatibility testing
- 🌐 Safari compatibility testing

### Next Steps
1. Add keyboard shortcut (Alt+D for dictionary, Alt+S for sidepanel)
2. Test on Firefox
3. Test on Safari
4. Update documentation

---

## Coding Conventions

### JavaScript
- Use `const` by default, `let` only when reassignment needed
- Async/await for all chrome.storage and fetch operations
- Error handling with try-catch for API calls
- Arrow functions for callbacks (`() => {}`)
- Template literals for string interpolation
- Debounce for text selection (300ms delay)

### CSS
- Purple gradient theme: `#8b5cf6` → `#6366f1`
- Border radius: `8px` for cards, `12px` for popup
- Font: system-ui, -apple-system, sans-serif
- Responsive units: `rem` for spacing, `px` for borders

### Naming
- Files: lowercase with extension suffix (e.g., `sidepanel.js`)
- Functions: camelCase with descriptive verbs (`fetchDefinition`, `renderWordList`)
- Constants: UPPER_SNAKE_CASE (`API_ENDPOINT`, `DEFAULT_FONT_SIZE`)
- CSS classes: kebab-case with prefix (`.dict-popup`, `.sidepanel-container`)

---

## Testing

### Load Extension in Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `~/Projects/products/dict-extension/` directory

### Test Scenarios
| Scenario | Steps |
|----------|-------|
| Basic lookup | Select any English word on a webpage |
| Word not found | Select a nonsense word |
| Popup positioning | Select text near page edges |
| Audio playback | Click 🔊 button in popup |
| Save word | Click 📚 button in popup |
| View sidepanel | Click extension icon → Open sidepanel |
| Settings | Click extension icon → Options page |

---

## Keyboard Shortcuts (Planned - In Progress)

| Shortcut | Action | Status |
|----------|--------|--------|
| `Alt+D` | Toggle popup enable/disable | 🚧 Implementing |
| `Alt+S` | Open/close sidepanel | 🚧 Implementing |
| `Esc` | Close popup | ✅ Done |

---

## Git Workflow
- **Branch:** `main`
- **Commit style:** Conventional commits (feature:, fix:, docs:)
- **Remote:** GitHub (https://github.com/itsCissy/english-dictionary-extension)

---

## Cross-Browser Support

### Chrome ✅
- Fully supported
- Primary development target

### Firefox 🚧
- Manifest V3 supported (Firefox 109+)
- Needs testing:
  - [ ] chrome.storage API compatibility
  - [ ] chrome.sidePanel API availability
  - [ ] Content script injection
  - [ ] Popup styling

### Safari 🚧
- Requires Safari Extension Converter
- Different permission model
- Needs investigation

---

## Development Workflow

### Setup
```bash
cd ~/Projects/products/dict-extension/
```

### Load Extension
1. Chrome: `chrome://extensions/` → Load unpacked
2. Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on
3. Safari: Use Extension Converter

### Make Changes
1. Edit code files
2. Go to extensions page
3. Click "Reload" button on extension
4. Test changes

### Commit
```bash
git add .
git commit -m "feat: description"
git push
```
