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
  repo_name: string
}
