const MAX_BUFFER_SIZE = 30;

export class RollingBuffer<T> {
  private items: T[] = [];
  private maxSize: number;

  constructor(maxSize: number = MAX_BUFFER_SIZE) {
    this.maxSize = maxSize;
  }

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift();
    }
  }

  snapshot(): T[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }

  get size(): number {
    return this.items.length;
  }
}
