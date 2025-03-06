import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext<{
  auth: any;
  setAuth: React.Dispatch<React.SetStateAction<any>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
}>({
  auth: null,
  setAuth: () => {},
  user: null,
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<boolean | null>(null);
  interface User {
    data: {
      Token: string;
    };
  }

  const [user, setUser] = useState<User | null>(null);

  if (!(user?.data?.Token)) {
    const userLocal = localStorage.getItem("user");
    if (userLocal) {
      setUser(JSON.parse(userLocal));
      setAuth(true);
    }
  }
  
  return (
    <AuthContext.Provider value={{ auth, setAuth, user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;