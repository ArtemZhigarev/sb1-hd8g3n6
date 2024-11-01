import axios from 'axios';

export interface WooCommerceServer {
  id: string;
  name: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  isActive: boolean;
  lastChecked?: string;
  status?: 'online' | 'offline' | 'error';
  errorMessage?: string;
}

class WooCommerceService {
  private static STORAGE_KEY = 'woocommerce_servers';
  private static ACTIVE_SERVER_KEY = 'woocommerce_active_server';

  static getServers(): WooCommerceServer[] {
    const serversJson = localStorage.getItem(this.STORAGE_KEY);
    return serversJson ? JSON.parse(serversJson) : [];
  }

  static getActiveServer(): WooCommerceServer | null {
    const servers = this.getServers();
    return servers.find(server => server.isActive) || null;
  }

  static async addServer(server: Omit<WooCommerceServer, 'id' | 'isActive' | 'status'>): Promise<WooCommerceServer> {
    const servers = this.getServers();
    const newServer: WooCommerceServer = {
      ...server,
      id: crypto.randomUUID(),
      isActive: servers.length === 0, // First server is active by default
      status: 'offline'
    };

    servers.push(newServer);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(servers));
    return newServer;
  }

  static updateServer(serverId: string, updates: Partial<WooCommerceServer>): void {
    const servers = this.getServers();
    const index = servers.findIndex(s => s.id === serverId);
    
    if (index !== -1) {
      servers[index] = { ...servers[index], ...updates };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(servers));
    }
  }

  static deleteServer(serverId: string): void {
    const servers = this.getServers().filter(s => s.id !== serverId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(servers));

    // If we deleted the active server, make the first remaining server active
    const activeServer = servers.find(s => s.isActive);
    if (!activeServer && servers.length > 0) {
      this.setActiveServer(servers[0].id);
    }
  }

  static setActiveServer(serverId: string): void {
    const servers = this.getServers();
    servers.forEach(server => {
      server.isActive = server.id === serverId;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(servers));
  }

  static async checkServerStatus(server: WooCommerceServer): Promise<{
    status: 'online' | 'offline' | 'error';
    errorMessage?: string;
  }> {
    try {
      const response = await axios.get(`${server.url}/wp-json/wc/v3/system_status`, {
        auth: {
          username: server.consumerKey,
          password: server.consumerSecret
        },
        timeout: 5000
      });

      return {
        status: response.status === 200 ? 'online' : 'error',
        errorMessage: response.status !== 200 ? 'Server returned unexpected status' : undefined
      };
    } catch (error) {
      return {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async checkAllServersStatus(): Promise<void> {
    const servers = this.getServers();
    
    for (const server of servers) {
      const { status, errorMessage } = await this.checkServerStatus(server);
      this.updateServer(server.id, {
        status,
        errorMessage,
        lastChecked: new Date().toISOString()
      });
    }
  }
}

export default WooCommerceService;