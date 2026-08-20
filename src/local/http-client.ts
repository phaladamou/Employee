export class ResilientHttpClient {
  async request(url: string, options?: any): Promise<Response> {
    return fetch(url, options);
  }
}




