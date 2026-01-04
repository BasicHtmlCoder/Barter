/**
 * Like/Dislike System with User Accountability and Mutual Interaction Tracking
 *
 * This data structure tracks likes and dislikes on content items,
 * maintains user accountability, and enables detection of mutual
 * interactions (lift/revenge patterns).
 */

// Types of content that can be liked/disliked
type ContentType = 'thread' | 'resource' | 'comment' | 'post';

// Reaction types
type ReactionType = 'like' | 'dislike';

// User reaction on a specific content item
interface Reaction {
  username: string;
  type: ReactionType;
  timestamp: Date;
}

// Content item that can receive reactions
interface ContentItem {
  id: string;
  type: ContentType;
  authorUsername: string;
  reactions: Reaction[];
}

// Mutual interaction between two users
interface MutualInteraction {
  user1: string;
  user2: string;
  type: 'mutual-lift' | 'mutual-revenge' | 'mixed';
  user1LikesUser2Count: number;
  user2LikesUser1Count: number;
  user1DislikesUser2Count: number;
  user2DislikesUser1Count: number;
}

// Main system class
class LikeDislikeSystem {
  private content: Map<string, ContentItem> = new Map();

  /**
   * Add or update a reaction on a content item
   */
  react(contentId: string, username: string, reactionType: ReactionType): void {
    const item = this.content.get(contentId);
    if (!item) {
      throw new Error(`Content item ${contentId} not found`);
    }

    // Remove any existing reaction from this user
    item.reactions = item.reactions.filter(r => r.username !== username);

    // Add the new reaction
    item.reactions.push({
      username,
      type: reactionType,
      timestamp: new Date()
    });
  }

  /**
   * Remove a user's reaction from a content item
   */
  unreact(contentId: string, username: string): void {
    const item = this.content.get(contentId);
    if (!item) {
      throw new Error(`Content item ${contentId} not found`);
    }

    item.reactions = item.reactions.filter(r => r.username !== username);
  }

  /**
   * Create a new content item
   */
  createContent(id: string, type: ContentType, authorUsername: string): void {
    this.content.set(id, {
      id,
      type,
      authorUsername,
      reactions: []
    });
  }

  /**
   * Get all reactions for a content item
   */
  getReactions(contentId: string): Reaction[] {
    const item = this.content.get(contentId);
    return item ? [...item.reactions] : [];
  }

  /**
   * Get users who liked a content item
   */
  getLikes(contentId: string): string[] {
    return this.getReactions(contentId)
      .filter(r => r.type === 'like')
      .map(r => r.username);
  }

  /**
   * Get users who disliked a content item
   */
  getDislikes(contentId: string): string[] {
    return this.getReactions(contentId)
      .filter(r => r.type === 'dislike')
      .map(r => r.username);
  }

  /**
   * Get reaction counts for a content item
   */
  getReactionCounts(contentId: string): { likes: number; dislikes: number } {
    const reactions = this.getReactions(contentId);
    return {
      likes: reactions.filter(r => r.type === 'like').length,
      dislikes: reactions.filter(r => r.type === 'dislike').length
    };
  }

  /**
   * Get all content items by a specific author
   */
  getContentByAuthor(username: string): ContentItem[] {
    return Array.from(this.content.values())
      .filter(item => item.authorUsername === username);
  }

  /**
   * Analyze mutual interactions between two users
   * Returns how they interact with each other's content
   */
  getMutualInteraction(user1: string, user2: string): MutualInteraction {
    const user1Content = this.getContentByAuthor(user1);
    const user2Content = this.getContentByAuthor(user2);

    // Count user2's reactions on user1's content
    let user2LikesUser1 = 0;
    let user2DislikesUser1 = 0;
    for (const item of user1Content) {
      const user2Reaction = item.reactions.find(r => r.username === user2);
      if (user2Reaction) {
        if (user2Reaction.type === 'like') user2LikesUser1++;
        else user2DislikesUser1++;
      }
    }

    // Count user1's reactions on user2's content
    let user1LikesUser2 = 0;
    let user1DislikesUser2 = 0;
    for (const item of user2Content) {
      const user1Reaction = item.reactions.find(r => r.username === user1);
      if (user1Reaction) {
        if (user1Reaction.type === 'like') user1LikesUser2++;
        else user1DislikesUser2++;
      }
    }

    // Determine interaction type
    const mutualLikes = user1LikesUser2 > 0 && user2LikesUser1 > 0;
    const mutualDislikes = user1DislikesUser2 > 0 && user2DislikesUser1 > 0;

    let type: 'mutual-lift' | 'mutual-revenge' | 'mixed';
    if (mutualLikes && !mutualDislikes) {
      type = 'mutual-lift';
    } else if (mutualDislikes && !mutualLikes) {
      type = 'mutual-revenge';
    } else {
      type = 'mixed';
    }

    return {
      user1,
      user2,
      type,
      user1LikesUser2Count: user1LikesUser2,
      user2LikesUser1Count: user2LikesUser1,
      user1DislikesUser2Count: user1DislikesUser2,
      user2DislikesUser1Count: user2DislikesUser1
    };
  }

  /**
   * Find all users who have mutual lift patterns with a given user
   * (both users like each other's content)
   */
  findMutualLifts(username: string): string[] {
    const allAuthors = new Set(
      Array.from(this.content.values()).map(item => item.authorUsername)
    );

    const mutualLifts: string[] = [];
    for (const otherUser of allAuthors) {
      if (otherUser === username) continue;

      const interaction = this.getMutualInteraction(username, otherUser);
      if (interaction.type === 'mutual-lift') {
        mutualLifts.push(otherUser);
      }
    }

    return mutualLifts;
  }

  /**
   * Find all users who have mutual revenge patterns with a given user
   * (both users dislike each other's content)
   */
  findMutualRevenges(username: string): string[] {
    const allAuthors = new Set(
      Array.from(this.content.values()).map(item => item.authorUsername)
    );

    const mutualRevenges: string[] = [];
    for (const otherUser of allAuthors) {
      if (otherUser === username) continue;

      const interaction = this.getMutualInteraction(username, otherUser);
      if (interaction.type === 'mutual-revenge') {
        mutualRevenges.push(otherUser);
      }
    }

    return mutualRevenges;
  }

  /**
   * Get user's reaction history (all reactions they've made)
   */
  getUserReactionHistory(username: string): Array<{
    contentId: string;
    contentType: ContentType;
    contentAuthor: string;
    reactionType: ReactionType;
    timestamp: Date;
  }> {
    const history: Array<{
      contentId: string;
      contentType: ContentType;
      contentAuthor: string;
      reactionType: ReactionType;
      timestamp: Date;
    }> = [];

    for (const item of this.content.values()) {
      const userReaction = item.reactions.find(r => r.username === username);
      if (userReaction) {
        history.push({
          contentId: item.id,
          contentType: item.type,
          contentAuthor: item.authorUsername,
          reactionType: userReaction.type,
          timestamp: userReaction.timestamp
        });
      }
    }

    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get timeline of user1's reactions on user2's posts over time
   * Shows how user1 has reacted to user2's content chronologically
   */
  getReactionTimeline(reactorUsername: string, authorUsername: string): Array<{
    contentId: string;
    contentType: ContentType;
    reactionType: ReactionType;
    timestamp: Date;
  }> {
    const authorContent = this.getContentByAuthor(authorUsername);
    const timeline: Array<{
      contentId: string;
      contentType: ContentType;
      reactionType: ReactionType;
      timestamp: Date;
    }> = [];

    for (const item of authorContent) {
      const reaction = item.reactions.find(r => r.username === reactorUsername);
      if (reaction) {
        timeline.push({
          contentId: item.id,
          contentType: item.type,
          reactionType: reaction.type,
          timestamp: reaction.timestamp
        });
      }
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get content item details
   */
  getContent(contentId: string): ContentItem | undefined {
    const item = this.content.get(contentId);
    return item ? { ...item, reactions: [...item.reactions] } : undefined;
  }

  /**
   * Get all content items
   */
  getAllContent(): ContentItem[] {
    return Array.from(this.content.values()).map(item => ({
      ...item,
      reactions: [...item.reactions]
    }));
  }
}

// Example usage
const system = new LikeDislikeSystem();

// Create some content
system.createContent('thread-1', 'thread', 'alice');
system.createContent('thread-2', 'thread', 'bob');
system.createContent('resource-1', 'resource', 'alice');
system.createContent('resource-2', 'resource', 'bob');

// Users react to content
system.react('thread-1', 'bob', 'like');    // Bob likes Alice's thread
system.react('thread-2', 'alice', 'like');  // Alice likes Bob's thread (mutual lift!)
system.react('resource-1', 'bob', 'like');  // Bob likes Alice's resource
system.react('resource-2', 'alice', 'like'); // Alice likes Bob's resource

system.react('thread-1', 'charlie', 'dislike'); // Charlie dislikes Alice's thread
system.react('thread-2', 'charlie', 'like');    // Charlie likes Bob's thread

// Check mutual interactions
console.log('Alice & Bob mutual interaction:', system.getMutualInteraction('alice', 'bob'));
// Result: { type: 'mutual-lift', user1LikesUser2Count: 2, user2LikesUser1Count: 2, ... }

console.log('Alice\'s mutual lifts:', system.findMutualLifts('alice'));
// Result: ['bob']

// See who liked/disliked content
console.log('Who liked thread-1:', system.getLikes('thread-1'));
// Result: ['bob']
console.log('Who disliked thread-1:', system.getDislikes('thread-1'));
// Result: ['charlie']

// Get reaction counts
console.log('Thread-1 reaction counts:', system.getReactionCounts('thread-1'));
// Result: { likes: 1, dislikes: 1 }

// View user's reaction history
console.log('Bob\'s reaction history:', system.getUserReactionHistory('bob'));

export { LikeDislikeSystem, ContentItem, Reaction, MutualInteraction, ContentType, ReactionType };
