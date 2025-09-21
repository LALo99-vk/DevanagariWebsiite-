// Mock data for admin components when database is not available
export const mockAdminData = {
  products: {
    count: 3,
    data: [
      {
        id: "1",
        name: "Devanagari Health Mix 200g",
        price: 19.99,
        stock: 100,
        category: "health_mix",
      },
      {
        id: "2",
        name: "Devanagari Health Mix 450g",
        price: 29.99,
        stock: 100,
        category: "health_mix",
      },
      {
        id: "3",
        name: "Devanagari Health Mix 900g",
        price: 49.99,
        stock: 100,
        category: "health_mix",
      },
    ],
  },
  orders: {
    count: 0,
    data: [],
  },
  users: {
    count: 1,
    data: [
      {
        id: "7766c47a-312c-446c-82a5-0ea607607a0c",
        email: "adityapiyush71@gmail.com",
        name: "Admin User",
        is_admin: true,
        role: "super_admin",
      },
    ],
  },
  refunds: {
    count: 0,
    data: [],
  },
};

// Helper function to simulate database delay
export const simulateDbDelay = (ms: number = 100) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
