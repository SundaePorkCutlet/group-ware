import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// fetchWithTimeout: 10초(10000ms) 타임아웃 기본 적용
export async function fetchWithTimeout(resource: string | URL | Request, options: any = {}) {
  const { timeout = 10000 } = options; // 10초 기본값
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
} 