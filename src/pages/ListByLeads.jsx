// ListByLeads.jsx
import React from 'react';
import { useParams } from 'react-router-dom';

const ListByLeads = ({ leads }) => {
  const { status } = useParams();

  const filteredLeads = leads.filter(
    (lead) => lead.status.toLowerCase() === status.toLowerCase()
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold capitalize mb-4">{status} Leads</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded-2xl">
          <thead>
            <tr className="bg-gray-100 text-left text-sm font-medium text-gray-700 uppercase">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead, index) => (
              <tr key={index} className="border-t">
                <td className="px-6 py-4">{lead.name}</td>
                <td className="px-6 py-4">{lead.phone}</td>
                <td className="px-6 py-4">{lead.email}</td>
                <td className="px-6 py-4 capitalize">{lead.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLeads.length === 0 && (
          <p className="text-center py-6 text-gray-500">No leads found for this category.</p>
        )}
      </div>
    </div>
  );
};

export default ListByLeads;
