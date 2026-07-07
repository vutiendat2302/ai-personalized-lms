import React from "react";
import { useAuth } from "@/hooks/useAuth";

export const Dashboard: React.FC = () => {
  const { auth, logout } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded shadow">
        <p className="mb-2"><strong>Email:</strong> {auth.user?.email}</p>
        <p className="mb-2"><strong>Role:</strong> {auth.user?.role}</p>
        <button 
          onClick={logout}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
};
