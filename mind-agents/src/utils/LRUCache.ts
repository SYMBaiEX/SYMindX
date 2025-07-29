/**
 * LRU (Least Recently Used) Cache Implementation
 * High-performance cache with O(1) get/set operations
 */

interface CacheNode<K, V> {
  key: K;
  value: V;
  prev: CacheNode<K, V> | null;
  next: CacheNode<K, V> | null;
  timestamp: number;
  accessCount: number;
}

interface LRUCacheOptions {
  maxSize: number;
  ttl?: number; // Time to live in milliseconds
  onEvict?: <K, V>(key: K, value: V) => void;
}

export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly ttl?: number;
  private readonly onEvict?: <K, V>(key: K, value: V) => void;
  
  private cache: Map<K, CacheNode<K, V>>;
  private head: CacheNode<K, V> | null = null;
  private tail: CacheNode<K, V> | null = null;
  private size = 0;
  
  // Performance metrics
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  
  constructor(options: LRUCacheOptions) {
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;
    this.onEvict = options.onEvict;
    this.cache = new Map();
  }
  
  /**
   * Get value from cache
   */
  get(key: K): V | null {
    const node = this.cache.get(key);
    
    if (!node) {
      this.misses++;
      return null;
    }
    
    // Check TTL
    if (this.ttl && Date.now() - node.timestamp > this.ttl) {
      this.delete(key);
      this.misses++;
      return null;
    }
    
    // Move to front (most recently used)
    this.moveToFront(node);
    node.accessCount++;
    this.hits++;
    
    return node.value;
  }
  
  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // Update existing node
      existingNode.value = value;
      existingNode.timestamp = Date.now();
      this.moveToFront(existingNode);
      return;
    }
    
    // Create new node
    const newNode: CacheNode<K, V> = {
      key,
      value,
      prev: null,
      next: this.head,
      timestamp: Date.now(),
      accessCount: 0
    };
    
    if (this.head) {
      this.head.prev = newNode;
    }
    this.head = newNode;
    
    if (!this.tail) {
      this.tail = newNode;
    }
    
    this.cache.set(key, newNode);
    this.size++;
    
    // Evict if necessary
    if (this.size > this.maxSize) {
      this.evictLRU();
    }
  }
  
  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    const node = this.cache.get(key);
    
    if (!node) return false;
    
    // Check TTL
    if (this.ttl && Date.now() - node.timestamp > this.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete key from cache
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    
    if (!node) return false;
    
    this.removeNode(node);
    this.cache.delete(key);
    this.size--;
    
    return true;
  }
  
  /**
   * Clear all entries
   */
  clear(): void {
    if (this.onEvict) {
      for (const node of this.cache.values()) {
        this.onEvict(node.key, node.value);
      }
    }
    
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.evictions += this.size;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    hits: number;
    misses: number;
    evictions: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    
    return {
      size: this.size,
      maxSize: this.maxSize,
      hitRate,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions
    };
  }
  
  /**
   * Get all keys in order of most to least recently used
   */
  keys(): K[] {
    const keys: K[] = [];
    let current = this.head;
    
    while (current) {
      keys.push(current.key);
      current = current.next;
    }
    
    return keys;
  }
  
  /**
   * Get all values in order of most to least recently used
   */
  values(): V[] {
    const values: V[] = [];
    let current = this.head;
    
    while (current) {
      values.push(current.value);
      current = current.next;
    }
    
    return values;
  }
  
  /**
   * Get entries as array
   */
  entries(): Array<[K, V]> {
    const entries: Array<[K, V]> = [];
    let current = this.head;
    
    while (current) {
      entries.push([current.key, current.value]);
      current = current.next;
    }
    
    return entries;
  }
  
  /**
   * Prune expired entries
   */
  prune(): number {
    if (!this.ttl) return 0;
    
    const now = Date.now();
    let pruned = 0;
    
    for (const [key, node] of this.cache.entries()) {
      if (now - node.timestamp > this.ttl) {
        this.delete(key);
        pruned++;
      }
    }
    
    return pruned;
  }
  
  // Private helper methods
  
  private moveToFront(node: CacheNode<K, V>): void {
    if (node === this.head) return;
    
    // Remove from current position
    this.removeNode(node);
    
    // Add to front
    node.prev = null;
    node.next = this.head;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }
  
  private removeNode(node: CacheNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }
  
  private evictLRU(): void {
    if (!this.tail) return;
    
    const lru = this.tail;
    
    if (this.onEvict) {
      this.onEvict(lru.key, lru.value);
    }
    
    this.removeNode(lru);
    this.cache.delete(lru.key);
    this.size--;
    this.evictions++;
  }
}

/**
 * Create a multi-level cache with different eviction policies
 */
export class MultiLevelCache<K, V> {
  private l1: LRUCache<K, V>;
  private l2: LRUCache<K, V>;
  private l3: Map<K, V>;
  
  constructor(options: {
    l1Size: number;
    l2Size: number;
    l1TTL?: number;
    l2TTL?: number;
  }) {
    this.l1 = new LRUCache<K, V>({
      maxSize: options.l1Size,
      ttl: options.l1TTL,
      onEvict: (key, value) => {
        // Demote to L2
        this.l2.set(key, value);
      }
    });
    
    this.l2 = new LRUCache<K, V>({
      maxSize: options.l2Size,
      ttl: options.l2TTL,
      onEvict: (key, value) => {
        // Demote to L3
        this.l3.set(key, value);
      }
    });
    
    this.l3 = new Map();
  }
  
  get(key: K): V | null {
    // Try L1 first
    let value = this.l1.get(key);
    if (value !== null) return value;
    
    // Try L2
    value = this.l2.get(key);
    if (value !== null) {
      // Promote to L1
      this.l1.set(key, value);
      return value;
    }
    
    // Try L3
    value = this.l3.get(key) ?? null;
    if (value !== null) {
      // Promote to L1
      this.l1.set(key, value);
    }
    
    return value;
  }
  
  set(key: K, value: V): void {
    this.l1.set(key, value);
  }
  
  has(key: K): boolean {
    return this.l1.has(key) || this.l2.has(key) || this.l3.has(key);
  }
  
  delete(key: K): boolean {
    const deleted1 = this.l1.delete(key);
    const deleted2 = this.l2.delete(key);
    const deleted3 = this.l3.delete(key);
    
    return deleted1 || deleted2 || deleted3;
  }
  
  clear(): void {
    this.l1.clear();
    this.l2.clear();
    this.l3.clear();
  }
  
  getStats(): {
    l1: ReturnType<LRUCache<K, V>['getStats']>;
    l2: ReturnType<LRUCache<K, V>['getStats']>;
    l3Size: number;
  } {
    return {
      l1: this.l1.getStats(),
      l2: this.l2.getStats(),
      l3Size: this.l3.size
    };
  }
}