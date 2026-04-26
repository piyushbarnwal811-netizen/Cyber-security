import React, { createContext, useMemo, useState } from "react";
import { login } from "../services/userService.js";

export const AuthContext = createContext(null);

const storedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("fraudshield_user"));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(storedUser);

  const signIn = async (credentials) => {
    const data = await login(credentials);
    localStorage.setItem("fraudshield_user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const signOut = () => {
    localStorage.removeItem("fraudshield_user");
    setUser(null);
  };

  const demoSignIn = () => {
    const demoUser = {
      _id: "demo-user",
      name: "Demo Analyst",
      email: "demo@fraudshield.ai",
      role: "analyst",
      token: "demo-token"
    };

    localStorage.setItem("fraudshield_user", JSON.stringify(demoUser));
    setUser(demoUser);
  };

  const value = useMemo(
    () => ({ user, signIn, signOut, demoSignIn }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
