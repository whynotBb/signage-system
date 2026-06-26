export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize = 400,
  outputWidth?: number,
  outputHeight?: number,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const w = outputWidth ?? outputSize
  const h = outputHeight ?? outputSize
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // JPEG는 투명도 미지원 — 흰색 배경 채우기
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    w,
    h
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'))
          return
        }
        resolve(blob)
      },
      mimeType,
      mimeType === 'image/jpeg' ? 0.9 : undefined
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}
