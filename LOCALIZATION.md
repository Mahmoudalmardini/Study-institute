# 🌍 Localization (i18n) Documentation

## Overview

The Study Institute application now supports **bilingual** functionality with English and Arabic translations. Users can switch between languages seamlessly through the settings menu or on the login page.

## Features

✅ **English & Arabic Support** - Complete translation coverage  
✅ **RTL (Right-to-Left) Support** - Automatic layout direction for Arabic  
✅ **Persistent Language Selection** - Saved in localStorage  
✅ **Settings Menu** - Quick access to language switcher and logout  
✅ **Login Page Language Toggle** - Switch language before signing in  

## Implementation

### 📁 File Structure

```
frontend/
├── locales/
│   ├── en.json           # English translations
│   └── ar.json           # Arabic translations
├── lib/
│   ├── i18n-context.tsx  # i18n context provider
│   └── providers.tsx     # Updated with I18nProvider
└── components/
    └── SettingsMenu.tsx  # Settings dropdown with language & logout
```

### 🔧 Core Components

#### 1. **I18n Context** (`lib/i18n-context.tsx`)

Provides:
- `locale` - Current language ('en' or 'ar')
- `setLocale()` - Change language
- `t` - Translation object
- `dir` - Text direction ('ltr' or 'rtl')

#### 2. **Settings Menu** (`components/SettingsMenu.tsx`)

Features:
- Language switcher (EN/AR)
- Logout button
- Dropdown UI with visual feedback
- Click-outside-to-close functionality

#### 3. **Translation Files** (`locales/`)

JSON structure:
```json
{
  "common": { ... },      // Shared translations
  "login": { ... },       // Login page
  "admin": { ... },       // Admin dashboard
  "teacher": { ... },     // Teacher dashboard
  "student": { ... },     // Student dashboard
  "messages": { ... }     // System messages
}
```

## Usage

### In Components

```tsx
import { useI18n } from '@/lib/i18n-context';

export default function MyComponent() {
  const { t, locale, setLocale } = useI18n();

  return (
    <div>
      <h1>{t.common.appName}</h1>
      <button onClick={() => setLocale('ar')}>
        Switch to Arabic
      </button>
    </div>
  );
}
```

### Accessing Translations

```tsx
const { t } = useI18n();

// Access nested translations
t.common.appName          // "Study Institute" or "معهد الدراسات"
t.login.title             // Page title
t.admin.welcome           // "Welcome" or "مرحباً"
```

### Settings Menu Integration

```tsx
import SettingsMenu from '@/components/SettingsMenu';

<SettingsMenu 
  onLogout={() => {
    // Handle logout logic
    localStorage.clear();
    router.push('/login');
  }} 
/>
```

## Adding New Translations

### Step 1: Add to English (`locales/en.json`)

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description"
  }
}
```

### Step 2: Add Arabic Translation (`locales/ar.json`)

```json
{
  "myFeature": {
    "title": "ميزتي",
    "description": "وصف الميزة"
  }
}
```

### Step 3: Use in Component

```tsx
const { t } = useI18n();
<h1>{t.myFeature.title}</h1>
```

## Language Switching

### Automatic Features

When language changes:
- ✅ `localStorage` updated
- ✅ `document.documentElement.dir` set to 'rtl' or 'ltr'
- ✅ `document.documentElement.lang` updated
- ✅ All components re-render with new translations

### Manual Switch

```tsx
const { setLocale } = useI18n();
setLocale('ar'); // Switch to Arabic
setLocale('en'); // Switch to English
```

## RTL (Right-to-Left) Support

### Automatic Layout Direction

The i18n context automatically sets:
```tsx
document.documentElement.dir = 'rtl'; // for Arabic
document.documentElement.dir = 'ltr'; // for English
```

### CSS Considerations

Most Tailwind CSS utilities work with RTL automatically:
- `ml-4` becomes margin-right in RTL
- `text-left` becomes text-right in RTL
- Flexbox `flex-row` reverses in RTL

For custom CSS, use logical properties:
```css
/* Instead of */
margin-left: 1rem;

/* Use */
margin-inline-start: 1rem;
```

## Current Translations Coverage

### ✅ Fully Translated Pages

- **Login Page** - Including language switcher
- **Admin Dashboard** - All sections and cards
- **Teacher Dashboard** - All sections
- **Student Dashboard** - All sections
- **Settings Menu** - Language options & logout

### 📝 Translation Keys

| Section | English Keys | Arabic Keys |
|---------|--------------|-------------|
| Common | appName, settings, logout, language | ✅ Complete |
| Login | title, subtitle, username, password | ✅ Complete |
| Admin | title, welcome, users, students, etc. | ✅ Complete |
| Teacher | title, welcome, myClasses, homework | ✅ Complete |
| Student | title, welcome, myHomework, myGrades | ✅ Complete |

## Testing

### Test Language Switch

1. **Login Page**:
   - Click EN/AR buttons
   - Verify text changes
   - Check RTL layout for Arabic

2. **Dashboard**:
   - Click Settings button
   - Select language
   - Verify all text updates
   - Check dropdown closes

3. **Persistence**:
   - Select Arabic
   - Refresh page
   - Verify Arabic persists

### Test RTL Layout

1. Switch to Arabic
2. Verify:
   - Text aligns right
   - Icons/buttons mirror correctly
   - Navigation feels natural

## Browser Compatibility

✅ Chrome/Edge - Full support  
✅ Firefox - Full support  
✅ Safari - Full support  
✅ Mobile browsers - Full support  

## Performance

- Translations loaded once on app start
- Language switching is instant (no API calls)
- localStorage provides persistence
- Minimal bundle size impact (~5KB for both languages)

## Future Enhancements

Potential additions:
- 🔮 Add more languages (French, Spanish, etc.)
- 🔮 Server-side language detection
- 🔮 Translation management UI for admins
- 🔮 Language-specific date/number formatting
- 🔮 Pluralization support

## Troubleshooting

### Translations not showing?

1. Check browser console for errors
2. Verify JSON syntax in locale files
3. Ensure I18nProvider wraps your component
4. Clear localStorage and refresh

### RTL layout issues?

1. Check `document.documentElement.dir`
2. Inspect elements for conflicting CSS
3. Use browser RTL debugger

### Language not persisting?

1. Check localStorage in DevTools
2. Verify key is 'locale'
3. Check for localStorage clearing code

## Code Examples

### Complete Component Example

```tsx
'use client';

import { useI18n } from '@/lib/i18n-context';
import SettingsMenu from '@/components/SettingsMenu';

export default function MyPage() {
  const { t, locale } = useI18n();

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <h1>{t.common.appName}</h1>
            <SettingsMenu onLogout={handleLogout} />
          </div>
        </div>
      </nav>

      <main className="p-6">
        <h2>{t.myPage.title}</h2>
        <p>{t.myPage.description}</p>
        <p>Current language: {locale}</p>
      </main>
    </div>
  );
}
```

## Summary

The localization system is:
- ✅ Fully functional
- ✅ Easy to use
- ✅ Well-structured
- ✅ Performant
- ✅ Extendable

All user-facing pages now support English and Arabic with automatic RTL layout switching!

