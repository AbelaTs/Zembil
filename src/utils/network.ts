import fetch from 'node-fetch';

export class NetworkUtils {
  private static isOnline: boolean | null = null;
  private static lastCheck: number = 0;
  private static checkInterval: number = 30000; // 30 seconds

  static async isConnected(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached result if recent
    if (this.isOnline !== null && (now - this.lastCheck) < this.checkInterval) {
      return this.isOnline;
    }

    try {
      // Try to reach a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      this.isOnline = response.ok;
      this.lastCheck = now;
      return response.ok;
    } catch (error) {
      this.isOnline = false;
      this.lastCheck = now;
      return false;
    }
  }

  static async checkConnectivity(): Promise<{
    online: boolean;
    latency: number;
    speed: 'slow' | 'medium' | 'fast';
  }> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;
      const speed = latency < 1000 ? 'fast' : latency < 3000 ? 'medium' : 'slow';
      
      return {
        online: response.ok,
        latency,
        speed
      };
    } catch (error) {
      return {
        online: false,
        latency: -1,
        speed: 'slow'
      };
    }
  }

  static async downloadWithRetry(
    url: string, 
    maxRetries: number = 3, 
    retryDelay: number = 1000
  ): Promise<Buffer> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, { signal: controller.signal });
      
      clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.buffer();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          console.warn(`Download attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
          await this.sleep(retryDelay);
          retryDelay *= 2; // Exponential backoff
        }
      }
    }
    
    throw new Error(`Failed to download after ${maxRetries} attempts: ${lastError?.message}`);
  }

  static async downloadWithProgress(
    url: string,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<Buffer> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const total = parseInt(response.headers.get('content-length') || '0');
    const chunks: Buffer[] = [];
    let downloaded = 0;

    const reader = (response.body as any)?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    try {
      while (true) { // eslint-disable-line no-constant-condition
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(Buffer.from(value));
        downloaded += value.length;
        
        if (onProgress && total > 0) {
          onProgress(downloaded, total);
        }
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
