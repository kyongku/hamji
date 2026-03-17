import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'

export async function uploadPostImages(
  postId: string,
  files: File[]
): Promise<{ url: string; order_index: number }[]> {
  const results: { url: string; order_index: number }[] = []

  for (let i = 0; i < files.length; i++) {
    // 압축
    const compressed = await compressImage(files[i])
    const ext = compressed.type === 'image/avif' ? 'avif' : 'webp'
    const path = `posts/${postId}/${i}_${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('post-images')
      .upload(path, compressed, {
        upsert: false,
        contentType: compressed.type,
      })

    if (error) {
      console.error(`[uploadPostImages] ${i}번 파일 실패:`, error.message)
      continue
    }

    const { data } = supabase.storage
      .from('post-images')
      .getPublicUrl(path)

    results.push({ url: data.publicUrl, order_index: i })
  }

  return results
}
