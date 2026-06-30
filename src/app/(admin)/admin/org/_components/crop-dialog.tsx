'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedImg } from '@/lib/image-utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingButton } from '@/components/composite/loading-button'

interface CropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onCropComplete: (blob: Blob) => void
  cropShape?: 'round' | 'rect'
  aspect?: number
  outputWidth?: number
  outputHeight?: number
  description?: string
}

export function CropDialog({ open, onOpenChange, imageSrc, onCropComplete, cropShape = 'round', aspect = 1, outputWidth, outputHeight, description }: CropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  const onCropCompleteCallback = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setIsCropping(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 400, outputWidth, outputHeight, 'image/png')
      onCropComplete(blob)
      onOpenChange(false)
    } catch {
      // 크롭 실패 시 원본 사용
    } finally {
      setIsCropping(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>프로필 사진 편집</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-md bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="w-8 text-xs text-muted-foreground">확대</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <LoadingButton isPending={isCropping} onClick={handleConfirm}>
            적용
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
