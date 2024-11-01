import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Package } from 'lucide-react';
import WooCommerceService from '../services/woocommerce';

interface Product {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  status: string;
  stock_status: string;
}

const AllProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const activeServer = WooCommerceService.getActiveServer();

      if (!activeServer) {
        throw new Error('No active WooCommerce server configured. Please set up a server in the Settings page.');
      }

      const response = await axios.get(`${activeServer.url}/wp-json/wc/v3/products`, {
        auth: {
          username: activeServer.consumerKey,
          password: activeServer.consumerSecret
        },
        params: {
          per_page: 20,
          page: page
        }
      });

      setProducts(prevProducts => {
        const newProducts = response.data.filter((newProduct: Product) => 
          !prevProducts.some(existingProduct => existingProduct.id === newProduct.id)
        );
        return [...prevProducts, ...newProducts];
      });
      setHasMore(response.data.length === 20);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prevPage => prevPage + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">All Products</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <div className="flex">
            <div className="py-1">
              <AlertCircle className="h-6 w-6 text-red-500 mr-4" />
            </div>
            <div>
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={`${product.id}-${page}`} className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">{product.name}</h2>
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-600">Price: {product.price}</p>
              {product.sale_price && (
                <p className="text-green-600">Sale Price: {product.sale_price}</p>
              )}
              <p className="text-gray-600">Status: {product.status}</p>
              <p className="text-gray-600">Stock: {product.stock_status}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default AllProducts;