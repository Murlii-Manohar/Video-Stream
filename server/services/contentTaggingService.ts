/**
 * Content Tagging Service
 * 
 * This service provides AI-like content tagging functionality using pattern matching
 * and keyword analysis without relying on external AI APIs.
 */

// Categories with associated keywords and patterns
const categoryPatterns = {
  // Body types and demographics
  teen: {
    keywords: ['teen', 'teenage', 'young', '18', '19', 'college', 'university', 'freshman'],
    patterns: [/\bteen\b/i, /\byoung\b/i, /\b(18|19)[- ]year[- ]old\b/i, /\bcollege\b/i]
  },
  milf: {
    keywords: ['milf', 'mother', 'mom', 'mature', 'cougar', 'housewife'],
    patterns: [/\bmilf\b/i, /\bmom\b/i, /\bmother\b/i, /\bcougar\b/i, /\bhousewife\b/i]
  },
  stepmom: {
    keywords: ['stepmom', 'step mom', 'step mother', 'stepmother', 'step-mom', 'step-mother'],
    patterns: [/\bstep[- ]?mom\b/i, /\bstep[- ]?mother\b/i]
  },
  ebony: {
    keywords: ['ebony', 'black', 'african'],
    patterns: [/\bebony\b/i, /\bblack\b/i]
  },
  asian: {
    keywords: ['asian', 'japanese', 'korean', 'chinese', 'thai', 'filipina'],
    patterns: [/\basian\b/i, /\bjapanese\b/i, /\bkorean\b/i, /\bchinese\b/i, /\bthai\b/i]
  },
  indian: {
    keywords: ['indian', 'desi', 'punjabi', 'bengali', 'hindi'],
    patterns: [/\bindian\b/i, /\bdesi\b/i]
  },

  // Production quality
  amateur: {
    keywords: ['amateur', 'homemade', 'selfie', 'self shot', 'home video', 'personal'],
    patterns: [/\bamateur\b/i, /\bhomemade\b/i, /\bself(?:ie| shot)\b/i, /\bhome video\b/i]
  },
  professional: {
    keywords: ['professional', 'studio', 'production', 'high quality', 'hd', '4k', 'premium'],
    patterns: [/\bprofessional\b/i, /\bstudio\b/i, /\bhigh quality\b/i, /\bhd\b/i, /\b4k\b/i]
  },
  verified: {
    keywords: ['verified', 'official', 'original', 'authentic', 'star', 'pornstar', 'model'],
    patterns: [/\bverified\b/i, /\bofficial\b/i, /\bpornstar\b/i, /\bstar\b/i]
  },

  // Acts
  anal: {
    keywords: ['anal', 'ass', 'butt', 'backdoor'],
    patterns: [/\banal\b/i, /\bass\b/i, /\bbutt\b/i, /\bbackdoor\b/i]
  },
  threesome: {
    keywords: ['threesome', 'three way', '3way', '3some', 'trio', 'mmf', 'ffm', 'mfm'],
    patterns: [/\bthreesome\b/i, /\bthree[- ]way\b/i, /\b3(?:way|some)\b/i, /\b(?:mmf|ffm|mfm)\b/i]
  },
  lesbian: {
    keywords: ['lesbian', 'girl on girl', 'gg', 'female only', 'women only'],
    patterns: [/\blesbian\b/i, /\bgirl[- ]on[- ]girl\b/i, /\bgg\b/i]
  },
  cheating: {
    keywords: ['cheating', 'cheat', 'affair', 'unfaithful', 'cuckold', 'cuck', 'boyfriend', 'husband'],
    patterns: [/\bcheating\b/i, /\bcheat\b/i, /\baffair\b/i, /\bunfaithful\b/i, /\bcuck(?:old)?\b/i]
  },
  couples: {
    keywords: ['couple', 'couples', 'boyfriend', 'girlfriend', 'bf', 'gf', 'husband', 'wife'],
    patterns: [/\bcouple(s)?\b/i, /\b(?:boy|girl)friend\b/i, /\bhusband\b/i, /\bwife\b/i]
  },
  solo: {
    keywords: ['solo', 'alone', 'masturbation', 'self pleasure', 'touching', 'dildo', 'toy'],
    patterns: [/\bsolo\b/i, /\balone\b/i, /\bmasturbat(?:e|ing|ion)\b/i, /\bself[- ]pleasure\b/i, /\bdildo\b/i, /\btoy\b/i]
  }
};

// Content type patterns for detecting whether content might be a quickie
const contentTypePatterns = {
  quickie: {
    keywords: ['quick', 'short', 'fast', 'tease', 'preview', 'trailer', 'teaser', 'clip', 'snippet'],
    patterns: [/\b(?:quick|short|fast)\b/i, /\b(?:tease|teaser)\b/i, /\bpreview\b/i, /\btrailer\b/i, /\bclip\b/i, /\bsnippet\b/i]
  },
  explicit: {
    keywords: ['explicit', 'xxx', 'hardcore', 'uncensored', 'uncut', 'raw', 'full'],
    patterns: [/\bexplicit\b/i, /\bxxx\b/i, /\bhardcore\b/i, /\buncensored\b/i, /\buncut\b/i, /\braw\b/i, /\bfull\b/i]
  }
};

/**
 * Tags content based on title, description, and other metadata
 * to identify likely categories and content types
 */
export function tagContent(data: {
  title: string;
  description?: string | null;
  tags?: string[] | null;
  duration?: number | null;
  isQuickie?: boolean;
}): { 
  categories: string[];
  tags: string[];
  contentType: string; 
  durationCategory: string;
} {
  const { title, description, tags = [], duration, isQuickie } = data;
  
  // Create the combined text to analyze from title, description, and tags
  const combinedText = [
    title,
    description || '',
    ...(Array.isArray(tags) ? tags : [])
  ].join(' ').toLowerCase();
  
  // Initialize result arrays
  const detectedCategories: string[] = [];
  const enhancedTags: string[] = [...(Array.isArray(tags) ? tags : [])];
  
  // Analyze content and identify categories
  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    // Check for keywords
    const hasKeyword = patterns.keywords.some(keyword => 
      combinedText.includes(keyword.toLowerCase())
    );
    
    // Check for regex patterns
    const matchesPattern = patterns.patterns.some(pattern => 
      pattern.test(combinedText)
    );
    
    if (hasKeyword || matchesPattern) {
      detectedCategories.push(category);
      
      // Add category as a tag if it's not already included
      if (!enhancedTags.includes(category)) {
        enhancedTags.push(category);
      }
    }
  }
  
  // Determine content type (quickie or full video)
  let contentType = 'standard';
  
  // If explicitly marked as quickie via form
  if (isQuickie) {
    contentType = 'quickie';
  } 
  // If duration suggests it's a quickie (under 2 minutes)
  else if (duration !== undefined && duration !== null && duration <= 120) {
    contentType = 'quickie';
  } 
  // If title/description suggests quickie content
  else {
    const hasQuickieKeyword = contentTypePatterns.quickie.keywords.some(keyword => 
      combinedText.includes(keyword.toLowerCase())
    );
    
    const matchesQuickiePattern = contentTypePatterns.quickie.patterns.some(pattern => 
      pattern.test(combinedText)
    );
    
    if (hasQuickieKeyword || matchesQuickiePattern) {
      contentType = 'quickie';
    }
  }
  
  // Determine duration category
  let durationCategory = 'unknown';
  if (duration !== undefined && duration !== null) {
    if (duration <= 60) {
      durationCategory = 'minute';
    } else if (duration <= 300) {
      durationCategory = 'short';
    } else if (duration <= 1200) {
      durationCategory = 'medium';
    } else {
      durationCategory = 'long';
    }
  }
  
  return {
    categories: detectedCategories,
    tags: enhancedTags,
    contentType,
    durationCategory
  };
}

/**
 * Suggests related content based on tags and categories
 */
export function suggestRelatedContentIds(
  videoId: number,
  currentTags: string[],
  currentCategories: string[],
  allVideos: Array<{
    id: number;
    tags?: string[] | null;
    categories?: string[] | null;
  }>
): number[] {
  // Filter out the current video from suggestions
  const otherVideos = allVideos.filter(v => v.id !== videoId);
  
  if (otherVideos.length === 0) {
    return [];
  }
  
  // Calculate relevance score for each video based on tags and categories
  const scoredVideos = otherVideos.map(video => {
    const videoTags = video.tags || [];
    const videoCategories = video.categories || [];
    
    // Calculate tag overlap
    const tagOverlap = currentTags.filter(tag => 
      videoTags.includes(tag)
    ).length;
    
    // Calculate category overlap
    const categoryOverlap = currentCategories.filter(category => 
      videoCategories.includes(category)
    ).length;
    
    // Calculate overall score (categories have more weight)
    const score = (tagOverlap * 1) + (categoryOverlap * 2);
    
    return {
      id: video.id,
      score
    };
  });
  
  // Sort videos by score (descending) and return top 8
  return scoredVideos
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(v => v.id);
}

/**
 * Extracts keywords from text for search optimization
 */
export function extractKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Normalize text
  const normalized = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
    .trim();
  
  // Common words to exclude (stop words)
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'have', 'has', 'had', 'be', 'been', 'being', 'do', 'does', 'did',
    'can', 'could', 'will', 'would', 'should', 'shall', 'may', 'might',
    'must', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'from', 'up', 'down', 'this', 'that', 'these', 'those',
    'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their', 'am'
  ]);
  
  // Split text into words and filter out stop words and short words
  const keywords = normalized.split(' ')
    .filter(word => 
      word.length > 2 && !stopWords.has(word)
    );
  
  // Return unique keywords
  return Array.from(new Set(keywords));
}