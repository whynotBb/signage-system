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
import { Eraser, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
  const [isRemovingBg, setIsRemovingBg] = useState(false)
  // forSrc와 함께 저장하여 imageSrc가 바뀌면 자동 무효화
  const [bgResult, setBgResult] = useState<{ forSrc: string; url: string } | null>(null)

  const bgRemoved = bgResult?.forSrc === imageSrc
  const currentSrc = bgRemoved ? bgResult!.url : imageSrc

  const onCropCompleteCallback = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function handleRemoveBg() {
    setIsRemovingBg(true)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(currentSrc)
      setBgResult({ forSrc: imageSrc, url: URL.createObjectURL(blob) })
    } catch {
      toast.error('배경 제거에 실패했습니다.')
    } finally {
      setIsRemovingBg(false)
    }
  }

  function handleResetBg() {
    setBgResult(null)
  }

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setIsCropping(true)
    try {
      const blob = await getCroppedImg(currentSrc, croppedAreaPixels, 400, outputWidth, outputHeight, 'image/png')
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

        {/* 배경 제거 액션 */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveBg}
            disabled={isRemovingBg || bgRemoved}
          >
            {isRemovingBg
              ? <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              : <Eraser className="mr-2 h-3 w-3" />}
            {isRemovingBg ? '처리 중...' : '배경 제거'}
          </Button>
          {bgRemoved && (
            <Button type="button" variant="ghost" size="sm" onClick={handleResetBg}>
              <RotateCcw className="mr-2 h-3 w-3" />
              원본으로
            </Button>
          )}
        </div>

        <div className="relative h-72 w-full overflow-hidden rounded-md bg-[#e8e8e8]">
          <Cropper
            image={currentSrc}
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
