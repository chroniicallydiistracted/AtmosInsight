export interface Chunk {
  id: string;
  text: string;
}

export async function* explain(_context: unknown): AsyncGenerator<Chunk> {
  void _context;
  yield { id: 'stub', text: 'stubbed response' };
}
