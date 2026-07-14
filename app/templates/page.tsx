'use client'

import { PrometheusShell } from '@/components/prometheus-shell'
import { PageHeader } from '@/components/page-header'
import { TemplateGallery } from '@/components/template-gallery/TemplateGallery'
import type { TemplateGalleryItem } from '@/components/template-gallery/TemplateCard'

export default function TemplatesPage() {
  const templates: TemplateGalleryItem[] = [
    {
      id: 'tpl_talking_head_01',
      title: 'Talking Head Punch Cuts',
      category: 'Talking Head',
      previewImage: '/previews/talking-head-1.jpg',
      avatarImage: '/previews/avatars/face-1.jpg',
      impressions: ['Fast hook', 'Snappy pacing', 'Clean captions'],
    },
    {
      id: 'tpl_podcast_01',
      title: 'Podcast Two Shot Clean',
      category: 'Podcast',
      previewImage: '/previews/podcast-1.jpg',
      categoryImage: '/previews/categories/podcast.jpg',
      impressions: ['Speaker labels', 'Soft zooms', 'Low b-roll'],
    },
    {
      id: 'tpl_reels_01',
      title: 'Reels Heat Overlay Pack',
      category: 'Reels',
      previewImage: '/previews/reels-1.jpg',
      impressions: ['High energy', 'B-roll heavy', 'Bold captions'],
    },
    {
      id: 'tpl_doc_01',
      title: 'Documentary Story Cut',
      category: 'Documentary',
      previewImage: '/previews/doc-1.jpg',
      categoryImage: '/previews/categories/documentary.jpg',
      impressions: ['Cinematic pacing', 'Subtle captions'],
    },
    {
      id: 'tpl_talking_head_02',
      title: 'Talking Head Clean Minimal',
      category: 'Talking Head',
      previewImage: '/previews/talking-head-2.jpg',
      impressions: ['Minimal', 'Brand first'],
    },
    {
      id: 'tpl_podcast_02',
      title: 'Long Form Typography V1 Highlights',
      category: 'Podcast',
      previewImage: '/previews/podcast-2.jpg',
      avatarImage: '/previews/avatars/face-2.jpg',
      impressions: ['Highlight markers', 'Clip ready'],
    },
    {
      id: 'tpl_reels_02',
      title: 'Reels Product Montage',
      category: 'Reels',
      previewImage: '/previews/reels-2.jpg',
      categoryImage: '/previews/categories/reels.jpg',
      impressions: ['Montage', 'Sound design slots'],
    },
    {
      id: 'tpl_doc_02',
      title: 'Documentary Interview Cut',
      category: 'Documentary',
      previewImage: '/previews/doc-2.jpg',
      impressions: ['Lower thirds', 'Breathing room'],
    },
  ]

  return (
    <PrometheusShell
      header={
        <PageHeader
          title="Templates"
          description="Template Gallery demo. Images are local references; missing files fall back deterministically."
          showBackButton
        />
      }
    >
      <div className="px-8 py-6">
        <TemplateGallery
          templates={templates}
          onSelect={(t) => {
            // Demo behavior requested: log selected template.
            console.log('Selected template:', t)
          }}
        />
      </div>
    </PrometheusShell>
  )
}
