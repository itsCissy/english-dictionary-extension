# English Dictionary Plugin - AI Development Context

## Project Overview
English-to-English dictionary browser extension for immersion learning. Users select text on any webpage to see instant English definitions, with vocabulary collection and review features.

**Project Documentation:** `~/Sigi-knowledge-base/20_Project/EnglishDictionaryPlugin.md`

**Current Phase:** Phase 2 - Enhancement & Polish (70% complete)

---

## Tech Stack
- **Platform:** Chrome Extension (Manifest V3)
- **Languages:** JavaScript (ES6+), HTML5, CSS3
- **API:** Free Dictionary API (https://dictionaryapi.dev/)
- **Storage:** chrome.storage.local (word book), chrome.storage.sync (settings)

---

## File Structure
```
~/dict-extension/
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
| `closePopup()` | Remove popup from DOM |
| `debounce(func, wait)` | Prevent rapid API calls on fast selections |

**Events:** `mouseup` (text selection), `click` (close popup)

### sidepanel.js - Vocabulary Manager
**Purpose:** Word book, review system, statistics

**Data Structure:**
```javascript
wordBook = {
  "word": {
    definition: "...",
    partOfSpeech: "noun",
    example: "...",
    phonetic: "/wɜːrd/",
    tags: ["daily", "work"],
    mastered: false,
    viewCount: 5,
    addedAt: "2026-02-20",
    lastReviewedAt: "2026-02-25"
  }
}
```

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `loadWordBook()` | Load from chrome.storage.local |
| `saveWord(wordData)` | Save new word to storage |
| `renderWordList()` | Display all saved words |
| `startReview()` | Enter flashcard review mode |
| `updateStats()` | Update mastery/view statistics |
| `exportWords()` | Export to CSV/JSON |

**Views:** List, Detail, Review (Flashcard), Calendar

### options.js - Settings Page
**Purpose:** User customization

**Settings (stored in chrome.storage.sync):**
| Setting | Type | Default |
|---------|------|---------|
| `fontSize` | number | 16 |
| `theme` | string | "purple" |
| `autoSave` | boolean | true |

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
    "phonetics": [...],
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
- Options page (font size, theme selection)
- Sidepanel layout and basic structure
- Word list display and statistics
- Calendar view for tracking words by date

### In Progress 🚧
- Word saving functionality from popup to sidepanel
- Flashcard review mode implementation
- Tag-based filtering system

### Next Steps
1. Add "Save to Word Book" button in content.js popup
2. Implement flashcard review mode in sidepanel.js
3. Add import/export functionality
4. Test on Firefox and Safari

---

## Coding Conventions

### JavaScript
- Use `const` by default, `let` only when reassignment needed
- Async/await for all chrome.storage and fetch operations
- Error handling with try-catch for API calls
- Arrow functions for callbacks (`() => {}`)
- Template literals for string interpolation

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
4. Select `~/dict-extension/` directory

### Test Scenarios
| Scenario | Steps |
|----------|-------|
| Basic lookup | Select any English word on a webpage |
| Word not found | Select a nonsense word |
| Popup positioning | Select text near page edges |
| Settings | Click extension icon → Options page |
| Sidepanel | Click extension icon → Open sidepanel |

---

## Git Workflow
- **Branch:** `main` (currently)
- **Commit style:** Conventional commits (feature:, fix:, docs:)
- **Remote:** GitHub (configure if not set)

---

## Keyboard Shortcuts (Planned)
- `Alt+W`: Open sidepanel
- `Esc`: Close popup
- `Space` (in review): Show answer
- `N` (in review): Next word
