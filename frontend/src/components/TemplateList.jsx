import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:8080/waba/debug/all-templates');
      console.log('Templates response:', response.data);
      
      if (response.data.status === 'success' && response.data.templates) {
        setTemplates(response.data.templates);
      } else {
        setError('Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Error fetching templates: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Templates</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <button 
          onClick={fetchTemplates}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Templates'}
        </button>
      </div>
      
      {loading && templates.length === 0 && (
        <div className="text-center py-4">Loading templates...</div>
      )}
      
      {templates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">Template Name</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Category</th>
                <th className="py-2 px-4 border-b text-left">Language</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-2 px-4 border-b">
                    <span className={`font-medium ${template.name === 'my_m_one' ? 'text-red-600' : template.name === 'auto_pay_reminder_2' ? 'text-green-600' : ''}`}>
                      {template.name}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      template.status === 'APPROVED' 
                        ? 'bg-green-100 text-green-800' 
                        : template.status === 'PENDING' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {template.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b">{template.category}</td>
                  <td className="py-2 px-4 border-b">{template.language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {templates.length === 0 && !loading && (
        <div className="text-center py-4 text-gray-500">
          No templates found
        </div>
      )}
    </div>
  );
};

export default TemplateList;