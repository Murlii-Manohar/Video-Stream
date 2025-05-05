import axios from 'axios';
import * as cheerio from 'cheerio';
import { tagContent } from './contentTaggingService';
import { log } from '../vite';

// Video source types for import
enum VideoSourceType {
  YouTube = 'youtube',
  Vimeo = 'vimeo',
  PornHub = 'pornhub',
  XVideos = 'xvideos',
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
  } else {
    return VideoSourceType.Generic;
  }
}

/**
 * Safely extracts a value using a selector from a Cheerio instance
 */
function extractWithSelector($: cheerio.CheerioAPI, selector: string, attribute?: string): string {
  try {
    const element = $(selector);
    if (!element.length) return '';
    
    if (attribute) {
      return element.attr(attribute) || '';
    } else {
      return element.text().trim();
    }
  } catch (error) {
    log(`Error extracting with selector ${selector}: ${error}`, 'videoImporter');
    return '';
  }
}

/**
 * Scrapes videos from a PornHub source
 */
async function scrapePornHub(url: string, count: number = 5): Promise<ScrapedVideo[]> {
  try {
    log(`Scraping PornHub content from ${url}`, 'videoImporter');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });
    
    const $ = cheerio.load(response.data);
    const videos: ScrapedVideo[] = [];
    
    // Find all video elements
    const videoElements = $('div.videoblock');
    
    // Process only the requested number of videos
    for (let i = 0; i < Math.min(count, videoElements.length); i++) {
      const element = videoElements.eq(i);
      
      // Extract metadata from the element
      const title = extractWithSelector(element, 'span.title a');
      const thumbnailPath = extractWithSelector(element, 'img', 'data-src') || extractWithSelector(element, 'img', 'src');
      const durationText = extractWithSelector(element, 'var.duration');
      const duration = convertDurationToSeconds(durationText);
      
      // Generate a direct video URL using metadata
      // For safety, we reference the thumbnail rather than attempt to get actual video files
      const videoId = thumbnailPath.match(/i=(.*?)\//)?.[1] || '';
      const filePath = thumbnailPath; // Only using thumbnail URL as reference, not actual video
      
      if (title && filePath) {
        // Use content tagging service to enhance metadata
        const { categories, tags } = tagContent({
          title,
          description: '',
          duration: duration || 0
        });
        
        videos.push({
          title,
          filePath,
          thumbnailPath,
          duration,
          categories,
          tags,
          isQuickie: duration !== undefined && duration <= 120 // Mark as quickie if under 2 minutes
        });
      }
    }
    
    return videos;
  } catch (error) {
    log(`Error scraping PornHub: ${error}`, 'videoImporter');
    return [];
  }
}

/**
 * Scrapes videos from an XVideos source
 */
async function scrapeXVideos(url: string, count: number = 5): Promise<ScrapedVideo[]> {
  try {
    log(`Scraping XVideos content from ${url}`, 'videoImporter');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });
    
    const $ = cheerio.load(response.data);
    const videos: ScrapedVideo[] = [];
    
    // Find all video elements
    const videoElements = $('div.thumb-block');
    
    // Process only the requested number of videos
    for (let i = 0; i < Math.min(count, videoElements.length); i++) {
      const element = videoElements.eq(i);
      
      // Extract metadata from the element
      const title = extractWithSelector(element, 'p.title a');
      const thumbnailPath = extractWithSelector(element, 'img', 'data-src') || extractWithSelector(element, 'img', 'src');
      const durationText = extractWithSelector(element, 'span.duration');
      const duration = convertDurationToSeconds(durationText);
      
      // Use thumbnail as reference
      const filePath = thumbnailPath;
      
      if (title && filePath) {
        // Use content tagging service to enhance metadata
        const { categories, tags } = tagContent({
          title,
          description: '',
          duration: duration || 0
        });
        
        videos.push({
          title,
          filePath,
          thumbnailPath,
          duration,
          categories,
          tags,
          isQuickie: duration !== undefined && duration <= 120 // Mark as quickie if under 2 minutes
        });
      }
    }
    
    return videos;
  } catch (error) {
    log(`Error scraping XVideos: ${error}`, 'videoImporter');
    return [];
  }
}

/**
 * Generic scraper for any site
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
    
    // Look for common video patterns
    const videoElements = $('video, iframe[src*="youtube"], iframe[src*="vimeo"], div[class*="video"], article, .video-container');
    
    // Process only the requested number of videos
    let processedCount = 0;
    videoElements.each((_, element) => {
      if (processedCount >= count) return false;
      
      const $element = $(element);
      
      // Try to extract title from various sources
      let title = '';
      if ($element.attr('title')) {
        title = $element.attr('title') || '';
      } else if ($element.attr('alt')) {
        title = $element.attr('alt') || '';
      } else if ($element.attr('data-title')) {
        title = $element.attr('data-title') || '';
      } else {
        // Look for nearby headings
        const heading = $element.prev('h1, h2, h3, h4, h5, h6, .title, .video-title');
        if (heading.length) {
          title = heading.text().trim();
        }
      }
      
      // Try to find thumbnail
      let thumbnailPath = '';
      if ($element.is('video') && $element.attr('poster')) {
        thumbnailPath = $element.attr('poster') || '';
      } else {
        // Look for nearby images
        const img = $element.find('img').first();
        if (img.length) {
          thumbnailPath = img.attr('src') || '';
        }
      }
      
      // Use source if it's a video element
      let filePath = '';
      if ($element.is('video')) {
        const source = $element.find('source').first();
        if (source.length && source.attr('src')) {
          filePath = source.attr('src') || '';
        } else if ($element.attr('src')) {
          filePath = $element.attr('src') || '';
        }
      } else if ($element.is('iframe') && $element.attr('src')) {
        filePath = $element.attr('src') || '';
      }
      
      // If we found enough info, add to results
      if (title && (filePath || thumbnailPath)) {
        const thumbToUse = thumbnailPath || filePath;
        const pathToUse = filePath || thumbnailPath;
        
        // Use content tagging service to enhance metadata
        const { categories, tags } = tagContent({
          title,
          description: '',
          duration: 0
        });
        
        videos.push({
          title,
          filePath: pathToUse,
          thumbnailPath: thumbToUse,
          categories,
          tags
        });
        
        processedCount++;
      }
    });
    
    return videos;
  } catch (error) {
    log(`Error scraping generic site: ${error}`, 'videoImporter');
    return [];
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
      case VideoSourceType.PornHub:
        return await scrapePornHub(url, count);
      case VideoSourceType.XVideos:
        return await scrapeXVideos(url, count);
      default:
        return await scrapeGeneric(url, count);
    }
  } catch (error) {
    log(`Error importing videos: ${error}`, 'videoImporter');
    throw error;
  }
}