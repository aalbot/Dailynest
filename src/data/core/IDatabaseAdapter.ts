export interface IDatabaseAdapter {
  connect(): Promise<void>

  subscribe<T>(
    key: string,
    callback: (data: T) => void
  ): () => void

  getOnce<T>(key: string): Promise<T>

  set<T>(key: string, value: T): Promise<void>

  update<T>(key: string, partial: Partial<T>): Promise<void>

  remove(key: string): Promise<void>
}
