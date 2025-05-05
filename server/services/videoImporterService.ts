import axios from 'axios';
import * as cheerio from 'cheerio';
import { tagContent } from './contentTaggingService';
import { log } from '../vite';
import { AnyNode } from 'cheerio';

// Video source types for import
enum VideoSourceType {
  YouTube = 'youtube',
  Vimeo = 'vimeo',
  PornHub = 'pornhub',
  XVideos = 'xvideos',
  EPorner = 'eporner',
  FPO = 'fpo',
  RedTube = 'redtube',
  XNXX = 'xnxx',
  Generic = 'generic'
}

// Interface for scraped video metadata
interface ScrapedVideo {
  title: string;
  description?: string;
  filePath: string;
  thumbnailPath?: string;
  duration?: number;
  categories?: string[];
  tags?: string[];
  isQuickie?: boolean;
}

/**
 * Detects the source type from a URL
 */
function detectSourceType(url: string): VideoSourceType {
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('youtube') || domain.includes('youtu.be')) {
    return VideoSourceType.YouTube;
  } else if (domain.includes('vimeo')) {
    return VideoSourceType.Vimeo;
  } else if (domain.includes('pornhub')) {
    return VideoSourceType.PornHub;
  } else if (domain.includes('xvideos')) {
    return VideoSourceType.XVideos;
  } else if (domain.includes('eporner')) {
    return VideoSourceType.EPorner;
  } else if (domain.includes('fpo.xxx') || domain.includes('fpo')) {
    return VideoSourceType.FPO;
  } else if (domain.includes('redtube')) {
    return VideoSourceType.RedTube;
  } else if (domain.includes('xnxx')) {
    return VideoSourceType.XNXX;
  } else {
    return VideoSourceType.Generic;
  }
}

/**
 * Converts a duration string (e.g., "5:30") to seconds
 */
function convertDurationToSeconds(durationStr: string): number | undefined {
  if (!durationStr) return undefined;
  
  // Handle "MM:SS" format
  const mmSsMatch = durationStr.trim().match(/^(\d+):(\d+)$/);
  if (mmSsMatch) {
    const minutes = parseInt(mmSsMatch[1], 10);
    const seconds = parseInt(mmSsMatch[2], 10);
    return minutes * 60 + seconds;
  }
  
  // Handle "HH:MM:SS" format
  const hhMmSsMatch = durationStr.trim().match(/^(\d+):(\d+):(\d+)$/);
  if (hhMmSsMatch) {
    const hours = parseInt(hhMmSsMatch[1], 10);
    const minutes = parseInt(hhMmSsMatch[2], 10);
    const seconds = parseInt(hhMmSsMatch[3], 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return undefined;
}

/**
 * Scrapes videos from FPO site
 */
async function scrapeFPO(url: string, count: number = 5): Promise<ScrapedVideo[]> {
  try {
    log(`Scraping FPO content from ${url}`, 'videoImporter');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    
    const $ = cheerio.load(response.data);
    const videos: ScrapedVideo[] = [];
    
    // FPO uses various selectors depending on the page
    const videoElements = $('li.video, div.thumb, div.vidcont');
    
    if (videoElements.length === 0) {
      log(`No videos found with primary selectors, trying alternatives`, 'videoImporter');
      // Try alternative selectors
      const alternativeElements = $('div.content div.video, article, div[class*="video"]');
      
      if (alternativeElements.length > 0) {
        alternativeElements.each((i, element) => {
          if (i >= count) return false;
          
          // Extract video information
          let title = '';
          let thumbnailPath = '';
          let durationText = '';
          
          // Try to get title
          const titleEl = $(element).find('h2, h3, .title, [class*="title"]').first();
          if (titleEl.length > 0) {
            title = titleEl.text().trim();
          } else {
            // Try to get title from links
            const linkEl = $(element).find('a').first();
            if (linkEl.length > 0) {
              title = linkEl.attr('title') || linkEl.text().trim();
            }
          }
          
          // Try to get thumbnail
          const imgEl = $(element).find('img').first();
          if (imgEl.length > 0) {
            thumbnailPath = imgEl.attr('data-src') || imgEl.attr('src') || '';
          }
          
          // Try to get duration
          const durationEl = $(element).find('.duration, [class*="duration"]').first();
          if (durationEl.length > 0) {
            durationText = durationEl.text().trim();
          }
          
          const duration = convertDurationToSeconds(durationText);
          
          if (title && thumbnailPath) {
            // Get categories and tags
            const { categories, tags } = tagContent({
              title,
              description: '',
              duration: duration || 0
            });
            
            videos.push({
              title,
              filePath: thumbnailPath, // Use thumbnail as reference
              thumbnailPath,
              duration,
              categories,
              tags,
              isQuickie: duration !== undefined && duration <= 120
            });
          }
        });
      }
    } else {
      // Process standard video elements
      videoElements.each((i, element) => {
        if (i >= count) return false;
        
        let title = '';
        let thumbnailPath = '';
        let durationText = '';
        
        // Get title
        const titleEl = $(element).find('h2, h3, .title, [class*="title"], a[title]').first();
        if (titleEl.length > 0) {
          title = titleEl.attr('title') || titleEl.text().trim();
        }
        
        // Get thumbnail
        const imgEl = $(element).find('img').first();
        if (imgEl.length > 0) {
          thumbnailPath = imgEl.attr('data-src') || imgEl.attr('src') || '';
        }
        
        // Get duration
        const durationEl = $(element).find('.duration, [class*="duration"]').first();
        if (durationEl.length > 0) {
          durationText = durationEl.text().trim();
        }
        
        const duration = convertDurationToSeconds(durationText);
        
        if (title && thumbnailPath) {
          // Get categories and tags
          const { categories, tags } = tagContent({
            title,
            description: '',
            duration: duration || 0
          });
          
          videos.push({
            title,
            filePath: thumbnailPath, // Use thumbnail as reference
            thumbnailPath,
            duration,
            categories,
            tags,
            isQuickie: duration !== undefined && duration <= 120
          });
        }
      });
    }
    
    log(`Found ${videos.length} videos from FPO source`, 'videoImporter');
    return videos;
  } catch (error) {
    log(`Error scraping FPO: ${error}`, 'videoImporter');
    return [];
  }
}

/**
 * Generic scraper for any adult site
 */
async function scrapeGeneric(url: string, count: number = 5): Promise<ScrapedVideo[]> {
  try {
    log(`Scraping generic content from ${url}`, 'videoImporter');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const videos: ScrapedVideo[] = [];
    
    // Looking for common patterns across adult sites
    const videoElements = $('div[class*="video"], div[class*="thumb"], article, .video-container, li.video, .vidcont');
    
    let processedCount = 0;
    videoElements.each((_, element) => {
      if (processedCount >= count) return false;
      
      let title = '';
      let thumbnailPath = '';
      let durationText = '';
      
      // Try to extract title
      const titleEl = $(element).find('h2, h3, .title, [class*="title"], a[title]').first();
      if (titleEl.length > 0) {
        title = titleEl.attr('title') || titleEl.text().trim();
      } else {
        // Try other sources for title
        const alt = $(element).find('img').attr('alt');
        if (alt) title = alt;
      }
      
      // Try to extract thumbnail
      const imgEl = $(element).find('img').first();
      if (imgEl.length > 0) {
        thumbnailPath = imgEl.attr('data-src') || imgEl.attr('src') || '';
      }
      
      // Try to extract duration
      const durationEl = $(element).find('.duration, [class*="duration"], .time, [class*="time"]').first();
      if (durationEl.length > 0) {
        durationText = durationEl.text().trim();
      }
      
      const duration = convertDurationToSeconds(durationText);
      
      if (title && thumbnailPath) {
        // Get categories and tags
        const { categories, tags } = tagContent({
          title,
          description: '',
          duration: duration || 0
        });
        
        videos.push({
          title,
          filePath: thumbnailPath, // Use thumbnail as reference
          thumbnailPath,
          duration,
          categories,
          tags,
          isQuickie: duration !== undefined && duration <= 120
        });
        
        processedCount++;
      }
    });
    
    log(`Found ${videos.length} videos from generic source`, 'videoImporter');
    return videos;
  } catch (error) {
    log(`Error scraping generic site: ${error}`, 'videoImporter');
    return [];
  }
}

/**
 * Main function to import videos from a source
 */
export async function importVideosFromUrl(url: string, count: number = 5): Promise<ScrapedVideo[]> {
  try {
    if (!url) {
      throw new Error('URL is required');
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      throw new Error('Invalid URL format');
    }
    
    // Detect source type and use appropriate scraper
    const sourceType = detectSourceType(url);
    log(`Detected source type: ${sourceType} for URL: ${url}`, 'videoImporter');
    
    switch (sourceType) {
      case VideoSourceType.FPO:
        return await scrapeFPO(url, count);
      default:
        return await scrapeGeneric(url, count);
    }
  } catch (error) {
    log(`Error importing videos: ${error}`, 'videoImporter');
    throw error;
  }
}