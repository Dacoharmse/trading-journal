/**
 * Supabase Storage helpers for trade media uploads
 */

import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  url: string
  path: string
  error?: string
}

/**
 * Upload a file to Supabase Storage
 * @param file File to upload
 * @param userId User ID for folder structure
 * @param tradeId Optional trade ID for organization
 * @returns Upload result with public URL
 */
export async function uploadTradeMedia(
  file: File,
  userId: string,
  tradeId?: string
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const folder = tradeId ? `${userId}/${tradeId}` : `${userId}/temp`
    const filePath = `${folder}/${timestamp}_${sanitizedName}`

    // Upload file
    const { data, error } = await supabase.storage
      .from('trade-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return { url: '', path: '', error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('trade-media').getPublicUrl(data.path)

    return { url: publicUrl, path: data.path }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Upload failed'
    console.error('Upload exception:', err)
    return { url: '', path: '', error: errorMessage }
  }
}

/**
 * Delete a file from Supabase Storage
 * @param path File path in storage
 * @returns Success status
 */
export async function deleteTradeMedia(path: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage.from('trade-media').remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
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
  maxWidth = 1920,
  quality = 0.85
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
