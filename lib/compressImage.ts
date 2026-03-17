/**
 * 이미지 파일을 리사이즈 + WebP 변환하여 압축
 * AVIF 우선 시도, 브라우저 미지원 시 WebP 폴백
 */
export async function compressImage(file: File): Promise<File> {
  // 원본이 200KB 이하면 압축 없이 그대로 반환
  if (file.size <= 200 * 1024) {
    return file
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // 비율 유지하며 960px로 리사이즈
      const scale = Math.min(1, 960 / img.width)
      const width = Math.floor(img.width * scale)
      const height = Math.floor(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context 획득 실패'))
      ctx.drawImage(img, 0, 0, width, height)

      // AVIF 우선 시도
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const name = file.name.replace(/\.[^.]+$/, '.avif')
            return resolve(new File([blob], name, { type: 'image/avif' }))
          }
          // AVIF 실패 시 WebP 폴백
          canvas.toBlob(
            (webpBlob) => {
              if (!webpBlob) return reject(new Error('압축 실패'))
              const name = file.name.replace(/\.[^.]+$/, '.webp')
              resolve(new File([webpBlob], name, { type: 'image/webp' }))
            },
            'image/webp',
            0.75
          )
        },
        'image/avif',
        0.75
      )
    }

    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = objectUrl
  })
}
