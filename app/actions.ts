'use server';

import * as cheerio from 'cheerio';

export interface ScrapedData {
  url: string;
  title: string;
  content: string;
  images: string[];
  tags?: string[];
  error?: string;
}

export async function scrapeXhsNote(url: string): Promise<ScrapedData> {
  try {
    // Basic validation
    if (!url.includes('xiaohongshu.com')) {
      return { url, title: '', content: '', images: [], tags: [], error: 'Invalid Xiaohongshu URL' };
    }

    // Fetch the page content
    // Note: XHS has strict anti-scraping. This is a best-effort attempt using standard fetch.
    // In a production environment, you might need a headless browser or proxy service.
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    
    // Extract images (og:image is usually the cover)
    const images: string[] = [];
    $('meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr('content');
      if (src) images.push(src);
    });

    // If description is empty, try to find the content in the body (this is tricky as XHS is dynamic)
    // Fallback to description meta tag which usually contains the first part of the post.
    let content = description;
    let tags: string[] = [];

    // Attempt to find structured data if available
    $('script').each((_, el) => {
      const html = $(el).html() || '';
      if (html.includes('window.__INITIAL_STATE__')) {
        try {
          const jsonStr = html.replace('window.__INITIAL_STATE__=', '').replace(/undefined/g, 'null');
          const json = JSON.parse(jsonStr);
          const noteData = json?.note?.note || json?.note?.noteDetailMap?.[json?.note?.firstNoteId]?.note;
          
          if (noteData) {
            title = noteData.title || title;
            content = noteData.desc || content;
            
            if (noteData.imageList && Array.isArray(noteData.imageList)) {
              const newImages = noteData.imageList.map((img: any) => img.urlDefault || img.url || img.infoList?.[0]?.url);
              images.push(...newImages);
            }

            if (noteData.tagList && Array.isArray(noteData.tagList)) {
                tags = noteData.tagList.map((tag: any) => tag.name);
            }
          }
        } catch (e) {
          console.error('Error parsing INITIAL_STATE', e);
        }
      }
    });

    // Fallback to LD+JSON if INITIAL_STATE failed or didn't have images
    if (images.length === 0) {
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html() || '{}');
                if (!title && json.headline) title = json.headline;
                if (!content && json.description) content = json.description;
                if (json.image) {
                    if (Array.isArray(json.image)) images.push(...json.image);
                    else if (typeof json.image === 'string') images.push(json.image);
                }
            } catch (e) {
                console.error('Error parsing LD+JSON', e);
            }
        });
    }

    // Extract hashtags from content if no tags found
    if (tags.length === 0 && content) {
        const hashtags = content.match(/#[^\s#]+/g);
        if (hashtags) {
            tags = hashtags.map(t => t.substring(1));
        }
    }

    return {
      url,
      title: title.trim(),
      content: content.trim(),
      images: [...new Set(images)], // Deduplicate
      tags: [...new Set(tags)],
    };

  } catch (error: any) {
    console.error('Scraping error:', error);
    return {
      url,
      title: '',
      content: '',
      images: [],
      tags: [],
      error: error.message || 'Failed to scrape content. Please paste text manually.',
    };
  }
}

export async function urlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.xiaohongshu.com/',
      }
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return null;
  }
}
