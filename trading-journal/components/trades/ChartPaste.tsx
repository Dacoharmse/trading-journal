'use client'

import React from 'react'
import { X, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'
import {
  uploadTradeMedia,
  validateMediaFile,
  compressImage,
  extractTradingViewUrl,
} from '@/lib/storage'

export interface MediaItem {
  url: string
  kind: 'image' | 'link'
  path?: string // Storage path for deletion
}

interface ChartPasteProps {
  media: MediaItem[]
  onChange: (media: MediaItem[]) => void
  userId: string
  tradeId?: string
  maxFiles?: number
}

export function ChartPaste({
  media,
  onChange,
  userId,
  tradeId,
  maxFiles = 5,
}: ChartPasteProps) {
  const [uploading, setUploading] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    if (media.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    setUploading(true)
    setError(null)

    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validateMediaFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid file')
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      setUploading(false)
      return
    }

    // Compress and upload
    const newMedia: MediaItem[] = []
    for (const file of validFiles) {
      const compressed = await compressImage(file)
      const result = await uploadTradeMedia(compressed, userId, tradeId)

      if (result.error) {
        setError(result.error)
      } else {
        newMedia.push({ url: result.url, kind: 'image', path: result.path })
      }
    }

    onChange([...media, ...newMedia])
    setUploading(false)
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    // Check for image
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const fileList = new DataTransfer()
          fileList.items.add(file)
          await handleFiles(fileList.files)
        }
        return
      }
    }

    // Check for TradingView URL
    const text = e.clipboardData?.getData('text')
    if (text) {
      const tvUrl = extractTradingViewUrl(text)
      if (tvUrl) {
        e.preventDefault()
        if (media.length < maxFiles) {
          onChange([...media, { url: tvUrl, kind: 'link' }])
        } else {
          setError(`Maximum ${maxFiles} files allowed`)
        }
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      await handleFiles(files)
    }
  }

  const handleRemove = (index: number) => {
    const newMedia = [...media]
    newMedia.splice(index, 1)
    onChange(newMedia)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onPaste={handlePaste}
        onClick={handleClick}
        tabIndex={0}
        role="button"
        aria-label="Upload chart images"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files)
            }
          }}
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="w-10 h-10 text-gray-400" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Click to upload
            </span>{' '}
            or drag and drop
          </div>
          <div className="text-xs text-gray-500">
            Paste images (Ctrl/Cmd+V) or TradingView URLs
          </div>
          <div className="text-xs text-gray-400">
            PNG, JPG, GIF, WebP up to 10MB
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Uploading...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded p-3">
          {error}
        </div>
      )}

      {/* Thumbnails grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((item, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group"
            >
              {item.kind === 'image' ? (
                <img
                  src={item.url}
                  alt={`Chart ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center w-full h-full bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-xs text-blue-600 dark:text-blue-400 px-2 text-center line-clamp-2">
                    TradingView Chart
                  </span>
                </a>
              )}

              <button
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {item.kind === 'image' ? (
                  <ImageIcon className="w-3 h-3 inline mr-1" />
                ) : (
                  <LinkIcon className="w-3 h-3 inline mr-1" />
                )}
                {item.kind === 'image' ? 'Image' : 'Link'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
