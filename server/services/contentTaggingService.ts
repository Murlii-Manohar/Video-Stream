import { log } from '../vite';

// Categories for content
const CATEGORIES = [
  'amateur',
  'anal',
  'asian',
  'bdsm',
  'big-ass',
  'big-tits',
  'blonde',
  'blowjob',
  'brunette',
  'creampie',
  'cumshot',
  'ebony',
  'fetish',
  'group',
  'hardcore',
  'interracial',
  'latina',
  'lesbian',
  'masturbation',
  'mature',
  'milf',
  'pov',
  'public',
  'redhead',
  'rough',
  'solo',
  'squirt',
  'teen',
  'threesome',
  'toys',
  'vintage'
];

// Keywords to category mapping (common patterns)
const CATEGORY_PATTERNS: Record<string, string[]> = {
  'amateur': ['amateur', 'homemade', 'home made', 'self shot', 'selfshot'],
  'anal': ['anal', 'ass fuck', 'assfuck', 'butt'],
  'asian': ['asian', 'japanese', 'korean', 'chinese', 'thai'],
  'bdsm': ['bdsm', 'bondage', 'tied', 'rope', 'slave', 'dom', 'domination', 'submissive', 'discipline'],
  'big-ass': ['big ass', 'bigass', 'big booty', 'pawg', 'bubble butt'],
  'big-tits': ['big tits', 'bigtits', 'big boobs', 'huge tits', 'busty'],
  'blonde': ['blonde', 'blond'],
  'blowjob': ['blowjob', 'blow job', 'bj', 'sucking', 'oral'],
  'brunette': ['brunette', 'brown hair'],
  'creampie': ['creampie', 'cream pie', 'internal'],
  'cumshot': ['cumshot', 'cum shot', 'facial', 'cum on'],
  'ebony': ['ebony', 'black', 'african'],
  'fetish': ['fetish', 'foot', 'feet', 'smoking', 'latex', 'spandex'],
  'group': ['group', 'orgy', 'gangbang', 'gang bang', 'foursome'],
  'hardcore': ['hardcore', 'hard', 'rough', 'intense'],
  'interracial': ['interracial', 'bbc', 'ir'],
  'latina': ['latina', 'latino', 'hispanic', 'mexican', 'spanish'],
  'lesbian': ['lesbian', 'girl on girl', 'girls only'],
  'masturbation': ['masturbation', 'masturbate', 'solo', 'masturbating', 'fingering'],
  'mature': ['mature', 'older woman', 'granny', 'cougar'],
  'milf': ['milf', 'mom', 'mother', 'mommy', 'stepmom', 'step mom'],
  'pov': ['pov', 'point of view'],
  'public': ['public', 'outdoor', 'outside', 'beach', 'park', 'car'],
  'redhead': ['redhead', 'red head', 'ginger'],
  'rough': ['rough', 'hard', 'slap', 'choke', 'spank'],
  'solo': ['solo', 'alone', 'herself', 'himself'],
  'squirt': ['squirt', 'squirting', 'gush'],
  'teen': ['teen', '18', 'young', 'college', 'barely legal'],
  'threesome': ['threesome', 'three way', 'threeway', 'mmf', 'ffm'],
  'toys': ['toy', 'toys', 'dildo', 'vibrator', 'plug']
};

// Content type classification
const CONTENT_TYPES = {
  'quickie': {
    maxDuration: 120, // 2 minutes in seconds
    patterns: ['quick', 'short', 'tease', 'preview']
  },
  'standard': {
    minDuration: 120,
    patterns: []
  }
};

interface TaggingResult {
  categories: string[];
  tags: string[];
  contentType: 'quickie' | 'standard';
}

interface ContentData {
  title: string;
  description?: string;
  tags?: string[];
  duration?: number;
  isQuickie?: boolean;
}

/**
 * Extracts keywords from text
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Remove special characters and convert to lowercase
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // Split into words and filter out common words and short words
  const words = cleanText.split(/\s+/).filter(word => 
    word.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that', 'from'].includes(word)
  );
  
  return [...new Set(words)]; // Remove duplicates
}

/**
 * Tags content based on title, description, and other metadata
 */
export function tagContent(data: ContentData): TaggingResult {
  try {
    const { title, description = '', tags = [], duration = 0, isQuickie = false } = data;
    
    // Extract text from title and description
    const titleText = title.toLowerCase();
    const descriptionText = description.toLowerCase();
    const combinedText = `${titleText} ${descriptionText}`;
    
    // Derive categories based on text patterns
    const categories: string[] = [];
    
    Object.entries(CATEGORY_PATTERNS).forEach(([category, patterns]) => {
      const inCategory = patterns.some(pattern => 
        combinedText.includes(pattern.toLowerCase())
      );
      
      if (inCategory && !categories.includes(category)) {
        categories.push(category);
      }
    });
    
    // Add existing tags if they match our categories
    const normalizedTags = tags.map(tag => tag.toLowerCase());
    CATEGORIES.forEach(category => {
      if (normalizedTags.includes(category) && !categories.includes(category)) {
        categories.push(category);
      }
    });
    
    // Determine content type
    let contentType: 'quickie' | 'standard' = 'standard';
    
    if (isQuickie || duration <= CONTENT_TYPES.quickie.maxDuration) {
      contentType = 'quickie';
    } else if (CONTENT_TYPES.quickie.patterns.some(pattern => combinedText.includes(pattern))) {
      contentType = 'quickie';
    }
    
    // Generate tags from keywords in title and description
    const extractedTags = [
      ...extractKeywords(title),
      ...extractKeywords(description)
    ].filter(tag => tag.length >= 3);
    
    // Combine with existing tags and deduplicate
    const combinedTags = [...new Set([...normalizedTags, ...extractedTags])];
    
    return {
      categories,
      tags: combinedTags,
      contentType
    };
  } catch (error) {
    log(`Error in content tagging: ${error}`, 'contentTagging');
    return {
      categories: [],
      tags: [],
      contentType: 'standard'
    };
  }
}

/**
 * Suggests related content IDs based on content similarity
 */
export function suggestRelatedContentIds(
  contentId: number,
  allContent: { id: number, categories: string[], tags: string[] }[],
  limit: number = 10
): number[] {
  try {
    // Find the content we're relating to
    const sourceContent = allContent.find(content => content.id === contentId);
    if (!sourceContent) return [];
    
    // Calculate similarity scores
    const contentWithScores = allContent
      .filter(content => content.id !== contentId) // Exclude the source content
      .map(content => {
        // Calculate category overlap
        const categoryOverlap = sourceContent.categories.filter(
          category => content.categories.includes(category)
        ).length;
        
        // Calculate tag overlap
        const tagOverlap = sourceContent.tags.filter(
          tag => content.tags.includes(tag)
        ).length;
        
        // Combined score (weighted)
        const score = (categoryOverlap * 3) + tagOverlap;
        
        return {
          id: content.id,
          score
        };
      })
      .filter(item => item.score > 0) // Only keep items with some similarity
      .sort((a, b) => b.score - a.score); // Sort by score descending
    
    // Return the top N content IDs
    return contentWithScores.slice(0, limit).map(item => item.id);
  } catch (error) {
    log(`Error in suggest related content: ${error}`, 'contentTagging');
    return [];
  }
}