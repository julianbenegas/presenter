# Image Support

This document describes the image paste and upload functionality in the presentation editor.

## Features

### Phase 1: Paste & Drop (✅ Implemented)

- **Paste images**: Copy an image and paste it directly into the editor (Cmd/Ctrl+V)
- **Drop images**: Drag and drop image files directly into the editor
- Images are automatically inserted at the cursor position or drop location

### Phase 2: Upload & URL Replacement (✅ Implemented)

- Images are automatically uploaded to `/public/uploads/`
- Temporary placeholder markdown is shown during upload: `![Uploading filename...](uploading-id)`
- After upload completes, the placeholder is replaced with the actual URL: `![filename](/uploads/unique-id.ext)`
- Upload failures are handled gracefully with error messages

## Technical Implementation

### Components Modified

1. **`src/components/Editor.tsx`**

   - Added `onImagePaste` prop to handle image files
   - Implemented paste event handler to detect images in clipboard
   - Implemented drop event handler to detect dragged image files
   - Added `insertMarkdownAtCursor` helper to insert markdown at cursor position

2. **`src/app/[presentationId]/page.tsx`**

   - Implemented `handleImagePaste` callback that:
     - Inserts a temporary placeholder markdown
     - Uploads the file to `/api/upload`
     - Replaces the placeholder with the actual URL
     - Updates localStorage and triggers UI refresh

3. **`src/app/api/upload/route.ts`** (New)
   - POST endpoint for image uploads
   - Validates file type (must be image)
   - Generates unique filename using `nanoid`
   - Saves to `/public/uploads/` directory
   - Returns public URL

### Storage

- Images are stored in `/public/uploads/`
- Filenames are generated as `{nanoid}.{extension}` for uniqueness
- Images are served as static files via Next.js public folder

## Usage

1. Open a presentation in edit mode
2. Click in the editor where you want to insert an image
3. Either:
   - Copy an image and paste (Cmd/Ctrl+V)
   - Drag and drop an image file onto the editor
4. The image will be uploaded automatically and the markdown will be inserted
5. The image will appear in the slide preview on the right

## Markdown Format

Images are inserted using standard markdown syntax:

```markdown
![alt text](/uploads/unique-id.png)
```

## Future Enhancements

Potential improvements for the future:

- Support for external image URLs (currently only file uploads)
- Image optimization and resizing
- Support for cloud storage (S3, Cloudinary, etc.)
- Image gallery or asset manager
- Drag-to-resize images in slides
- Image captions and alignment options
