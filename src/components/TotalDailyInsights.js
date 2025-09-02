import React from 'react';

const TotalDailyInsights = ({ insights, kitchenInsights }) => {
  if (!insights || !kitchenInsights) {
    return <p>Loading insights...</p>;
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Total Daily Insights</h3>

      <div className="space-y-8">
        <div>
          <h4 className="text-lg font-semibold text-gray-700 mb-4">Team Lead Insights</h4>
          <div className="space-y-4">
            {insights.map(({ teamLead, dailyTargets, salesData }) => (
              <div key={teamLead.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                <h5 className="font-bold text-base sm:text-lg text-gray-800 mb-2">{teamLead.name} ({teamLead.subrole})</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h6 className="font-semibold text-gray-700">Daily Targets</h6>
                    <ul className="list-disc list-inside text-gray-600">
                      {dailyTargets.flatMap(dt => dt.items).map((item, index) => (
                        <li key={index}>{item.quantity} of {item.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-700">Sales Data</h6>
                    <ul className="list-disc list-inside text-gray-600">
                      <li>Stock Sold: {salesData.stockSold}</li>
                      <li>Stock Backed: {salesData.stockBacked}</li>
                      <li>Stock Shifted: {salesData.stockShifted}</li>
                      <li>Stock Remaining: {salesData.stockRemaining}</li>
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-700 mb-4">Kitchen Insights</h4>
          <div className="space-y-4">
            {kitchenInsights.map(({ kitchenManager, assignments }) => (
              <div key={kitchenManager.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                <h5 className="font-bold text-base sm:text-lg text-gray-800 mb-2">{kitchenManager.name}</h5>
                
                <h6 className="font-semibold text-gray-700">Assignments</h6>
                <ul className="list-disc list-inside text-gray-600">
                  {assignments.map(assignment => (
                    <li key={assignment.id}>
                      <p>Status: {assignment.status}</p>
                      <ul className="list-disc list-inside ml-4">
                        {assignment.items.map((item, index) => (
                          <li key={index}>{item.quantity} of {item.name} (to cook) - Cooked: {item.cookedQuantity || 0}</li>
                        ))}
                        {assignment.fromPreparedStock && assignment.fromPreparedStock.map((item, index) => (
                          <li key={index}>{item.quantity} of {item.name} (from prepared stock)</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalDailyInsights;
