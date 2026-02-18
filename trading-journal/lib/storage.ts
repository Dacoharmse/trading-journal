/**
 * Supabase Storage helpers for trade media uploads
 * Uploads go through /api/upload to bypass storage RLS
 */

export interface UploadResult {
  url: string
  path: string
  error?: string
}

/**
 * Upload a file via the server-side API route (bypasses storage RLS)
 */
export async function uploadTradeMedia(
  file: File,
  userId: string,
  tradeId?: string,
): Promise<UploadResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (tradeId) formData.append('tradeId', tradeId)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()

    if (!res.ok) {
      return { url: '', path: '', error: data.error || 'Upload failed' }
    }

    return { url: data.url, path: data.path }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Upload failed'
    console.error('Upload exception:', err)
    return { url: '', path: '', error: errorMessage }
  }
}

/**
 * Delete a file from Supabase Storage via API route
 */
export async function deleteTradeMedia(path: string): Promise<boolean> {
  try {
    const res = await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    return res.ok
  } catch (err) {
    console.error('Delete exception:', err)
    return false
  }
}

/**
 * Upload multiple files
 * @param files Files to upload
 * @param userId User ID
 * @param tradeId Optional trade ID
 * @returns Array of upload results
 */
export async function uploadMultipleTradeMedia(
  files: File[],
  userId: string,
  tradeId?: string
): Promise<UploadResult[]> {
  return Promise.all(files.map((file) => uploadTradeMedia(file, userId, tradeId)))
}

/**
 * Validate file before upload
 * @param file File to validate
 * @param maxSizeMB Maximum file size in MB
 * @returns Validation result
 */
export function validateMediaFile(
  file: File,
  maxSizeMB = 10
): { valid: boolean; error?: string } {
  // Check file size
  const maxBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
  }

  // Check file type (images only for now)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' }
  }

  return { valid: true }
}

/**
 * Compress image before upload (client-side)
 * @param file Image file
 * @param maxWidth Maximum width
 * @param quality JPEG quality (0-1)
 * @returns Compressed file or original if compression fails
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file) // Return original if canvas fails
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }

            // Only use compressed version if it's smaller
            if (blob.size < file.size) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }

    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

/**
 * Extract TradingView chart URL from pasted content
 * @param text Pasted text
 * @returns TradingView URL or null
 */
export function extractTradingViewUrl(text: string): string | null {
  const tvPatterns = [
    /https?:\/\/(?:www\.)?tradingview\.com\/[^\s]+/gi,
    /https?:\/\/(?:www\.)?tv\.com\/[^\s]+/gi,
  ]

  for (const pattern of tvPatterns) {
    const match = text.match(pattern)
    if (match) return match[0]
  }

  return null
}
