import { Video, LikedVideo, VideoHistory } from '@shared/schema';
import { IStorage } from '../storage';

interface ScoredVideo {
  video: Video;
  score: number;
}

interface UserInterests {
  categories: Set<string>;
  tags: Set<string>;
  viewedVideoIds: Set<number>;
  watchFrequency: Map<string, number>; // Maps category to view count
  liked: Set<number>; // IDs of videos the user has liked
}

export class RecommendationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate personalized video recommendations for a user
   */
  async getRecommendations(userId: number, limit = 10): Promise<Video[]> {
    try {
      // 1. Get user's interests based on watch history and likes
      const userInterests = await this.getUserInterests(userId);
      
      // 2. Get candidate videos (excluding ones the user has already seen)
      const candidates = await this.getCandidateVideos(userInterests.viewedVideoIds);
      
      // 3. Score each candidate video
      const scoredVideos = this.scoreVideos(candidates, userInterests);
      
      // 4. Filter and sort results
      return this.getTopRecommendations(scoredVideos, limit);
    } catch (error) {
      console.error(`Error getting recommendations for user ${userId}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get recommendations based on a specific video (for "Up Next" feature)
   */
  async getSimilarVideos(videoId: number, userId: number | null, limit = 5): Promise<Video[]> {
    try {
      // 1. Get the source video
      const sourceVideo = await this.storage.getVideo(videoId);
      if (!sourceVideo) {
        return [];
      }
      
      // 2. Get candidate videos
      let viewedVideoIds = new Set<number>();
      if (userId) {
        try {
          const history = await this.storage.getVideoHistoryByUser(userId);
          viewedVideoIds = new Set(history.map(item => item.videoId));
        } catch (error) {
          console.error(`Error getting history for user ${userId}:`, error);
          // Continue with empty history if there's an error
        }
      }
      viewedVideoIds.add(videoId); // Always exclude the current video
      
      const candidates = await this.getCandidateVideos(viewedVideoIds);
      
      // 3. Score candidates based on similarity to source video
      const scoredVideos = candidates.map(video => {
        const score = this.calculateSimilarityScore(sourceVideo, video);
        return { video, score };
      });
      
      // 4. Sort and return top matches
      return this.getTopRecommendations(scoredVideos, limit);
    } catch (error) {
      console.error(`Error getting similar videos for video ${videoId}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get trending recommendations in a specific category
   */
  async getCategoryRecommendations(category: string, limit = 10): Promise<Video[]> {
    try {
      // Get all videos in the given category
      const allVideos = await this.storage.getVideos(100); // Get a reasonable number of videos
      
      // Filter by category and sort by views/recency
      const categoryVideos = allVideos
        .filter(video => video.categories?.includes(category))
        .sort((a, b) => {
          // Score based on views and recency
          const viewsScore = (b.views || 0) - (a.views || 0);
          const recencyScore = this.getDateTimestamp(b.createdAt) - this.getDateTimestamp(a.createdAt);
          return viewsScore * 0.7 + recencyScore * 0.3;
        })
        .slice(0, limit);
      
      return categoryVideos;
    } catch (error) {
      console.error(`Error getting recommendations for category ${category}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Build a profile of user interests based on their activity
   */
  private async getUserInterests(userId: number): Promise<UserInterests> {
    // Initialize user interests
    const interests: UserInterests = {
      categories: new Set<string>(),
      tags: new Set<string>(),
      viewedVideoIds: new Set<number>(),
      watchFrequency: new Map<string, number>(),
      liked: new Set<number>()
    };
    
    try {
      // Get user's watch history
      const history = await this.storage.getVideoHistoryByUser(userId);
      
      // Process watch history
      await Promise.all(history.map(async (item) => {
        interests.viewedVideoIds.add(item.videoId);
        
        try {
          const video = await this.storage.getVideo(item.videoId);
          if (video) {
            // Add categories and tags to interests
            video.categories?.forEach(category => {
              interests.categories.add(category);
              
              // Update watch frequency
              const currentCount = interests.watchFrequency.get(category) || 0;
              interests.watchFrequency.set(category, currentCount + 1);
            });
            
            video.tags?.forEach(tag => interests.tags.add(tag));
          }
        } catch (error) {
          console.error(`Error processing history item for video ${item.videoId}:`, error);
          // Skip this item and continue
        }
      }));
      
      try {
        // Get user's liked videos (these have higher weight)
        const likedVideos = await this.storage.getLikedVideosByUser(userId);
        
        // Process likes
        await Promise.all(likedVideos.map(async (item) => {
          interests.liked.add(item.videoId);
          
          try {
            const video = await this.storage.getVideo(item.videoId);
            if (video) {
              video.categories?.forEach(category => {
                interests.categories.add(category);
                // Likes count twice in watch frequency
                const currentCount = interests.watchFrequency.get(category) || 0;
                interests.watchFrequency.set(category, currentCount + 2);
              });
              
              video.tags?.forEach(tag => interests.tags.add(tag));
            }
          } catch (error) {
            console.error(`Error processing liked video ${item.videoId}:`, error);
            // Skip this item and continue
          }
        }));
      } catch (error) {
        console.error(`Error fetching liked videos for user ${userId}:`, error);
        // Continue with what we have
      }
    } catch (error) {
      console.error(`Error building user interests for user ${userId}:`, error);
      // Return empty interests if there's an error
    }
    
    return interests;
  }

  /**
   * Get candidate videos that the user hasn't watched yet
   */
  private async getCandidateVideos(excludeVideoIds: Set<number>): Promise<Video[]> {
    try {
      // Get a batch of recent videos as candidates
      const recentVideos = await this.storage.getVideos(50);
      
      // Filter out videos the user has already seen
      return recentVideos.filter(video => !excludeVideoIds.has(video.id));
    } catch (error) {
      console.error('Error getting candidate videos:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Score candidate videos based on user interests
   */
  private scoreVideos(candidates: Video[], userInterests: UserInterests): ScoredVideo[] {
    return candidates.map(video => {
      let score = 0;
      
      // Base score - all valid videos start with a small score
      score += 0.1;
      
      // Category match score
      video.categories?.forEach(category => {
        if (userInterests.categories.has(category)) {
          // Add basic category match score
          score += 3.0;
          
          // Boost score based on watch frequency
          const frequencyBoost = userInterests.watchFrequency.get(category) || 0;
          score += frequencyBoost * 0.5; // Each view adds 0.5 to score
        }
      });
      
      // Tag match score
      video.tags?.forEach(tag => {
        if (userInterests.tags.has(tag)) {
          score += 1.0;
        }
      });
      
      // Popular videos get a small boost
      score += Math.min((video.views || 0) / 1000, 2); // Max 2 points from views
      
      // Recency boost - newer videos get a small advantage
      const daysSinceCreation = (Date.now() - this.getDateTimestamp(video.createdAt)) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 2 - (daysSinceCreation / 15)); // Bonus diminishes over 30 days
      
      return { video, score };
    });
  }

  /**
   * Calculate similarity score between two videos
   */
  private calculateSimilarityScore(sourceVideo: Video, candidateVideo: Video): number {
    let score = 0;
    
    // Same creator gets a big boost
    if (sourceVideo.userId === candidateVideo.userId) {
      score += 4.0;
    }
    
    // Category overlap
    const sourceCategories = new Set(sourceVideo.categories || []);
    const candidateCategories = new Set(candidateVideo.categories || []);
    
    candidateCategories.forEach(category => {
      if (sourceCategories.has(category)) {
        score += 2.5;
      }
    });
    
    // Tag overlap
    const sourceTags = new Set(sourceVideo.tags || []);
    const candidateTags = new Set(candidateVideo.tags || []);
    
    candidateTags.forEach(tag => {
      if (sourceTags.has(tag)) {
        score += 1.0;
      }
    });
    
    // Popularity boost
    score += Math.min((candidateVideo.views || 0) / 1000, 1.5);
    
    // Recency boost
    const daysSinceCreation = (Date.now() - this.getDateTimestamp(candidateVideo.createdAt)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 1 - (daysSinceCreation / 30));
    
    return score;
  }

  /**
   * Get top N recommendations from scored videos
   */
  private getTopRecommendations(scoredVideos: ScoredVideo[], limit: number): Video[] {
    return scoredVideos
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.video);
  }
  
  /**
   * Helper method to safely convert a date string or Date object to timestamp
   */
  private getDateTimestamp(date: string | Date | null): number {
    if (!date) return 0;
    try {
      return new Date(date).getTime();
    } catch (error) {
      return 0;
    }
  }
}