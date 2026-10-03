"use client";
import { useEffect, useState } from "react";

interface User {
  _id: string;
  name: string;
  email: string;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("token");

          if (!token) {
            setError("Unauthorized: Please log in first.");

            return;
          }

          const res = await fetch("/api/users", {
            headers: { Authorization: `Bearer ${token}` },
          });

          const data = await res.json();

          if (!data.success)
            throw new Error(data.error || "Failed to fetch users");

          setUsers(data.users);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
      }
    };

    fetchUsers();
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">User List</h2>
      <ul>
        {users.map((user) => (
          <li key={user._id} className="border p-2 rounded mb-1">
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
