/**
 * Global Search Service
 * Business logic for unified search with AI assistance
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ISearchAdapter } from '@/adapters/search.adapter';
import type {
  SearchQuery,
  SearchResponse,
  SearchEntityType,
  RecentSearch,
  AISearchIntent,
  AISearchSuggestion,
  ExtractedEntity,
} from '@/models/search.model';

// =====================================================
// Interface
// =====================================================

export interface ISearchService {
  /**
   * Execute search with optional AI enhancement
   */
  search(tenantId: string, userId: string, query: SearchQuery): Promise<SearchResponse>;

  /**
   * Get recent searches for user
   */
  getRecentSearches(tenantId: string, userId: string): Promise<RecentSearch[]>;

  /**
   * Clear recent search history
   */
  clearRecentSearches(tenantId: string, userId: string): Promise<void>;

  /**
   * Analyze search query with AI
   */
  analyzeSearchIntent(query: string): Promise<AISearchIntent>;

  /**
   * Get AI-powered search suggestions
   */
  getSmartSuggestions(
    tenantId: string,
    query: string,
    context?: Record<string, unknown>
  ): Promise<AISearchSuggestion[]>;

  /**
   * Get autocomplete suggestions
   */
  getAutocompleteSuggestions(tenantId: string, partialQuery: string): Promise<string[]>;
}

// =====================================================
// Implementation
// =====================================================

@injectable()
export class SearchService implements ISearchService {
  constructor(
    @inject(TYPES.ISearchAdapter)
    private searchAdapter: ISearchAdapter
  ) {}

  /**
   * Execute search with optional AI enhancement
   */
  async search(tenantId: string, userId: string, query: SearchQuery): Promise<SearchResponse> {
    // Execute base search
    const response = await this.searchAdapter.search(tenantId, query);

    // Save to recent searches (non-blocking)
    this.searchAdapter
      .saveRecentSearch(
        tenantId,
        userId,
        query.query,
        query.entityTypes || [],
        response.totalCount
      )
      .catch((err) => console.warn('[SearchService] Failed to save recent search:', err));

    // If AI is requested and query looks complex, add suggestions
    if (query.useAI && query.query.length > 3) {
      try {
        const suggestions = await this.generateAISuggestions(query.query, response);
        response.suggestions = suggestions;
      } catch (err) {
        // AI is optional, don't fail the search
        console.warn('[SearchService] AI suggestions failed:', err);
      }
    }

    return response;
  }

  /**
   * Get recent searches for user
   */
  async getRecentSearches(tenantId: string, userId: string): Promise<RecentSearch[]> {
    return this.searchAdapter.getRecentSearches(tenantId, userId);
  }

  /**
   * Clear recent search history
   */
  async clearRecentSearches(tenantId: string, userId: string): Promise<void> {
    return this.searchAdapter.clearRecentSearches(tenantId, userId);
  }

  /**
   * Analyze search query with AI to understand intent
   */
  async analyzeSearchIntent(query: string): Promise<AISearchIntent> {
    const normalizedQuery = query.toLowerCase().trim();

    // Extract entities from query
    const entities = this.extractEntities(normalizedQuery);

    // Determine intent type
    const intent = this.determineIntent(normalizedQuery, entities);

    // Suggest filters based on query
    const suggestedFilters = this.suggestFilters(normalizedQuery, entities);

    // Generate natural language interpretation
    const interpretation = this.generateInterpretation(normalizedQuery, intent, entities);

    return {
      intent,
      entities,
      suggestedFilters,
      interpretation,
    };
  }

  /**
   * Get AI-powered search suggestions
   */
  async getSmartSuggestions(
    tenantId: string,
    query: string,
    _context?: Record<string, unknown>
  ): Promise<AISearchSuggestion[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const suggestions: AISearchSuggestion[] = [];

    // Analyze the query
    const intent = await this.analyzeSearchIntent(query);

    // Generate suggestions based on intent
    if (intent.entities.length > 0) {
      // If we found entities, suggest targeted searches
      for (const entity of intent.entities) {
        if (entity.type === 'person') {
          suggestions.push({
            suggestion: `Find member "${entity.value}"`,
            confidence: 0.9,
            reason: 'Search for a specific person',
            targetTypes: ['member'],
          });
        }
        if (entity.type === 'date') {
          suggestions.push({
            suggestion: `Events on ${entity.value}`,
            confidence: 0.8,
            reason: 'Search for events on a specific date',
            targetTypes: ['event'],
          });
        }
        if (entity.type === 'amount') {
          suggestions.push({
            suggestion: `Transactions of ${entity.value}`,
            confidence: 0.85,
            reason: 'Search for financial transactions',
            targetTypes: ['transaction', 'donation'],
          });
        }
      }
    }

    // Add general suggestions based on query patterns
    if (normalizedQuery.includes('new') || normalizedQuery.includes('recent')) {
      suggestions.push({
        suggestion: `Recently added members`,
        confidence: 0.7,
        reason: 'Show newest members',
        targetTypes: ['member'],
      });
    }

    if (normalizedQuery.includes('overdue') || normalizedQuery.includes('pending')) {
      suggestions.push({
        suggestion: `Pending care plans`,
        confidence: 0.75,
        reason: 'Show care plans needing attention',
        targetTypes: ['care_plan'],
      });
    }

    // Limit to top 3 suggestions
    return suggestions.slice(0, 3);
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(tenantId: string, partialQuery: string): Promise<string[]> {
    // Get from recent searches
    const recentSuggestions = await this.searchAdapter.getSearchSuggestions(
      tenantId,
      partialQuery
    );

    // Add common search patterns
    const patternSuggestions = this.getPatternSuggestions(partialQuery);

    // Combine and deduplicate
    const combined = [...new Set([...recentSuggestions, ...patternSuggestions])];

    return combined.slice(0, 8);
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Extract entities from search query
   */
  private extractEntities(query: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Date patterns
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /(\d{4}-\d{2}-\d{2})/g,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi,
      /(today|yesterday|tomorrow|this week|last week|this month|last month)/gi,
    ];

    for (const pattern of datePatterns) {
      const matches = query.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: 'date',
            value: match,
            originalText: match,
            confidence: 0.9,
          });
        }
      }
    }

    // Amount patterns
    const amountPattern = /(?:php|usd|eur|gbp|\$|€|£)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi;
    const amountMatches = query.match(amountPattern);
    if (amountMatches) {
      for (const match of amountMatches) {
        entities.push({
          type: 'amount',
          value: match,
          originalText: match,
          confidence: 0.85,
        });
      }
    }

    // Status patterns
    const statusWords = [
      'active',
      'inactive',
      'pending',
      'completed',
      'cancelled',
      'overdue',
      'scheduled',
    ];
    for (const status of statusWords) {
      if (query.includes(status)) {
        entities.push({
          type: 'status',
          value: status,
          originalText: status,
          confidence: 0.9,
        });
      }
    }

    // Proper names (capitalized words that aren't common words)
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'search',
      'find',
      'show',
      'get',
    ]);
    const words = query.split(/\s+/);
    for (const word of words) {
      if (
        word.length > 2 &&
        /^[A-Z][a-z]+$/.test(word) &&
        !commonWords.has(word.toLowerCase())
      ) {
        entities.push({
          type: 'person',
          value: word,
          originalText: word,
          confidence: 0.7,
        });
      }
    }

    return entities;
  }

  /**
   * Determine search intent from query
   */
  private determineIntent(
    query: string,
    entities: ExtractedEntity[]
  ): 'find' | 'filter' | 'action' | 'question' {
    const questionWords = ['what', 'where', 'when', 'who', 'how', 'why', 'which'];
    const actionWords = ['create', 'add', 'delete', 'update', 'edit', 'remove', 'send'];
    const filterWords = ['all', 'only', 'with', 'without', 'greater', 'less', 'between'];

    // Check for questions
    if (query.endsWith('?') || questionWords.some((w) => query.startsWith(w))) {
      return 'question';
    }

    // Check for actions
    if (actionWords.some((w) => query.includes(w))) {
      return 'action';
    }

    // Check for filters
    if (filterWords.some((w) => query.includes(w)) || entities.some((e) => e.type === 'status')) {
      return 'filter';
    }

    // Default to find
    return 'find';
  }

  /**
   * Suggest filters based on query analysis
   */
  private suggestFilters(
    query: string,
    entities: ExtractedEntity[]
  ): { entityTypes: SearchEntityType[]; status?: string[] } | undefined {
    const entityTypes: SearchEntityType[] = [];
    const statuses: string[] = [];

    // Keywords to entity type mapping
    const keywordMapping: Record<string, SearchEntityType[]> = {
      member: ['member'],
      members: ['member'],
      people: ['member'],
      person: ['member'],
      family: ['family'],
      families: ['family'],
      household: ['family'],
      account: ['account'],
      accounts: ['account'],
      transaction: ['transaction'],
      transactions: ['transaction'],
      payment: ['transaction', 'donation'],
      money: ['transaction', 'donation'],
      event: ['event'],
      events: ['event'],
      calendar: ['event'],
      ministry: ['ministry'],
      ministries: ['ministry'],
      team: ['ministry'],
      care: ['care_plan'],
      pastoral: ['care_plan'],
      discipleship: ['discipleship_plan'],
      growth: ['discipleship_plan'],
      notebook: ['notebook'],
      note: ['note'],
      notes: ['note'],
      donation: ['donation'],
      donations: ['donation'],
      giving: ['donation'],
      tithe: ['donation'],
    };

    for (const [keyword, types] of Object.entries(keywordMapping)) {
      if (query.includes(keyword)) {
        entityTypes.push(...types);
      }
    }

    // Extract statuses
    for (const entity of entities) {
      if (entity.type === 'status') {
        statuses.push(entity.value);
      }
    }

    if (entityTypes.length === 0 && statuses.length === 0) {
      return undefined;
    }

    return {
      entityTypes: [...new Set(entityTypes)],
      status: statuses.length > 0 ? statuses : undefined,
    };
  }

  /**
   * Generate natural language interpretation
   */
  private generateInterpretation(
    query: string,
    intent: 'find' | 'filter' | 'action' | 'question',
    entities: ExtractedEntity[]
  ): string {
    const parts: string[] = [];

    switch (intent) {
      case 'find':
        parts.push('Searching for');
        break;
      case 'filter':
        parts.push('Filtering results by');
        break;
      case 'action':
        parts.push('Looking to');
        break;
      case 'question':
        parts.push('Answering:');
        break;
    }

    if (entities.length > 0) {
      const entityDescriptions = entities.map((e) => {
        switch (e.type) {
          case 'person':
            return `person named "${e.value}"`;
          case 'date':
            return `date ${e.value}`;
          case 'amount':
            return `amount ${e.value}`;
          case 'status':
            return `status "${e.value}"`;
          default:
            return e.value;
        }
      });
      parts.push(entityDescriptions.join(', '));
    } else {
      parts.push(`"${query}"`);
    }

    return parts.join(' ');
  }

  /**
   * Get pattern-based suggestions
   */
  private getPatternSuggestions(partialQuery: string): string[] {
    const suggestions: string[] = [];
    const normalized = partialQuery.toLowerCase();

    // Common search patterns
    const patterns = [
      { prefix: 'new', suggestion: 'new members this month' },
      { prefix: 'act', suggestion: 'active members' },
      { prefix: 'pend', suggestion: 'pending care plans' },
      { prefix: 'over', suggestion: 'overdue follow-ups' },
      { prefix: 'don', suggestion: 'donations this week' },
      { prefix: 'eve', suggestion: 'events today' },
      { prefix: 'birth', suggestion: 'birthdays this month' },
      { prefix: 'min', suggestion: 'ministry teams' },
      { prefix: 'fam', suggestion: 'families' },
      { prefix: 'note', suggestion: 'notebook pages' },
    ];

    for (const pattern of patterns) {
      if (normalized.startsWith(pattern.prefix)) {
        suggestions.push(pattern.suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Generate AI suggestions based on search results
   */
  private async generateAISuggestions(
    query: string,
    response: SearchResponse
  ): Promise<AISearchSuggestion[]> {
    const suggestions: AISearchSuggestion[] = [];

    // If no results, suggest broadening the search
    if (response.totalCount === 0) {
      suggestions.push({
        suggestion: 'Try a shorter or different search term',
        confidence: 0.9,
        reason: 'No results found for your search',
      });

      // Suggest removing specific filters
      if (query.split(' ').length > 1) {
        const words = query.split(' ');
        suggestions.push({
          suggestion: `Search for "${words[0]}" only`,
          confidence: 0.7,
          reason: 'Simplify your search',
        });
      }
    }

    // If results are concentrated in one type, suggest exploring others
    if (response.groups.length === 1 && response.totalCount > 5) {
      const mainGroup = response.groups[0];
      suggestions.push({
        suggestion: `Found ${mainGroup.totalCount} ${mainGroup.label.toLowerCase()}s - try searching other categories`,
        confidence: 0.6,
        reason: 'Results are concentrated in one category',
      });
    }

    // If many results, suggest filtering
    if (response.totalCount > 20) {
      suggestions.push({
        suggestion: 'Add more specific terms to narrow results',
        confidence: 0.75,
        reason: `Found ${response.totalCount} results`,
      });
    }

    return suggestions.slice(0, 3);
  }
}
