# AgriSolve UI Architecture

## Overview

AgriSolve now supports two UI versions that can be switched using feature flags:

- **Old UI**: Original chat-focused interface with language selection
- **New UI**: Modern landing page with separate chat and document analysis screens

## Directory Structure

```
frontend/src/app/
├── page.tsx              # Root router - directs to old-ui or new-ui based on flag
├── layout.tsx            # App layout with Material Symbols + styling
├── globals.css           # Global styles and design tokens
│
├── new-ui/               # New UI (Green theme, modern design)
│   ├── page.tsx          # Landing page with "Start Chatting" & "Analyze Documents" buttons
│   ├── chat/page.tsx     # New chat interface
│   └── analyze/page.tsx  # Document analysis/upload interface
│
├── old-ui/               # Old UI (Blue theme, legacy)
│   ├── page.tsx          # Chat interface (original)
│   └── upload/page.tsx   # Document upload interface
│
└── upload/               # [Deprecated - use old-ui/upload or new-ui/analyze]
    └── page.tsx
```

## Switching Between UIs

### Option 1: Using Flags (Recommended)

The root `page.tsx` routes based on a flag:

```typescript
// frontend/src/app/page.tsx
const useNewUI = true; // Change to false to use old UI

if (useNewUI) {
  router.push("/new-ui");
} else {
  router.push("/old-ui");
}
```

Set `useNewUI` to:

- `true` → Uses new UI at `/new-ui`
- `false` → Uses old UI at `/old-ui`

### Option 2: Direct URL Navigation

Users can also visit:

- `/new-ui` - New UI landing page
- `/old-ui` - Old UI chat page
- `/new-ui/chat` - New UI chat
- `/new-ui/analyze` - New UI document analysis
- `/old-ui/upload` - Old UI upload page

## UI Comparison

### New UI (`/new-ui`)

**Design**: Modern, green accent (#2bee3b), polished look
**Features**:

- Landing page with feature showcase
- Separate chat and document analysis flows
- Material Symbols icons
- Dark mode support
- Modern gradient designs

**Routes**:

- `/new-ui` - Landing page
- `/new-ui/chat` - Chat interface
- `/new-ui/analyze` - Document upload & analysis

### Old UI (`/old-ui`)

**Design**: Blue theme, minimalist chat-focused
**Features**:

- Direct to chat interface
- Integrated language selection
- Inline document reference
- Simple, functional design

**Routes**:

- `/old-ui` - Chat page
- `/old-ui/upload` - Document upload

## API Endpoint Compatibility

**Both UIs use the same backend API endpoints**:

- `POST /api/chat` - Chat with documents
- `POST /api/transcribe` - Audio to text
- `POST /api/upload` - Upload PDF documents

**Request/Response formats are identical** - see [UI_BUTTON_MAPPING.md](../UI_BUTTON_MAPPING.md)

## Design System

### Colors

**New UI (Green Theme)**:

- Primary: `#2bee3b` (bright green)
- Primary Dark: `#24c932` (darker green)
- Background Light: `#f6f8f6`
- Background Dark: `#0a120b`

**Old UI (Blue Theme)**:

- Uses Tailwind blue colors
- Blue-600, Blue-700, etc.

### Typography

- Font Family: Inter (via Google Fonts)
- Material Symbols for icons

### Components

**New UI Components**:

- Navigation header with logo
- Hero section with CTA buttons
- Feature cards with hover animations
- Chat message bubbles (green gradient)
- Document analysis card
- Sources display with expand/collapse

**Old UI Components**:

- Floating chat container
- Message bubbles (blue gradient)
- Sources card
- Icon buttons with multiple states
- Language dropdown

## How to Enable the New UI

1. **Open `frontend/src/app/page.tsx`**
2. **Find the line**: `const useNewUI = true;`
3. **Keep as `true`** to enable new UI (or set to `false` for old UI)
4. **Run the app**: `npm run dev`
5. **Visit**: `http://localhost:3000`

## Creating New UI Variants

If you want to create additional UI versions:

1. Create a new directory: `frontend/src/app/custom-ui/`
2. Implement pages:
   - `custom-ui/page.tsx` - Landing/home
   - `custom-ui/chat/page.tsx` - Chat interface
   - `custom-ui/analyze/page.tsx` - Document analysis
3. Update the router in `frontend/src/app/page.tsx`:
   ```typescript
   if (useCustomUI) {
     router.push("/custom-ui");
   }
   ```

## Important Notes

- **API Endpoints**: All UI versions call the same backend endpoints
- **Language Support**: Both UIs support English, Hindi, Marathi
- **Dark Mode**: New UI has built-in dark mode support
- **Mobile Responsive**: Both UIs are mobile-friendly
- **Translation**: No client-side translation; all done on backend

## Material Symbols Icon Guide

Common icons used in New UI:

- `eco` - Leaf/eco icon for logo
- `chat_bubble` - Chat
- `upload_file` - Upload
- `description` - Document
- `forum` - Discussion/forum
- `tips_and_updates` - Tips
- `hourglass_bottom` - Loading
- `send` - Send message
- `mic` - Microphone
- `library_books` - Document library

See [Material Symbols](https://fonts.google.com/icons) for full list.

## Troubleshooting

### Page Doesn't Load

- Ensure `npm run dev` is running
- Check console for errors
- Verify flag is set correctly in `page.tsx`

### Styles Look Wrong

- Clear Next.js cache: `rm -r .next`
- Rebuild: `npm run dev`
- Check that `globals.css` is imported in `layout.tsx`

### Material Symbols Not Showing

- Verify Google Fonts link is in `layout.tsx`
- Check Material Symbols Outlined is loaded: `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />`

### Dark Mode Not Working

- Ensure parent element has `class="light"` or `class="dark"`
- New UI respects system preferences via CSS media queries

## Future Improvements

- [ ] Server-side flag fetching from backend
- [ ] A/B testing support
- [ ] UI preference persistence in localStorage
- [ ] Theme customization panel
- [ ] Additional UI variants
