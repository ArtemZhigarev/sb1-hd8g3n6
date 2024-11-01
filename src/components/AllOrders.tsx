import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, ShoppingBag, ArrowUpDown, Search } from 'lucide-react';
import WooCommerceService from '../services/woocommerce';
import OrderDetails from './OrderDetails';

interface Order {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  customer_id: number;
  customer_note: string;
  notes: Array<{
    id: number;
    author: string;
    date_created: string;
    note: string;
    customer_note: boolean;
  }>;
}

type SortField = 'id' | 'date_created';
type SortDirection = 'asc' | 'desc';

const AllOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sortField, setSortField] = useState<SortField>('date_created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const activeServer = WooCommerceService.getActiveServer();

      if (!activeServer) {
        throw new Error('No active WooCommerce server configured. Please set up a server in the Settings page.');
      }

      // Fetch orders
      const ordersResponse = await axios.get(`${activeServer.url}/wp-json/wc/v3/orders`, {
        auth: {
          username: activeServer.consumerKey,
          password: activeServer.consumerSecret
        },
        params: {
          per_page: 20,
          page: page
        }
      });

      // Fetch notes for each order
      const ordersWithNotes = await Promise.all(
        ordersResponse.data.map(async (order: Order) => {
          const notesResponse = await axios.get(
            `${activeServer.url}/wp-json/wc/v3/orders/${order.id}/notes`,
            {
              auth: {
                username: activeServer.consumerKey,
                password: activeServer.consumerSecret
              }
            }
          );
          return { ...order, notes: notesResponse.data };
        })
      );

      setOrders(prevOrders => {
        const newOrders = ordersWithNotes.filter((newOrder: Order) => 
          !prevOrders.some(existingOrder => existingOrder.id === newOrder.id)
        );
        return [...prevOrders, ...newOrders];
      });
      setHasMore(ordersResponse.data.length === 20);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset orders and page when searching
    setOrders([]);
    setPage(1);
    fetchOrders();
  };

  const filteredOrders = orders.filter(order => 
    searchTerm ? order.number.includes(searchTerm) : true
  );

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'id') {
      return sortDirection === 'asc' ? a.id - b.id : b.id - a.id;
    } else {
      const dateA = new Date(a.date_created).getTime();
      const dateB = new Date(b.date_created).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">All Orders</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex-1 sm:flex-initial">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by order ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </form>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSort('id')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                sortField === 'id' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              } hover:bg-blue-50`}
            >
              Order ID
              <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'id' ? 'text-blue-800' : 'text-gray-500'}`} />
            </button>
            <button
              onClick={() => handleSort('date_created')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                sortField === 'date_created' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              } hover:bg-blue-50`}
            >
              Date
              <ArrowUpDown className={`ml-1 h-4 w-4 ${sortField === 'date_created' ? 'text-blue-800' : 'text-gray-500'}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <div className="flex">
            <AlertCircle className="h-6 w-6 text-red-500 mr-4" />
            <div>
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sortedOrders.map((order) => (
            <li
              key={`${order.id}-${page}`}
              onClick={() => setSelectedOrder(order)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ShoppingBag className="h-6 w-6 text-gray-400 mr-3" />
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      Order #{order.number}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Customer ID: {order.customer_id}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>Total: {order.total}</p>
                    <p className="ml-4">Date: {new Date(order.date_created).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {loading && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      )}

      {hasMore && !loading && orders.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Load More
          </button>
        </div>
      )}

      {!loading && sortedOrders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No orders found matching your search.' : 'No orders found. Make sure you have orders in your WooCommerce store.'}
        </div>
      )}

      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default AllOrders;