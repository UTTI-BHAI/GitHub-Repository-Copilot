export interface Session {
  id: string
  repo_name: string
  url: string
}

export interface CloneRequest {
  url: string
}

export interface CloneResponse {
  session_id: string
  repository_id: number
  repo_name: string
  index_status: 'pending' | 'indexing' | 'ready' | 'failed'
}
