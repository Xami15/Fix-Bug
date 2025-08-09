# Auth Background Images Guide

## Overview
The authentication pages (login/signup) now use professional background images that rotate automatically. This guide explains how to replace these images with your own.

## Current Setup

### Background Images Location
- **Directory**: `public/auth-backgrounds/`
- **Current placeholder files**:
  - `industrial-motor-1.jpg`
  - `industrial-motor-2.jpg`
  - `industrial-motor-3.jpg`

### Code Configuration
The background images are configured in `src/auth/authPage.jsx` in the `backgroundSlides` array.

## How to Replace Background Images

### Step 1: Prepare Your Images
1. **Image Requirements**:
   - **Format**: JPG or PNG
   - **Resolution**: 1920x1080 or higher (16:9 aspect ratio recommended)
   - **Theme**: Professional industrial/motor/engineering themes
   - **Contrast**: Ensure good contrast for text readability
   - **File Size**: Keep under 2MB for optimal loading

### Step 2: Replace the Images
1. **Option A - Replace existing files**:
   - Replace the files in `public/auth-backgrounds/` with your images
   - Keep the same filenames: `industrial-motor-1.jpg`, `industrial-motor-2.jpg`, `industrial-motor-3.jpg`

2. **Option B - Add new images**:
   - Add your images to `public/auth-backgrounds/`
   - Update the `backgroundSlides` array in `src/auth/authPage.jsx`:

```javascript
const backgroundSlides = [
  // ... existing slides ...
  {
    type: 'image',
    src: '/auth-backgrounds/your-new-image.jpg',
    fallback: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  // ... more slides ...
];
```

### Step 3: Test Your Changes
1. Start the development server: `npm start`
2. Navigate to the login/signup page
3. Verify that your images display correctly
4. Check that the automatic rotation works

## Image Suggestions

### Professional Themes
- **Industrial Motors**: Electric motors, generators, turbines
- **Manufacturing**: Production lines, machinery, automation
- **Engineering**: Blueprints, technical diagrams, control panels
- **Technology**: Circuit boards, digital displays, modern equipment

### Color Considerations
- **Dark themes**: Work well with light text
- **Light themes**: May need darker overlay for text readability
- **Gradient overlays**: Already applied for better text contrast

## Social Icons

### Current Implementation
- **Google**: Uses `react-icons/fc` - `FcGoogle` component
- **GitHub**: Uses `react-icons/fa` - `FaGithub` component

### Customization
To change the social icons, update the imports in:
- `src/auth/authPage.jsx`
- `src/pages/Login.jsx`
- `src/pages/Signup.jsx`

Example:
```javascript
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
```

## Troubleshooting

### Images Not Loading
1. Check file paths in `backgroundSlides` array
2. Verify images exist in `public/auth-backgrounds/`
3. Check browser console for 404 errors

### Performance Issues
1. Optimize image file sizes
2. Consider using WebP format for better compression
3. Implement lazy loading for multiple images

### Styling Issues
1. Check CSS in `src/auth/auth.css`
2. Verify `.background-slide` and `.auth-overlay` styles
3. Adjust overlay opacity if needed for better text readability

## Additional Customization

### Adding More Backgrounds
1. Add images to `public/auth-backgrounds/`
2. Update `backgroundSlides` array
3. Test rotation timing (currently 5 seconds)

### Changing Rotation Speed
Update the interval in `src/auth/authPage.jsx`:
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % backgroundSlides.length);
  }, 5000); // Change 5000 to desired milliseconds

  return () => clearInterval(interval);
}, [backgroundSlides.length]);
```

### Disabling Auto-Rotation
Comment out or remove the `useEffect` hook that handles auto-rotation.

## File Structure
```
public/
├── auth-backgrounds/
│   ├── industrial-motor-1.jpg
│   ├── industrial-motor-2.jpg
│   └── industrial-motor-3.jpg
├── videos/
│   └── induction-motor-operation.mp4.mp4
└── engine-animation.mp4
```
