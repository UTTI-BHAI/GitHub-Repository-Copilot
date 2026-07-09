import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function isValidGithubUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i.test(url.trim())
}

export function repoNameFromUrl(url: string): string {
  const match = url.match(/github\.com\/[\w.-]+\/([\w.-]+)/i)
  return match ? match[1].replace(/\.git$/, '') : 'repository'
}
